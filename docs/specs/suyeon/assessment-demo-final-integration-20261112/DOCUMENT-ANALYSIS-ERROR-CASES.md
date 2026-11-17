# 평가계획서 분석 오류 케이스

> 실행 중인 분석기(8765)에 직접 보낸 결과(`scripts/analyze-real-plans.mjs --errors`, `plan-analysis-error-cases.json`). 실패를 성공·Mock 결과로 바꾸지 않는다.

| 케이스 | HTTP | 분석기 상태 | 오류 코드·메시지 | 화면 구분(기존 구현) |
|---|---:|---|---|---|
| 손상 PDF (`%PDF-` + 임의 본문) | 422 | PARSE_FAILED | `PARSE_FAILED` PdfLayout 실패 | 원문 추출 실패 |
| 손상 HWP (OLE 서명 + 0x07 채움) | 422 | REJECTED | `CORRUPT_FILE` HWP(CFB) 머리 값이 올바르지 않음 | 원문 추출 실패 |
| HWPX가 아닌 ZIP | 415 | UNSUPPORTED_FORMAT | 확장자가 아니라 내용으로 판별 | 지원하지 않는 문서 |
| 토큰 없음 | 401 | REJECTED | `UNAUTHORIZED` X-Analysis-Token 없음 | 분석기 연결 실패(인증) |
| **현재 5173 Proxy** | 401 | REJECTED | 5173이 토큰 없이 실행 중 → 학생 화면 분석은 지금 실패 | `SERVER-CONNECTION-VERIFICATION.md` |
| **현재 5174** | 404 | — | 5174에 `/dev-analysis` Proxy 없음(분석기 옵션 없이 실행) | Admin 자동 분석 버튼 경로 없음 |
| 부분 성공 | 200 | PARTIAL | 경고 예: "세부 표 연결이 없어 상세정보를 추출하지 못한 수행평가 17개", "목록을 만들지 못한 구간 11개" | 결과 + 경고 표시(전체 개수를 모르면 "일부" 표현) |
| 권한 없는 관리자의 평가계획서 접근 | 403 | — | 지점 관리자 `adm_demo_a01`(운영 학교 없음) | 5174에서 문서 미표시(`ADMIN-UI-VERIFICATION.md` plans) |

이전 보고서에서 화면으로 검증한 실패 케이스(20MB 초과·확장자 위장 → 전송 전 차단, 분석기 꺼짐 → "분석기 연결 실패" 배너): `assessment-ui-analysis-connection-202611/REPORT.md` §7. 이번에는 사용자 서버를 끄지 않기 위해 분석기 중지 시험은 다시 하지 않았다.
