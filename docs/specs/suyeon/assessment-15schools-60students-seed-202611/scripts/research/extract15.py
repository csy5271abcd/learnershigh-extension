"""15개교 2026 평가계획서 텍스트 추출 (원본 읽기 전용). 페이지/섹션은 \f로 구분. 결과는 scratchpad/text15/에만 저장."""
import hashlib, json, os, re, subprocess, sys, zipfile, zlib, struct, html

ROOT = r"C:\learnershigh-extension\references\curriculum-plan"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "text15")
# 추출 텍스트에는 교사명 등 개인정보가 있을 수 있다 → 저장소 안에서는 실행하지 않는다(README: 저장소 밖 작업 폴더에 복사해 실행).
if "learnershigh-extension" in os.path.abspath(OUT).replace("\\", "/").split("/"):
    sys.exit("저장소 밖 작업 폴더에 복사한 뒤 실행하세요 (추출 텍스트를 저장소에 쓰지 않습니다).")
TOOLS = r"C:\Users\choi suyeon\LearnersHigh-local\curriculum-analysis\tools"
sys.path.insert(0, TOOLS)
from docmodel.hwp5 import Cfb, para_text, PARA_TEXT  # noqa: E402

SCHOOLS = [
    ("unjeong", "운정고", "general-high-school/gyeong-gi/unjeong", "A"),
    ("munhyeon", "문현고", "general-high-school/busan·daegu·daejeon·gwangju·ulsan/munhyeon", "A"),
    ("hoseo", "호서고", "general-high-school/sejong·gang-won·chungbug·chungnam/hoseo", "A"),
    ("haneul", "인천하늘고", "autonomous-private-high-school/haneul", "A"),
    ("sehwa", "세화고", "autonomous-private-high-school/sehwa", "A"),
    ("daeshin", "대신고", "general-high-school/seoul/daeshin", "B"),
    ("hanlim", "한림고", "general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/hanlim", "B"),
    ("jinyang", "진양고", "general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/jinyang", "B"),
    ("samgaksan", "삼각산고", "general-high-school/seoul/samgaksan", "B"),
    ("gajwa", "가좌고", "general-high-school/incheon/gajwa", "B"),
    ("chungmu", "충무고", "general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/chungmu", "C"),
    ("gwangmyeong", "광명고", "general-high-school/gyeong-gi/gwangmyeong", "C"),
    ("sejong", "세종고", "general-high-school/gyeong-gi/sejong", "C"),
    ("hansol", "한솔고", "general-high-school/gyeong-gi/hansol", "C"),
    ("jeju", "제주고", "general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/jeju", "C"),
]
GRADES = {"first-grade": 1, "second-grade": 2, "third-grade": 3}
SEMS = {"first-semester": 1, "second-semester": 2}


def hwp_text(data):
    cfb = Cfb(data)
    hdr = cfb.read("FileHeader")
    props = struct.unpack_from("<I", hdr, 36)[0]
    compressed, password, distribution = bool(props & 1), bool(props & 2), bool(props & 4)
    secs = sorted([p for p in cfb.paths if p.startswith("BodyText/Section")], key=lambda p: int(re.sub(r"\D", "", p) or 0))
    if password or distribution or not secs:
        return cfb.read("PrvText").decode("utf-16le", "replace") if "PrvText" in cfb.paths else ""
    out = []
    for sp in secs:
        raw = cfb.read(sp)
        body = zlib.decompress(raw, -15) if compressed else raw
        o = 0
        while o + 4 <= len(body):
            h = struct.unpack_from("<I", body, o)[0]; o += 4
            tag, size = h & 0x3FF, (h >> 20) & 0xFFF
            if size == 0xFFF:
                size = struct.unpack_from("<I", body, o)[0]; o += 4
            if tag == PARA_TEXT:
                out.append(para_text(body[o:o + size]))
            o += size
        out.append("\f")
    return "\n".join(out)


def hwpx_text(path):
    with zipfile.ZipFile(path) as z:
        secs = sorted([n for n in z.namelist() if re.match(r"Contents/section\d+\.xml$", n)], key=lambda n: int(re.sub(r"\D", "", n)))
        out = []
        for s in secs:
            x = z.read(s).decode("utf-8", "replace")
            x = re.sub(r"</hp:p>", "\n</hp:p>", x)
            out.append("\n".join(html.unescape(re.sub(r"<[^>]+>", "", m)) for m in re.findall(r"<hp:t(?:\s[^>]*)?>(.*?)</hp:t>", x, re.S)))
            out.append("\f")
        return "\n".join(out)


def main():
    os.makedirs(OUT, exist_ok=True)
    index_path = os.path.join(OUT, "index.jsonl")
    done = set()
    if os.path.exists(index_path):
        with open(index_path, encoding="utf-8") as f:
            done = {json.loads(l)["rel"] for l in f if l.strip()}
    only = set(sys.argv[1:])
    with open(index_path, "a", encoding="utf-8") as idx:
        for sid, name, base, branch in SCHOOLS:
            if only and sid not in only:
                continue
            top = os.path.join(ROOT, base, "2026")
            for dp, _, fns in os.walk(top):
                for fn in sorted(fns):
                    full = os.path.join(dp, fn)
                    rel = os.path.relpath(full, ROOT).replace("\\", "/")
                    if rel in done:
                        continue
                    parts = rel.split("/")
                    grade = next((GRADES[p] for p in parts if p in GRADES), None)
                    sem = next((SEMS[p] for p in parts if p in SEMS), None)
                    with open(full, "rb") as fh:
                        data = fh.read()
                    sha = hashlib.sha256(data).hexdigest()
                    magic = "PDF" if data[:4] == b"%PDF" else "HWPX" if data[:2] == b"PK" else "HWP" if data[:4] == b"\xd0\xcf\x11\xe0" else "?"
                    err = None
                    try:
                        if magic == "PDF":
                            text = subprocess.run(["pdftotext", "-enc", "UTF-8", "-layout", full, "-"], capture_output=True, timeout=600).stdout.decode("utf-8", "replace")
                        elif magic == "HWPX":
                            text = hwpx_text(full)
                        elif magic == "HWP":
                            text = hwp_text(data)
                        else:
                            text = ""
                    except Exception as e:  # noqa: BLE001
                        text, err = "", f"{type(e).__name__}: {e}"[:200]
                    del data
                    tid = sha[:16]
                    with open(os.path.join(OUT, tid + ".txt"), "w", encoding="utf-8") as t:
                        t.write(text)
                    rec = dict(rel=rel, schoolId=sid, school=name, branch=branch, grade=grade, semester=sem, fileName=fn,
                               magic=magic, sha256=sha, textId=tid, chars=len(text), pages=text.count("\f") + (1 if text else 0), error=err)
                    idx.write(json.dumps(rec, ensure_ascii=False) + "\n"); idx.flush()
                    print(sid, magic, len(text), err or "", flush=True)


if __name__ == "__main__":
    main()
