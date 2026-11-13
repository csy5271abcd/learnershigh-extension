# 학교별 평가계획서 원본 목록 (60개교)

> 조사일 2026-11-12. 읽기 전용 조사. 원본 파일은 열거·해시만 했고 수정하지 않았다.
> 상태 표시: **[원본 확인]** 실제 폴더·파일에서 확인 / **[연구 기록]** 분석기 `runs/v3-20261106` 산출물 / **[확인 불가]** 근거 자료 없음

## 1. 확인 방법

| 단계 | 방법 | 결과 |
|---|---|---|
| 폴더 열거 | `references/curriculum-plan/` 전체 재귀 열거 | 파일 5,170개, 2,600,696,576 bytes (약 2.42 GiB) **[원본 확인]** |
| 내용 해시 | 5,170개 전부 SHA-256 계산(조사용 스크립트, 결과는 Scratchpad에만) | 고유 SHA 5,132개 **[원본 확인]** |
| 기존 Manifest 대조 | 분석기 `runs/v3-20261106/manifest.jsonl`(5,170행)과 경로·크기·SHA 비교 | 추가 0 · 삭제 0 · 변경 0 — **v3 Manifest와 바이트 단위로 동일** **[원본 확인]** |
| 학교명 | 파일명에 들어 있는 `○○고`·`○○고등학교` 표기를 집계 | 47개교 확인, 13개교는 파일명에 학교명이 없음(2026-11-12 재확인으로 정정) |
| 학생 수 | 저장소·분석기·원본 폴더 전체 검색 | **학생 수 자료 없음 → 전 학교 "확인 불가"** |

- 파일명은 이 문서에 옮기지 않았다. 분석기 기록상 1,030개 파일명에 교사 이름이 들어 있다(`runs/v3-20261106/stats.txt` flags `TEACHER_NAME_IN_FILENAME`). 원본 경로는 학교 폴더까지만 적는다.
- 폴더 구조: `<학교 유형>/<지역 묶음 — 일반고만>/<학교 ID>/<학년도>/<학년>/<학기>/파일`. 일부 학교는 교과·압축 해제 하위 폴더가 더 있다(`EXTRA_FOLDER_LEVEL` 350개 파일) **[연구 기록]**.
- 자사고 폴더에는 지역 단계가 없다. 일반고도 지역은 **시·도가 아니라 묶음 폴더**(예: `busan·daegu·daejeon·gwangju·ulsan`)까지만 있다. 학교별 시·도는 폴더로 확인할 수 없다.
- 형식 열은 확장자가 아니라 **파일 첫 바이트(매직 바이트)** 기준이다. 확장자는 `.hwp`인데 실제로는 HWPX(ZIP)인 파일이 5개 있다.

## 2. 학교 유형·지역 폴더 요약 [원본 확인]

| 지역 폴더 | 학교 수 | 파일 수 | PDF | HWP | HWPX | DOCX |
|---|---:|---:|---:|---:|---:|---:|
| 서울 | 8 | 1881 | 388 | 1198 | 295 | 0 |
| 경기 | 10 | 259 | 83 | 104 | 72 | 0 |
| 인천 | 4 | 115 | 15 | 83 | 17 | 0 |
| 부산·대구·대전·광주·울산 | 10 | 371 | 111 | 246 | 14 | 0 |
| 세종·강원·충북·충남 | 8 | 580 | 58 | 506 | 16 | 0 |
| 전북·전남·경북·경남·제주 | 10 | 816 | 71 | 485 | 260 | 0 |
| 자사고(지역 폴더 없음) | 10 | 1148 | 255 | 658 | 230 | 5 |

| 유형 | 학교 수 | 파일 수 | 고유 SHA 수 |
|---|---:|---:|---:|
| 일반고 (`general-high-school`) | 50 | 4,022 | 3,986 |
| 자사고 (`autonomous-private-high-school`) | 10 | 1,148 | 1,146 |
| 합계 | 60 | 5,170 | 5,132 |

## 3. 학교별 목록 [원본 확인]

- 학년도별 수는 학년도 폴더 기준이다.
- 문서 유형 후보는 분석기 v3 규칙 판정이다(사람 확인 전) **[연구 기록]**.
- PDF 최대 쪽은 PDFBox로 센 쪽 수다. HWP·HWPX는 쪽 정보가 없어 `–`로 적었다.

| # | 폴더 ID | 학교명(파일명에서 확인) | 유형 | 지역(폴더) | 학생 수 | 파일 수 | PDF/HWP/HWPX/DOCX | 학년도별(2024/2025/2026) | 문서 유형 후보 | PDF 최대 쪽 | 원본 경로(`references/curriculum-plan/` 기준) |
|---:|---|---|---|---|---|---:|---|---|---|---:|---|
| 1 | `daeshin` | 대신고 | 일반고 | 서울 | 확인 불가 | 370 | 0/131/239/0 | 119/126/125 | 통합 370 | – | `general-high-school/seoul/daeshin/` |
| 2 | `gaepo` | 개포고 | 일반고 | 서울 | 확인 불가 | 18 | 9/9/0/0 | 6/6/6 | 통합 18 | 222 | `general-high-school/seoul/gaepo/` |
| 3 | `hanyoung` | 한영고 | 일반고 | 서울 | 확인 불가 | 346 | 0/341/5/0 | 113/114/119 | 통합 346 | – | `general-high-school/seoul/hanyoung/` |
| 4 | `jayang` | 자양고 | 일반고 | 서울 | 확인 불가 | 18 | 3/6/9/0 | 6/6/6 | 통합 18 | 224 | `general-high-school/seoul/jayang/` |
| 5 | `myeongji` | 명지고 | 일반고 | 서울 | 확인 불가 | 418 | 5/410/3/0 | 137/141/140 | 통합 409, 평가만 8, 기타·판독불가 1 | 12 | `general-high-school/seoul/myeongji/` |
| 6 | `poongmoon` | 파일명에 없음 | 일반고 | 서울 | 확인 불가 | 340 | 0/301/39/0 | 118/107/115 | 통합 336, 평가만 4 | – | `general-high-school/seoul/poongmoon/` |
| 7 | `samgaksan` | 파일명에 없음 | 일반고 | 서울 | 확인 불가 | 18 | 18/0/0/0 | 6/6/6 | 통합 18 | 212 | `general-high-school/seoul/samgaksan/` |
| 8 | `solsaem` | 파일명에 없음 | 일반고 | 서울 | 확인 불가 | 353 | 353/0/0/0 | 74/144/135 | 통합 229, 평가만 124 | 20 | `general-high-school/seoul/solsaem/` |
| 9 | `ansan` | 안산고 | 일반고 | 경기 | 확인 불가 | 14 | 14/0/0/0 | 6/6/2 | 통합 14 | 713 | `general-high-school/gyeong-gi/ansan/` |
| 10 | `bora` | 파일명에 없음 | 일반고 | 경기 | 확인 불가 | 49 | 3/46/0/0 | 16/27/6 | 통합 49 | 338 | `general-high-school/gyeong-gi/bora/` |
| 11 | `gaun` | 가운고 | 일반고 | 경기 | 확인 불가 | 18 | 15/3/0/0 | 6/6/6 | 통합 18 | 326 | `general-high-school/gyeong-gi/gaun/` |
| 12 | `gimpo` | 파일명에 없음 | 일반고 | 경기 | 확인 불가 | 18 | 6/12/0/0 | 6/6/6 | 통합 18 | 310 | `general-high-school/gyeong-gi/gimpo/` |
| 13 | `gwangmyeong` | 광명고 | 일반고 | 경기 | 확인 불가 | 14 | 0/6/8/0 | 2/6/6 | 통합 14 | – | `general-high-school/gyeong-gi/gwangmyeong/` |
| 14 | `hansol` | 한솔고 | 일반고 | 경기 | 확인 불가 | 6 | 6/0/0/0 | 2/2/2 | 통합 6 | 1046 | `general-high-school/gyeong-gi/hansol/` |
| 15 | `hyowon` | 효원고 | 일반고 | 경기 | 확인 불가 | 18 | 3/13/2/0 | 6/6/6 | 통합 18 | 341 | `general-high-school/gyeong-gi/hyowon/` |
| 16 | `juyeob` | 주엽고 | 일반고 | 경기 | 확인 불가 | 24 | 12/12/0/0 | 6/12/6 | 통합 17, 평가만 7 | 335 | `general-high-school/gyeong-gi/juyeob/` |
| 17 | `sejong` | 세종고 | 일반고 | 경기 | 확인 불가 | 80 | 6/12/62/0 | 6/68/6 | 통합 80 | 449 | `general-high-school/gyeong-gi/sejong/` |
| 18 | `unjeong` | 운정고 | 일반고 | 경기 | 확인 불가 | 18 | 18/0/0/0 | 6/6/6 | 통합 18 | 469 | `general-high-school/gyeong-gi/unjeong/` |
| 19 | `baekseok` | 파일명에 없음 | 일반고 | 인천 | 확인 불가 | 10 | 9/1/0/0 | 2/2/6 | 통합 10 | 654 | `general-high-school/incheon/baekseok/` |
| 20 | `gajeong` | 가정고 | 일반고 | 인천 | 확인 불가 | 26 | 0/18/8/0 | 12/2/12 | 통합 26 | – | `general-high-school/incheon/gajeong/` |
| 21 | `gajwa` | 가좌고 | 일반고 | 인천 | 확인 불가 | 61 | 0/52/9/0 | 20/21/20 | 통합 61 | – | `general-high-school/incheon/gajwa/` |
| 22 | `garim` | 가림고 | 일반고 | 인천 | 확인 불가 | 18 | 6/12/0/0 | 6/6/6 | 통합 17, 텍스트없음 1 | 306 | `general-high-school/incheon/garim/` |
| 23 | `daejin` | 대진고 | 일반고 | 부산·대구·대전·광주·울산 | 확인 불가 | 18 | 9/9/0/0 | 6/6/6 | 통합 18 | 319 | `general-high-school/busan·daegu·daejeon·gwangju·ulsan/daejin/` |
| 24 | `dongdaejeon` | 파일명에 없음 | 일반고 | 부산·대구·대전·광주·울산 | 확인 불가 | 18 | 13/5/0/0 | 6/6/6 | 통합 18 | 265 | `general-high-school/busan·daegu·daejeon·gwangju·ulsan/dongdaejeon/` |
| 25 | `gyeong-il` | 경일고 | 일반고 | 부산·대구·대전·광주·울산 | 확인 불가 | 18 | 18/0/0/0 | 6/6/6 | 통합 18 | 255 | `general-high-school/busan·daegu·daejeon·gwangju·ulsan/gyeong-il/` |
| 26 | `gyeseong` | 계성고 | 일반고 | 부산·대구·대전·광주·울산 | 확인 불가 | 67 | 15/47/5/0 | 55/6/6 | 통합 60, 평가만 7 | 388 | `general-high-school/busan·daegu·daejeon·gwangju·ulsan/gyeseong/` |
| 27 | `haegang` | 해강고 | 일반고 | 부산·대구·대전·광주·울산 | 확인 불가 | 19 | 19/0/0/0 | 7/6/6 | 통합 19 | 268 | `general-high-school/busan·daegu·daejeon·gwangju·ulsan/haegang/` |
| 28 | `maegok` | 매곡고 | 일반고 | 부산·대구·대전·광주·울산 | 확인 불가 | 27 | 0/25/2/0 | 9/12/6 | 통합 27 | – | `general-high-school/busan·daegu·daejeon·gwangju·ulsan/maegok/` |
| 29 | `munhyeon` | 문현고 | 일반고 | 부산·대구·대전·광주·울산 | 확인 불가 | 27 | 6/15/6/0 | 9/12/6 | 통합 27 | 218 | `general-high-school/busan·daegu·daejeon·gwangju·ulsan/munhyeon/` |
| 30 | `seogang` | 서강고 | 일반고 | 부산·대구·대전·광주·울산 | 확인 불가 | 18 | 18/0/0/0 | 6/6/6 | 통합 18 | 622 | `general-high-school/busan·daegu·daejeon·gwangju·ulsan/seogang/` |
| 31 | `suwan` | 수완고 | 일반고 | 부산·대구·대전·광주·울산 | 확인 불가 | 141 | 10/130/1/0 | 129/6/6 | 통합 140, 평가만 1 | 408 | `general-high-school/busan·daegu·daejeon·gwangju·ulsan/suwan/` |
| 32 | `woosong` | 우송고 | 일반고 | 부산·대구·대전·광주·울산 | 확인 불가 | 18 | 3/15/0/0 | 6/6/6 | 통합 18 | 150 | `general-high-school/busan·daegu·daejeon·gwangju·ulsan/woosong/` |
| 33 | `dajeong` | 다정고 | 일반고 | 세종·강원·충북·충남 | 확인 불가 | 219 | 5/208/6/0 | 139/74/6 | 통합 218, 기타·판독불가 1 | 451 | `general-high-school/sejong·gang-won·chungbug·chungnam/dajeong/` |
| 34 | `geumcheon` | 파일명에 없음 | 일반고 | 세종·강원·충북·충남 | 확인 불가 | 21 | 0/20/1/0 | 7/8/6 | 통합 21 | – | `general-high-school/sejong·gang-won·chungbug·chungnam/geumcheon/` |
| 35 | `goun` | 고운고 | 일반고 | 세종·강원·충북·충남 | 확인 불가 | 14 | 1/13/0/0 | 6/2/6 | 통합 14 | 508 | `general-high-school/sejong·gang-won·chungbug·chungnam/goun/` |
| 36 | `hoseo` | 호서고 | 일반고 | 세종·강원·충북·충남 | 확인 불가 | 18 | 17/1/0/0 | 6/6/6 | 통합 18 | 445 | `general-high-school/sejong·gang-won·chungbug·chungnam/hoseo/` |
| 37 | `jinkwang` | 진광고 | 일반고 | 세종·강원·충북·충남 | 확인 불가 | 18 | 18/0/0/0 | 6/6/6 | 통합 18 | 424 | `general-high-school/sejong·gang-won·chungbug·chungnam/jinkwang/` |
| 38 | `mukho` | 묵호고 | 일반고 | 세종·강원·충북·충남 | 확인 불가 | 17 | 17/0/0/0 | 6/5/6 | 통합 17 | 254 | `general-high-school/sejong·gang-won·chungbug·chungnam/mukho/` |
| 39 | `seolhwa` | 설화고 | 일반고 | 세종·강원·충북·충남 | 확인 불가 | 18 | 0/18/0/0 | 6/6/6 | 통합 18 | – | `general-high-school/sejong·gang-won·chungbug·chungnam/seolhwa/` |
| 40 | `seowon` | 서원고 | 일반고 | 세종·강원·충북·충남 | 확인 불가 | 255 | 0/246/9/0 | 126/123/6 | 통합 255 | – | `general-high-school/sejong·gang-won·chungbug·chungnam/seowon/` |
| 41 | `chungmu` | 충무고 | 일반고 | 전북·전남·경북·경남·제주 | 확인 불가 | 18 | 3/15/0/0 | 6/6/6 | 통합 18 | 151 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/chungmu/` |
| 42 | `geumo` | 금오고 | 일반고 | 전북·전남·경북·경남·제주 | 확인 불가 | 18 | 18/0/0/0 | 6/6/6 | 통합 18 | 334 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/geumo/` |
| 43 | `hanlim` | 한림고 | 일반고 | 전북·전남·경북·경남·제주 | 확인 불가 | 17 | 0/6/11/0 | 6/5/6 | 통합 16, 교수학습만 1 | – | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/hanlim/` |
| 44 | `honamjeil` | 호남제일고 | 일반고 | 전북·전남·경북·경남·제주 | 확인 불가 | 308 | 2/137/169/0 | 203/103/2 | 통합 221, 교수학습만 87 | 512 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/honamjeil/` |
| 45 | `hyeonil` | 현일고 | 일반고 | 전북·전남·경북·경남·제주 | 확인 불가 | 43 | 10/28/5/0 | 6/6/31 | 통합 43 | 160 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/hyeonil/` |
| 46 | `hyoam` | 효암고 | 일반고 | 전북·전남·경북·경남·제주 | 확인 불가 | 130 | 0/68/62/0 | 6/6/118 | 통합 126, 교수학습만 4 | – | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/hyoam/` |
| 47 | `jeju` | 파일명에 없음 | 일반고 | 전북·전남·경북·경남·제주 | 확인 불가 | 15 | 9/6/0/0 | 6/3/6 | 통합 15 | 577 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/jeju/` |
| 48 | `jinyang` | 진양고 | 일반고 | 전북·전남·경북·경남·제주 | 확인 불가 | 18 | 12/6/0/0 | 6/6/6 | 통합 18 | 302 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/jinyang/` |
| 49 | `semyeong` | 세명고 | 일반고 | 전북·전남·경북·경남·제주 | 확인 불가 | 18 | 17/1/0/0 | 6/6/6 | 통합 18 | 200 | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/semyeong/` |
| 50 | `wanju` | 완주고 | 일반고 | 전북·전남·경북·경남·제주 | 확인 불가 | 231 | 0/218/13/0 | 51/90/90 | 통합 231 | – | `general-high-school/jeonbug·jeonnam·gyeongbug·gyeongnam·jeju/wanju/` |
| 51 | `bugil` | 파일명에 없음 | 자사고 | (지역 폴더 없음) | 확인 불가 | 18 | 18/0/0/0 | 6/6/6 | 통합 18 | 400 | `autonomous-private-high-school/bugil/` |
| 52 | `gimcheon` | 김천고 | 자사고 | (지역 폴더 없음) | 확인 불가 | 366 | 0/346/20/0 | 131/130/105 | 통합 365, 평가만 1 | – | `autonomous-private-high-school/gimcheon/` |
| 53 | `hana` | 파일명에 없음 | 자사고 | (지역 폴더 없음) | 확인 불가 | 18 | 18/0/0/0 | 6/6/6 | 통합 18 | 323 | `autonomous-private-high-school/hana/` |
| 54 | `haneul` | 인천하늘고 | 자사고 | (지역 폴더 없음) | 확인 불가 | 18 | 18/0/0/0 | 6/6/6 | 통합 18 | 313 | `autonomous-private-high-school/haneul/` |
| 55 | `hcu-h` | 현대청운고 | 자사고 | (지역 폴더 없음) | 확인 불가 | 12 | 9/0/3/0 | 0/6/6 | 통합 12 | 361 | `autonomous-private-high-school/hcu-h/` |
| 56 | `paichai` | 파일명에 없음 | 자사고 | (지역 폴더 없음) | 확인 불가 | 127 | 127/0/0/0 | 3/118/6 | 기타·판독불가 119, 통합 8 | 540 | `autonomous-private-high-school/paichai/` |
| 57 | `pocheolhs` | 포항제철고 | 자사고 | (지역 폴더 없음) | 확인 불가 | 129 | 12/117/0/0 | 117/6/6 | 통합 124, 교수학습만 5 | 232 | `autonomous-private-high-school/pocheolhs/` |
| 58 | `sangsan` | 파일명에 없음 | 자사고 | (지역 폴더 없음) | 확인 불가 | 389 | 0/177/207/5 | 127/130/132 | 통합 366, 교수학습만 17, 기타·판독불가 6 | – | `autonomous-private-high-school/sangsan/` |
| 59 | `sehwa` | 세화고 | 자사고 | (지역 폴더 없음) | 확인 불가 | 18 | 0/18/0/0 | 6/6/6 | 통합 18 | – | `autonomous-private-high-school/sehwa/` |
| 60 | `whimoon` | 휘문고 | 자사고 | (지역 폴더 없음) | 확인 불가 | 53 | 53/0/0/0 | 18/17/18 | 통합 43, 평가만 10 | 167 | `autonomous-private-high-school/whimoon/` |

### 파일명에 학교명이 없는 13개교

`baekseok`, `bora`, `dongdaejeon`, `geumcheon`, `gimpo`, `jeju`, `poongmoon`, `samgaksan`, `solsaem`(일반고 9), `bugil`, `hana`, `paichai`, `sangsan`(자사고 4). 처음 판에서 8개교로 적었던 것은 집계 오류였다(위 표는 처음부터 13개교였음). 폴더 ID로 학교를 짐작할 수는 있지만, 원본 자료로 확인하지 못해 학교명을 적지 않았다 **[확인 불가]**.

## 4. 학교별 자료 결손

분석기 v3의 수집 상태 집계(학교 × 학년도 × 학년 × 학기 = 1,080 조합)는 다음과 같다 **[연구 기록]** `runs/v3-20261106/coverage.csv`·`stats.txt`.

| 상태 | 조합 수 | 뜻 |
|---|---:|---|
| COVERED | 933 | 해당 학년·학기 문서 있음 |
| UNKNOWN | 126 | 문서는 있으나 학년 판정 불가(여러 학년 통합 문서·학년 폴더 없음) |
| NOT_FOUND | 21 | 해당 조합 문서 없음 (일반고 12, 자사고 9) |

예: `hcu-h`는 2024학년도 폴더가 없다. `whimoon`·`hansol`·`gajeong`·`gajwa`는 모든 조합이 UNKNOWN이다(학년 통합 문서).
