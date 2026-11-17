-- [DEMO-1112] 합성 데이터 MySQL 대조 (읽기 전용 SELECT만, 쓰기 없음).
-- 대상 Schema: lh_demo_manual_20261111. 실행 예(비밀번호는 프롬프트로 입력, 명령줄·로그에 남기지 않음):
--   Get-Content verify-seed.sql | docker exec -i learnershigh-mysql mysql -u <MYSQL_USER> -p lh_demo_manual_20261111 --table
SELECT DATABASE() AS current_schema;

SELECT '1 school_assessment' AS check_item, id, student_id, academic_year, semester, subject_id, title, status, deadline_date, deleted_at
  FROM assessment_school_assessment WHERE title LIKE '[DEMO-1112]%' ORDER BY created_at;

SELECT '2 note' AS check_item, n.id, n.source_id, n.latest_revision_id, n.latest_revision_number
  FROM assessment_note n JOIN assessment_school_assessment s ON s.id = n.source_id WHERE s.title LIKE '[DEMO-1112]%';
SELECT '2 note_revision' AS check_item, r.id, r.note_id, r.revision_number, r.title, CHAR_LENGTH(r.blocks_json) AS blocks_chars,
       (r.blocks_json LIKE '%오차 원인%') AS has_error_section, r.saved_at
  FROM assessment_note_revision r JOIN assessment_note n ON n.id = r.note_id
  JOIN assessment_school_assessment s ON s.id = n.source_id WHERE s.title LIKE '[DEMO-1112]%' ORDER BY r.revision_number;

SELECT '3 artifact' AS check_item, a.id, a.title, a.latest_version_number, a.deleted_at
  FROM assessment_artifact a WHERE a.title LIKE '[DEMO-1112]%';
SELECT '3 artifact_version' AS check_item, v.id, v.artifact_id, v.version_number, v.file_name, v.content_type, v.size_bytes, v.storage_key, v.uploaded_at
  FROM assessment_artifact_version v JOIN assessment_artifact a ON a.id = v.artifact_id WHERE a.title LIKE '[DEMO-1112]%' ORDER BY v.artifact_id, v.version_number;

SELECT '4 feedback_request' AS check_item, f.id, f.source_id, f.note_revision_id, f.status, f.requested_at, f.delivered_at
  FROM assessment_feedback_request f JOIN assessment_school_assessment s ON s.id = f.source_id WHERE s.title LIKE '[DEMO-1112]%';
SELECT '4 feedback_snapshot' AS check_item, fs.request_id, fs.artifact_version_id, fs.position
  FROM assessment_feedback_snapshot fs JOIN assessment_feedback_request f ON f.id = fs.request_id
  JOIN assessment_school_assessment s ON s.id = f.source_id WHERE s.title LIKE '[DEMO-1112]%';
SELECT '4 feedback_reply' AS check_item, fr.request_id, fr.admin_id, fr.state, LEFT(fr.overall_comment, 40) AS comment_head, fr.draft_saved_at, fr.delivered_at
  FROM assessment_feedback_reply fr JOIN assessment_feedback_request f ON f.id = fr.request_id
  JOIN assessment_school_assessment s ON s.id = f.source_id WHERE s.title LIKE '[DEMO-1112]%';

SELECT '5 growth_record' AS check_item, id, student_id, title, related_source_type, related_source_id, artifact_ids_json, deleted_at
  FROM assessment_growth_record WHERE title LIKE '[DEMO-1112]%';

SELECT '6/8 resource' AS check_item, id, owner_type, owner_id, type, title, source_url, visibility, published_at, deleted_at
  FROM assessment_resource WHERE title LIKE '[DEMO-1112]%' ORDER BY owner_type, created_at;

SELECT '7 favorite' AS check_item, fv.student_id, fv.source_type, fv.source_id, fv.created_at
  FROM assessment_favorite fv JOIN assessment_school_assessment s ON s.id = fv.source_id WHERE s.title LIKE '[DEMO-1112]%';

-- 보존 확인: [DEMO-1112] 밖 기존 행 수 (Seed 전후 값이 같아야 한다)
SELECT 'preserve' AS check_item,
  (SELECT COUNT(*) FROM assessment_school_assessment WHERE title NOT LIKE '[DEMO-1112]%') AS other_assessments,
  (SELECT COUNT(*) FROM assessment_artifact_version v JOIN assessment_artifact a ON a.id = v.artifact_id WHERE a.title NOT LIKE '[DEMO-1112]%') AS other_versions,
  (SELECT COUNT(*) FROM assessment_feedback_request) AS all_feedback_requests,
  (SELECT COUNT(*) FROM assessment_plan_revision) AS plan_revisions,
  (SELECT COUNT(*) FROM assessment_plan_confirmed_value) AS plan_confirmed_values;
SELECT 'flyway' AS check_item, COUNT(*) AS applied, MAX(version) AS latest FROM flyway_schema_history WHERE success = 1;
