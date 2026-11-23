"""관리자가 붙여넣은 평가표(표 칸 목록 또는 글자)·캡처 이미지에서 지필·수행 비율과 수행 항목을 읽는다.

입력 형태
  grid  : [[칸, ...], ...]  — 한글·워드·엑셀·웹에서 표를 복사하면 브라우저가 HTML 표로 받는다
  text  : 여러 줄 글자     — PDF에서 복사하거나 OCR로 읽은 글자 (칸 경계가 없다)
  image : PNG 바이트       — Windows 내장 OCR로 글자를 읽은 뒤 text 와 같이 처리

반환: {"examPercent", "performancePercent", "items": [{"name", "weightPercent", "maxScore"}], "check": [사유], "how"}
"""
import os
import re
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gates  # noqa: E402
import run_school  # noqa: E402

PCT = re.compile(r"(\d{1,3}(?:\.\d+)?)\s*%")


def _out(result, how):
    r, reasons, _ = run_school._clean(result)
    return {"examPercent": r.get("exam_total"), "performancePercent": r.get("perf_total"),
            "items": [{"name": it.get("label") or "", "weightPercent": it.get("weightPercent"), "maxScore": it.get("maxScore")}
                      for it in r.get("items") or []],
            "check": reasons, "how": how}


def from_grid(grid):
    g = [[re.sub(r"\s+", " ", str(c or "")).strip() for c in row] for row in grid if any(str(c or "").strip() for c in row)]
    if not g:
        return None
    w = max(len(r) for r in g)
    g = [r + [""] * (w - len(r)) for r in g]
    best = None
    area = gates.area_items(g)
    for fam, fn in (("COL", gates.fam_col), ("ROW", gates.fam_row)):
        try:
            res = fn(g)
        except Exception:  # noqa: BLE001
            res = None
        if area and res and res.get("perf_total") and abs(sum(x["weightPercent"] for x in area) - res["perf_total"]) <= 0.6:
            return _out(dict(res, items=area), fam + "+AREA")   # 비율 표와 세부 표를 함께 붙여넣은 경우
    if area:
        best = _out({"perf_total": sum(x["weightPercent"] for x in area), "exam_total": None, "items": area}, "AREA")
    for fam, fn in (("COL", gates.fam_col), ("ROW", gates.fam_row)):
        try:
            res = fn(g)
        except Exception:  # noqa: BLE001 - 서식이 안 맞으면 다음 방식
            res = None
        if res and res.get("items"):
            out = _out(res, fam)
            if not out["check"]:
                return out
            best = best or out
    return best


RESET = re.compile(r"^(평가\s*영역|영역|시\s*기|내\s*용|평가\s*방법|배점|만점|.)$|[.。]$|\d+\s*(월|주)|학기|수시|이후|이전|^\d+\s*점$")


def from_text(text):
    """칸 경계 없는 글자(PDF 복사·OCR): '수행평가(40%)' 같은 총비율과 항목 이름 + 비율을 읽는다.
    OCR은 한 칸이 여러 줄로 나오므로 '(20%)'만 있는 줄은 바로 앞의 이름 줄(최대 2줄)과 묶는다.
    라벨(평가영역·시기·내용), 문장 끝(.), 시기(9월·2주·학기)는 이름이 아니므로 묶음을 끊는다."""
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in (text or "").splitlines() if ln.strip()]
    perf = exam_total = None
    exam_parts = 0.0
    items, buf = [], []
    for ln in lines:
        m = PCT.search(ln)
        if not m:
            if RESET.search(ln):
                buf = []
            else:
                buf.append(ln)
            continue
        v = float(m.group(1))
        head = ln[:m.start()].strip(" :|()·-[]")
        if not head:            # '(20%)'만 있는 줄: 앞 줄들이 이름
            head = " ".join(buf[-2:])
        buf = []
        if re.search(r"수행", head) and perf is None and not items:
            perf = v; continue
        if re.search(r"정기|지필", head) and not re.search(r"수행", head):
            exam_total = v; continue
        if re.search(r"중간|기말", head) and not re.search(r"수행", head):
            exam_parts += v; continue
        if re.search(r"합계|^계$|총점|반영\s*비율", head) or not head:
            continue
        name = re.sub(r"\(\s*$", "", head).strip()
        if name and not run_school.NOT_ITEM.match(name):
            items.append({"label": name, "weightPercent": v, "maxScore": None})
    exam = exam_total if exam_total is not None else (exam_parts or None)
    if perf is None and exam is None and not items:
        return None
    return _out({"perf_total": perf, "exam_total": exam, "items": items}, "TEXT")


def _ocr_words_tesseract(path):
    """Tesseract(kor+eng) 단어와 위치. Linux는 tesseract 를 바로, Windows는 WSL 안의 tesseract 를 부른다."""
    import subprocess
    psm = os.environ.get("TESS_PSM", "11")   # 11: 흩어진 글자(표 칸) 찾기
    k = 1.0   # 2배 확대는 25개 측정에서 14/25 → 9/25로 나빠져 쓰지 않는다
    if os.name == "nt":
        p = os.path.abspath(path).replace("\\", "/")
        p = f"/mnt/{p[0].lower()}{p[2:]}"
        cmd = ["wsl", "--", "tesseract", p, "stdout", "-l", "kor+eng", "--psm", psm, "tsv"]
    else:
        cmd = ["tesseract", path, "stdout", "-l", "kor+eng", "--psm", psm, "tsv"]
    try:
        out = subprocess.run(cmd, capture_output=True, timeout=120).stdout.decode("utf-8", "replace")
    except (OSError, subprocess.TimeoutExpired):
        return []
    words = []
    for ln in out.splitlines()[1:]:
        f = ln.split("\t")
        if len(f) == 12 and f[11].strip() and f[10] not in ("-1",):
            words.append((int(int(f[6]) / k), int(int(f[7]) / k), int(int(f[8]) / k), int(int(f[9]) / k), f[11].strip()))
    return words


def _ocr_words(path):
    """OCR 단어와 위치 [(x, y, w, h, 글자)]. OCR_ENGINE=tesseract 이거나 Windows가 아니면 Tesseract, 아니면 Windows OCR."""
    if os.environ.get("OCR_ENGINE") == "tesseract" or os.name != "nt":
        return [(x, y, w, h, _fix_pct(t)) for x, y, w, h, t in _ocr_words_tesseract(path)]
    os.environ["OCR_WORDS"] = "1"
    try:
        raw = run_school.ocr_images([path]).get(path, "")
    finally:
        os.environ.pop("OCR_WORDS", None)
    words = []
    for ln in raw.splitlines():
        p = ln.split(" ", 5)
        if len(p) == 6 and p[0] == "W":
            words.append((int(p[1]), int(p[2]), int(p[3]), int(p[4]), _fix_pct(p[5])))
    return words


def _fix_pct(t):
    """OCR이 '%'를 '96'으로 읽는 경우: '1096' → '10%', '(96)' → '(%)' (100을 넘는 비율은 없으므로)."""
    t = re.sub(r"^([(（]?)(\d{1,3})96([)）]?)$",
               lambda m: f"{m.group(1)}{m.group(2)}%{m.group(3)}" if int(m.group(2)) <= 100 else m.group(0), t)
    return re.sub(r"^([(（])96([)）])$", lambda m: f"{m.group(1)}%{m.group(2)}", t)


def _lines(mask, axis, min_len):
    """가로(axis=0)·세로(axis=1) 선 위치 목록. 붙어 있는 선 픽셀 줄은 하나로 합친다."""
    import numpy as np
    prof = (mask > 0).sum(axis=1 - axis) if axis == 0 else (mask > 0).sum(axis=0)
    idx = np.where(prof >= min_len)[0]
    out = []
    for i in idx:
        if out and i - out[-1][-1] <= 3:
            out[-1].append(i)
        else:
            out.append([i])
    return [int(sum(g) / len(g)) for g in out]


def grid_from_image(path, words):
    """테두리가 있는 표 캡처: 표 선으로 칸을 나누고 OCR 단어를 칸에 넣는다. 병합 칸은 같은 글자로 펼친다."""
    import cv2
    import numpy as np
    img = cv2.imdecode(np.fromfile(path, dtype=np.uint8), cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None
    PAD = 10   # 캡처가 표 테두리에 딱 붙어 잘리면 바깥 선을 못 찾는다: 흰 여백을 두르고 가장자리를 경계로 보충
    img = cv2.copyMakeBorder(img, PAD, PAD, PAD, PAD, cv2.BORDER_CONSTANT, value=255)
    words = [(x + PAD, y + PAD, w, h, t) for x, y, w, h, t in words]
    H, W = img.shape
    bw = cv2.adaptiveThreshold(~img, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 15, -2)
    hor = cv2.morphologyEx(bw, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (max(20, W // 25), 1)))
    ver = cv2.morphologyEx(bw, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(20, H // 25))))
    ys = _lines(hor, 0, max(20, W // 25))   # 열기 연산 뒤 남은 픽셀은 이미 선 조각이다: 짧은 안쪽 선도 칸 경계로
    xs = _lines(ver, 1, max(20, H // 25))
    if ys and ys[0] > PAD + 15:
        ys.insert(0, PAD)
    if ys and ys[-1] < H - PAD - 15:
        ys.append(H - PAD)
    if xs and xs[0] > PAD + 15:
        xs.insert(0, PAD)
    if xs and xs[-1] < W - PAD - 15:
        xs.append(W - PAD)
    if len(ys) < 3 or len(xs) < 3:
        return None
    R, C = len(ys) - 1, len(xs) - 1
    cell = [[[] for _ in range(C)] for _ in range(R)]
    for x, y, w, h, t in sorted(words, key=lambda q: (q[1], q[0])):
        cx, cy = x + w / 2, y + h / 2
        r = next((i for i in range(R) if ys[i] <= cy < ys[i + 1]), None)
        c = next((j for j in range(C) if xs[j] <= cx < xs[j + 1]), None)
        if r is not None and c is not None:
            cell[r][c].append((y, x, h, t))

    edge_x, edge_y = {xs[0], xs[-1]}, {ys[0], ys[-1]}

    def wall_v(r, j):  # 칸 (r, j-1)과 (r, j) 사이 세로선이 있나
        y0, y1, x = ys[r] + 3, ys[r + 1] - 3, xs[j]
        seg = ver[y0:y1, max(0, x - 3):x + 4].max(axis=1)
        return y1 <= y0 or (seg > 0).mean() > 0.6

    def wall_h(i, c):  # 칸 (i-1, c)와 (i, c) 사이 가로선이 있나
        x0, x1, y = xs[c] + 3, xs[c + 1] - 3, ys[i]
        seg = hor[max(0, y - 3):y + 4, x0:x1].max(axis=0)
        return x1 <= x0 or (seg > 0).mean() > 0.6

    # 병합 칸: 선이 없는 이웃 칸끼리 같은 묶음(union-find)
    parent = {(r, c): (r, c) for r in range(R) for c in range(C)}

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    for r in range(R):
        for c in range(C):
            if c > 0 and not wall_v(r, c):
                parent[find((r, c))] = find((r, c - 1))
            if r > 0 and not wall_h(r, c):
                parent[find((r, c))] = find((r - 1, c))
    text = {}
    for r in range(R):
        for c in range(C):
            text.setdefault(find((r, c)), []).extend(cell[r][c])
    def join(ws):  # 칸 안 단어: 같은 줄(높이 절반 이내)끼리 왼쪽부터, 줄은 위에서부터
        out, line, base = [], [], None
        for y, x, h, t in sorted(ws):
            if base is not None and y - base > h * 0.5:
                out += [t for _, t in sorted(line)]; line = []
            if not line:
                base = y
            line.append((x, t))
        out += [t for _, t in sorted(line)]
        return " ".join(out)
    grid = [[join(text[find((r, c))]) for c in range(C)] for r in range(R)]
    return [row for row in grid if any(row)]


def from_image(png_bytes):
    """캡처: 표 선이 보이면 칸을 복원해 표로 읽고, 아니면 줄 글자로 읽는다."""
    with tempfile.TemporaryDirectory() as td:
        p = os.path.join(td, "paste.png")
        open(p, "wb").write(png_bytes)
        words = _ocr_words(p)
        grid = None
        try:
            grid = grid_from_image(p, words) if words else None
        except Exception:  # noqa: BLE001 - 칸 복원 실패는 글자 해석으로
            grid = None
    lines, cur, last_y = [], [], None
    for x, y, w, h, t in sorted(words, key=lambda q: (q[1], q[0])):
        if last_y is not None and abs(y - last_y) > h * 0.6:
            lines.append(" ".join(cur)); cur = []
        cur.append(t); last_y = y
    if cur:
        lines.append(" ".join(cur))
    text = "\n".join(lines)
    res = parse(grid=grid, text=text) if grid else from_text(text)
    if res is not None:
        res["ocrText"] = text
    return res, text


def parse(grid=None, text=None):
    """표 칸이 있으면 표로 먼저, 안 되면 글자로."""
    grid = [[str(c or "") for c in row] for row in grid] if grid else None
    res = from_grid(grid) if grid else None
    if (res is None or res["check"]) and (text or grid):
        t = text or "\n".join(" ".join(r) for r in grid)
        alt = from_text(t)
        if alt and (res is None or (not alt["check"] and alt["items"])):
            res = alt
    return res
