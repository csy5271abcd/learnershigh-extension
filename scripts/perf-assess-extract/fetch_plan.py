"""학교알리미 '교과별(학년별) 교수학습 및 평가계획' 공시 파일 자동 수집 테스트.

사용: python -I fetch_plan.py OUT_DIR 학교명1 학교명2 ...   (--no-download 로 목록만)
흐름: 학교 검색(EUC-KR POST) -> 학교 상세(SHL_IDF_CD) -> 평가계획 공시 조각(GET) -> 파일 목록 -> 다운로드 -> zip이면 풀기
결과: OUT_DIR/<학교>/... 파일, OUT_DIR/manifest.json
"""
import http.client
import http.cookiejar
import json
import random
import ssl
import urllib.error
import os
import re
import sys
import time
import urllib.parse
import urllib.request
import zipfile

BASE = "https://www.schoolinfo.go.kr"
RETRIES = 3  # 일시 오류 재시도 횟수 (총 4번 시도)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
PLAN_KEY = "평가계획"


class Client:
    def __init__(self):
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def get(self, path, data=None, params=None, referer=None, enc="utf-8"):
        url = BASE + path
        if params:
            url += "?" + urllib.parse.urlencode(params, encoding="utf-8")
        body = urllib.parse.urlencode(data, encoding=enc).encode() if data is not None else None
        r = urllib.request.Request(url, data=body, headers={"User-Agent": UA, "Referer": referer or BASE + "/Main.do"})
        t0 = time.time()
        for attempt in range(RETRIES + 1):
            try:
                with self.opener.open(r, timeout=60) as resp:
                    content = resp.read()
                    info = {"status": resp.status, "ctype": resp.headers.get("Content-Type"),
                            "disp": resp.headers.get("Content-Disposition"), "attempts": attempt + 1}
                break
            except urllib.error.HTTPError as e:
                # 4xx(429 제외)는 다시 시도해도 같은 결과라 바로 실패
                if attempt == RETRIES or not (e.code == 429 or e.code >= 500):
                    raise
            except (urllib.error.URLError, ssl.SSLError, ConnectionError, TimeoutError, http.client.IncompleteRead):
                # SSL EOF·연결 끊김·시간 초과 같은 일시 오류만 재시도
                if attempt == RETRIES:
                    raise
            time.sleep(2 ** attempt + random.random())  # 1~2초, 2~3초, 4~5초 …
        info["ms"] = int((time.time() - t0) * 1000)
        return content, info


def text(b):
    for enc in ("utf-8", "cp949"):
        try:
            return b.decode(enc)
        except UnicodeDecodeError:
            pass
    return b.decode("cp949", "replace")


def sniff(b):
    if b[:4] == b"%PDF":
        return "pdf"
    if b[:4] == b"PK\x03\x04":
        return "zip-container"
    if b[:8] == bytes.fromhex("d0cf11e0a1b11ae1"):
        return "ole"
    if b[:200].lstrip().lower().startswith((b"<!doctype", b"<html")):
        return "html"
    return "unknown"


def filename_from(disp, fallback):
    if not disp:
        return fallback
    m = re.search(r"filename\*=UTF-8''([^;]+)", disp, re.I)
    if m:
        return urllib.parse.unquote(m.group(1))
    m = re.search(r'filename="?([^";]+)"?', disp, re.I)
    if not m:
        return fallback
    name = m.group(1)
    if "%" in name:
        for enc in ("utf-8", "cp949"):
            try:
                return urllib.parse.unquote(name, encoding=enc, errors="strict")
            except UnicodeDecodeError:
                pass
    for enc in ("utf-8", "cp949"):
        try:
            return name.encode("latin-1").decode(enc)
        except (UnicodeDecodeError, UnicodeEncodeError):
            pass
    return name


def safe_extract(zpath, dest):
    names = []
    root = os.path.realpath(dest)
    os.makedirs(root, exist_ok=True)
    with zipfile.ZipFile(zpath) as z:
        for info in z.infolist():
            name = info.filename
            if not (info.flag_bits & 0x800):
                try:
                    name = name.encode("cp437").decode("cp949")
                except (UnicodeEncodeError, UnicodeDecodeError):
                    pass
            target = os.path.realpath(os.path.join(root, name))
            if not target.startswith(root + os.sep) or info.is_dir():
                continue
            os.makedirs(os.path.dirname(target), exist_ok=True)
            with z.open(info) as src, open(target, "wb") as dst:
                dst.write(src.read())
            names.append(os.path.relpath(target, root))
    return names


def fetch_school(cli, school, out, download=True):
    rec = {"query": school, "steps": {}}
    cli.get("/Main.do")

    if school.startswith("id:"):
        shl = school[3:]
        rec["shl_idf_cd"] = shl
        return _fetch_by_id(cli, school, shl, rec, out, download)

    # 1. 검색 (사이트가 EUC-KR 폼을 기대)
    b, info = cli.get("/ei/ss/Pneiss_f01_l0.do", enc="cp949", data={
        "SEARCH_KEYWORD": school, "SEARCH_SCHUL_NM": school, "SEARCH_TYPE": "1", "pageNumber": "1", "SEARCH_MODE": "",
    })
    html = text(b)
    ids = list(dict.fromkeys(re.findall(r"SHL_IDF_CD\"\)\.val\('([0-9a-f-]{36})'\)", html)
                             + re.findall(r"searchSchul\('([0-9a-f-]{36})'\)", html)))
    rec["steps"]["search"] = {**info, "hits": len(ids)}
    if not ids:
        rec["error"] = "no search hit"
        return rec
    shl = ids[0]
    rec["shl_idf_cd"] = shl
    return _fetch_by_id(cli, school, shl, rec, out, download)


def _fetch_by_id(cli, school, shl, rec, out, download):
    # 2. 학교 상세
    b, info = cli.get("/ei/ss/Pneiss_b01_s0.do", data={"SHL_IDF_CD": shl})
    html = text(b)
    nm = re.search(r'HG_NM\s*:\s*"([^"]+)"', html)
    yr = re.search(r'JG_YEAR\s*:\s*"(\d{4})"', html)
    calls = re.findall(r"loadGongSi\('([^']+)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)'\)", html)
    plan = next((c for c in calls if PLAN_KEY in c[3]), None)
    rec["school_name"] = nm.group(1) if nm else None
    rec["steps"]["school"] = {**info, "plan_item": plan[3] if plan else None, "year": yr.group(1) if yr else None}
    if not plan or not yr:
        rec["error"] = "plan item not found"
        return rec
    year = yr.group(1)
    url, cd, no, gnm, gsb, jgb, jgh, jgg = plan
    params = {"GS_HANGMOK_CD": cd, "GS_HANGMOK_NO": no, "GS_HANGMOK_NM": gnm, "GS_BURYU_CD": gsb,
              "JG_BURYU_CD": jgb, "JG_HANGMOK_CD": jgh, "JG_GUBUN": jgg, "JG_YEAR2": year,
              "HG_NM": rec["school_name"] or school, "SHL_IDF_CD": shl, "GS_TYPE": "Y", "JG_YEAR": year,
              "SORT": "BR", "CHOSEN_JG_YEAR": year, "PRE_JG_YEAR": year, "LOAD_TYPE": "single"}

    # 3. 공시 조각
    b, info = cli.get(url, params=params, referer=BASE + "/ei/ss/Pneiss_b01_s0.do")
    html = text(b)
    if "서비스 일시 중단" in html:
        rec["error"] = "item page returned error page"
        rec["steps"]["item"] = info
        return rec
    fn = re.search(r"function (getEiFile\d+)\(", html)
    fn_name = fn.group(1) if fn else f"getEiFile{cd}"
    files = re.findall(re.escape(fn_name) + r"\('(\d+)'\);?\"?[^>]*>\s*([^<]+?)\s*<", html)
    chasu = re.findall(r"\((\d)차\)\s*(\d{4})년\s*(\d{2})월", html)
    form = {}
    if "eiFileDownForm" in html:
        seg = html.split('id="eiFileDownForm"', 1)[-1][:3000]
        form = dict(re.findall(r'name="([A-Z_]+)"[^>]*value="([^"]*)"', seg))
    rec["steps"]["item"] = {**info, "file_count": len(files), "form": form, "submissions": chasu[:6]}
    rec["files"] = [{"seq": seq, "label": label} for seq, label in files]
    if not download or not form:
        return rec

    # 4. 다운로드
    sdir = os.path.join(out, re.sub(r"[\\/:*?\"<>|]", "_", rec["school_name"] or school))
    os.makedirs(sdir, exist_ok=True)
    for f in rec["files"]:
        q = dict(form); q["FILE_SEQ"] = f["seq"]
        b, info = cli.get("/servlets/EiFileDownLoad.do", params=q, referer=BASE + "/ei/ss/Pneiss_b01_s0.do")
        name = filename_from(info["disp"], f"file_{f['seq']}.bin")
        path = os.path.join(sdir, f"{f['seq']}_" + re.sub(r"[\/:*?\"<>|]", "_", os.path.basename(name)))
        with open(path, "wb") as fh:
            fh.write(b)
        f.update({"status": info["status"], "ms": info["ms"], "bytes": len(b), "ctype": info["ctype"],
                  "filename": name, "sniff": sniff(b), "path": path})
        if f["sniff"] == "zip-container" and name.lower().endswith(".zip"):
            try:
                f["unzipped"] = safe_extract(path, os.path.join(sdir, f"{f['seq']}_z"))
            except zipfile.BadZipFile as e:
                f["unzip_error"] = str(e)
        time.sleep(1)
    return rec


def main():
    out = sys.argv[1]
    names = [a for a in sys.argv[2:] if not a.startswith("--")]
    download = "--no-download" not in sys.argv
    os.makedirs(out, exist_ok=True)
    cli = Client()
    results = []
    for s in names:
        try:
            rec = fetch_school(cli, s, out, download)
        except Exception as e:  # noqa: BLE001 - 학교별 실패를 기록하고 계속
            rec = {"query": s, "error": f"{type(e).__name__}: {e}"}
        results.append(rec)
        files = rec.get("files", [])
        print(f"{s:<16} name={rec.get('school_name')} files={len(files)} err={rec.get('error')}")
        for f in files:
            print(f"    {f.get('sniff','-'):<14} {f.get('bytes',0)//1024:>6}KB {f.get('filename', f['label'])}"
                  + (f"  unzip={len(f['unzipped'])}" if f.get("unzipped") else ""))
        time.sleep(2)
    with open(os.path.join(out, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(results, fh, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
