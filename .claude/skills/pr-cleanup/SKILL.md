---
name: pr-cleanup
description: PR 제목과 본문에서 AI 말투, 과장, 나열, 검증하지 않은 주장을 걷어내고 리뷰어가 판단에 필요한 내용만 남긴다. PR 생성 직전이나 "PR 정리", "PR 본문 다듬어" 요청에 사용.
---

# PR Cleanup

리뷰어가 30초 안에 무엇이 바뀌었고 무엇을 확인해야 하는지 알 수 있어야 한다.

## 1. 입력

- PR 본문: GitHub MCP `pull_request_read`(method `get`). 아직 PR이 없으면 작성 중인 초안.
- 실제 변경: `git diff --stat origin/main...HEAD`, `git log --oneline origin/main..HEAD`
- 양식: `.github/pull_request_template.md`

본문의 모든 주장은 Diff나 실행 기록으로 확인한다. 확인하지 못한 문장은 지운다.

## 2. 남긴다

| 항목 | 기준 |
|---|---|
| Summary | 사용자 또는 시스템 관점에서 바뀐 것 2~5줄 |
| Breaking / Contract | `api-contract.md`, DB Migration, 다른 Surface에 영향을 주는 변경 |
| Verification | 실제로 실행한 명령과 결과. 실행하지 않은 것은 "CI에서 확인"처럼 사실대로 쓴다 |
| Open Decision / Blocker | 리뷰어가 정해야 하는 것 |
| 리뷰 포인트 | 특히 봐야 할 파일이나 판단이 있을 때만 |

양식의 섹션 중 이번 PR과 관계없는 것은 빼거나 "해당 없음" 한 줄로 쓴다. 빈 체크박스를 길게 남기지 않는다.

## 3. 지운다

- 작업 서술과 자기 평가: "~를 구현했습니다", "꼼꼼하게", "완벽하게", "견고한", "포괄적인"
- 같은 내용을 Summary, Changes, 결론에서 반복하는 것
- 파일 목록 나열. GitHub의 Files changed가 이미 보여 준다
- 이모지 섹션 머리, 과도한 굵은 글씨, 의미 없는 구분선
- "~할 수 있습니다", "~것으로 보입니다" 같은 흐린 표현. 사실이면 단정하고, 아니면 지운다
- 검증하지 않은 "정상 동작", "문제 없음"
- 커밋 메시지를 그대로 옮긴 목록

## 4. 문체

- 짧은 평서문을 쓴다. 한 문장에 한 사실만 담는다.
- 용어는 화면과 코드에 실제로 쓰인 말을 따른다. 학생 케어는 `docs/design/student-care-ux.md` 용어표를 따른다.
- 제목은 `type(scope): 바뀐 것` 형식으로 쓰고 한 줄로 끝낸다.

## 5. 고정 문구

본문 끝의 Attribution 줄(세션 링크, Generated with 줄)은 지우지 않는다. 모델 이름이나 ID는 넣지 않는다.

## 6. 적용

- PR이 있으면 GitHub MCP `update_pull_request`로 제목과 본문을 바꾼다.
- 바꾸기 전 원문과 바꾼 결과를 사용자에게 보여 주지 않는다. 링크만 알린다. 사용자가 원하면 Diff를 보여 준다.
