# API 계약 반영 결과

`docs/api/api-contract.md`에 **§62-1 "학생 기록 실데이터 구현 반영 (2026-11-11)"**을 추가했다. 기존 절(§20~§45 등)과 Student Care(§65)는 수정하지 않았다.

## 기존 절 Shape 그대로 구현

§20·21 노트·Revision, §22 자료함, §24·25·26 결과물·버전·원본 파일, §29 성장 기록, §30 보관함·중요 표시, §31·32 피드백 요청·답변, §35·36 관리자 노트·결과물 읽기, §43 참고자료실, §44·45 관리자 피드백 목록·상세·초안·전달.

Frontend 계약 Type(`frontend/student/.../api/types.ts`, `frontend/admin/.../api/types.ts`)의 필드명과 같은 JSON을 돌려준다(Mock·http 같은 Shape). 오류 code는 §53 목록만 사용: `NOTE_NOT_FOUND`, `NOTE_REVISION_NOT_FOUND`, `RESOURCE_VERSION_CONFLICT`, `ARTIFACT_NOT_FOUND`, `ARTIFACT_VERSION_NOT_FOUND`, `FILE_VERSION_MISMATCH`, `FILE_TOO_LARGE`, `UNSUPPORTED_FILE_TYPE`, `FEEDBACK_REQUEST_NOT_FOUND`, `FEEDBACK_ALREADY_DELIVERED`, `ASSESSMENT_NOT_FOUND`, `VALIDATION_ERROR`, `NOT_FOUND`.

## 새로 추가

| Endpoint | 이유 |
|---|---|
| `GET /api/student/assessment/shared-resources` | 관리자 공개 자료의 학생 조회(지시서 §14) — 기존 계약에 학생 쪽 조회 경로가 없었다 |
| `PUT /api/admin/assessment/reference-library/{scrapId}/visibility` | 공개/비공개(기본 비공개) |
| `GET /api/admin/assessment/students`, `/students/{id}`, `/students/{id}/school-assessments/{assessmentId}`, `/students/{id}/growth-records` | §34는 목록·상세 경로만 있고 응답 Shape이 없었다. Admin 화면 Type에 맞춘 Shape을 기록 |
| 응답 필드 `published`, `publishedAt`(스크랩), `subjectIds`(학생 자료), `previewSupported`(관리자 버전) | 화면 표시용 |

## 하지 않음

C-10 분석 수신 Endpoint의 계약 본문 등록(Backend에는 PROPOSED로 존재), HWP·HWPX M-1~M-7, 결과물 `/preview`·비교, 학생 화면 보기 Snapshot, 삭제.
