"""합성 HWPX 평가계획서 생성 (가상 학교·과목, 실제 학교 자료 아님).
XML 규칙은 계정 B tests/test_docmodel.py의 make_hwpx(hs:sec · hp:p/hp:run/hp:t · hp:tbl/hp:tr/hp:tc · cellAddr · cellSpan)를 따른다.
표 내용은 PDF 합성 Fixture(analyzer-v21/synthetic-plan.pdf)와 같은 평가계획(과학, 지필 1차 + 수행 2개)이다.
usage: python -I make_synthetic_hwpx.py <out.hwpx>
"""
import sys
import zipfile
from xml.sax.saxutils import escape

HP = 'xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section"'


def tc(r, c, text, rs=1, cs=1):
    paras = ''.join(f'<hp:p><hp:run><hp:t>{escape(line)}</hp:t></hp:run></hp:p>' for line in text.split('\n'))
    return f'<hp:tc><hp:subList>{paras}</hp:subList><hp:cellAddr colAddr="{c}" rowAddr="{r}"/><hp:cellSpan colSpan="{cs}" rowSpan="{rs}"/></hp:tc>'


def tbl(cells):
    rows = max(c[0] + (c[3] if len(c) > 3 else 1) for c in cells)
    cols = max(c[1] + (c[4] if len(c) > 4 else 1) for c in cells)
    body = ''
    for r in range(rows):
        body += '<hp:tr>' + ''.join(tc(*c) for c in cells if c[0] == r) + '</hp:tr>'
    return f'<hp:p><hp:run><hp:tbl rowCnt="{rows}" colCnt="{cols}">{body}</hp:tbl></hp:run></hp:p>'


def para(text):
    return f'<hp:p><hp:run><hp:t>{escape(text)}</hp:t></hp:run></hp:p>'


HEADER = [(0, 0, '학교명'), (0, 1, '학년'), (0, 2, '학기'), (0, 3, '과목'),
          (1, 0, '가상고'), (1, 1, '1학년'), (1, 2, '1학기'), (1, 3, '과학')]
SUMMARY = [(0, 0, '평가 종류', 1, 2), (0, 2, '지 필 평 가', 1, 2), (0, 4, '수 행 평 가', 1, 2),
           (1, 0, '반영비율', 1, 2), (1, 2, '50%', 1, 2), (1, 4, '50%', 1, 2),
           (2, 0, '평가영역', 1, 2), (2, 2, '1차 시험(50%)', 1, 2), (2, 4, '탐구 보고서'), (2, 5, '발표 활동'),
           (3, 0, '평가 방법', 1, 2), (3, 2, '선택형'), (3, 3, '서답형'), (3, 4, '서술형'), (3, 5, '구술'),
           (4, 0, '영역만점', 1, 2), (4, 2, '70점'), (4, 3, '30점'), (4, 4, '25점'), (4, 5, '40점'),
           (5, 0, '세부\n반영비율', 1, 2), (5, 2, '35%'), (5, 3, '15%'), (5, 4, '25%'), (5, 5, '25%'),
           (6, 0, '기본점수', 1, 2), (6, 2, '0점', 1, 2), (6, 4, '5점'), (6, 5, '5점'),
           (7, 0, '평가시기', 1, 2), (7, 2, '5월', 1, 2), (7, 4, '4월'), (7, 5, '6월')]
DETAIL = [(0, 0, '수행 과제'), (0, 1, '1. 하천 수질 측정 실험을 수행한다.\n2. 측정 결과를 정리하여 탐구 보고서를\n제출한다.', 1, 3),
          (1, 0, '평가 목표'), (1, 1, '변인을 통제하여 실험을 설계할 수 있다.', 1, 3),
          (2, 0, '유의사항'), (2, 1, '보고서는 A4 2쪽 이상으로 작성한다.\n발표는 5분 이내로 한다.', 1, 3),
          (3, 0, '평가 요소'), (3, 1, '채점 기준'), (3, 2, '배점'),
          (4, 0, '실험 설계', 2, 1), (4, 1, '변인 통제가 명확함'), (4, 2, '10'),
          (5, 1, '변인 통제가 일부 부족함'), (5, 2, '5'),
          (6, 0, '보고서 작성', 2, 1), (6, 1, '결과와 결론이 타당함'), (6, 2, '15'),
          (7, 1, '결과 해석이 부족함'), (7, 2, '8')]

section = (f'<?xml version="1.0" encoding="UTF-8"?><hs:sec {HP}>'
           + para('2026학년도 1학년 1학기 [과학] 가상고등학교 평가 계획 (합성 자료)') + tbl(HEADER)
           + para('2. 평가 계획') + tbl(SUMMARY)
           + para('가. 탐구 보고서 세부 계획') + tbl(DETAIL) + '</hs:sec>')

with zipfile.ZipFile(sys.argv[1], 'w') as z:
    # mimetype은 HWPX 관례대로 첫 항목·무압축
    z.writestr(zipfile.ZipInfo('mimetype'), 'application/hwp+zip', compress_type=zipfile.ZIP_STORED)
    z.writestr('Contents/section0.xml', section, compress_type=zipfile.ZIP_DEFLATED)
print(sys.argv[1])
