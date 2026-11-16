# 다음 단계 (2026-11-10 기준)

## 1. 11월 12일 오전까지

- 실험 기능은 **꺼진 상태(기본)** 로 둔다. PDF P0 시연은 기본 설정으로 한다.
- 마감 직전 `scripts/verify-backend.ps1`, `scripts/verify-frontend.ps1` 재실행.

## 2. 계정 B와

1. 초안(`../assessment-multiformat-integration-draft.md`) 검토 → 필드 이름 합의
2. Adapter가 HWPX 결과를 `documentLocator`로 직접 출력 → 계정 A 임시 변환기 대신 B 출력으로 Fixture 교체, `MultiformatExperimentalApiTest`·`hwpx-browser-e2e.mjs` 재실행
3. 실제 파서로 읽히는 합성 HWP 파일 확보 방법(계정 B의 HWP 합성 생성 가능 여부) → HWP E2E

## 3. 승인 후

| 순서 | 작업 |
|---|---|
| 1 | M-1~M-3 계약 반영 → 실험 필드를 정식 필드로 |
| 2 | D-1 Migration → HWP·HWPX 검토 확정 근거 저장, `review_not_supported` 해제 |
| 3 | P-1 원문 위치 대조 수단 → 관리자 확정 허용 조건 설계 |
| 4 | P-2 Storage → 서버 Locator·원문 대조 |
| 5 | 실험 기능 운영 활성화(P-5) |

## 4. 운영 전 필수

- 실제 인증·학업 Context·운영 권한 연결(기존 항목)
- HWP 구조 검사 강화(OLE 디렉터리 해석) 또는 분석기 `PARSE_FAILED` 연계 확인
- HWPX 검사 한도 운영값 결정, 대용량 업로드 성능 확인
- 실제 학교 HWP·HWPX 샘플(승인 범위)로 분석 정확도 확인
