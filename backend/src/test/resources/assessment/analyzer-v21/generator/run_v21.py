"""계정 B v21 파이프라인을 수정 없이 호출하되, 작업·출력 폴더를 계정 A scratchpad로 돌린다.
analyze_file.py의 main()과 같은 순서(AR.analyze_file → BA.to_import_request)를 따르고, 차이는 WORK/OUT 경로뿐이다.
usage: python -I -B run_v21.py <B_root> <pdf> <work_dir> <out_dir> <file_id>
"""
import json, os, sys

b_root, pdf, work, out, fid = sys.argv[1:6]
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.join(b_root, "tools"))
from llmprep import analysis_result as AR, backend_adapter as BA  # noqa: E402

res, doc = AR.analyze_file(pdf, fid, work)
bi = BA.to_import_request(res, doc) if doc is not None else BA.to_import_request({**res, "segments": []}, None)
os.makedirs(out, exist_ok=True)
for name, obj in (("analysis", res), ("backend-import", {k: v for k, v in bi.items() if k != "gaps"}),
                  ("contract-gaps", {"adapter": BA.VERSION, "contract": BA.CONTRACT, "summary": BA.gap_summary(bi["gaps"]), "gaps": bi["gaps"]})):
    with open(os.path.join(out, f"{fid}.{name}.json"), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
segs = res.get("segments") or []
print(json.dumps({"status": res["status"], "statusReasons": res.get("statusReasons"), "source": res["source"],
                  "segments": [{"id": s["segmentId"], "status": s["status"], "subject": (s.get("context") or {}).get("subject"),
                                "assessments": [(x["key"], x["kind"], x["name"]) for x in s["assessments"]]} for s in segs],
                  "importable": bi["importable"], "blockers": bi["blockers"], "localValidation": bi.get("localValidation"),
                  "gaps": BA.gap_summary(bi["gaps"])}, ensure_ascii=False, indent=1))
