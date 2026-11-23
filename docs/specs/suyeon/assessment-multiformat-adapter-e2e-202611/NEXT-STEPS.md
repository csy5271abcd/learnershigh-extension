# 다음 단계 (2026-11-10 기준)

## 1. 11월 12일 시연

- 실험 기능은 **꺼진 기본 설정**으로 둔다. PDF P0 흐름으로 시연한다.
- HWP·HWPX를 보여야 하면 로컬 전용으로 `ASSESSMENT_ANALYSIS_IMPORT_ENABLED=true ASSESSMENT_MULTIFORMAT_EXPERIMENTAL=true`(Backend) + `VITE_ASSESSMENT_DEV_MULTIFORMAT=true`(Admin)로 켜고, "실험 · 확정 불가"임을 함께 안내한다.
- 시연 직전 Docker Desktop 상태를 확인한다(이번 작업 중 Docker가 모든 MySQL 컨테이너를 한꺼번에 종료한 일이 있었다).

## 2. 운영 전 필요한 승인

| 항목 | 내용 |
|---|---|
| 공식 계약 | M-1~M-8(형식·Locator·path 규칙·필드 이름) |
| DB Migration | D-1(확정값 근거 위치) |
| 원문 대조 수단 | 관리자가 HWP·HWPX 원문 위치를 믿을 수 있게 확인하는 방법 |
| 원본 Storage | API-OD-A03 — 보관하면 서버가 위치·원문을 대조할 수 있음 |
| 실제 학교 문서 반입 | 담당자 승인·로컬 범위 |

## 3. HWP·HWPX 검토 확정 지원 순서

1. D-1 Migration + 확정 요청에 `documentLocator` 근거 수용
2. 원문 대조 수단 확정 → 확정 버튼 활성 조건 설계(PDF의 쪽 대조에 해당)
3. `review_not_supported` 해제, 학생 공식 항목 참조 허용
4. Cross-format 시험(같은 내용의 PDF·HWP·HWPX 확정값 비교)

## 4. 그 밖의 후속 과제

- 개인 메타데이터 없는 합성 HWP·HWPX Fixture로 저장소 안 자동 통합 테스트(계정 B 협조)
- `adapter-e2e.mjs`를 공용 E2E로 옮길지(Shared 승인)
- HWP 등록 검사 강화(OLE 디렉터리 해석) 여부
- 실제 인증·학업 Context·운영 권한 연결(기존 항목)
- 노트·결과물·피드백 Backend(기존 항목)
