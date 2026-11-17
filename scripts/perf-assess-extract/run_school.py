"""학교 하나를 끝까지 돌려 과목 목록과 상태 메시지를 낸다 (학교 검색 → 파일 받기 → 표 추출 → 과목 목록).

사용: python run_school.py OUT_DIR 학교명|id:<학교알리미ID> [...] [--semester 2]
결과: OUT_DIR/<학교>.result.json + 화면 출력

학교 단위 상태 (status)
  OK       과목 목록을 만들었다 (과목별 경고는 따로)
  PARTIAL  목록은 만들었지만 일부 파일을 못 읽었다 (스캔본 등)
  ERROR    목록을 만들 수 없다 — messages[].code 참고
메시지 코드
  SCHOOL_NOT_FOUND      학교알리미에서 학교를 찾지 못함
  SCHOOL_AMBIGUOUS      같은 이름 학교가 여러 곳 — 첫 번째로 진행 (주소로 다시 확인 필요)
  PLAN_NOT_PUBLISHED    평가계획 공시 항목 또는 첨부 파일 없음
  DOWNLOAD_FAILED       재시도 후에도 받기 실패
  SEMESTER_MISSING      요청 학기 자료가 없음 (예: 1학기 자료만 공시)
  SCANNED_FILE          글자가 없는 스캔본 파일이고 OCR로도 과목을 못 찾음 — 캡처 업로드·직접 입력 필요
  OCR_USED              스캔본을 Windows 내장 OCR(한국어)로 읽어 과목을 찾음 — 과목명 확인 필요 (NO_OCR=1이면 끔)
  UNREADABLE_FILE       지원하지 않는 형식이거나 열 수 없는 파일
  NO_SUBJECTS           파일은 읽었지만 과목을 찾지 못함
  FILE_NO_SUBJECTS      표가 있는데 과목을 하나도 못 찾은 파일 — 빠진 과목이 있을 수 있음
  TOC_MISSING           목차에는 있는데 결과에 없는 과목 (이름을 함께 보여 줌)
과목 단위 경고 (subjects[].warnings)
  NAME_CHECK            과목 사전에 없는 이름이고 근거가 약함 — 과목명 확인 필요
"""
import json
import os
import re
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dump_tables  # noqa: E402
import fetch_plan  # noqa: E402
import subjlist2 as SL  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
DICT_PATH = os.path.join(HERE, "subject_dictionary.json")
TEXT = {
    "SCHOOL_NOT_FOUND": "학교를 찾을 수 없습니다. 학교 이름을 확인해 주세요.",
    "SCHOOL_AMBIGUOUS": "같은 이름의 학교가 {n}곳 있어 첫 번째 학교로 진행했습니다. 주소를 확인해 주세요.",
    "PLAN_NOT_PUBLISHED": "학교알리미에 평가계획이 공시되지 않았습니다. 직접 입력하거나 캡처를 올려 주세요.",
    "DOWNLOAD_FAILED": "평가계획 파일을 받지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
    "SEMESTER_MISSING": "{sem}학기 평가계획이 공시되지 않았습니다 (공시된 자료: {have}). 직접 입력하거나 캡처를 올려 주세요.",
    "SCANNED_FILE": "글자를 읽을 수 없는 스캔 파일입니다: {file}. 캡처를 올리거나 직접 입력해 주세요.",
    "UNREADABLE_FILE": "읽을 수 없는 파일입니다: {file}",
    "NO_SUBJECTS": "파일은 받았지만 과목을 찾지 못했습니다. 직접 입력해 주세요.",
    "FILE_NO_SUBJECTS": "과목을 하나도 찾지 못한 파일이 {n}개 있습니다 ({files}). 빠진 과목이 있을 수 있으니 확인해 주세요.",
    "TOC_MISSING": "목차에는 있지만 찾지 못한 과목 {n}개: {names}. 추가해 주세요.",
    "NAME_CHECK": "과목명 확인 필요",
    "OCR_USED": "스캔 파일을 OCR로 읽어 과목 {n}개를 찾았습니다: {file}. OCR 결과라 과목명을 확인해 주세요.",
}
USE_OCR = os.environ.get("NO_OCR") != "1"


def msg(code, level, **kw):
    return {"code": code, "level": level, "text": TEXT[code].format(**kw)}


def semester_of(name, first_text):
    s = name + " " + first_text[:400]
    has1 = bool(re.search(r"1\s*학기", s)); has2 = bool(re.search(r"2\s*학기", s))
    return {1} if has1 and not has2 else {2} if has2 and not has1 else {1, 2} if has1 and has2 else set()


def first_text(path, kind):
    if kind == "pdf":
        import pymupdf
        d = pymupdf.open(path)
        return "".join(d[i].get_text() for i in range(min(2, len(d))))
    return ""


OCR_PS = os.path.join(HERE, "ocr_win.ps1")


def ocr_images(paths):
    """Windows 내장 OCR(한국어)로 이미지들을 읽어 {경로: 글자} 반환. Windows가 아니거나 실패하면 빈 dict."""
    import subprocess
    if os.name != "nt" or not paths:
        return {}
    out = {}
    for i in range(0, len(paths), 25):
        chunk = paths[i:i + 25]
        try:
            r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", OCR_PS, *chunk],
                               capture_output=True, timeout=600)
        except (OSError, subprocess.TimeoutExpired):
            return out
        cur = None
        for line in r.stdout.decode("utf-8", "replace").splitlines():
            if line.startswith("===FILE "):
                cur = line[8:].strip(); out[cur] = []
            elif cur:
                out[cur].append(line)
    return {k: "\n".join(v) for k, v in out.items()}


def ocr_pdf_text(path, tmpdir):
    """스캔 PDF 쪽마다 그림으로 바꿔 OCR. 쪽별 글자 목록."""
    import pymupdf
    d = pymupdf.open(path)
    imgs = []
    for i in range(len(d)):
        p = os.path.join(tmpdir, f"p{i:04d}.png")
        d[i].get_pixmap(matrix=pymupdf.Matrix(2, 2)).save(p)
        imgs.append(p)
    got = ocr_images(imgs)
    return [got.get(p, "") for p in imgs]


def ocr_subjects(page_texts, sc, dic):
    """OCR 글자에서 과목 제목을 찾는다. OCR 오인식('2'→'기')은 사전에 있으면 고친다."""
    found = {}
    for t in page_texts:
        t = re.sub(r"[\[\]{}|]", " ", t)
        for v in SL.titles_in(re.sub(r"\s+", " ", t)):
            v = SL.ok_name(v, sc)
            if not v:
                continue
            if v.endswith("기") and SL.skey(v[:-1] + "2") in dic:
                v = v[:-1] + "2"
            found.setdefault(SL.skey(v), v)
    return found


def is_scanned(path):
    import pymupdf
    d = pymupdf.open(path)
    n = min(len(d), 10)
    return n > 0 and sum(len(d[i].get_text().strip()) for i in range(n)) < 30 * n


def run(cli, query, out, semester=2):
    res = {"query": query, "status": "ERROR", "messages": [], "subjects": [], "files": []}
    try:
        rec = fetch_plan.fetch_school(cli, query, out, True)
    except Exception as e:  # noqa: BLE001
        res["messages"].append(msg("DOWNLOAD_FAILED", "error")); res["detail"] = f"{type(e).__name__}: {e}"
        return res
    res["school"] = rec.get("school_name")
    hits = rec.get("steps", {}).get("search", {}).get("hits", 1)
    if rec.get("error") == "no search hit":
        res["messages"].append(msg("SCHOOL_NOT_FOUND", "error")); return res
    if hits and hits > 1:
        res["messages"].append(msg("SCHOOL_AMBIGUOUS", "warning", n=hits))
    if rec.get("error") or not rec.get("files"):
        res["messages"].append(msg("PLAN_NOT_PUBLISHED", "error")); return res
    if any(f.get("status") not in (None, 200) for f in rec["files"]) or not any(f.get("path") for f in rec["files"]):
        res["messages"].append(msg("DOWNLOAD_FAILED", "error")); return res

    sdir = os.path.dirname(rec["files"][0]["path"])
    jobs = []
    for dp, _, fs in os.walk(sdir):
        for fn in fs:
            p = os.path.join(dp, fn)
            if fn.lower().endswith((".zip", ".json")) or re.search(r"성적관리|규정", fn.replace(" ", "")):   # r5: 제규정집·평가규정 등 평가계획이 아닌 파일 제외
                continue
            k = dump_tables.kind_of(p)
            if k:
                jobs.append((p, k))
    # 학기 판단을 먼저: 다른 학기 자료만 있으면 스캔 여부와 관계없이 학기 없음
    sems_by = {p: semester_of(os.path.basename(p), first_text(p, k) if k == "pdf" and not is_scanned(p) else "") for p, k in jobs}
    sems = set().union(*sems_by.values()) if sems_by else set()
    if sems and semester not in sems:
        res["messages"].append(msg("SEMESTER_MISSING", "error", sem=semester, have=", ".join(f"{x}학기" for x in sorted(sems))))
        return res
    use, scanned = [], []
    for p, k in jobs:
        name = os.path.basename(p)
        if sems_by[p] and semester not in sems_by[p]:
            res["files"].append({"file": name, "state": "other-semester"}); continue
        if k.startswith("other"):
            res["messages"].append(msg("UNREADABLE_FILE", "warning", file=name)); continue
        if k == "pdf" and is_scanned(p):
            scanned.append(p); res["files"].append({"file": name, "state": "scanned"}); continue
        use.append((p, k))
        res["files"].append({"file": name, "state": "read"})
    dic = set(json.load(open(DICT_PATH, encoding="utf-8"))) if os.path.exists(DICT_PATH) else set()
    ocr_found = {}
    for p in scanned:
        name = os.path.basename(p)
        found = {}
        if USE_OCR:
            with tempfile.TemporaryDirectory() as td:
                found = ocr_subjects(ocr_pdf_text(p, td), res.get("school") or query, dic)
        if found:
            res["messages"].append(msg("OCR_USED", "warning", file=name, n=len(found)))
            for k, v in found.items():
                ocr_found.setdefault(k, {"name": v, "files": set()})["files"].add(name)
        else:
            res["messages"].append(msg("SCANNED_FILE", "warning", file=name))
    if not use and not ocr_found:
        scanned_msgs = [m for m in res["messages"] if m["code"] == "SCANNED_FILE"]
        if scanned_msgs:
            for m in scanned_msgs:
                m["level"] = "error"   # 읽을 파일이 하나도 없으면 스캔본이 곧 실패 원인
        else:
            res["messages"].append(msg("NO_SUBJECTS", "error"))
        return res
    if not use:
        for k, e in sorted(ocr_found.items(), key=lambda kv: kv[1]["name"]):
            res["subjects"].append({"name": e["name"], "evidence": ["O"], "files": sorted(e["files"]),
                                    "warnings": [{"code": "NAME_CHECK", "text": TEXT["NAME_CHECK"] + " (OCR)"}]})
        res["status"] = "PARTIAL"
        return res

    root = os.path.dirname(sdir)
    n_tables, ctx_by_file = {}, {}
    with tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False, encoding="utf-8") as tf:
        for p, k in use:
            fname = os.path.basename(p)
            for row in dump_tables.work((root, p)):
                tf.write(json.dumps(row, ensure_ascii=False).encode("utf-8", "replace").decode("utf-8") + "\n")
                if "grid" in row:
                    n_tables[fname] = n_tables.get(fname, 0) + 1
                    if n_tables[fname] <= 5:
                        ctx_by_file.setdefault(fname, []).append(row.get("ctx") or "")
        tpath = tf.name
    built = SL.build([tpath], schools=None, dic=dic or None)
    os.unlink(tpath)
    entries = next(iter(built.values()), {}) if built else {}
    for k, e in sorted(entries.items(), key=lambda kv: kv[1]["name"]):
        warn = []
        if dic and k not in dic and not (e["how"] & {"A", "S"}):
            warn.append({"code": "NAME_CHECK", "text": TEXT["NAME_CHECK"]})
        res["subjects"].append({"name": e["name"], "evidence": sorted(e["how"]), "files": sorted(e["files"]), "warnings": warn})
    have = set(entries)
    for k, e in sorted(ocr_found.items(), key=lambda kv: kv[1]["name"]):   # 스캔 파일에서만 나온 과목
        if k not in have:
            res["subjects"].append({"name": e["name"], "evidence": ["O"], "files": sorted(e["files"]),
                                    "warnings": [{"code": "NAME_CHECK", "text": TEXT["NAME_CHECK"] + " (OCR)"}]})
    if not res["subjects"]:
        res["messages"].append(msg("NO_SUBJECTS", "error")); return res
    res["messages"] += missing_checks(use, res["subjects"], n_tables, ctx_by_file, sc=res.get("school") or query)
    res["status"] = "PARTIAL" if any(m["code"] in ("SCANNED_FILE", "UNREADABLE_FILE", "OCR_USED") for m in res["messages"]) else "OK"
    return res


TOC_LINE = re.compile(r"(?:^|\s)\d{1,2}\s*[.)]\s*([가-힣][^·…\n]{1,26}?)\s*[·…\.]{2,}\s*\d{1,3}(?=\s|$)")


def toc_subjects(texts, sc):
    """목차('1. 공통국어2 …… 3')에서 과목 이름. 줄 5개 이상이고 절반 이상이 과목 이름처럼 보일 때만."""
    out = []
    for t in texts:
        names = [SL.ok_name(m.group(1), sc) for m in TOC_LINE.finditer(t)]
        good = [n for n in names if n]
        if len(names) >= 5 and len(good) >= 0.5 * len(names):
            out += good
    return list(dict.fromkeys(out))


def missing_checks(use, subjects, n_tables, ctx_by_file, sc):
    """과목이 빠졌을 수 있는 신호: 과목을 하나도 못 찾은 파일, 목차에는 있는데 결과에 없는 과목."""
    import difflib
    out = []
    found_in = {}
    for s in subjects:
        for f in s["files"]:
            found_in[f] = found_in.get(f, 0) + 1
    empty = [f for f, n in n_tables.items() if n >= 3 and not found_in.get(f)]
    if empty:
        out.append(msg("FILE_NO_SUBJECTS", "warning", n=len(empty), files=", ".join(empty[:3]) + (" 외" if len(empty) > 3 else "")))
    texts = []
    for p, k in use:
        if k == "pdf":
            import pymupdf
            d = pymupdf.open(p)
            texts += [d[i].get_text() for i in range(min(4, len(d)))]
        texts += ctx_by_file.get(os.path.basename(p), [])
    toc = toc_subjects([re.sub(r"[ \t]+", " ", t) for t in texts], sc)
    have = [SL.skey(s["name"]) for s in subjects]
    sim = lambda a, b: a in b or b in a or difflib.SequenceMatcher(None, a, b).ratio() >= 0.75
    miss = [n for n in toc if not any(sim(SL.skey(n), h) for h in have)]
    if miss:
        out.append(msg("TOC_MISSING", "warning", n=len(miss), names=", ".join(miss[:8]) + (" 외" if len(miss) > 8 else "")))
    return out


def show(r):
    print(f"■ {r['query']} → {r.get('school') or '-'}  [{r['status']}]  과목 {len(r['subjects'])}개")
    for m in r["messages"]:
        print(f"   {'오류' if m['level'] == 'error' else '주의'} {m['code']}: {m['text']}")
    flagged = [s for s in r["subjects"] if s["warnings"]]
    if flagged:
        print("   과목명 확인 필요:", ", ".join(s["name"] for s in flagged))


def main():
    args = [a for a in sys.argv[1:]]
    sem = 2
    if "--semester" in args:
        i = args.index("--semester"); sem = int(args[i + 1]); del args[i:i + 2]
    out, queries = args[0], args[1:]
    os.makedirs(out, exist_ok=True)
    cli = fetch_plan.Client()
    for q in queries:
        r = run(cli, q, out, sem)
        name = re.sub(r"[\\/:*?\"<>|]", "_", r.get("school") or q)
        json.dump(r, open(os.path.join(out, name + ".result.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        show(r)


if __name__ == "__main__":
    main()
