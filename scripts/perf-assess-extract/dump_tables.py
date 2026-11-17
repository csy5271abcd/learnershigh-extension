"""모든 파일의 표를 한 번만 뽑아 JSONL 캐시로 저장 (규칙 반복 실험용).

사용: python dump_tables.py OUT.jsonl DL_DIR [DL_DIR ...]
줄마다: {school, file, kind, ti, page, ctx, grid} / 파일 오류는 {school, file, kind, error}
"""
import json
import os
import sys
from multiprocessing import Pool

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tables  # noqa: E402


def kind_of(path):
    with open(path, "rb") as f:
        b = f.read(8)
    ext = path.lower().rsplit(".", 1)[-1]
    if b[:4] == b"%PDF":
        return "pdf"
    if b[:8] == bytes.fromhex("d0cf11e0a1b11ae1") and ext == "hwp":
        return "hwp"
    if b[:4] == b"PK\x03\x04" and ext == "hwpx":
        return "hwpx"
    if ext in ("hwp", "hwpx", "pdf", "doc", "docx", "xls", "xlsx", "jpg", "png"):
        return "other-" + ext
    return None


def work(args):
    root, path = args
    rel = os.path.relpath(path, root)
    base = {"src": os.path.basename(root), "school": rel.split(os.sep)[0], "file": rel}
    k = kind_of(path)
    base["kind"] = k
    if not k or k.startswith("other"):
        return [dict(base, error="unsupported format")]
    try:
        out = []
        for i, t in enumerate(tables.tables_of(path, k)):
            out.append(dict(base, ti=i, page=t["page"], ctx=t.get("ctx", ""), grid=tables.grid(t)))
        if not out:
            out.append(dict(base, error="no tables"))
        return out
    except Exception as e:  # noqa: BLE001
        return [dict(base, error=f"{type(e).__name__}: {e}")]


def main():
    out = sys.argv[1]
    jobs = []
    for root in sys.argv[2:]:
        for dp, _, fs in os.walk(root):
            for fn in fs:
                p = os.path.join(dp, fn)
                if fn.endswith(".json") or fn.lower().endswith(".zip") or "성적관리" in fn.replace(" ", ""):
                    continue
                if kind_of(p) is None:
                    continue
                jobs.append((root, p))
    with Pool(4) as pool, open(out, "w", encoding="utf-8") as f:
        for n, rows in enumerate(pool.imap_unordered(work, jobs, chunksize=1), 1):
            for r in rows:
                line = json.dumps(r, ensure_ascii=False)
                f.write(line.encode("utf-8", "replace").decode("utf-8") + "\n")
            if n % 25 == 0:
                print(f"{n}/{len(jobs)}", flush=True)
    print("done", len(jobs))


if __name__ == "__main__":
    main()
