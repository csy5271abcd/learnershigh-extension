# HWP·HWPX 통합 검증 결과 (2026-11-10)

> 합성 자료만 사용했다. 실제 학교 HWP·HWPX는 DB에 넣지 않았다. 검토 확정은 HWP·HWPX에서 차단돼 실행하지 않았다(사람 검토 기록 없음).

## 1. 도달 범위

```text
합성 HWPX ──▶ 계정 B 실제 HWPX 파서·분석기(v21.1, 무수정) ──▶ [계정 A 임시 변환기] ──▶ Backend HTTP ──▶ MySQL 후보 ──▶ 관리자 조회(브라우저)
                                                        ╰─ 계정 B Adapter는 FORMAT_NOT_ACCEPTED로 차단(현재 계약 기준)
```

| 단계 | 상태 |
|---|---|
| 합성 HWPX 생성 | 계정 A 생성기(B 테스트의 XML 규칙) — SHA-256 `19cd28b6…` |
| 실제 분석기 | **실제 실행**: 문서 `PARTIAL`, 구간 `과학` 1개, W01·P01·P02 추출, 쪽 수 없음 |
| Adapter | 계정 B Adapter 결과는 차단(`FORMAT_NOT_ACCEPTED`, `PAGE_COUNT_MISSING`). **계정 A 임시 변환기**가 B의 `shapePreview` 값 + B DocumentModel 실제 locator로 초안 JSON을 만듦 |
| HTTP·MySQL | **실제 확인**(로컬 Docker MySQL `lh_assessment_mf2`, 실험 기능 켬) |
| 관리자 화면 | **브라우저 확인**(Chrome + Playwright, Admin http 개발 서버) |
| HWP | **실제 파일 E2E 없음**(실제 파서로 읽히는 합성 HWP 파일 없음). 서명 검사용 합성 바이트로 등록 검사만 |

## 2. 실제 서버·브라우저 결과 (최종 빌드 18/18 PASS)

| # | 확인 | 결과 |
|---|---|---|
| 1 | 개발 Flag에서 업로드 선택이 `.hwp`·`.hwpx` 허용 | 통과 |
| 2 | 암호 HWP(서명 합성 바이트) 업로드 → 415, 저장 없음 | 통과 |
| 3 | 합성 HWPX 업로드 → DB `content_type=application/hwp+zip`, `page_count` NULL, SHA-256 일치, `file_ref` NULL | 통과 |
| 4 | 문서 카드 "HWPX · 실험" | 통과 |
| 5 | 초안 수신 201 `REVIEW_REQUIRED`·`UNREVIEWED` | 통과 |
| 6 | 같은 요청 재전송 200, Run 1, Review 0 | 통과 |
| 7 | DB 후보에 `documentLocator`(`HWPX_TABLE_CELL`) 저장, 쪽 번호 값 없음 | 통과 |
| 8 | DB 후보 = 보낸 초안(null 제외 비교) | 통과 |
| 9 | HWPX Revision에 PDF 형식 결과 → 400 `format_mismatch`·`pageCount not_allowed`, 저장 없음 | 통과 |
| 10 | 관리자 조회: 과학·탐구 보고서·발표 활동 | 통과 |
| 11 | HWPX 실험 표시 + 확정 불가 이유 | 통과 |
| 12 | 근거를 쪽이 아니라 위치로 표시(예: "구역 0 · 표 1 · 3행 3열 · 경로 p3.c0.r2c2 — 1차 시험(50%)") | 통과 |
| 13 | 다른 파일 선택 → 해시 불일치 | 통과 |
| 14 | 등록 HWPX 선택 → 해시 일치, 브라우저 보기 없음, "확정하지 않아요" 안내 | 통과 |
| 15 | 해시 일치·필드·과목 ID가 있어도 확인 체크·확정 비활성 | 통과 |
| 16 | 화면에서 PUT review 없음 | 통과 |
| 17 | 서버 직접 PUT review → 400 `review_not_supported`, Review 0, `UNREVIEWED` | 통과 |
| 18 | 학생: `UNREVIEWED`, 후보·위치 미노출 | 통과 |

같은 흐름의 1차 실행(Fixture 버전 문자열 수정 후, NON_NULL 수정 전 빌드)도 18/18이었다.

## 3. Testcontainers 통합 테스트

`MultiformatExperimentalApiTest` 4건·`MultiformatDisabledApiTest` 1건 통과(`BACKEND-IMPLEMENTATION.md` §5).

## 4. 작업 중 문제

| # | 증상 | 원인 | 조치 |
|---|---|---|---|
| 1 | 초안 수신이 400 `analyzer.version: size` | 임시 변환기가 버전에 붙인 표시가 서버 제한(50자) 초과 | 변환기 표시를 `+a-draft`로 줄임(서버 제한 유지) |
| 2 | **PDF 회귀**: 저장 JSON이 보낸 값과 달라짐 | 새 필드가 null로 직렬화(`"documentLocator": null`) → 응답 Shape·재전송 해시 변화 | 새 필드만 `@JsonInclude(NON_NULL)`. 변경 전 서버와 해시 동일 확인 + 회귀 단언 추가 |
| 3 | (설계) 채점 요소 근거 | 변환기 초안이 항목 근거를 채점 요소에 복사 | 실제 근거가 아닌 연결이라 제거(빈 배열 유지) |

## 5. 검증하지 않은 것

- 계정 B Adapter가 직접 만든 HWP·HWPX 수신 JSON(Adapter 변경 전)
- 실제 HWP 바이너리 파일의 등록·분석·수신
- HWP·HWPX 검토 확정(차단)
- 위치(`section`·`path`)가 실제 문서에 있는지 서버 대조(원본 미보관)
- 운영 환경
