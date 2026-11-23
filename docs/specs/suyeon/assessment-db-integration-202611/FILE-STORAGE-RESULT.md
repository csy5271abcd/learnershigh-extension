# 개발용 파일 저장소 결과

> 사용자 승인(2026-11-11 전달): 단기 개발용으로 Git 저장소 밖 격리 로컬 Storage. **운영 Storage(Provider·백업·보존 기간·악성코드 검사)는 아니다.**

## 정책 (구현)

| 항목 | 구현 |
|---|---|
| 위치 | `assessment.storage.root` = 환경 변수 `ASSESSMENT_STORAGE_ROOT`, 기본 `${user.home}/.learnershigh-extension/dev-artifact-storage` (Git·웹 공개 경로 밖) |
| 경로 | `<root>/<키 앞 2자>/<UUID 키>` — 원본 파일명은 경로에 쓰지 않음(DB `file_name`에만) |
| 경로 이동 차단 | 키를 UUID 정규식으로 검사 + 해석한 경로가 Root 안인지 재확인 |
| 쓰기 | 임시 파일 → 원자적 이동. 같은 키 덮어쓰기 없음 |
| 형식 | 확장자 + 파일 앞부분 서명(PDF `%PDF-`, HWP/DOC/PPT OLE, HWPX/DOCX/PPTX/XLSX ZIP, PNG/JPEG/GIF). Content-Type은 서버가 정함 |
| 크기 | `assessment.storage.max-file-bytes` 기본 50MB(초과 413), 빈 파일 400 |
| 무결성 | SHA-256(hex)을 DB에 저장 |
| 정합성 | 파일 저장 후 DB 저장. Transaction이 커밋되지 않으면 방금 쓴 파일을 지움 |
| 권한 | 다운로드는 Backend만: 학생 본인 결과물만, 관리자는 담당 지점 학생만(아니면 404) |
| 응답 | `Content-Disposition: attachment`(UTF-8 파일명), `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store` |
| 버전 | 새 버전은 새 키·새 행. 이전 파일·행 불변 |

## 시험

| 시험 | 결과 |
|---|---|
| `StudentRecordApiTest` 결과물 시험 | v1·v2 업로드, v1 다운로드 바이트 = 원본, SHA 64자 저장, 글자 파일(.pdf) 415, 크기 초과 413(시험은 2KB 상한), **실패 후 저장 파일 수 증가 없음·버전 번호 그대로**, 다른 학생 404, 강남 관리자 다운로드 = 원본, 분당 관리자 404 |
| 교차 E2E(실제 UI) | 화면에서 v1·v2 업로드, "내려받기" 파일 SHA = v2 업로드 바이트 |

## 한계

- 바이러스·악성 매크로 검사 없음. 미리보기·변환 없음(내려받기만).
- 개발 PC 한 대 디스크. 백업·보존 기간·삭제 정책 없음.
- 시연 Schema와 시험 Schema가 같은 기본 Root를 쓴다(키가 UUID라 충돌은 없음). 분리하려면 `ASSESSMENT_STORAGE_ROOT`를 따로 준다.
