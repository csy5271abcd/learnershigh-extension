# PDF·HWP·HWPX 분석 서비스 연동 결과 (2026-11-11)

## 1. 서비스 (계정 B, 수정 없음)

| 항목 | 값 |
|---|---|
| 주소 | `http://127.0.0.1:8765` (127.0.0.1만, Host 검사, CORS 없음) |
| Health | `GET /health` — 형식 PDF·HWP·HWPX, 기본 `v21.1`, `llmCalls=false` |
| 분석 | `POST /analyze-preview` multipart: `file`(필수), `analyzerVersion`, `includeAnalysis`, `fileId`, `includeInferred`(false만) |
| 인증 | `X-Analysis-Token` — 개발 서버 Proxy(Node)에서만 부착 |
| 계약 | `analyze-preview-0.1-dev` (계정 B 내부, LearnersHigh 공식 아님) |
| 실행 | `.venv-llm\Scripts\python.exe -I -B -X utf8 tools\service\analysis_service.py` (계정 B `runs/v22-analysis-preview-service-20261111/REPORT.md` §2) |

## 2. 호출 방식

| Surface | 요청 | 쓰는 결과 | 저장 |
|---|---|---|---|
| Student 5173 | `file` + `includeAnalysis=true` (버전 미지정 = v21.1) | `backendImport.payload` + `analysis.segments[].context/teaching` | 없음 (탭 메모리) |
| Admin 5174 | `file`만 (`includeAnalysis` 없음 → 원문 전체 미수신) | `backendImport.payload`(AnalysisImportRequest)를 그대로 수신 Endpoint로 | `assessment_plan_analysis_run` (후보, `UNREVIEWED`) |

- v21.2-quality는 요청하지 않는다(자동 전환 없음). 결과 `analyzerChannel=DEFAULT` 확인.
- 표시 문구: **"자동 분석 후보 · 관리자 확인 전"**, "규칙 기반 문서 구조 분석(AI·LLM 호출 없음)".
- Proxy: Student `assessment-ui-analysis-connection-202611/scripts/vite.student-analysis-preview.config.ts`(포트 인자로 5173), Admin `scripts/vite.admin-analyzer.config.ts`. 두 설정 모두 Shared `vite.config.ts`를 불러와 `/dev-analysis`만 덧붙이고, 쿠키·Origin·Referer를 제거하고, 분석기 주소는 로컬만 허용한다.

## 3. 실제 분석 결과 (합성 문서만)

| 파일 | Student 5173 | Admin (격리 18081/5184) |
|---|---|---|
| `synthetic-e2e.pdf` (30,783B) | 200, v21.1 DEFAULT, payload = 계정 B `e2e/analysis-import.json` 동일, SHA 일치, 전체 페이지 | 등록 201 → 분석 200 → 수신 201, Revision SHA = 원본, 검토 페이지, `UNREVIEWED` |
| `synthetic-plan.hwp` | 200, HWP, 실험 Adapter, 쪽 번호 없음·구역/표 근거, 전체 페이지 | 실험 Backend에서 201/200/201, 검토 페이지, **확정 비활성** |
| `synthetic-plan.hwpx` | 200, HWPX, 위와 같음 | 위와 같음 |
| `corrupt.pdf` | 422 `PARSE_FAILED` → Modal "원문 추출 실패" | (Backend 등록 단계에서 PDF 검사) — 이번에 시험하지 않음 |
| 연결 실패 | 직전 보고서에서 502 → "분석기 연결 실패" 확인 | Modal 재시도 경로 구현, 이번에 브라우저로 시험하지 않음 |

## 4. 보안 확인

- 토큰: 번들·`VITE_` 변수·로그에 없음(직전 보고서에서 grep 0건, 이번 설정도 같은 방식). 개발 서버 시작 로그는 `token=set`만.
- 실제 학교 문서는 보내지 않았다. 외부 전송 없음(127.0.0.1).
- Student 결과는 메모리에만 둔다(브라우저 저장소 확인: 결과 없음).
- 분석기 임시 파일·크기 제한·HWPX ZIP 검사는 계정 B 서비스가 담당(직전 보고서에서 임시 폴더 0개 확인).

## 5. 한계

- 성취기준·평가 범위는 v21.1 결과 형식에 항목이 없어 "분석기 미지원"으로 표시한다. 교수·학습 운영표는 실제 예시가 없어 개수만 표시한다.
- Admin HWP·HWPX는 Backend 실험 Flag가 켜진 별도 프로세스에서만 등록된다. 시연 Backend(18080)는 OFF이므로 5174에서 HWP·HWPX 파일은 선택 목록에 나오지 않는다.
- 분석 품질(정확도) 개선은 이번 범위가 아니다.
