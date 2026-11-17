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
  SCANNED_FILE          글자가 없는 스캔본 파일 — 캡처 업로드·직접 입력 필요
  UNREADABLE_FILE       지원하지 않는 형식이거나 열 수 없는 파일
  NO_SUBJECTS           파일은 읽었지만 과목을 찾지 못함
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
    "NAME_CHECK": "과목명 확인 필요",
}


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
            if fn.lower().endswith((".zip", ".json")) or "성적관리" in fn.replace(" ", ""):
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
    use = []
    for p, k in jobs:
        name = os.path.basename(p)
        if sems_by[p] and semester not in sems_by[p]:
            res["files"].append({"file": name, "state": "other-semester"}); continue
        if k.startswith("other"):
            res["messages"].append(msg("UNREADABLE_FILE", "warning", file=name)); continue
        if k == "pdf" and is_scanned(p):
            res["messages"].append(msg("SCANNED_FILE", "warning", file=name)); res["files"].append({"file": name, "state": "scanned"}); continue
        use.append((p, k))
        res["files"].append({"file": name, "state": "read"})
    if not use:
        scanned = [m for m in res["messages"] if m["code"] == "SCANNED_FILE"]
        if scanned:
            for m in scanned:
                m["level"] = "error"   # 읽을 파일이 하나도 없으면 스캔본이 곧 실패 원인
        else:
            res["messages"].append(msg("NO_SUBJECTS", "error"))
        return res

    root = os.path.dirname(sdir)
    with tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False, encoding="utf-8") as tf:
        for p, k in use:
            for row in dump_tables.work((root, p)):
                tf.write(json.dumps(row, ensure_ascii=False).encode("utf-8", "replace").decode("utf-8") + "\n")
        tpath = tf.name
    dic = set(json.load(open(DICT_PATH, encoding="utf-8"))) if os.path.exists(DICT_PATH) else set()
    built = SL.build([tpath], schools=None, dic=dic or None)
    os.unlink(tpath)
    entries = next(iter(built.values()), {}) if built else {}
    for k, e in sorted(entries.items(), key=lambda kv: kv[1]["name"]):
        warn = []
        if dic and k not in dic and not (e["how"] & {"A", "S"}):
            warn.append({"code": "NAME_CHECK", "text": TEXT["NAME_CHECK"]})
        res["subjects"].append({"name": e["name"], "evidence": sorted(e["how"]), "files": sorted(e["files"]), "warnings": warn})
    if not res["subjects"]:
        res["messages"].append(msg("NO_SUBJECTS", "error")); return res
    res["status"] = "PARTIAL" if any(m["code"] in ("SCANNED_FILE", "UNREADABLE_FILE") for m in res["messages"]) else "OK"
    return res


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
