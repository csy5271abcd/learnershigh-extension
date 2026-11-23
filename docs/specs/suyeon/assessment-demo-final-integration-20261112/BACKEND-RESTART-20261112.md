# Backend 재시작 기록 — 관리자 학생 이름 반영 (2026-11-12 오후 5시경)

## 1. 원인
관리자 화면의 학생 이름은 Backend jar 안의 시연 명단 리소스(`assessment/demo-roster/demo-roster-2026.json`)의 `displayName`에서 온다. 명단 파일을 한국식 가명으로 바꾼 뒤 jar를 다시 만들지 않아, 실행 중인 Backend는 "시연학생NNN" 60건을 계속 내보냈다. 학생 화면 전환 패널은 Frontend dev 명단을 써서 이미 새 이름이었다.

src/main 아래에서 jar보다 새로운 파일은 이 명단 JSON 하나뿐이었다. 따라서 Java 코드 변경 없이 리소스만 반영했다.

## 2. 수행 절차
| 단계 | 내용 |
|---|---|
| 백업 | `backend/build/libs-backup-20261112/learnershigh-extension-backend-0.0.1.jar` SHA-256 `72fd018705ddb96f20cc76e81465840bbf46757638d2365e331a0f70d7279ab3`(원본과 동일) |
| 빌드 | 실행 중인 jar(잠김)는 그대로 둠. 임시 init script로 `bootJar` 출력만 `build/libs-demo/`로 변경했고 프로젝트 빌드 파일은 바꾸지 않음. `--no-daemon --max-workers=1 -Xmx512m`, 20초, BUILD SUCCESSFUL |
| 새 jar | `backend/build/libs-demo/learnershigh-extension-backend-0.0.1.jar` SHA-256 `92c29380511f474fdc7e80f0d82649f1a9b01f9e482dae5991b6d645c4a97316`. 명단 안 "시연학생" 0건, 고유 이름 60개(001 김민서 · 026 고은호 · 041 변주원) |
| 이전 실행 명령 | `java.exe -Xmx384m -jar .\build\libs\learnershigh-extension-backend-0.0.1.jar --server.port=18080` (PID 28916) |
| 종료 | 새 jar 확인 후 PID 28916만 종료. 5173·5174·MySQL 3307·분석기 8765는 건드리지 않음 |
| 시작 | `scripts/run-backend-demo.ps1`을 별도 PowerShell 창에서 실행. DB_URL `lh_demo_manual_20261111`. DB 계정은 MySQL 컨테이너 환경에서 읽고 출력하지 않음. 플래그 `ASSESSMENT_DEMO_ROSTER_ENABLED`, `ASSESSMENT_ANALYSIS_IMPORT_ENABLED`, `ASSESSMENT_MULTIFORMAT_EXPERIMENTAL`=true. 약 9초 만에 응답 |
| 롤백 | 필요 없었음. 방법: `run-backend-demo.ps1 -Jar <백업 jar>` |

## 3. 검증 결과 (재시작 후 실제 실행)
| 항목 | 결과 |
|---|---|
| 관리자 API 이름(a01·b01·c01 각 20명) | 60/60 명단과 일치, 고유 60, "시연학생" 0 |
| 관리자 이름 검색 `q=변주원`(c01) | stu_demo_041 반환 |
| 지점 권한 API | a01→stu_demo_041 404, c01→stu_demo_041 200 |
| 관리자 화면 E2E(`demo-final-e2e.mjs admins`) | 21/21 PASS. 4xx 8건은 의도한 타 지점 차단 404 |
| 대표 학생 화면(`enrichment-ui-check.mjs`) | 17/17 PASS. 학생·관리자 양쪽 이름, 노트 최신본, PDF·PNG 새 버전 |
| 학생 PDF/HWP 실시간 분석(`demo-analysis-ui.mjs student`) | 1회차 9/10(PDF 배너가 "확인 중"일 때 읽힘, 분석 자체는 성공) → 재실행 10/10 |
| Seed 보존(`verify-seed.mjs`) | 833/833 PASS (학생 60 · 수행평가 360 · 노트 60 · 결과물 버전 80 · 피드백 36) |
| Student Care API | branches 200, board·settings(branchId 지정) 200 |

스크린샷: `screenshots/backend-restart/`.

## 4. 변경 파일
- 신규 `scripts/run-backend-demo.ps1` (시연 Backend 실행기)
- `scripts/demo-final-e2e.mjs`: 학교 필터 대기 문구 `시연학생041` → `변주원` (검증 스크립트만)
- `DEMO-3H-RUNBOOK.md` §1·§8·§9
- 빌드 산출물 `backend/build/libs-demo/`, `backend/build/libs-backup-20261112/` (Git 추적 밖)

Java 코드, API, DB, Migration, Frontend 코드, Shared, Student Care 변경 없음. DB 데이터 변경 없음(읽기 검증만).

## 5. 남은 것
- `backend/build/libs/` 의 jar는 여전히 이전 이름 명단이다. 사용자 원래 명령(`.\build\libs\…`)으로 다시 띄우면 "시연학생"으로 돌아간다. 시연 중에는 `run-backend-demo.ps1`을 쓴다.
- 상단 공용 Shell 이름("최하은") 고정값, 실제 로그인 없음 등 기존 주의 사항은 그대로 남아 있다(RUNBOOK §8).
