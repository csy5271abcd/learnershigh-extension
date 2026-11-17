# 15개교 평가계획서 참고자료 목록

> 조사일 2026-11-12. `references/curriculum-plan/` **읽기 전용**. 파일명은 교사명이 들어 있을 수 있어 옮기지 않고 폴더·SHA-256(앞 12자리)으로 식별한다.
> 추출: PDF `pdftotext -layout`, HWP 표준 라이브러리 OLE 파서(기존 분석기 `docmodel.hwp5` 읽기 전용 import), HWPX ZIP XML. 추출 텍스트는 저장소 밖(Scratchpad)에만 두었다.

## 1. 학교별 요약

| # | 학교 | 지점 | 유형 | 폴더 | 파일 | PDF | HWP | HWPX | 학년 폴더 | 추출 오류 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 운정고등학교 | A | 일반고 | `general-high-school/gyeong-gi/unjeong/2026` | 6 | 6 | 0 | 0 | 있음 | 0 |
| 2 | 문현고등학교 | A | 일반고 | `general-high-school/busan·daegu·daejeon·gwangju·ulsan/munhyeon/2026` | 6 | 6 | 0 | 0 | 있음 | 0 |
| 3 | 호서고등학교 | A | 일반고 | `general-high-school/sejong·gang-won·chungbug·chungnam/hoseo/2026` | 6 | 6 | 0 | 0 | 있음 | 0 |
| 4 | 인천하늘고등학교 | A | 자사고 | `autonomous-private-high-school/haneul/2026` | 6 | 6 | 0 | 0 | 있음 | 0 |
| 5 | 세화고등학교 | A | 자사고 | `autonomous-private-high-school/sehwa/2026` | 6 | 0 | 6 | 0 | 있음 | 0 |
| 6 | 대신고등학교 | B | 일반고 | `general-high-school/seoul/daeshin/2026` | 125 | 0 | 5 | 120 | 없음(학기·교과별) | 0 |
| 7 | 한림고등학교 | B | 일반고 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/hanlim/2026` | 6 | 0 | 0 | 6 | 있음 | 0 |
| 8 | 진양고등학교 | B | 일반고 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/jinyang/2026` | 6 | 6 | 0 | 0 | 있음 | 0 |
| 9 | 삼각산고등학교 | B | 일반고 | `general-high-school/seoul/samgaksan/2026` | 6 | 6 | 0 | 0 | 있음 | 0 |
| 10 | 가좌고등학교 | B | 일반고 | `general-high-school/incheon/gajwa/2026` | 20 | 0 | 15 | 5 | 없음(학기·교과별) | 0 |
| 11 | 충무고등학교 | C | 일반고 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/chungmu/2026` | 6 | 3 | 3 | 0 | 있음 | 0 |
| 12 | 광명고등학교 | C | 일반고 | `general-high-school/gyeong-gi/gwangmyeong/2026` | 6 | 0 | 0 | 6 | 있음 | 0 |
| 13 | 세종고등학교 | C | 일반고 | `general-high-school/gyeong-gi/sejong/2026` | 6 | 3 | 0 | 3 | 있음 | 0 |
| 14 | 한솔고등학교 | C | 일반고 | `general-high-school/gyeong-gi/hansol/2026` | 2 | 2 | 0 | 0 | 없음(학기·교과별) | 0 |
| 15 | 제주고등학교 | C | 일반고 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/jeju/2026` | 6 | 3 | 3 | 0 | 있음 | 0 |

합계: 파일 219개, 추출 오류 0개.

## 2. 학교 × 학년·학기 범위 (논리적 90조합 중 확보 범위)

학년 폴더가 없는 학교(대신·가좌·한솔)는 한 파일에 여러 학년이 들어 있어 "학기만 확인"으로 적는다(학년은 본문에서 판정).

| 학교 | 1-1 | 1-2 | 2-1 | 2-2 | 3-1 | 3-2 |
|---|---|---|---|---|---|---|
| 운정고등학교 | O | O | O | O | O | O |
| 문현고등학교 | O | O | O | O | O | O |
| 호서고등학교 | O | O | O | O | O | O |
| 인천하늘고등학교 | O | O | O | O | O | O |
| 세화고등학교 | O | O | O | O | O | O |
| 대신고등학교 | 학기만 | 학기만 | 학기만 | 학기만 | 학기만 | 학기만 |
| 한림고등학교 | O | O | O | O | O | O |
| 진양고등학교 | O | O | O | O | O | O |
| 삼각산고등학교 | O | O | O | O | O | O |
| 가좌고등학교 | 학기만 | 학기만 | 학기만 | 학기만 | 학기만 | 학기만 |
| 충무고등학교 | O | O | O | O | O | O |
| 광명고등학교 | O | O | O | O | O | O |
| 세종고등학교 | O | O | O | O | O | O |
| 한솔고등학교 | 학기만 | 학기만 | 학기만 | 학기만 | 학기만 | 학기만 |
| 제주고등학교 | O | O | O | O | O | O |

## 3. 파일 목록 (폴더 · 형식 · 쪽/구역 · SHA-256 앞 12자리)

### 운정고등학교

| 폴더(학교 2026 아래) | 학년 | 학기 | 형식 | 쪽/구역 | 글자 수 | SHA-256 |
|---|---|---|---|---|---|---|
| /first-grade/first-semester | 1 | 1 | PDF | 294 | 621486 | a755a4325c01 |
| /first-grade/second-semester | 1 | 2 | PDF | 304 | 694958 | 3495a1d89f29 |
| /second-grade/first-semester | 2 | 1 | PDF | 470 | 1032538 | f5b978f978c8 |
| /second-grade/second-semester | 2 | 2 | PDF | 264 | 1819672 | 40153ea88724 |
| /third-grade/first-semester | 3 | 1 | PDF | 447 | 881108 | ab4ec087e683 |
| /third-grade/second-semester | 3 | 2 | PDF | 463 | 1073592 | 7ec8b69a3c2d |

### 문현고등학교

| 폴더(학교 2026 아래) | 학년 | 학기 | 형식 | 쪽/구역 | 글자 수 | SHA-256 |
|---|---|---|---|---|---|---|
| /first-grade/first-semester | 1 | 1 | PDF | 139 | 320903 | b8f8d877604e |
| /first-grade/second-semester | 1 | 2 | PDF | 149 | 359588 | c5bc0f57f417 |
| /second-grade/first-semester | 2 | 1 | PDF | 208 | 493150 | 7865e858ed6c |
| /second-grade/second-semester | 2 | 2 | PDF | 219 | 482495 | ced21a10b12c |
| /third-grade/first-semester | 3 | 1 | PDF | 179 | 413254 | e9c31d6c58f5 |
| /third-grade/second-semester | 3 | 2 | PDF | 142 | 337760 | 567793048313 |

### 호서고등학교

| 폴더(학교 2026 아래) | 학년 | 학기 | 형식 | 쪽/구역 | 글자 수 | SHA-256 |
|---|---|---|---|---|---|---|
| /first-grade/first-semester | 1 | 1 | PDF | 298 | 588822 | 453e007574c9 |
| /first-grade/second-semester | 1 | 2 | PDF | 254 | 556542 | bc3e33e8217a |
| /second-grade/first-semester | 2 | 1 | PDF | 400 | 769065 | 699c61a69ee9 |
| /second-grade/second-semester | 2 | 2 | PDF | 360 | 784563 | 4a7a70227fbb |
| /third-grade/first-semester | 3 | 1 | PDF | 428 | 908161 | 966cdc8a7843 |
| /third-grade/second-semester | 3 | 2 | PDF | 330 | 675899 | 975cfc99be03 |

### 인천하늘고등학교

| 폴더(학교 2026 아래) | 학년 | 학기 | 형식 | 쪽/구역 | 글자 수 | SHA-256 |
|---|---|---|---|---|---|---|
| /first-grade/first-semester | 1 | 1 | PDF | 160 | 465780 | bd69720aaa69 |
| /first-grade/second-semester | 1 | 2 | PDF | 185 | 515477 | a70f468f86b4 |
| /second-grade/first-semester | 2 | 1 | PDF | 222 | 621768 | cabe1ec1b9b4 |
| /second-grade/second-semester | 2 | 2 | PDF | 310 | 877789 | 23889ec1ab72 |
| /third-grade/first-semester | 3 | 1 | PDF | 314 | 879059 | 512c9c37b98a |
| /third-grade/second-semester | 3 | 2 | PDF | 264 | 697295 | e73ee589ce4e |

### 세화고등학교

| 폴더(학교 2026 아래) | 학년 | 학기 | 형식 | 쪽/구역 | 글자 수 | SHA-256 |
|---|---|---|---|---|---|---|
| /first-grade/first-semester | 1 | 1 | HWP | 2 | 249069 | 2f0fe29849df |
| /first-grade/second-semester | 1 | 2 | HWP | 2 | 259820 | fdf4cbcc8e06 |
| /second-grade/first-semester | 2 | 1 | HWP | 2 | 447421 | 4805f6991c99 |
| /second-grade/second-semester | 2 | 2 | HWP | 2 | 531418 | 115dca682eec |
| /third-grade/first-semester | 3 | 1 | HWP | 2 | 144878 | 003c68f809b1 |
| /third-grade/second-semester | 3 | 2 | HWP | 2 | 113098 | 2ce67ada40ea |

### 대신고등학교

| 폴더(학교 2026 아래) | 학년 | 학기 | 형식 | 쪽/구역 | 글자 수 | SHA-256 |
|---|---|---|---|---|---|---|
| /first-semester/(대신고) 과학과 1학기 교수학습 및 평가 운영 계획/과학과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 13293 | 83b48a73f6d4 |
| /first-semester/(대신고) 과학과 1학기 교수학습 및 평가 운영 계획/과학과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 10158 | d6a506ae5510 |
| /first-semester/(대신고) 과학과 1학기 교수학습 및 평가 운영 계획/과학과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 7574 | f6097f5da0c0 |
| /first-semester/(대신고) 과학과 1학기 교수학습 및 평가 운영 계획/과학과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 13049 | 2fd13319b763 |
| /first-semester/(대신고) 과학과 1학기 교수학습 및 평가 운영 계획/과학과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 7641 | 3333a2ef80c7 |
| /first-semester/(대신고) 과학과 1학기 교수학습 및 평가 운영 계획/과학과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 7392 | 72cec1d31b56 |
| /first-semester/(대신고) 과학과 1학기 교수학습 및 평가 운영 계획/과학과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 9576 | d9ec9158bc48 |
| /first-semester/(대신고) 과학과 1학기 교수학습 및 평가 운영 계획/과학과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 9796 | bb28343f223c |
| /first-semester/(대신고) 과학과 1학기 교수학습 및 평가 운영 계획/과학과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 11727 | 987cd9327e85 |
| /first-semester/(대신고) 과학과 1학기 교수학습 및 평가 운영 계획/과학과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 16116 | e6c0ac6bf1ae |
| /first-semester/(대신고) 과학과 1학기 교수학습 및 평가 운영 계획/과학과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 9681 | eec86ddd39d8 |
| /first-semester/(대신고) 과학과 1학기 교수학습 및 평가 운영 계획/과학과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 12267 | df081d2e9ce0 |
| /first-semester/(대신고) 국어과 1학기 교수학습 및 평가 운영 계획/국어과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 5547 | 9fcd43511b1a |
| /first-semester/(대신고) 국어과 1학기 교수학습 및 평가 운영 계획/국어과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 14720 | c2161fa9b7a7 |
| /first-semester/(대신고) 국어과 1학기 교수학습 및 평가 운영 계획/국어과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 9574 | 0c60df184776 |
| /first-semester/(대신고) 국어과 1학기 교수학습 및 평가 운영 계획/국어과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 7344 | 33ee0f447cdc |
| /first-semester/(대신고) 국어과 1학기 교수학습 및 평가 운영 계획/국어과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 7809 | 95f464f16b2d |
| /first-semester/(대신고) 국어과 1학기 교수학습 및 평가 운영 계획/국어과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 7663 | 94a1f99399d4 |
| /first-semester/(대신고) 사회과 1학기 교수학습 및 평가 운영 계획/사회과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 7457 | ac0d6cac198d |
| /first-semester/(대신고) 사회과 1학기 교수학습 및 평가 운영 계획/사회과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 5265 | 0a6c9caef1b8 |
| /first-semester/(대신고) 사회과 1학기 교수학습 및 평가 운영 계획/사회과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 6968 | 972aa30bdc25 |
| /first-semester/(대신고) 사회과 1학기 교수학습 및 평가 운영 계획/사회과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 9589 | 6e3c48b4f3a3 |
| /first-semester/(대신고) 사회과 1학기 교수학습 및 평가 운영 계획/사회과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 5371 | cd8fc00a0efb |
| /first-semester/(대신고) 사회과 1학기 교수학습 및 평가 운영 계획/사회과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 9096 | 5ae029dc4655 |
| /first-semester/(대신고) 사회과 1학기 교수학습 및 평가 운영 계획/사회과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 5613 | 774cece0534f |
| /first-semester/(대신고) 사회과 1학기 교수학습 및 평가 운영 계획/사회과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 6251 | 8338d23fe10e |
| /first-semester/(대신고) 사회과 1학기 교수학습 및 평가 운영 계획/사회과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 7659 | f2feac949858 |
| /first-semester/(대신고) 사회과 1학기 교수학습 및 평가 운영 계획/사회과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 12749 | ecb436483e9c |
| /first-semester/(대신고) 사회과 1학기 교수학습 및 평가 운영 계획/사회과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 16871 | 099720b9ed20 |
| /first-semester/(대신고) 사회과 1학기 교수학습 및 평가 운영 계획/사회과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 10544 | 036ae54afce8 |
| /first-semester/(대신고) 사회과 1학기 교수학습 및 평가 운영 계획/사회과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 11515 | bebb22c3327b |
| /first-semester/(대신고) 사회과 1학기 교수학습 및 평가 운영 계획/사회과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 7630 | bccf76be1073 |
| /first-semester/(대신고) 생활교양과 1학기 교수학습 및 평가 운영 계획/생활교양과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 4592 | d9a07d889822 |
| /first-semester/(대신고) 생활교양과 1학기 교수학습 및 평가 운영 계획/생활교양과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 5318 | 77edeade82bf |
| /first-semester/(대신고) 생활교양과 1학기 교수학습 및 평가 운영 계획/생활교양과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 4911 | 910bf210b141 |
| /first-semester/(대신고) 생활교양과 1학기 교수학습 및 평가 운영 계획/생활교양과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 15649 | 33b119fd4715 |
| /first-semester/(대신고) 생활교양과 1학기 교수학습 및 평가 운영 계획/생활교양과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 4802 | 42bb533a43d6 |
| /first-semester/(대신고) 생활교양과 1학기 교수학습 및 평가 운영 계획/생활교양과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 5034 | fc37357d0284 |
| /first-semester/(대신고) 생활교양과 1학기 교수학습 및 평가 운영 계획/생활교양과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 11545 | e230fc58df20 |
| /first-semester/(대신고) 생활교양과 1학기 교수학습 및 평가 운영 계획/생활교양과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 4541 | 6ae420f5bce2 |
| /first-semester/(대신고) 생활교양과 1학기 교수학습 및 평가 운영 계획/생활교양과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 6206 | 277f61513e85 |
| /first-semester/(대신고) 생활교양과 1학기 교수학습 및 평가 운영 계획/생활교양과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 5262 | 5e98b0790f72 |
| /first-semester/(대신고) 생활교양과 1학기 교수학습 및 평가 운영 계획/생활교양과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 5430 | 97139d405630 |
| /first-semester/(대신고) 수학과 1학기 교수학습 및 평가 운영 계획/수학과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 4932 | adeb556e1e33 |
| /first-semester/(대신고) 수학과 1학기 교수학습 및 평가 운영 계획/수학과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 12462 | 85e7ee03e075 |
| /first-semester/(대신고) 수학과 1학기 교수학습 및 평가 운영 계획/수학과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 8575 | 9d8a3d55778c |
| /first-semester/(대신고) 수학과 1학기 교수학습 및 평가 운영 계획/수학과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 9274 | e91222562b3c |
| /first-semester/(대신고) 수학과 1학기 교수학습 및 평가 운영 계획/수학과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 6234 | 70e90baa66f4 |
| /first-semester/(대신고) 수학과 1학기 교수학습 및 평가 운영 계획/수학과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWP | 2 | 7727 | 2f11289c5f0f |
| /first-semester/(대신고) 수학과 1학기 교수학습 및 평가 운영 계획/수학과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 4730 | f3874a608b04 |
| /first-semester/(대신고) 영어과 1학기 교수학습 및 평가 운영 계획/영어과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 22278 | bd570f202b8e |
| /first-semester/(대신고) 영어과 1학기 교수학습 및 평가 운영 계획/영어과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 11277 | 80f80e47a626 |
| /first-semester/(대신고) 영어과 1학기 교수학습 및 평가 운영 계획/영어과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 4886 | 92ba5ad46b41 |
| /first-semester/(대신고) 영어과 1학기 교수학습 및 평가 운영 계획/영어과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWP | 2 | 13058 | 9b3391ca1a14 |
| /first-semester/(대신고) 영어과 1학기 교수학습 및 평가 운영 계획/영어과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 11845 | 9eb38d80af1e |
| /first-semester/(대신고) 영어과 1학기 교수학습 및 평가 운영 계획/영어과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 3945 | caaa4ed80bb0 |
| /first-semester/(대신고) 영어과 1학기 교수학습 및 평가 운영 계획/영어과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 7883 | 62975b07067a |
| /first-semester/(대신고) 예술과 1학기 교수학습 및 평가 운영 계획/예술과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 7553 | af42c216df66 |
| /first-semester/(대신고) 예술과 1학기 교수학습 및 평가 운영 계획/예술과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 8403 | 22f69be4bac8 |
| /first-semester/(대신고) 예술과 1학기 교수학습 및 평가 운영 계획/예술과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 7370 | a09b2b472164 |
| /first-semester/(대신고) 체육과 1학기 교수학습 및 평가 운영 계획/체육과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 7882 | 659dfc07ddfc |
| /first-semester/(대신고) 체육과 1학기 교수학습 및 평가 운영 계획/체육과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 9590 | 6e02542cf446 |
| /first-semester/(대신고) 체육과 1학기 교수학습 및 평가 운영 계획/체육과 1학기 교수학습 및 평가 운영 계획 | 본문 | 1 | HWPX | 2 | 8764 | cfa815067193 |
| /second-semester/대신고 과학과 2학기 교수학습 및 평가 운영 계획(정정)/과학과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 10680 | 89bee8b94342 |
| /second-semester/대신고 과학과 2학기 교수학습 및 평가 운영 계획(정정)/과학과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 15030 | dd8d784714fe |
| /second-semester/대신고 과학과 2학기 교수학습 및 평가 운영 계획(정정)/과학과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 13142 | 224397f9ad9f |
| /second-semester/대신고 과학과 2학기 교수학습 및 평가 운영 계획(정정)/과학과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 6569 | 60dcba6ce4b1 |
| /second-semester/대신고 과학과 2학기 교수학습 및 평가 운영 계획(정정)/과학과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 12915 | 56bccbb23cf3 |
| /second-semester/대신고 과학과 2학기 교수학습 및 평가 운영 계획(정정)/과학과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 10731 | b02b794dfe7b |
| /second-semester/대신고 과학과 2학기 교수학습 및 평가 운영 계획(정정)/과학과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 15823 | 9040082436aa |
| /second-semester/대신고 과학과 2학기 교수학습 및 평가 운영 계획(정정)/과학과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 7662 | 1713cfeee9dd |
| /second-semester/대신고 과학과 2학기 교수학습 및 평가 운영 계획(정정)/과학과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 9876 | c42ce92498d7 |
| /second-semester/대신고 과학과 2학기 교수학습 및 평가 운영 계획(정정)/과학과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 9937 | acd4025a9222 |
| /second-semester/대신고 과학과 2학기 교수학습 및 평가 운영 계획(정정)/과학과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 10329 | 45954c970b3a |
| /second-semester/대신고 과학과 2학기 교수학습 및 평가 운영 계획(정정)/과학과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 9526 | 6984a0edcc5a |
| /second-semester/대신고 국어과 2학기 교수학습 및 평가 운영 계획/국어과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 17852 | 00b3c2625944 |
| /second-semester/대신고 국어과 2학기 교수학습 및 평가 운영 계획/국어과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 10696 | 43ea7392a21e |
| /second-semester/대신고 국어과 2학기 교수학습 및 평가 운영 계획/국어과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWP | 2 | 9271 | 4b56c9c47590 |
| /second-semester/대신고 국어과 2학기 교수학습 및 평가 운영 계획/국어과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 5648 | aa0f768bd8c5 |
| /second-semester/대신고 국어과 2학기 교수학습 및 평가 운영 계획/국어과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 5185 | f63c726e63d1 |
| /second-semester/대신고 국어과 2학기 교수학습 및 평가 운영 계획/국어과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 4731 | bc39a8051fd7 |
| /second-semester/대신고 사회과 2학기 교수학습 및 평가 운영 계획/사회과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 19557 | 96d79c766aa5 |
| /second-semester/대신고 사회과 2학기 교수학습 및 평가 운영 계획/사회과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 11302 | bea83bd52b21 |
| /second-semester/대신고 사회과 2학기 교수학습 및 평가 운영 계획/사회과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 7378 | 9753da8c04fc |
| /second-semester/대신고 사회과 2학기 교수학습 및 평가 운영 계획/사회과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 7675 | a6ac2b2a476f |
| /second-semester/대신고 사회과 2학기 교수학습 및 평가 운영 계획/사회과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 12549 | c8fa5a345448 |
| /second-semester/대신고 사회과 2학기 교수학습 및 평가 운영 계획/사회과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 7144 | 0f9cf4fbcbaf |
| /second-semester/대신고 사회과 2학기 교수학습 및 평가 운영 계획/사회과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 6057 | e6703bca0e48 |
| /second-semester/대신고 사회과 2학기 교수학습 및 평가 운영 계획/사회과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 5948 | 07cee98133a1 |
| /second-semester/대신고 사회과 2학기 교수학습 및 평가 운영 계획/사회과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 10911 | 71f4a9693d6d |
| /second-semester/대신고 사회과 2학기 교수학습 및 평가 운영 계획/사회과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 4952 | bde8b49025f6 |
| /second-semester/대신고 사회과 2학기 교수학습 및 평가 운영 계획/사회과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 8686 | 0c0e1f321146 |
| /second-semester/대신고 사회과 2학기 교수학습 및 평가 운영 계획/사회과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 5956 | 5c1d5ac30723 |
| /second-semester/대신고 사회과 2학기 교수학습 및 평가 운영 계획/사회과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 5611 | 215b90571074 |
| /second-semester/대신고 생활교양과 2학기 교수학습 및 평가 운영 계획/생활교양과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 12115 | d307fc6b6c13 |
| /second-semester/대신고 생활교양과 2학기 교수학습 및 평가 운영 계획/생활교양과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 5242 | dfe002d8840e |
| /second-semester/대신고 생활교양과 2학기 교수학습 및 평가 운영 계획/생활교양과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 5888 | 2b2707389320 |
| /second-semester/대신고 생활교양과 2학기 교수학습 및 평가 운영 계획/생활교양과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 4495 | 1646befe8802 |
| /second-semester/대신고 생활교양과 2학기 교수학습 및 평가 운영 계획/생활교양과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 7188 | 2da5ff200039 |
| /second-semester/대신고 생활교양과 2학기 교수학습 및 평가 운영 계획/생활교양과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 4129 | 1d2e7fad83e2 |
| /second-semester/대신고 생활교양과 2학기 교수학습 및 평가 운영 계획/생활교양과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 5187 | defe06613aa7 |
| /second-semester/대신고 생활교양과 2학기 교수학습 및 평가 운영 계획/생활교양과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 5041 | e0007a158d9f |
| /second-semester/대신고 생활교양과 2학기 교수학습 및 평가 운영 계획/생활교양과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 15581 | 2d3196c0d1ee |
| /second-semester/대신고 생활교양과 2학기 교수학습 및 평가 운영 계획/생활교양과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 4722 | 0e7c9de54bdb |
| /second-semester/대신고 생활교양과 2학기 교수학습 및 평가 운영 계획/생활교양과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 4887 | ec763e7ae429 |
| /second-semester/대신고 수학과 2학기 교수학습 및 평가 운영 계획/수학과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 11968 | d1c26ec77d3e |
| /second-semester/대신고 수학과 2학기 교수학습 및 평가 운영 계획/수학과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 11090 | 8970cc5847ce |
| /second-semester/대신고 수학과 2학기 교수학습 및 평가 운영 계획/수학과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 8557 | fa5145183fdf |
| /second-semester/대신고 수학과 2학기 교수학습 및 평가 운영 계획/수학과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 5877 | 2d349ed8c385 |
| /second-semester/대신고 수학과 2학기 교수학습 및 평가 운영 계획/수학과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 6670 | 51bf283dd56c |
| /second-semester/대신고 수학과 2학기 교수학습 및 평가 운영 계획/수학과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWP | 2 | 7694 | d34f12680584 |
| /second-semester/대신고 수학과 2학기 교수학습 및 평가 운영 계획/수학과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 5338 | cc5f9a55795e |
| /second-semester/대신고 영어과 2학기 교수학습 및 평가 운영 계획/영어과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 22378 | a06ff737515b |
| /second-semester/대신고 영어과 2학기 교수학습 및 평가 운영 계획/영어과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 11886 | 3cb33651947f |
| /second-semester/대신고 영어과 2학기 교수학습 및 평가 운영 계획/영어과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 13442 | c585dcb80901 |
| /second-semester/대신고 영어과 2학기 교수학습 및 평가 운영 계획/영어과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 4739 | b30c563986e1 |
| /second-semester/대신고 영어과 2학기 교수학습 및 평가 운영 계획/영어과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWP | 2 | 13341 | ebbadfe5c7b7 |
| /second-semester/대신고 영어과 2학기 교수학습 및 평가 운영 계획/영어과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 3953 | 9bb1f2eaf6c9 |
| /second-semester/대신고 영어과 2학기 교수학습 및 평가 운영 계획/영어과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 6295 | aaedfcb331d6 |
| /second-semester/대신고 예술과 2학기 교수학습 및 평가 운영 계획/예술과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 6337 | 4c0e8de7522b |
| /second-semester/대신고 예술과 2학기 교수학습 및 평가 운영 계획/예술과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 7669 | f0a901bfd6a7 |
| /second-semester/대신고 예술과 2학기 교수학습 및 평가 운영 계획/예술과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 8545 | 6b28733ca19b |
| /second-semester/대신고 체육과 2학기 교수학습 및 평가 운영 계획/체육과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 8127 | 069164d030a9 |
| /second-semester/대신고 체육과 2학기 교수학습 및 평가 운영 계획/체육과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 10620 | aafcf5d0d9b6 |
| /second-semester/대신고 체육과 2학기 교수학습 및 평가 운영 계획/체육과 2학기 교수학습 및 평가 운영 계획 | 본문 | 2 | HWPX | 2 | 8571 | c98a57047e10 |

### 한림고등학교

| 폴더(학교 2026 아래) | 학년 | 학기 | 형식 | 쪽/구역 | 글자 수 | SHA-256 |
|---|---|---|---|---|---|---|
| /first-grade/first-semester | 1 | 1 | HWPX | 24 | 128394 | ea3e5081cd9d |
| /first-grade/second-semester | 1 | 2 | HWPX | 24 | 108698 | bd8f44be3cf2 |
| /second-grade/first-semester | 2 | 1 | HWPX | 44 | 211124 | 31109095aa0d |
| /second-grade/second-semester | 2 | 2 | HWPX | 46 | 190312 | 4fbdf398883e |
| /third-grade/first-semester | 3 | 1 | HWPX | 66 | 271012 | f6edcb16e604 |
| /third-grade/second-semester | 3 | 2 | HWPX | 66 | 217544 | a6249327648d |

### 진양고등학교

| 폴더(학교 2026 아래) | 학년 | 학기 | 형식 | 쪽/구역 | 글자 수 | SHA-256 |
|---|---|---|---|---|---|---|
| /first-grade/first-semester | 1 | 1 | PDF | 118 | 236985 | eb6fbaa0b421 |
| /first-grade/second-semester | 1 | 2 | PDF | 140 | 306999 | d26194906294 |
| /second-grade/first-semester | 2 | 1 | PDF | 132 | 293475 | 59873ddd4f5f |
| /second-grade/second-semester | 2 | 2 | PDF | 157 | 369465 | 235134caaddd |
| /third-grade/first-semester | 3 | 1 | PDF | 303 | 774008 | 9a4ca28d6936 |
| /third-grade/second-semester | 3 | 2 | PDF | 301 | 705728 | 56d27ce1c2d3 |

### 삼각산고등학교

| 폴더(학교 2026 아래) | 학년 | 학기 | 형식 | 쪽/구역 | 글자 수 | SHA-256 |
|---|---|---|---|---|---|---|
| /first-grade/first-semester | 1 | 1 | PDF | 127 | 291919 | 84bc50d8fe0b |
| /first-grade/second-semester | 1 | 2 | PDF | 72 | 152128 | d2c8f93f02ea |
| /second-grade/first-semester | 2 | 1 | PDF | 213 | 521316 | 14342c99a796 |
| /second-grade/second-semester | 2 | 2 | PDF | 119 | 222220 | 1133e031c03e |
| /third-grade/first-semester | 3 | 1 | PDF | 213 | 475562 | 1d14b95a27cd |
| /third-grade/second-semester | 3 | 2 | PDF | 141 | 237809 | 03068da0951e |

### 가좌고등학교

| 폴더(학교 2026 아래) | 학년 | 학기 | 형식 | 쪽/구역 | 글자 수 | SHA-256 |
|---|---|---|---|---|---|---|
| /first-semester | 본문 | 1 | HWP | 16 | 113320 | 4f643c08b843 |
| /first-semester | 본문 | 1 | HWPX | 26 | 182262 | 1fd8a695f251 |
| /first-semester | 본문 | 1 | HWP | 8 | 27001 | e2f7a8973204 |
| /first-semester | 본문 | 1 | HWPX | 12 | 85761 | 95960a2d93d8 |
| /first-semester | 본문 | 1 | HWP | 8 | 44177 | 830851865774 |
| /first-semester | 본문 | 1 | HWP | 14 | 91015 | 4661f2ff6387 |
| /first-semester | 본문 | 1 | HWP | 14 | 95128 | 29ca49c6b37e |
| /first-semester | 본문 | 1 | HWP | 14 | 96883 | bb08ce7572e9 |
| /first-semester | 본문 | 1 | HWP | 24 | 208089 | 07e9ad13b9f9 |
| /first-semester | 본문 | 1 | HWP | 2 | 28394 | 675dc8425b55 |
| /second-semester | 본문 | 2 | HWPX | 2 | 37459 | cc86a98bf886 |
| /second-semester | 본문 | 2 | HWP | 8 | 24822 | f70fc6912f05 |
| /second-semester | 본문 | 2 | HWP | 8 | 37963 | 4f64a1526267 |
| /second-semester | 본문 | 2 | HWP | 16 | 116934 | 8dbe9dc49f16 |
| /second-semester | 본문 | 2 | HWPX | 12 | 85813 | fc19aaeff891 |
| /second-semester | 본문 | 2 | HWPX | 28 | 194121 | d19328890da7 |
| /second-semester | 본문 | 2 | HWP | 16 | 114622 | 68bdfbfc6882 |
| /second-semester | 본문 | 2 | HWP | 14 | 79531 | 09e13b9f58c0 |
| /second-semester | 본문 | 2 | HWP | 14 | 90204 | a1b3641d3721 |
| /second-semester | 본문 | 2 | HWP | 24 | 203749 | 9070199179da |

### 충무고등학교

| 폴더(학교 2026 아래) | 학년 | 학기 | 형식 | 쪽/구역 | 글자 수 | SHA-256 |
|---|---|---|---|---|---|---|
| /first-grade/first-semester | 1 | 1 | HWP | 12 | 133732 | 075bb95c8135 |
| /first-grade/second-semester | 1 | 2 | PDF | 82 | 191055 | beb4930c52ee |
| /second-grade/first-semester | 2 | 1 | HWP | 16 | 160008 | eb02f4c1a89c |
| /second-grade/second-semester | 2 | 2 | PDF | 104 | 235358 | db42f790bdd3 |
| /third-grade/first-semester | 3 | 1 | HWP | 26 | 215732 | f49d28e4bae2 |
| /third-grade/second-semester | 3 | 2 | PDF | 152 | 321059 | 34b51f5f3417 |

### 광명고등학교

| 폴더(학교 2026 아래) | 학년 | 학기 | 형식 | 쪽/구역 | 글자 수 | SHA-256 |
|---|---|---|---|---|---|---|
| /first-grade/first-semester | 1 | 1 | HWPX | 84 | 1452736 | 4cd9f4405f82 |
| /first-grade/second-semester | 1 | 2 | HWPX | 11 | 265536 | f2d362a231d9 |
| /second-grade/first-semester | 2 | 1 | HWPX | 84 | 1452736 | 4cd9f4405f82 |
| /second-grade/second-semester | 2 | 2 | HWPX | 23 | 586933 | 24e49ac287ea |
| /third-grade/first-semester | 3 | 1 | HWPX | 84 | 1452736 | 4cd9f4405f82 |
| /third-grade/second-semester | 3 | 2 | HWPX | 56 | 369311 | 5d26a500fe59 |

### 세종고등학교

| 폴더(학교 2026 아래) | 학년 | 학기 | 형식 | 쪽/구역 | 글자 수 | SHA-256 |
|---|---|---|---|---|---|---|
| /first-grade/first-semester | 1 | 1 | PDF | 190 | 500373 | 980d866d9837 |
| /first-grade/second-semester | 1 | 2 | HWPX | 6 | 289703 | aea8b0940ab8 |
| /second-grade/first-semester | 2 | 1 | PDF | 302 | 829063 | 59a924b4ff64 |
| /second-grade/second-semester | 2 | 2 | HWPX | 5 | 510881 | 3e00d81b20a1 |
| /third-grade/first-semester | 3 | 1 | PDF | 446 | 1025026 | 5e77940748c4 |
| /third-grade/second-semester | 3 | 2 | HWPX | 2 | 558280 | 9807012f0d6b |

### 한솔고등학교

| 폴더(학교 2026 아래) | 학년 | 학기 | 형식 | 쪽/구역 | 글자 수 | SHA-256 |
|---|---|---|---|---|---|---|
| /first-semester | 본문 | 1 | PDF | 1023 | 2841243 | 65ffc0677fa4 |
| /second-semester | 본문 | 2 | PDF | 978 | 2611466 | cdb96a5f3cec |

### 제주고등학교

| 폴더(학교 2026 아래) | 학년 | 학기 | 형식 | 쪽/구역 | 글자 수 | SHA-256 |
|---|---|---|---|---|---|---|
| /first-grade/first-semester | 1 | 1 | HWP | 21 | 491886 | 34acb9eeb37c |
| /first-grade/second-semester | 1 | 2 | PDF | 324 | 847924 | 8bedfb3e5400 |
| /second-grade/first-semester | 2 | 1 | HWP | 27 | 531698 | 7270f49d2f4d |
| /second-grade/second-semester | 2 | 2 | PDF | 412 | 1039790 | 73179ef6448e |
| /third-grade/first-semester | 3 | 1 | HWP | 39 | 559855 | 1c4a924ed4bb |
| /third-grade/second-semester | 3 | 2 | PDF | 465 | 1126546 | f693dda243d1 |

