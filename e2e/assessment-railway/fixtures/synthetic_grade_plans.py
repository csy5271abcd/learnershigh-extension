"""A19 원격(Railway) 분석기 시험용 합성 평가계획서 생성기 — 가상 학교·가상 과목만 담는다(실제 학교·학생·교사 자료 아님).

원격 분석기로 보내도 되는 문서는 이 생성기가 만든 합성 문서뿐이다(A19 지시 §6). 실제 학교 문서·기존 코퍼스(F0xxxx)를 변형해 쓰지 않는다.
  · 학년별 HTML(1·2·3학년 1학기, 학년도 2099, 학교명 '가상고')을 만든다. 평가 요약표 + 채점기준표 + 교수·학습 운영 계획표.
  · HWP·HWPX: 계정 B 공개 저장소의 생성기(tools/public_tests/fixtures/make_synthetic_hwp(x).py)를 **읽기 전용으로 불러** 바이트를 만든다(그 저장소에 쓰지 않음).
  · PDF: 같은 폴더의 SyntheticGradePlanPdf.java(PDFBox)가 만든다 — 이 스크립트는 HTML·HWP·HWPX와 manifest만 만든다.
  · 같은 입력 → 같은 바이트. manifest.json에 파일별 SHA-256·학년·과목·생성 원천을 적는다(원문 전체는 적지 않음).
사용: python -I -X utf8 synthetic_grade_plans.py <B public fixtures dir> <out dir>
"""
import hashlib
import importlib.util
import json
import os
import sys

# 학년별 가상 과목(과목명에 '가상'을 넣어 실제 과목과 섞이지 않게 한다)
GRADES = {
    1: {"subject": "가상과학탐구", "task": "가상 하천의 수질을 측정하는 실험을 수행한다."},
    2: {"subject": "가상사회탐구", "task": "가상 도시의 인구 자료를 분석한다."},
    3: {"subject": "가상융합탐구", "task": "가상 에너지 절약 방안을 설계한다."},
}

# (월, 주 표기, 단원, 학습내용) — 시간 정밀도가 서로 다른 행(월+월내 주 / 날짜 범위 / 월만 / 월 범위)
TEACHING = [
    ("3", "3월 1주", "1. 가상 기초 단원", "가상 개념 관찰"),
    ("3", "3월 2주", "1. 가상 기초 단원", "탐구 주제 정하기"),
    ("4", "4월 1주", "2. 가상 응용 단원", "가상 자료 수집"),
    ("5", "", "2. 가상 응용 단원", "토론 활동 준비"),
    ("6~7", "", "3. 가상 정리 단원", "학기 정리 발표"),
]


def html(grade):
    g = GRADES[grade]
    s = g["subject"]
    rows_teaching = "".join(
        f"<tr><td><p>{m}</p></td><td><p>{w}</p></td><td><p>{u}</p></td><td><p>{c}</p></td></tr>" for (m, w, u, c) in TEACHING)
    return f"""<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"><title>synthetic plan grade {grade} (virtual school)</title></head><body>
<p>2099학년도 {grade}학년 1학기 [{s}] 가상고등학교 평가 계획</p>
<table border="1" cellspacing="0" cellpadding="4">
<tr><td><p>학교명</p></td><td><p>학년</p></td><td><p>학기</p></td><td><p>과목</p></td></tr>
<tr><td><p>가상고</p></td><td><p>{grade}학년</p></td><td><p>1학기</p></td><td><p>{s}</p></td></tr>
</table>
<p>1. 평가 계획</p>
<table border="1" cellspacing="0" cellpadding="4">
<tr><td><p>평가 종류</p></td><td colspan="2"><p>지필평가</p></td><td colspan="2"><p>수행평가</p></td></tr>
<tr><td><p>반영비율</p></td><td colspan="2"><p>40%</p></td><td colspan="2"><p>60%</p></td></tr>
<tr><td><p>평가영역</p></td><td colspan="2"><p>1차 지필평가(40%)</p></td><td><p>탐구 보고서</p></td><td><p>토론 활동</p></td></tr>
<tr><td><p>평가 방법</p></td><td><p>선택형</p></td><td><p>서답형</p></td><td><p>서술형</p></td><td><p>토의토론</p></td></tr>
<tr><td><p>영역만점</p></td><td><p>70점</p></td><td><p>30점</p></td><td><p>100점</p></td><td><p>100점</p></td></tr>
<tr><td><p>세부 반영비율</p></td><td><p>28%</p></td><td><p>12%</p></td><td><p>30%</p></td><td><p>30%</p></td></tr>
<tr><td><p>기본점수</p></td><td colspan="2"><p>0점</p></td><td><p>10점</p></td><td><p>10점</p></td></tr>
<tr><td><p>평가시기</p></td><td colspan="2"><p>5월</p></td><td><p>4월</p></td><td><p>6월</p></td></tr>
</table>
<p>가. 탐구 보고서 세부 계획</p>
<table border="1" cellspacing="0" cellpadding="4">
<tr><td><p>수행 과제</p></td><td colspan="2"><p>1. {g["task"]}</p><p>2. 결과를 정리하여 탐구 보고서를 제출한다.</p></td></tr>
<tr><td><p>평가 목표</p></td><td colspan="2"><p>자료를 근거로 결론을 도출할 수 있다.</p></td></tr>
<tr><td><p>유의사항</p></td><td colspan="2"><p>보고서는 A4 2쪽 이상으로 작성한다.</p></td></tr>
<tr><td><p>평가 요소</p></td><td><p>채점 기준</p></td><td><p>배점</p></td></tr>
<tr><td rowspan="2"><p>탐구 설계</p></td><td><p>설계가 명확함</p></td><td><p>50</p></td></tr>
<tr><td><p>설계가 일부 부족함</p></td><td><p>30</p></td></tr>
<tr><td rowspan="2"><p>보고서 작성</p></td><td><p>결과와 결론이 타당함</p></td><td><p>50</p></td></tr>
<tr><td><p>결과 해석이 부족함</p></td><td><p>30</p></td></tr>
</table>
<p>나. 토론 활동 세부 계획</p>
<table border="1" cellspacing="0" cellpadding="4">
<tr><td><p>수행 과제</p></td><td colspan="2"><p>주어진 논제에 대해 찬반 토론에 참여한다.</p></td></tr>
<tr><td><p>평가 요소</p></td><td><p>채점 기준</p></td><td><p>배점</p></td></tr>
<tr><td rowspan="2"><p>논증</p></td><td><p>주장과 근거가 타당함</p></td><td><p>100</p></td></tr>
<tr><td><p>근거가 부족함</p></td><td><p>60</p></td></tr>
</table>
<p>2. 교수·학습 운영 계획</p>
<table border="1" cellspacing="0" cellpadding="4">
<tr><td><p>월</p></td><td><p>주</p></td><td><p>단원명</p></td><td><p>학습내용</p></td></tr>
{rows_teaching}
</table>
</body></html>
"""


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def sha(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def main(b_dir, out):
    os.makedirs(out, exist_ok=True)
    # make_synthetic_hwp는 같은 폴더의 make_synthetic_hwpx를 import한다 → 그 폴더를 경로 맨 앞에 둔다(읽기만)
    sys.path.insert(0, b_dir)
    hwpx = load(os.path.join(b_dir, "make_synthetic_hwpx.py"), "make_synthetic_hwpx")
    hwp = load(os.path.join(b_dir, "make_synthetic_hwp.py"), "make_synthetic_hwp")
    items = []
    for grade in GRADES:
        h = os.path.join(out, f"synthetic-a19-g{grade}.html")
        with open(h, "w", encoding="utf-8", newline="\n") as f:
            f.write(html(grade))
        for ext, mod in (("hwpx", hwpx), ("hwp", hwp)):
            p = os.path.join(out, f"synthetic-a19-g{grade}.{ext}")
            mod.write(h, p)
            items.append({"id": f"SYN-G{grade}-{ext.upper()}", "file": os.path.basename(p), "format": ext.upper(), "grade": grade,
                          "subject": GRADES[grade]["subject"], "generator": f"B public make_synthetic_{ext}.py + synthetic_grade_plans.py",
                          "sha256": sha(p), "bytes": os.path.getsize(p)})
        items.append({"id": f"SYN-G{grade}-HTML", "file": os.path.basename(h), "format": "HTML", "grade": grade,
                      "subject": GRADES[grade]["subject"], "generator": "synthetic_grade_plans.py", "sha256": sha(h), "bytes": os.path.getsize(h)})
    with open(os.path.join(out, "manifest.partial.json"), "w", encoding="utf-8") as f:
        json.dump({"synthetic": True, "school": "가상고(가상)", "academicYearInText": 2099, "items": items}, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
