# 결과물 앱 안 미리보기

## 지원 형식

| 형식 | 처리 |
|---|---|
| PDF | 브라우저 PDF 보기(쪽 스크롤·확대 내장) |
| PNG·JPEG·GIF | 폭 맞춤, 확대 25%~400%, 스크롤 |
| HWP·HWPX·DOC·DOCX·PPT·PPTX·XLSX | 미리보기 없음 → "지원하지 않는 형식" 안내 + 파일 정보 + 내려받기(서버 415 `PREVIEW_UNAVAILABLE`) |
| WebP·SVG·HTML | 업로드 허용 목록에 없음. SVG·HTML은 실행 가능한 콘텐츠라 미리보기 대상에서도 제외 |

## Backend

`GET /api/{student|admin}/assessment/artifacts/{artifactId}/versions/{versionId}/preview` (학생 화면 보기 경로도 있음).

- 권한은 다운로드와 같다. 학생은 본인 것만(휴지통 결과물은 404), 관리자는 담당 지점 학생만 본다(범위 밖 404).
- 형식은 저장된 contentType이 허용 목록에 있을 때만 통과한다. 이 값은 업로드 때 확장자와 파일 서명을 모두 검사해서 정해진다.
- 무결성: 저장 바이트를 읽어 크기와 SHA-256을 등록 값과 비교한다. 다르면 409 `FILE_INTEGRITY_FAILED`다(시험에서 파일을 바꿔 확인).
- 응답 Header: `Content-Type` 정확히, `Content-Disposition: inline`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`. 저장 경로나 키는 내보내지 않는다.

## Frontend

- Student: 결과물 카드의 눈 아이콘을 누르면 전체 페이지 Viewer(`/assessment/artifacts/{id}/viewer?v=`)로 간다. 이 페이지에서 버전 선택, 내려받기, 비교 선택을 할 수 있다.
- Admin: 관리자 기록 도구 › 결과 파일 "열람"을 누르면 그 자리에 미리보기를 펼친다(읽기 전용). "다운로드"는 원본을 받는다. 학생 화면 보기 iframe 안에서도 같은 Viewer가 열린다.
- Blob URL은 버전을 바꾸거나 화면을 떠나면 해제한다. 응답 형식이 허용 목록에 없으면 열지 않는다.

## 검증 (E2E)

- 화면에 보인 PDF blob의 SHA가 업로드한 v2와 같다. 응답 Header 4종을 확인했다. 다운로드 SHA가 일치한다.
- 유효한 PDF 두 개를 화면에서 실제로 렌더링했다(캡처 `b04-compare.png`). 처음 쓴 머리글만 있는 가짜 PDF는 브라우저가 그리지 못해, 유효한 PDF로 바꾼 뒤 다시 확인했다.
- PNG 1600×900을 실제로 그렸다(naturalWidth 1600). 화면 맞춤 상태에서는 가로 넘침이 없고, 200%로 확대하면 가로 스크롤이 된다.
- 관리자: 담당 지점 미리보기는 200(v1 바이트 일치), 다른 지점은 404다.
