"""계정 A 임시 변환기 (계정 B Adapter 아님): v21.1 분석기의 HWPX 결과 → 다중 형식 초안 AnalysisImportRequest.
- 계정 B 모듈은 수정 없이 import만 한다(-I -B). 값·구조는 B Adapter의 shapePreview를 그대로 쓰고,
  비어 있는 sources만 B 분석 결과의 Locator id → B DocumentModel의 실제 locator 객체·원문으로 채운다.
- 값을 만들거나 고치지 않는다. 근거 Locator가 없는 값은 그대로 두고(서버가 evidence_required로 거절하면 그대로 기록).
usage: python -I -B draft_hwpx_payload.py <B_root> <hwpx> <work_dir> <out.json>
"""
import json
import os
import sys

b_root, path, work, out = sys.argv[1:5]
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.join(b_root, "tools"))
from llmprep import analysis_result as AR, backend_adapter as BA  # noqa: E402

res, doc = AR.analyze_file(path, "SYNHWPX01", work)
shape = BA.to_import_request(res, doc)["shapePreview"]

# DocumentModel의 locator 객체·글 (id → (locator, text))
index = {}


def walk(node):
    if isinstance(node, dict):
        loc = node.get("locator")
        if isinstance(loc, dict) and loc.get("id"):
            text = node.get("text")
            if text is None and node.get("paragraphs"):
                text = "\n".join(p.get("text", "") for p in node["paragraphs"])
            index.setdefault(loc["id"], (loc, text))
        for value in node.values():
            walk(value)
    elif isinstance(node, list):
        for value in node:
            walk(value)


walk(doc["blocks"])
KEEP = ("kind", "section", "path", "table", "row", "col", "rowSpan", "colSpan", "control", "cell")


def source(loc_id):
    if loc_id not in index:
        return None
    loc, text = index[loc_id]
    out = {"documentLocator": {k: loc[k] for k in KEEP if loc.get(k) is not None}}
    if text:
        out["extractedText"] = text[:2000]
    return out


def ids_of(assessment, fields):
    found = []
    if assessment.get("sources", [{}])[0].get("nameLocator"):
        found.append(assessment["sources"][0]["nameLocator"])
    for field in fields:
        for value in (assessment.get(field) or {}).get("values", []):
            if value.get("locator"):
                found.append(value["locator"])
    return found


def sources(ids):
    seen, result = set(), []
    for loc_id in ids:
        item = source(loc_id)
        if item and loc_id not in seen:
            seen.add(loc_id)
            result.append(item)
    return result[:20]


assessments = {a["key"]: a for s in res["segments"] for a in s["assessments"]}
for subject in shape["subjects"]:
    subject.pop("pageRange", None)  # HWPX에는 쪽 범위가 없다
    written, performance = subject.get("writtenEvaluation"), subject.get("performanceEvaluation")
    for exam in (written or {}).get("exams", []):
        exam["sources"] = sources(ids_of(assessments[exam["itemKey"]], ("weight", "maxScore", "timing")))
    group_ids = []
    for item in (performance or {}).get("items", []):
        a = assessments[item["itemKey"]]
        item["sources"] = sources(ids_of(a, ("weight", "maxScore", "timing")))
        for g in a.get("groupValues") or []:
            for value in (g.get("values") or [g]) if isinstance(g, dict) else []:
                if isinstance(value, dict) and value.get("locator"):
                    group_ids.append(value["locator"])
        # 채점 요소별 칸 Locator는 이 변환기가 만들지 않는다(빈 배열 유지 — 실제 근거가 아닌 연결을 만들지 않음).
    if performance is not None:
        performance["sources"] = sources(group_ids)
shape["source"] = {"sha256": res["source"]["sha256"], "format": "HWPX"}
shape["analyzer"]["version"] = shape["analyzer"]["version"] + "+a-draft"
with open(out, "w", encoding="utf-8") as f:
    json.dump(shape, f, ensure_ascii=False, indent=1)
print(json.dumps({"sha256": res["source"]["sha256"], "format": res["source"]["format"], "indexSize": len(index),
                  "exams": [(e["itemKey"], len(e["sources"])) for s in shape["subjects"] for e in (s.get("writtenEvaluation") or {}).get("exams", [])],
                  "items": [(i["itemKey"], len(i["sources"])) for s in shape["subjects"] for i in (s.get("performanceEvaluation") or {}).get("items", [])],
                  "groupSources": [len((s.get("performanceEvaluation") or {}).get("sources", [])) for s in shape["subjects"]]}, ensure_ascii=False))
