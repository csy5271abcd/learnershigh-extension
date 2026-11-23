"""Playwright로 실측 화면을 캡처한다 (보고서용).

1) 학교알리미 학교 상세 → '교과별(학년별) 교수·학습 및 평가계획' 공시 항목(첨부 파일 목록)
2) 보고서 HTML의 주요 구역

사용: python capture_screens.py OUT_DIR 학교알리미ID[:이름] [...] [--report 보고서.html]
"""
import os
import re
import sys
import urllib.parse

from playwright.sync_api import sync_playwright

BASE = "https://www.schoolinfo.go.kr"


def school_screens(page, out, shl, label):
    page.goto(BASE + "/Main.do", timeout=60000)
    page.evaluate("""(shl) => {
        const f = document.createElement('form'); f.method = 'post'; f.action = '/ei/ss/Pneiss_b01_s0.do';
        const i = document.createElement('input'); i.name = 'SHL_IDF_CD'; i.value = shl; f.appendChild(i);
        document.body.appendChild(f); f.submit(); }""", shl)
    page.wait_for_load_state("networkidle", timeout=60000)
    page.screenshot(path=os.path.join(out, f"{label}_1_school.png"))
    # 공시 항목 URL은 fetch_plan과 같은 방식으로 학교 상세 HTML의 loadGongSi(...) 호출에서 만든다
    html = page.content()
    calls = re.findall(r"loadGongSi\('([^']+)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)'\)", html)
    plan = next((c for c in calls if "평가계획" in c[3]), None)
    yr = re.search(r'JG_YEAR\s*:\s*"(\d{4})"', html)
    nm = re.search(r'HG_NM\s*:\s*"([^"]+)"', html)
    if not plan or not yr:
        raise RuntimeError("평가계획 공시 항목 없음")
    url, cd, no, gnm, gsb, jgb, jgh, jgg = plan
    q = {"GS_HANGMOK_CD": cd, "GS_HANGMOK_NO": no, "GS_HANGMOK_NM": gnm, "GS_BURYU_CD": gsb, "JG_BURYU_CD": jgb,
         "JG_HANGMOK_CD": jgh, "JG_GUBUN": jgg, "JG_YEAR2": yr.group(1), "HG_NM": nm.group(1) if nm else "", "SHL_IDF_CD": shl,
         "GS_TYPE": "Y", "JG_YEAR": yr.group(1), "SORT": "BR", "CHOSEN_JG_YEAR": yr.group(1), "PRE_JG_YEAR": yr.group(1), "LOAD_TYPE": "single"}
    page.goto(BASE + url + "?" + urllib.parse.urlencode(q), timeout=60000)
    page.wait_for_load_state("networkidle", timeout=60000)
    page.screenshot(path=os.path.join(out, f"{label}_2_plan_files.png"), full_page=True)


def report_screens(page, out, report):
    page.goto("file:///" + os.path.abspath(report).replace("\\", "/"))
    for i, sel in enumerate(["h2", "pre", ".ex"]):
        el = page.locator(sel).first
        el.scroll_into_view_if_needed()
        page.screenshot(path=os.path.join(out, f"report_{i + 1}.png"))


def main():
    args = sys.argv[1:]
    report = None
    if "--report" in args:
        i = args.index("--report"); report = args[i + 1]; del args[i:i + 2]
    out, ids = args[0], args[1:]
    os.makedirs(out, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={"width": 1280, "height": 860}, locale="ko-KR")
        for s in ids:
            shl, _, label = s.partition(":")
            try:
                school_screens(page, out, shl, label or shl[:8])
                print("ok", label or shl)
            except Exception as e:  # noqa: BLE001
                print("fail", label or shl, type(e).__name__, e)
        if report:
            report_screens(page, out, report)
            print("ok report")
        b.close()


if __name__ == "__main__":
    main()
