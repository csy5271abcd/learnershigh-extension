"""평가계획서 과목 추출 데모 서버 (서비스 코드 아님 — 화면 확인·캡처용).

GET /                     데모 화면 (index.html)
GET /api/school?name=…    run_school.run() 실행 결과 JSON (같은 이름은 OUT 아래 캐시)

사용: python demo/server.py [포트=8765] [OUT_DIR=demo_out]
"""
import json
import os
import re
import sys
import threading
import urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import fetch_plan  # noqa: E402
import run_school  # noqa: E402

PORT = int(os.environ.get("PORT") or (sys.argv[1] if len(sys.argv) > 1 else 8765))
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "..", "demo_out")
LOCK = threading.Lock()   # 학교알리미 세션은 하나로, 요청은 차례로


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=HERE, **kw)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if u.path != "/api/school":
            return super().do_GET()
        name = (urllib.parse.parse_qs(u.query).get("name") or [""])[0].strip()
        if not name:
            return self._json(400, {"error": "학교 이름을 입력해 주세요."})
        cache = os.path.join(OUT, re.sub(r"[\\/:*?\"<>|]", "_", name) + ".api.json")
        if os.path.exists(cache):
            return self._json(200, json.load(open(cache, encoding="utf-8")))
        with LOCK:
            r = run_school.run(fetch_plan.Client(), name, OUT)
        os.makedirs(OUT, exist_ok=True)
        json.dump(r, open(cache, "w", encoding="utf-8"), ensure_ascii=False)
        self._json(200, r)

    def _json(self, code, obj):
        b = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    print(f"http://localhost:{PORT}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
