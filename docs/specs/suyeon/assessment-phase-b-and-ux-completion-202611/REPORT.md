# Phase B 공식 검토 · 학생 화면 보기 · 결과물 미리보기/비교 · 휴지통 · 과목별 추천 자료원 — 결과 (2026-11-11 밤 ~ 11-12 새벽)

> 이전 보고서(`assessment-db-integration-202611/`)는 덮어쓰지 않았다. Commit·Push·Merge 하지 않았다.

## 1. 기능별 완료 현황

| 기능 | Backend API | MySQL/Storage | Student UI | Admin UI | E2E | 상태 |
|---|---|---|---|---|---|---|
| HWP 공식 검토 | 구현 (형식별 검증) | D-1 + 무결성 Migration | 확정 상태만 표시(기존) | 검토 화면 공용(HWP Locator) | 통합 테스트만(서명 검사용 합성 HWP). 브라우저 E2E 없음 | **구현 완료·개발 전용**, 운영 인증 대기 |
| HWPX 공식 검토 | 구현 | 같음 | 확정 상태만 | 원본 SHA 대조·위치 선택·명시적 확인·검토 기록 | 브라우저 E2E 포함 44/44 | **실제 E2E 완료(개발 전용)**, 운영 인증 대기 |
| 관리자 학생 화면 보기 | `.../students/{id}/student-view/**` (GET만) | 기존 테이블 | Student 화면 재사용(읽기 전용) | 기존 탭 연결 | 44/44 안 6단계 | **실제 E2E 완료** |
| PDF 미리보기 | `/preview` (SHA 확인) | 기존 로컬 Storage | 전체 페이지 Viewer | 기록 도구 안 미리보기 | 44/44 안 4단계 | **실제 E2E 완료** |
| 이미지 미리보기 | 같음 (PNG·JPEG·GIF) | 같음 | 폭 맞춤·확대·스크롤 | 같음 | 2단계 | **실제 E2E 완료** |
| 결과물 버전 비교 | `/compare` (METADATA_ONLY) | — | 좌우 비교 + 파일 정보 표 | 기록 도구 비교 http 연결 | 3단계 | **실제 E2E 완료** (내용 Diff 없음 — 한계) |
| 삭제·휴지통 | DELETE 4종 + 관리자 1종 | soft delete Migration | 수행평가·결과물·자료·성장 기록 | 참고자료 휴지통 | 4단계 + Snapshot 2단계 | **실제 E2E 완료** |
| 복원 | `POST /archive/restore`, 관리자 restore | 같음 | 보관함 휴지통 탭 | 참고자료 휴지통 | 포함 | **실제 E2E 완료** |
| 과목별 추천 자료원 | 서버 API 없음(정적 카탈로그) | 저장만 §22 자료 API | 과목 선택·유형 필터·검색·링크·저장 | 기존 추천 사이트 탭 + 스크랩·공개 | 3단계 + 공개 2단계 | **실제 E2E 완료** (정적 원천) |

## 2. 요약

- **HWP·HWPX 근거 없는 확정 불가:** 원본 SHA 불일치, 다른 Run·과목, 다른 항목의 Locator, 중복·비정규 fieldPath, 근거 없는 필드, 수동 대조 확인 없음을 모두 400으로 막고 기록을 남기지 않는다.
- **운영 보호:** 시연 Backend(18080)를 포함한 기본 설정은 `structured-confirm-dev=false`다. HWP·HWPX 확정은 `verified_auth_required`로 거절한다. 합성 시험 Backend에서만 켰고, 그 기록에는 `reviewer_auth=MOCK_HEADER`가 남는다.
- **PDF 하위 호환:** 응답 JSON은 바뀌지 않았다. 기존 확정값 2건은 `evidence_format=PDF`로 Backfill했고 Checksum이 같다. 같은 fieldPath 중복과 `[01]` 같은 색인은 이제 거절한다.
- **학생 화면 보기:** 학생 Header로 가장하지 않는다. iframe의 Student 화면이 GET만 관리자 전용 경로로 보내고, 서버가 담당 지점을 확인한다. 다른 지점이면 404, 학생 Header로 접근하면 401이다.
- **휴지통:** 소프트 삭제만 한다. 노트 Revision, 결과물 Version, 피드백 Snapshot·답변, 실제 파일은 그대로 둔다. 자동 영구 삭제는 없다.
- **메모리:** 시작할 때 사용 가능 메모리는 약 1.7GB, 진행 중에는 2.1~2.4GB였다. 서버 세트는 한 번에 하나만 띄웠다(격리 → 회귀 → 시연 순서로 교체).

## 3. 승인 기록

사용자가 전달한 승인(DB·API·Storage·Phase B Gate 1~3·결정 1~6·Shared·Wangyu)을 근거로 진행했다. 저장소에서 Wangyu 서명이나 GitHub Review는 확인하지 못했고, 만들지도 않았다. `/database/`·`docs/api/` 공동 Review 기록은 PR 단계에서 남겨야 한다.

## 4. 문서

`HWP-HWPX-PHASE-B.md` · `ADMIN-STUDENT-VIEW.md` · `ARTIFACT-PREVIEW.md` · `ARTIFACT-COMPARISON.md` · `TRASH-AND-RESTORE.md` · `SUBJECT-RECOMMENDATIONS.md` · `API-DB-CHANGES.md` · `CROSS-SURFACE-E2E.md` · `REGRESSION-RESULT.md` · `DEMO-RUNBOOK.md` · `NEXT-STEPS.md` · `scripts/`
