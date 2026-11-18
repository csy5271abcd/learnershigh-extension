"""평가계획서 분석기 서버 — Backend 가 부르는 분석기 계약(`POST /analyze-preview`)을 이 추출기로 구현한다.

Backend(HttpPlanAnalyzerClient)가 보내는 것: multipart(file, analyzerVersion, contract, includeAnalysis, fileId) + X-Analysis-Token
돌려주는 것: {status, source.sha256, backendImport{importable, payload=analysis-import 0.3}, warnings, errors, ...}

원문은 이 컴퓨터 안에서만 처리한다(외부 전송 없음). 스캔 PDF 는 OCR(Windows 내장 또는 Tesseract)로 읽는다.

추가 기능 — 학교 이름으로 평가계획서 받기(학교알리미):
  GET /school-plans?name=신원고등학교&semester=2   → {school, files:[{fileName, grade, size, sha256}], messages}
  GET /school-plans/file?name=…&file=…            → 원문 바이트

사용: ANALYZER_TOKEN=<Backend application.yml 의 assessment.analyzer.token> python analyzer_server.py [포트=18768] [작업폴더]
"""
import glob
import hashlib
import json
import os
import re
import sys
import tempfile
import threading
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import fetch_plan  # noqa: E402
import run_school  # noqa: E402
import to_import03  # noqa: E402

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", "18768"))
WORK = sys.argv[2] if len(sys.argv) > 2 else os.path.join(tempfile.gettempdir(), "perf-assess-analyzer")
TOKEN = os.environ.get("ANALYZER_TOKEN", "")
LOCK = threading.Lock()   # 학교알리미 세션·분석은 차례로
VERSION = "perf-assess-extract/r16"


def analyze_bytes(file_name, data):
    """파일 하나를 분석해 analysis-import 0.3 payload 와 경고를 돌려준다."""
    with tempfile.TemporaryDirectory(dir=WORK) as td:
        sdir = os.path.join(td, "school")
        os.makedirs(sdir)
        safe = re.sub(r'[\\/:*?"<>|]', "_", os.path.basename(file_name) or "plan.pdf")
        path = os.path.join(sdir, safe)
        open(path, "wb").write(data)
        orig = fetch_plan.fetch_school
        fetch_plan.fetch_school = lambda cli, q, out, _: {"school_name": "school", "files": [{"path": path, "status": 200}],
                                                         "steps": {"search": {"hits": 1}}}
        try:
            res = run_school.run(None, "school", td)
        finally:
            fetch_plan.fetch_school = orig
        warnings = [m["text"] for m in res.get("messages", [])]
        sha = hashlib.sha256(data).hexdigest()
        if not safe.lower().endswith(".pdf"):
            return None, sha, warnings + ["HWP·HWPX 는 아직 원문 위치(documentLocator)를 만들지 못해 PDF 만 결과를 보냅니다."], res
        payload = to_import03.convert_file(res, safe, path)
        return payload, sha, warnings, res


def envelope(status, sha, payload, warnings, errors=()):
    return {"service": {"name": "perf-assess-extract"}, "requestId": f"pa-{int(time.time() * 1000)}", "ok": True,
            "status": status, "analyzerVersion": VERSION, "analyzerChannel": "DEFAULT", "contractVersion": "0.3",
            "source": {"sha256": sha},
            "backendImport": {"contract": "AnalysisImportRequest", "variant": "OFFICIAL_PDF", "importable": payload is not None,
                              "blockers": [] if payload is not None else [{"code": "FORMAT_NOT_SUPPORTED"}], "payload": payload},
            "warnings": list(warnings), "errors": [{"code": c} for c in errors], "elapsedMs": 0}


def parse_multipart(body, ctype):
    boundary = ("--" + ctype.split("boundary=")[1].strip('"')).encode()
    fields, file_name, data = {}, None, None
    for part in body.split(boundary)[1:]:
        if part.startswith(b"--"):
            break
        head, _, val = part.partition(b"\r\n\r\n")
        val = val[:-2] if val.endswith(b"\r\n") else val
        h = head.decode("utf-8", "replace")
        name = re.search(r'name="([^"]*)"', h)
        fn = re.search(r'filename="([^"]*)"', h)
        if fn:
            file_name, data = fn.group(1), val
        elif name:
            fields[name.group(1)] = val.decode("utf-8", "replace")
    return fields, file_name, data


GRADE = re.compile(r"([1-3])\s*학년")


def grade_of(name):
    m = GRADE.search(name)
    return int(m.group(1)) if m else None


class Handler(BaseHTTPRequestHandler):
    def _json(self, code, obj):
        b = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def _auth(self):
        if TOKEN and self.headers.get("X-Analysis-Token") != TOKEN:
            self._json(401, {"ok": False, "errors": [{"code": "UNAUTHORIZED"}]})
            return False
        return True

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(u.query)
        if u.path == "/health":
            return self._json(200, {"ok": True, "version": VERSION})
        if not self._auth():
            return
        if u.path == "/school-plans":
            return self._school_plans(q.get("name", [""])[0].strip(), int(q.get("semester", ["2"])[0] or 2))
        if u.path == "/school-plans/file":
            return self._school_file(q.get("name", [""])[0].strip(), q.get("file", [""])[0])
        self._json(404, {"ok": False})

    def _school_dir(self, name):
        return os.path.join(WORK, "schools", re.sub(r'[\\/:*?"<>|]', "_", name))

    def _school_plans(self, name, semester):
        if not name:
            return self._json(400, {"ok": False, "errors": [{"code": "NAME_REQUIRED"}]})
        out = self._school_dir(name)
        with LOCK:
            res = run_school.run(fetch_plan.Client(), name, out, semester)
        files = []
        for f in res.get("files", []):
            if f.get("state") not in ("read", "scanned"):
                continue
            p = next(iter(glob.glob(os.path.join(out, "**", glob.escape(f["file"])), recursive=True)), None)
            if not p:
                continue
            raw = open(p, "rb").read()
            files.append({"fileName": f["file"], "grade": grade_of(f["file"]), "size": len(raw),
                          "sha256": hashlib.sha256(raw).hexdigest(), "scanned": f.get("state") == "scanned"})
        self._json(200, {"ok": True, "school": res.get("school"), "status": res.get("status"),
                         "messages": res.get("messages", []), "files": files,
                         "subjects": len([s for s in res.get("subjects", []) if not s["name"].startswith("과목명 미확인")])})

    def _school_file(self, name, fname):
        out = self._school_dir(name)
        p = next(iter(glob.glob(os.path.join(out, "**", glob.escape(os.path.basename(fname))), recursive=True)), None)
        if not p:
            return self._json(404, {"ok": False})
        raw = open(p, "rb").read()
        self.send_response(200)
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        if u.path != "/analyze-preview":
            return self._json(404, {"ok": False})
        if not self._auth():
            return
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n)
        fields, file_name, data = parse_multipart(body, self.headers.get("Content-Type", ""))
        if data is None:
            return self._json(400, {"ok": False, "errors": [{"code": "FILE_REQUIRED"}]})
        t0 = time.time()
        with LOCK:
            payload, sha, warnings, _ = analyze_bytes(file_name, data)
        if payload is None or not payload["subjects"]:
            failed = {"contractVersion": "0.3", "analyzer": {"name": "perf-assess-extract", "version": VERSION},
                      "source": {"sha256": sha, "pageCount": payload["source"]["pageCount"]} if payload else {"sha256": sha},
                      "status": "FAILED", "failureReason": "NO_ASSESSMENTS_EXTRACTED", "subjects": [], "warnings": []}
            env = envelope("NO_ASSESSMENTS_EXTRACTED", sha, failed if payload else None, warnings)
        else:
            env = envelope("OK_REVIEW_REQUIRED", sha, payload, warnings)
        env["elapsedMs"] = int((time.time() - t0) * 1000)
        self._json(200, env)

    def log_message(self, fmt, *a):
        sys.stderr.write("analyzer " + (fmt % a) + "\n")


if __name__ == "__main__":
    os.makedirs(WORK, exist_ok=True)
    print(f"analyzer http://127.0.0.1:{PORT} work={WORK}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
