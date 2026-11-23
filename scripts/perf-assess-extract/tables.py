"""HWP / HWPX / PDF 에서 표를 행·열 격자로 추출 (AI·OCR 없음).

table = {"rows", "cols", "cells": [{"r","c","rs","cs","text"}], "page": int|None, "ctx": 표 앞 본문 텍스트(최대 400자)}
grid(table) -> 2차원 리스트 (병합 셀 값은 병합 범위 전체에 복제)
"""
import os
import re
import struct
import zipfile
import zlib

import olefile

CTX_LEN = 400

# ---------- HWP 5.x (OLE) ----------
_EXT = set(range(1, 10)) | {11, 12} | set(range(14, 24))  # 8 wchar 차지하는 제어문자


def _para_text(rec):
    out, i, n = [], 0, len(rec) // 2
    w = struct.unpack(f"<{n}H", rec[: n * 2])
    while i < n:
        ch = w[i]
        if ch in _EXT:
            i += 8
            continue
        if ch in (10, 13):
            out.append("\n")
        elif ch in (24, 30, 31):
            out.append(" ")
        elif ch >= 32:
            out.append(chr(ch))
        i += 1
    return "".join(out)


def _records(data):
    i = 0
    while i + 4 <= len(data):
        h = struct.unpack("<I", data[i:i + 4])[0]
        tag, level, size = h & 0x3FF, (h >> 10) & 0x3FF, (h >> 20) & 0xFFF
        i += 4
        if size == 0xFFF:
            size = struct.unpack("<I", data[i:i + 4])[0]
            i += 4
        yield tag, level, data[i:i + size]
        i += size


def hwp_tables(path):
    ole = olefile.OleFileIO(path)
    flags = struct.unpack("<I", ole.openstream("FileHeader").read()[36:40])[0]
    if flags & 2:
        raise ValueError("encrypted hwp")
    secs = sorted([e for e in ole.listdir() if e[0] == "BodyText"], key=lambda e: int(e[1][7:]))
    tables, ctx = [], ""
    for sec in secs:
        data = ole.openstream(sec).read()
        if flags & 1:
            data = zlib.decompress(data, -15)
        stack = []
        for tag, level, rec in _records(data):
            while stack and level <= stack[-1]["ctrl_level"] and tag != 72:
                done = stack.pop()
                if done["t"]:
                    tables.append(done["t"])
            if tag == 71 and rec[:4][::-1] == b"tbl ":
                stack.append({"ctrl_level": level, "t": None, "cell": None, "cell_level": None})
            elif tag == 77 and stack and stack[-1]["t"] is None:
                rows, cols = struct.unpack("<HH", rec[4:8])
                stack[-1]["t"] = {"rows": rows, "cols": cols, "cells": [], "page": None, "ctx": ctx[-CTX_LEN:]}
            elif tag == 72 and stack and stack[-1]["t"] is not None and (
                    stack[-1]["cell_level"] is None or level == stack[-1]["cell_level"]):
                c, r, cs, rs = struct.unpack("<HHHH", rec[8:16])
                cell = {"r": r, "c": c, "rs": rs, "cs": cs, "text": ""}
                stack[-1]["t"]["cells"].append(cell)
                stack[-1]["cell"], stack[-1]["cell_level"] = cell, level
            elif tag == 67:
                s = _para_text(rec).strip()
                if stack and stack[-1]["cell"] is not None:
                    cell = stack[-1]["cell"]
                    cell["text"] += (("\n" if cell["text"] else "") + s)
                elif not stack and s:
                    ctx = (ctx + "\n" + s)[-2000:]
        while stack:
            done = stack.pop()
            if done["t"]:
                tables.append(done["t"])
    return tables


# ---------- HWPX ----------
def _local(tag):
    return tag.rsplit("}", 1)[-1]


def hwpx_tables(path):
    import xml.etree.ElementTree as ET
    tables = []
    state = {"ctx": ""}

    def cell_text(el):
        parts = []
        for p in el.iter():
            if _local(p.tag) == "p":
                s = "".join(x.text or "" for x in p.iter() if _local(x.tag) == "t").strip()
                if s:
                    parts.append(s)
        return "\n".join(parts)

    def walk(el):
        tag = _local(el.tag)
        if tag == "tbl":
            t = {"rows": int(el.get("rowCnt", 0)), "cols": int(el.get("colCnt", 0)), "cells": [],
                 "page": None, "ctx": state["ctx"][-CTX_LEN:]}
            for tc in el.iter():
                if _local(tc.tag) != "tc":
                    continue
                addr = next((e for e in tc if _local(e.tag) == "cellAddr"), None)
                span = next((e for e in tc if _local(e.tag) == "cellSpan"), None)
                sub = next((e for e in tc if _local(e.tag) == "subList"), None)
                if addr is None:
                    continue
                t["cells"].append({"r": int(addr.get("rowAddr")), "c": int(addr.get("colAddr")),
                                   "rs": int(span.get("rowSpan", 1)) if span is not None else 1,
                                   "cs": int(span.get("colSpan", 1)) if span is not None else 1,
                                   "text": cell_text(sub) if sub is not None else ""})
            tables.append(t)
            return  # 중첩 표는 셀 텍스트에 포함
        if tag == "t" and el.text:
            state["ctx"] = (state["ctx"] + el.text)[-2000:]
        if tag == "p":
            state["ctx"] += "\n"
        for ch in el:
            walk(ch)

    with zipfile.ZipFile(path) as z:
        for n in sorted(z.namelist(), key=lambda x: (len(x), x)):
            if re.match(r"Contents/section\d+\.xml", n):
                walk(ET.fromstring(z.read(n)))
    return tables


# ---------- PDF ----------
OCR_SCANNED = os.environ.get("NO_OCR") != "1"


def _ocr_page_grid(page):
    """스캔 쪽 그림 → 표 칸. paste_parse 의 표 선 복원 + OCR(Windows 내장 또는 Tesseract)을 쓴다. 실패하면 None."""
    import tempfile
    try:
        import paste_parse
        with tempfile.TemporaryDirectory() as td:
            p = os.path.join(td, "page.png")
            page.get_pixmap(dpi=200).save(p)
            words = paste_parse._ocr_words(p)
            return paste_parse.grid_from_image(p, words) if words else None
    except Exception:  # noqa: BLE001 - OCR 실패는 그 쪽만 건너뛴다
        return None


def pdf_tables(path):
    import pymupdf
    tables = []
    doc = pymupdf.open(path)
    prev_tail = ""
    for pno, page in enumerate(doc):
        blocks = page.get_text("blocks")
        try:
            found = page.find_tables().tables
        except Exception:  # noqa: BLE001
            found = []
        if not found and OCR_SCANNED and not page.get_text().strip():
            g = _ocr_page_grid(page)   # 스캔 쪽: 표 선으로 칸을 복원하고 OCR 글자를 넣는다
            if g:
                tables.append({"rows": len(g), "cols": max(len(r) for r in g), "page": pno + 1, "ctx": prev_tail[-CTX_LEN:],
                               "cells": [{"r": r, "c": c, "rs": 1, "cs": 1, "text": v} for r, row in enumerate(g) for c, v in enumerate(row) if v],
                               "ocr": True})
        for tb in found:
            y0 = tb.bbox[1]
            above = [b[4] for b in blocks if b[3] <= y0 + 1]
            ctx = (prev_tail + "\n" + "\n".join(above))[-CTX_LEN:]
            rows = tb.extract()
            t = {"rows": len(rows), "cols": max((len(r) for r in rows), default=0), "cells": [],
                 "page": pno + 1, "ctx": ctx}
            for r, row in enumerate(rows):
                for c, v in enumerate(row):
                    if v is not None:
                        t["cells"].append({"r": r, "c": c, "rs": 1, "cs": 1, "text": (v or "").strip()})
            tables.append(t)
        prev_tail = page.get_text()[-CTX_LEN:]
    return tables


def grid(t):
    g = [["" for _ in range(t["cols"])] for _ in range(t["rows"])]
    for cell in t["cells"]:
        for dr in range(max(cell["rs"], 1)):
            for dc in range(max(cell["cs"], 1)):
                r, c = cell["r"] + dr, cell["c"] + dc
                if r < t["rows"] and c < t["cols"]:
                    g[r][c] = cell["text"]
    return g


def tables_of(path, kind):
    return {"hwp": hwp_tables, "hwpx": hwpx_tables, "pdf": pdf_tables}[kind](path)
