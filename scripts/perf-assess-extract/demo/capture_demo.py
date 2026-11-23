"""Playwright로 데모 화면을 실제로 조작하며 캡처한다.

사용: python demo/capture_demo.py http://localhost:8765 OUT_DIR "라벨=학교이름" [...]
각 학교마다: 이름 입력 → 불러오기 클릭 → (첫 학교는 로딩 화면도) → 결과 화면 캡처
"""
import os
import sys

from playwright.sync_api import sync_playwright

url, out, pairs = sys.argv[1], sys.argv[2], sys.argv[3:]
os.makedirs(out, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1100, "height": 900}, locale="ko-KR")
    page.goto(url)
    page.screenshot(path=os.path.join(out, "demo-0-search.png"))
    for i, pair in enumerate(pairs, 1):
        label, name = pair.split("=", 1)
        page.fill("#q", name)
        page.click("#go")
        if i == 1:
            page.wait_for_selector(".loading", timeout=10000)
            page.screenshot(path=os.path.join(out, "demo-0-loading.png"))
        page.wait_for_selector("#out .card:not(.loading)", timeout=600000)
        page.wait_for_function("!document.querySelector('#go').disabled", timeout=600000)
        page.screenshot(path=os.path.join(out, f"demo-{i}-{label}.png"), full_page=True)
        print("ok", label, page.locator("#out h1").first.inner_text().replace("\n", " "), flush=True)
    b.close()
