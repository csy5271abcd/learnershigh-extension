# 계정 B 합성 HWPX × 계정 B Adapter 실제 E2E (2026-11-10)

> 합성 자료(가상 학교). HWPX 검토 확정은 정책상 차단돼 실행하지 않았다.

## 1. 입력 (계정 B, 읽기 전용)

| 항목 | 값 |
|---|---|
| 원본 | `runs/v21-multiformat-backend-bridge-20261110/synthetic/synthetic-plan.hwpx` (36,644 byte) |
| SHA-256 (직접 계산) | `37fc6eb82d3a15c94bf2309cbc467cb4c6d768f9f8126d395b909d576c1b8b84` — 인계값과 같음 |
| 패키지 | ZIP 서명, Backend 등록 검사(`mimetype=application/hwp+zip`, `Contents/section*.xml`, 경로 이탈·압축 해제 한도) 통과 |
| Adapter JSON | `synthetic-results/SYNHWPX.experimental-import.json` — 계정 B `multiformat_adapter.py` 출력, SHA-256 `4c67c3ae…` |
| Payload 내용 | HWP와 같은 평가 내용(과목 1·지필 W01·수행 P01·P02, 제출물·조건·채점 동일) |
| Locator | 30개 모두 `HWPX_TABLE_CELL` |
| 개인 메타데이터 | HWP와 같음(원본 미복사, 보고서 미기재, Payload에는 없음) |

## 2. 결과 (최종 빌드, HWPX 41건 = 흐름 22 + 오류·보안 19, 모두 PASS)

HWP와 같은 절차(`HWP-ADAPTER-E2E.md` §3)로 같은 결과를 얻었다. 다른 점만 적는다.

| 단계 | 결과 |
|---|---|
| 업로드 | 201, DB `content_type=application/hwp+zip`, `page_count` NULL, 크기 36,644, `file_ref` NULL |
| 관리자 응답 | `documentFormat=HWPX`, `pageCount=null`, `checksum` = 원본 SHA-256, 카드 "HWPX · 실험" |
| 수신·재전송 | 201 → 200(같은 `analysisId`), Run 1, Review 0, 저장 JSON = Adapter `subjects` |
| Locator | `HWPX_TABLE_CELL` 보존, HWP kind 섞임 없음 |
| 해시 대조 | 다른 형식 원본(HWP) → 불일치 / 등록 원본 → 일치 + "브라우저는 HWPX를 열지 못해요" |
| 확정·학생 | 확정 비활성·직접 PUT `review_not_supported` / 학생 후보 미노출 |
| 오류·보안 | HWP와 같은 19건(형식·Locator·공통 규칙 14 + 다른 형식 Revision 1 + 인증·권한 3 + Run 중복 없음 1) 모두 거절·저장 없음. kind 교차는 `HWP_TABLE_CELL`로 시험 |

학생 공식 항목 참조 시험은 HWP(1학기 문서)에서만 했다. HWPX는 2학기 칸에 올렸고, 학생 Mock 학업 정보(2학기 과목 `subj_01~04`)와 과목이 달라 같은 시험을 반복하지 않았다.

## 3. 계정 A 임시 변환기(지난 작업) 결과와의 차이

| 항목 | 계정 A 임시 변환기(`assessment-multiformat-202611`) | 계정 B Adapter(이번) |
|---|---|---|
| 원본 | 계정 A 생성 HWPX(SHA `19cd28b6…`, 내용 '과학') | 계정 B 생성 HWPX(SHA `37fc6eb8…`, 내용 '가상과학탐구') |
| `analyzer.version` | `v21.1/backend-adapter-0.2+a-draft` | `v21.1/multiformat-adapter-0.1-draft` |
| Locator 필드 | kind·section·path·table·row·col·rowSpan·colSpan | 같음 |
| 채점 요소 근거 | 비움 | 계정 B가 칸 근거를 채움(`rubric[].sources`) |
| 상위 비율 근거 | 1개 | 1개 |
| 서버 수용 | 201 | 201 |

필드 이름·구조는 같아 Backend DTO와 충돌이 없었다. 계정 B JSON은 손대지 않았다.
