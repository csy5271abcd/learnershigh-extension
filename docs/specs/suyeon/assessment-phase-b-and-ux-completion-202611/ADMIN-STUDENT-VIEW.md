# 관리자 "학생 화면 보기" (읽기 전용 실데이터)

## 방식

```text
Admin 학생 상세 › 학생 화면 보기 (기존 탭·기존 /students/{id}/view, 새 메뉴 없음)
 └ 부모: GET /api/admin/assessment/students/{id} (담당 범위 확인 + 이름·학교·학년)
 └ iframe(student-preview.html): 같은 Student 화면을 admin-readonly 모드로
      Student HTTP Client → GET만 /api/admin/assessment/students/{id}/student-view/<학생 API 경로>
      Header = 관리자 개발용 Mock Header(X-Assessment-Admin-Id), 학생 Header 없음
 └ Backend AdminStudentViewController: 담당 지점 확인(AdminStudentViewAccess) → 학생 조회 Service만 호출
```

- 학생으로 로그인하거나 가장하지 않는다. studentId는 URL에 있지만 서버가 관리자 담당 범위를 다시 확인한다. 범위 밖이면 404다.
- 응답 Shape은 학생 API와 같다. 그래서 Student 화면을 그대로 재사용한다.
- 학생 화면에서 숨겨진 것(관리자 답변 초안 등)은 여기서도 숨겨진다. 같은 조회 Service를 쓰기 때문이다.
- 쓰기를 세 겹으로 막는다: ① 서버에 쓰기 Endpoint가 없다, ② HTTP Client가 GET 외 요청을 403 `READ_ONLY_VIEW`로 막는다, ③ 기존 `guardWrite`가 쓰기 함수를 차단한다. 화면에서도 결과 파일 등록·새 버전·휴지통·피드백 요청 버튼을 숨기거나 비활성으로 둔다. 수정·진행 상태·안내문 추가는 기존대로 비활성이다.

## 표시 항목 (실제 Backend 값만)

수행평가 목록·상세·진행 상태·마감, 탐구 노트·최신·과거 Revision, 결과물·버전·미리보기·비교, 피드백 상태·전달된 답변, 성장 기록, 보관함(중요·휴지통), 자료함·공개 자료.

## 검증

| 항목 | 결과 |
|---|---|
| 학생 목록 응답 = 관리자 student-view 응답(바이트 동일) | 통합 테스트 |
| 같은 수행평가·노트 원문·결과물·성장 기록 렌더링 | E2E |
| 쓰기 컨트롤 0개(활성 버튼 기준) + 평가 정보 수정 비활성 | E2E |
| 다른 지점 관리자 404 · 학생 Header 401 · POST 405/404 | E2E·통합 테스트 |
| 시연 주소(5174) 읽기 점검 | 렌더링 OK, API 오류 0, 쓰기 요청 0 |

## 한계

- 학생 홈의 바로가기("PDF 가져오기"·"수행평가 추가")는 보인다. 누르면 기존 설계대로 읽기 전용 안내만 뜨고 쓰기는 일어나지 않는다.
- Admin은 Student 모듈을 import한다. Student 코드를 바꾼 뒤에는 Admin Vite를 재시작해야 한다(이번에도 시연 Stack을 새로 띄워 확인).
