# DB Migration 결과

## 1. 파일

`database/migrations/V202611110506__create_assessment_student_records.sql` — 버전은 작성 시각(UTC). 기존 4개 Migration은 수정하지 않았다.

## 2. 테이블

| 테이블 | 핵심 제약 |
|---|---|
| `assessment_note` | UNIQUE(student_id, source_type, source_id) — 수행평가당 노트 1개(재시도·두 탭 중복 방지). FK source_id → `assessment_school_assessment`. CHECK source_type = SCHOOL_ASSESSMENT. `version`(낙관적 잠금) |
| `assessment_note_revision` | UNIQUE(note_id, revision_number). FK note. `blocks_json` JSON, CHECK JSON_TYPE = ARRAY. **갱신 Column 없음**(Entity 전부 updatable=false) |
| `assessment_artifact` | FK source. `latest_version_number` + `version`(동시 업로드 시 번호 충돌 방지) |
| `assessment_artifact_version` | UNIQUE(artifact_id, version_number), UNIQUE(storage_key). CHECK size_bytes > 0, sha256 정규식. **불변** |
| `assessment_feedback_request` | UNIQUE(student_id, snapshot_key) — 같은 Snapshot 재요청 중복 방지. FK note_revision. CHECK status ∈ {PENDING, DELIVERED}, `(status=DELIVERED) = (delivered_at IS NOT NULL)` |
| `assessment_feedback_snapshot` | PK(request_id, artifact_version_id). FK 둘 다. INSERT만 |
| `assessment_feedback_reply` | PK request_id(요청당 1개). CHECK state ∈ {DRAFT, DELIVERED}, 전달 시각 쌍, comments/recommendations JSON 배열 |
| `assessment_growth_record` | FK related_source_id(nullable). CHECK 관련 활동 쌍(둘 다 null 또는 SCHOOL_ASSESSMENT+id), artifact_ids_json 배열 |
| `assessment_resource` | owner_type ∈ {STUDENT, ADMIN}, visibility ∈ {PRIVATE, PUBLISHED}, CHECK 학생 자료는 항상 PRIVATE, 공개 시각 쌍, tags/subject_ids JSON 배열 |
| `assessment_favorite` | PK(student_id, source_type, source_id), FK source |

- `student_id`는 기존 LearnersHigh 학생 ID 문자열이라 FK를 걸지 않았다(기존 Assessment 테이블과 같은 방식, API-OD-A01).
- ON DELETE CASCADE 없음. 삭제 Column·API 없음(삭제·보존 정책 OD-A11 미결).
- 이름 조정: 지시서의 `assessment_feedback_snapshot`은 "요청에 고정한 결과물 버전" 행으로 썼고, 노트 Revision 고정은 요청 행의 `note_revision_id`가 맡는다.

## 3. 적용·보존 검증

| Schema | 방법 | 결과 |
|---|---|---|
| 빈 MySQL (Testcontainers) | `StudentRecordApiTest` 시작 시 전체 Migration | 테이블 10개 생성 확인(테스트 PASS) |
| `lh_demo_pdf` (기존 PDF 시험 데이터: 계획서 2·Revision 3·분석 2·검토 1·확정값 2·수행평가 5) | 새 코드 `bootRun` 시작 | `Successfully applied 1 migration`. 적용 전후 행 수·`CHECKSUM TABLE`(revision·analysis_run·school_assessment) **동일**, Flyway 4 → 5 |
| `lh_demo_manual_20261111` (시연) | 새 jar로 18080 재시작 | 적용 1건. 수행평가 1건·Checksum 동일, Flyway 4 → 5, Student Care 테이블 무변경 |

- 새 빈 Schema를 따로 만들지 못했다: 개발 계정은 Schema 생성 권한이 없고, 컨테이너 root 자격증명 사용은 권한 정책으로 거부됐다(우회하지 않음). 빈 Schema 검증은 Testcontainers로 대신했다.
- CHECK 진리표·FK·UNIQUE 위반을 SQL로 하나씩 넣어 보는 별도 시험은 하지 않았다. 대신 API 통합 테스트로 중복 노트(409)·같은 Snapshot 재요청(같은 요청)·형식 거절 시 버전 번호·파일 미증가를 확인했다.
- D-1(HWP·HWPX 근거) Migration은 **적용하지 않았다**(`HWP-HWPX-REVIEW.md`).
