"""평가계획서 과목 추출 데모 서버 (서비스 코드 아님 — 화면 확인·캡처용).

GET /                     데모 화면 (index.html)
GET /api/school?name=…    run_school.run() 실행 결과 JSON (같은 이름은 OUT 아래 캐시)
GET /api/download?school=…  그 학교 평가계획서 원문 파일(받아 둔 것)을 zip 하나로 내려받기
POST /api/parse           붙여넣은 평가표 해석 {grid?, text?, image?(data URL)} → 지필·수행 비율, 수행 항목

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
import base64  # noqa: E402
import fetch_plan  # noqa: E402
import paste_parse  # noqa: E402
import run_school  # noqa: E402

PORT = int(os.environ.get("PORT") or (sys.argv[1] if len(sys.argv) > 1 else 8765))
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "..", "demo_out")
LOCK = threading.Lock()   # 학교알리미 세션은 하나로, 요청은 차례로


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=HERE, **kw)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if u.path == "/api/snapshot":
            q = urllib.parse.parse_qs(u.query)
            return self._snapshot(*(q.get(k, [""])[0] for k in ("school", "file", "page", "ti")))
        if u.path == "/api/download":
            return self._download((urllib.parse.parse_qs(u.query).get("school") or [""])[0].strip())
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

    def do_POST(self):
        if urllib.parse.urlparse(self.path).path != "/api/parse":
            return self._json(404, {"error": "없는 주소"})
        n = int(self.headers.get("Content-Length") or 0)
        if n > 8_000_000:
            return self._json(413, {"error": "붙여넣은 내용이 너무 큽니다."})
        try:
            body = json.loads(self.rfile.read(n).decode("utf-8"))
        except ValueError:
            return self._json(400, {"error": "요청을 읽지 못했습니다."})
        ocr_text = None
        if body.get("image"):
            png = base64.b64decode(body["image"].split(",", 1)[-1])
            res, ocr_text = paste_parse.from_image(png)
            if not ocr_text:
                return self._json(422, {"error": "이미지에서 글자를 읽지 못했습니다. 표를 복사해 붙여넣어 주세요."})
        else:
            res = paste_parse.parse(grid=body.get("grid"), text=body.get("text"))
        if res is None:
            return self._json(422, {"error": "평가 비율이나 수행 항목을 찾지 못했습니다. 비율(%)이 보이는 평가표를 붙여넣어 주세요.",
                                    "ocrText": ocr_text})
        return self._json(200, res)

    def _snapshot(self, school, fname, page, ti):
        """원문 PDF 쪽에서 세부 표를 찾아 그 영역만 PNG 로 (확인이 필요한 채점 기준을 원문과 바로 대조하게)."""
        import pymupdf
        sdir = os.path.join(OUT, re.sub(r"[\\/:*?\"<>|]", "_", school))
        path = next((os.path.join(dp, f) for dp, _, fs in os.walk(sdir) for f in fs if f == fname), None) if os.path.isdir(sdir) else None
        if not path or not path.lower().endswith(".pdf") or not page.isdigit():
            return self._json(404, {"error": "원문 캡처를 만들 수 없습니다 (PDF가 아님)."})
        cache = os.path.join(OUT, "_snap", re.sub(r"[^\w.-]", "_", f"{school}_{fname}_{page}_{ti}") + ".png")
        if not os.path.exists(cache):
            doc = pymupdf.open(path)
            pg = doc[int(page) - 1]
            tabs = pg.find_tables().tables
            k = int(ti.split(":")[-1]) if ti.split(":")[-1].isdigit() else 0
            # dump_tables 의 ti 는 파일 안 표 순번: 같은 쪽 앞 표 수를 빼서 쪽 안 순번으로
            before = sum(len(doc[p].find_tables().tables) for p in range(int(page) - 1))
            idx = k - before
            rect = pymupdf.Rect(tabs[idx].bbox) if 0 <= idx < len(tabs) else pg.rect
            rect = (rect + (-6, -6, 6, 6)) & pg.rect
            os.makedirs(os.path.dirname(cache), exist_ok=True)
            pg.get_pixmap(clip=rect, dpi=160).save(cache)
        b = open(cache, "rb").read()
        self.send_response(200)
        self.send_header("Content-Type", "image/png")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def _download(self, school):
        import io
        import zipfile
        sdir = os.path.join(OUT, re.sub(r"[\\/:*?\"<>|]", "_", school))
        if not school or not os.path.isdir(sdir):
            return self._json(404, {"error": "받아 둔 평가계획서가 없습니다. 먼저 불러오기를 해 주세요."})
        files = [os.path.join(dp, f) for dp, _, fs in os.walk(sdir) for f in fs
                 if f.lower().endswith((".pdf", ".hwp", ".hwpx")) and not re.search(r"성적관리|규정", f.replace(" ", ""))]
        if not files:
            return self._json(404, {"error": "내려받을 평가계획서 파일이 없습니다."})
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
            for p in files:
                z.write(p, os.path.basename(p))
        b = buf.getvalue()
        name = urllib.parse.quote(f"{school} 평가계획서.zip")
        self.send_response(200)
        self.send_header("Content-Type", "application/zip")
        self.send_header("Content-Disposition", f"attachment; filename*=UTF-8''{name}")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

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
