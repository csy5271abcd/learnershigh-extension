# 미완료 조건과 필요한 승인 (2026-11-11)

> 사용자의 작업 지시는 Shared 공동 승인(Wangyu)을 대체하지 않는다. 아래 항목은 승인 기록이 없어 **변경하지 않았다.**
> 확인한 승인 기록: `assessment-demo-final-check-202611/PHASE-B-APPROVAL-PACKET.md` — "반려된 Gate는 없다. 승인된 Gate도 없다."

## B-1. 학생 기록 테이블 (P0 핵심 흐름의 막힘) — Shared `database/**`, 승인자 Suyeon + Wangyu

노트·수정 이력·결과물·피드백·성장 기록·자료함·즐겨찾기를 실제 MySQL에 저장하려면 새 Flyway Migration이 필요하다. `docs/OWNERSHIP.md` §9·CODEOWNERS상 `/database/`는 `@suyeon @wangyu` 공동 영역이다.

| 필요한 테이블(초안) | 계약 근거 | 비고 |
|---|---|---|
| `assessment_note`, `assessment_note_revision` | api-contract §19~21 (DRAFT) | Revision 불변, 낙관적 잠금(OD-A04 자동 저장 간격 미정) |
| `assessment_artifact`, `assessment_artifact_version` | §24·25 | Version 불변, SHA-256, B-2 필요 |
| `assessment_feedback_request`, `…_snapshot`, `…_reply` | §31·32·ADR-0009 | Snapshot 불변, 초안/전달 분리 |
| `assessment_growth_record` | §29 | |
| `assessment_resource`, `assessment_favorite` | §22·30 | 관리자 공개 자료 포함 시 AD-07·08 |

필요한 결정: 위 Entity·Enum·API의 최종 확정(OD 목록 "Assessment 신규 Entity / Enum / API의 최종 확정"), Migration 작성·리뷰, Idempotency-Key 정책(§16 testing).
진행 방법: Migration 초안 + `api-contract.md` 확정 구간을 PR로 만들어 Wangyu Review → 승인 후 Backend(assessment 패키지, Suyeon 소유) 구현 → Frontend Adapter 교체.

## B-2. File Storage — API-OD-A03

결과물 파일 실제 바이트 저장·다운로드, 평가계획서 원본 보관. 정할 것: Provider(로컬 격리 폴더/객체 저장소), 경로 규칙, 보관 기간·삭제, 다운로드 권한 검사(학생 본인·담당 관리자), 크기·형식 제한, 바이러스 검사 여부. **승인 전에는 "파일 정보만 저장" 방식도 만들지 않는다**(지시서 §7).

## B-3. Phase B (HWP·HWPX 공식 확정)

Gate 1 API M-1~M-7(결정 1·2·3·5 반영 후), Gate 2 D-1 Migration, Gate 3 원문 수동 검토 A안. 지시서 §20의 6개 방향(evidence_scope_unavailable, PDF 하위 호환, 구조 근거 없는 비율 확정 차단, Mock 인증 확정 차단, fieldPath 색인·중복 확정 방지, D-1 JSON·CHECK)은 패킷에 정리돼 있으나 **서명이 없다**. 현재: 확정 버튼 비활성·Backend `review_not_supported` 유지(이번 15/15×2로 재확인).

## B-4. 분석 수신 Endpoint 계약 (C-10, PROPOSED)

Admin 자동 분석은 기존 `POST …/revisions/{revisionId}/analysis-imports`(Backend에는 있음, `assessment.analysis-import.enabled=true`일 때만)를 쓴다. `api-contract.md`에는 아직 없다. 공식화하려면 Shared 계약 반영이 필요하다. 분석기 서비스 계약 `analyze-preview-0.1-dev`도 계정 B 내부 계약이다.

## B-5. 실제 인증·학업 Context — API-OD-A01·OD-A04

학생·관리자 모두 개발용 Mock Header. 관리자 담당 범위도 Mock 설정. 운영 확정 전 기존 LearnersHigh 인증 연동 필요.

## B-6. 관리자 학생 목록 API

Admin "학생 Assessment" 목록(`listStudents`)·학생 상세·활동 현황은 Backend가 없다(학생 원천이 기존 LearnersHigh — Integration Boundary). 학생별 수행평가 조회 API만 있다.

## B-7. 회귀 기준선 전체 재실행 조건

- 브라우저·HTTP 회귀 6종은 **새 빈 Schema**가 필요하다. 개발 계정 `learnershigh`는 Schema별 권한만 있어 새 Schema를 만들 수 없고, root 비밀번호가 있는 `.env` 읽기는 허용되지 않았다. → 사용자가 아래를 실행하거나 root 사용을 허락해 주면 바로 돌릴 수 있다.

```powershell
docker exec -i learnershigh-mysql mysql -uroot -p -e "
CREATE DATABASE lh_regress_v211_1112 CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE lh_regress_off_1112  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE lh_regress_pdf_1112  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE lh_regress_mf_1112   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
GRANT ALL PRIVILEGES ON lh_regress_v211_1112.* TO 'learnershigh'@'%';
GRANT ALL PRIVILEGES ON lh_regress_off_1112.*  TO 'learnershigh'@'%';
GRANT ALL PRIVILEGES ON lh_regress_pdf_1112.*  TO 'learnershigh'@'%';
GRANT ALL PRIVILEGES ON lh_regress_mf_1112.*   TO 'learnershigh'@'%';"
```

- 브라우저 회귀(S7)는 5173이 **분석 Flag OFF**일 때의 버튼 이름 "PDF로 가져오기"를 기대한다. 지금 5173은 사용자 요청으로 Flag ON이므로, 회귀는 Flag OFF Student(`run-student-http-dev.ps1`)로 돌려야 한다.
