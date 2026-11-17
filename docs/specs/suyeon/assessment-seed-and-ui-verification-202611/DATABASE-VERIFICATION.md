# MySQL·Storage 저장 확인

## 1. 실행한 확인 (HTTP API를 통한 재조회)

DB 자격증명 탐색이 이 세션에서 거부돼(우회하지 않음) **SQL로 행을 직접 읽지는 못했다.** 대신 모든 항목을 등록 응답이 아닌 **별도 GET 재조회**로 확인했다. 아래 GET은 Spring Boot가 MySQL·File Storage에서 읽은 값이다.

| 항목 | 확인 방법 | 결과 |
|---|---|---|
| 수행평가 4건 | `GET /school-assessments/{id}` 제목·상태·과목 | PASS (IN_PROGRESS·BEFORE_START·IN_PROGRESS·COMPLETED) |
| NoteRevision v1·v2 | `GET /notes/{id}/revisions` 2건, `GET .../revisions/{v1}` 본문에 "오차 원인" 없음, 최신 = v2 | PASS (v1 불변) |
| ArtifactVersion | 다운로드(`/file`)·미리보기(`/preview`) 바이트 SHA-256 = 업로드 원본 (PDF v1·v2·PNG) | PASS — Storage 실제 파일 |
| 비교 | `GET /artifacts/{id}/compare?fromVersionId=v1&toVersionId=v2` | PASS |
| FeedbackSnapshot | 요청 직후 `snapshot` = {v2 Revision, [PDF v2], locked} | PASS |
| 초안 비노출 | 초안 저장 후 학생 `GET .../reply` → `reply: null` | PASS |
| 전달 | 학생 `reply.status = DELIVERED`, 최종 문구 일치. 관리자 상세 `snapshotRevision` = v2, `snapshotVersions[0]` = PDF v2 | PASS |
| 수행평가 상태 | 피드백 전달 후에도 A = IN_PROGRESS | PASS |
| 성장 기록 | 학생 재조회(관련 A·후속 활동), 관리자 `/students/stu_001/growth-records`에 같은 ID | PASS |
| 학생 자료 2·관리자 자료 2 | 목록 재조회, 관리자 A 공개 → 학생 `shared-resources`에 있음, B 비공개 → 없음 | PASS |
| 중요 표시 | `archive?tab=favorites`에 A·C | PASS |
| 삭제·복원 | 아래 §3 | PASS |
| 재실행 | 2회차 생성 0·재사용 17 | PASS (중복 없음) |

## 2. 기존 데이터 보존 (API 기준선 비교, Seed 전·후)

| 항목 | 전 | 후 |
|---|---|---|
| 2026-2 수행평가 | 1건 `assessment_2817030c…` "함께 읽고 싶은 책 나누기" BEFORE_START | **동일** |
| 2026-1 수행평가 | 0 | 4 (모두 [DEMO-1112]) |
| 학생 자료 / 성장 기록 / 피드백 / 관리자 스크랩 | 0 / 0 / 0 / 0 | 2 / 1 / 1 / 2 (모두 [DEMO-1112]) |
| 휴지통 | 비어 있음 | 비어 있음 (B는 복원됨) |
| 평가계획서(`school_001`) | 0 | 0 (손대지 않음) |

TRUNCATE·DELETE·Schema 변경·Migration·Flyway Repair·직접 INSERT는 하지 않았다. 삭제 동작은 이 작업이 만든 자료 B의 소프트 삭제 1회(복원 완료)뿐이다.

## 3. 삭제·휴지통·복원 (자료 B)

1. 활성 목록에 있음 → 2. `DELETE /resources/{B}` → 3. 활성 목록에서 빠짐 → 4. `archive?tab=trash`에 `deletedAt`과 함께 표시 → 5. `POST /archive/restore {RESOURCE, B}` → 6. 같은 ID로 목록 재표시 → 7. NoteRevision 2건·ArtifactVersion [v1,v2]·Snapshot 원문 그대로. 영구 삭제는 하지 않았다.
(2회차 실행에서 같은 절차를 한 번 더 수행했다 — 결과 동일, 최종 상태는 활성.)

## 4. SQL 직접 대조 — 사용자 실행 대기

`scripts/verify-seed.sql`: SELECT만 있다(쓰기 없음). 각 테이블의 [DEMO-1112] 행, Snapshot 행, 답변 상태, `deleted_at`, 비데모 행 수, Flyway 적용 수를 보여준다.

```powershell
Get-Content docs\specs\suyeon\assessment-seed-and-ui-verification-202611\scripts\verify-seed.sql |
  docker exec -i learnershigh-mysql mysql -u <MYSQL_USER> -p lh_demo_manual_20261111 --table
```

기대값: 수행평가 4·note_revision 2(v2만 `has_error_section=1`)·artifact 2·artifact_version 3·feedback_snapshot 1(PDF v2)·feedback_reply state=DELIVERED·growth 1·resource 4(STUDENT 2, ADMIN 2: 공개 1)·favorite 2, 모든 `deleted_at` NULL, Flyway 8. 결과가 나오면 이 절에 붙인다.
