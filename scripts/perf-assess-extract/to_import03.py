"""학교 결과(run_school.py 의 *.result.json)를 수연님 평가계획 import 계약(analysis-import 0.3)으로 바꾼다.

수연님 흐름: 관리자가 평가계획 파일(학교·학년·학기)을 올리면 → 분석 결과를 analysis-import JSON 으로 받고 → 관리자가 검토·확정.
이 변환기는 그 '분석 결과' 자리에 들어갈 JSON 을 파일마다 만든다. 서비스 코드(Backend)는 바꾸지 않는다.

계약 요점 (backend .../dto/plan/AnalysisImportRequest.java, service/plan/AnalysisImportValidator.java)
  - source: 파일 sha256, PDF 쪽 수
  - 숫자(비율·만점·수준 점수)마다 원문 근거(sources) 필수. PDF 는 pdfPageNumber(1~쪽 수)
  - 과목 40개, 수행 항목 50개, 채점 요소 30개, 수준 10개 이하
  - HWP·HWPX 근거는 documentLocator(구역·문단 경로·표 칸)가 필요하다. 지금 표 추출은 그 경로를 남기지 않아 PDF 만 만든다.

사용: python to_import03.py RESULT_JSON SCHOOL_DIR OUT_DIR
출력: OUT_DIR/<파일명>.analysis-import.json  (+ 계약 규칙 자체 점검 결과를 화면에)
"""
import glob
import hashlib
import json
import os
import re
import sys

LIMITS = {"subjects": 40, "items": 50, "rubric": 30, "levels": 10}


def loc(page, text):
    return {"pdfPageNumber": int(page), "printedPageLabel": None, "extractedText": (text or "")[:2000]}


def num_text(v, unit="%"):
    return f"{v:g}{unit}" if isinstance(v, (int, float)) else str(v)


def page_of(source):
    m = re.search(r"p\.(\d+)", source or "")
    return int(m.group(1)) if m else None


def convert_file(res, fname, path):
    import pymupdf
    raw = open(path, "rb").read()
    doc = pymupdf.open(path)
    out = {"contractVersion": "0.3",
           "analyzer": {"name": "perf-assess-extract", "version": "r16", "profile": "rule-tables"},
           "source": {"sha256": hashlib.sha256(raw).hexdigest(), "pageCount": len(doc)},   # PDF 는 format 을 보내지 않는다 (다중 형식 실험이 꺼져 있으면 unknown_field)
           "status": "REVIEW_REQUIRED", "subjects": [], "warnings": []}
    for s in res["subjects"]:
        ev = s.get("evaluation")
        if not ev or not ev["source"].startswith(fname + " p."):
            continue
        p = page_of(ev["source"])
        if not p:
            continue
        subj = {"subjectName": s["name"][:100], "sources": [loc(p, s["name"])]}
        pages = [p]
        if ev.get("examPercent") is not None:
            subj["writtenEvaluation"] = {"weightPercent": ev["examPercent"], "sources": [loc(p, num_text(ev["examPercent"]))], "exams": []}
        perf = {"weightPercent": ev.get("performancePercent"), "sources": [loc(p, num_text(ev.get("performancePercent")))] if ev.get("performancePercent") is not None else [], "items": []}
        for k, it in enumerate(ev.get("items") or [], 1):
            d = it.get("detail") or {}
            refs = [r for r in d.get("sourceRefs") or [] if r.get("page")]
            rp = next((r["page"] for r in refs if r.get("hasRubric")), refs[0]["page"] if refs else p)
            pages += [r["page"] for r in refs]
            item = {"itemKey": f"P{k:02d}", "label": (it.get("name") or f"수행 {k}")[:200],
                    "timing": ((d.get("task") or {}).get("timing") or None),
                    "weightPercent": it.get("weightPercent"),
                    "maxScore": it.get("maxScore") or (d.get("task") or {}).get("maxScore"),
                    "content": ((d.get("task") or {}).get("description") or None),
                    "sources": [loc(p, it.get("name"))] + ([loc(rp, num_text(it.get("maxScore") or (d.get("task") or {}).get("maxScore"), "점"))] if rp != p else []),
                    "rubric": []}
            if item["timing"]:
                item["timing"] = item["timing"][:100]
            if item["content"]:
                item["content"] = item["content"][:4000]
            if item["maxScore"] is not None and item["maxScore"] <= 0:
                item["maxScore"] = None
            for e in (d.get("rubric") or [])[:LIMITS["rubric"]]:
                levels = [{"description": (lv.get("description") or (f"{lv['level']}" if lv.get("level") else "") or f"{lv['score']:g}점")[:1000],
                           "score": lv.get("score")} for lv in e["levels"][:LIMITS["levels"]]]
                crit = {"element": (e["element"] or "채점 기준")[:300], "levels": levels, "sources": [loc(rp, e["element"])]}
                if e.get("maxScore") is not None:
                    crit["maxScore"] = e["maxScore"]
                item["rubric"].append(crit)
            perf["items"].append({k2: v for k2, v in item.items() if v is not None})
        perf["items"] = perf["items"][:LIMITS["items"]]
        subj["performanceEvaluation"] = perf
        subj["pageRange"] = {"from": min(pages), "to": max(pages)}
        out["subjects"].append(subj)
    return out


def check(payload):
    """계약 규칙 자체 점검 (Backend Validator 의 주요 규칙을 옮김). 반환: 위반 목록"""
    errs = []
    pc = payload["source"]["pageCount"]
    subs = payload["subjects"]
    if not subs:
        errs.append("subjects: required")
    if len(subs) > LIMITS["subjects"]:
        errs.append(f"subjects: size {len(subs)} > {LIMITS['subjects']}")
    names = {}
    for i, s in enumerate(subs):
        path = f"subjects[{i}]"
        if s["subjectName"].strip() in names:
            errs.append(f"{path}.subjectName: duplicate ({s['subjectName']})")
        names[s["subjectName"].strip()] = 1
        rng = s.get("pageRange")
        locs = []

        def need(at, has_num, sources):
            if has_num and not sources:
                errs.append(f"{at}.sources: evidence_required")
            locs.extend((at, x) for x in sources or [])
        w = s.get("writtenEvaluation")
        if w:
            need(f"{path}.writtenEvaluation", w.get("weightPercent") is not None, w.get("sources"))
        pe = s.get("performanceEvaluation") or {}
        need(f"{path}.performanceEvaluation", pe.get("weightPercent") is not None, pe.get("sources"))
        keys = set()
        for j, it in enumerate(pe.get("items") or []):
            at = f"{path}.performanceEvaluation.items[{j}]"
            if it["itemKey"] in keys:
                errs.append(f"{at}.itemKey: duplicate")
            keys.add(it["itemKey"])
            if not it.get("label", "").strip():
                errs.append(f"{at}.label: blank")
            need(at, it.get("weightPercent") is not None or it.get("maxScore") is not None, it.get("sources"))
            for r, c in enumerate(it.get("rubric") or []):
                scored = any(lv.get("score") is not None for lv in c["levels"])
                if scored and not c.get("sources") and not it.get("sources"):
                    errs.append(f"{at}.rubric[{r}].sources: evidence_required")
                if not c["element"].strip():
                    errs.append(f"{at}.rubric[{r}].element: blank")
                for lv in c["levels"]:
                    if not lv["description"].strip():
                        errs.append(f"{at}.rubric[{r}].levels.description: blank")
                    if lv.get("score") is not None and lv["score"] < 0:
                        errs.append(f"{at}.rubric[{r}].levels.score: negative")
                locs.extend((f"{at}.rubric[{r}]", x) for x in c.get("sources") or [])
        if rng and (rng["from"] > rng["to"] or rng["to"] > pc):
            errs.append(f"{path}.pageRange: out_of_range")
        for at, x in locs:   # 지필·수행·항목·채점 기준 근거는 문서 쪽 수 안, 과목 쪽 범위(pageRange) 안
            pg = x["pdfPageNumber"]
            if pg < 1 or pg > pc or (rng and (pg < rng["from"] or pg > rng["to"])):
                errs.append(f"{at}.pdfPageNumber: out_of_range ({pg})")
    return errs


def main():
    res_path, school_dir, out_dir = sys.argv[1:4]
    res = json.load(open(res_path, encoding="utf-8"))
    os.makedirs(out_dir, exist_ok=True)
    files = {os.path.basename(p): p for p in glob.glob(os.path.join(school_dir, "**", "*"), recursive=True)}
    used = sorted({(s.get("evaluation") or {}).get("source", "").split(" p.")[0] for s in res["subjects"] if s.get("evaluation")})
    report = []
    for fname in used:
        path = files.get(fname)
        if not path:
            continue
        if not fname.lower().endswith(".pdf"):
            report.append((fname, "건너뜀", ["HWP·HWPX: documentLocator(구역·문단 경로) 미지원"]))
            continue
        payload = convert_file(res, fname, path)
        errs = check(payload)
        json.dump(payload, open(os.path.join(out_dir, fname + ".analysis-import.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        report.append((fname, f"과목 {len(payload['subjects'])}", errs))
    for fname, what, errs in report:
        print(f"{fname[:50]} | {what} | 위반 {len(errs)}" + ("" if not errs else " | " + "; ".join(errs[:3])))


if __name__ == "__main__":
    main()
