# 시연 RUNBOOK (최신)

> 합성 학생·활동(이름은 **한국식 가명**), 학교명만 실제 고등학교. 화면 왼쪽 아래 "개발용" 전환은 **실제 로그인이 아니다.**
> 평가계획서 분석 = **규칙 기반 자동 분석(LLM 호출 없음)**, 결과는 관리자 확인 전 후보.

## 0. 최종 시연 = 운정고 김민서 중심 (2026-11-12 저녁 확정)

**클릭 순서·파일 경로·예상 표시값은 `UNJEONG-KIMMINSEO-DEMO.md`를 따른다.** 이 문서의 §3~§6 이전 시나리오는 예비용이다.

| 순서 | 화면 | 주소 |
|---|---|---|
| A 운정고 평가계획서 분석 (약 18초, **인간과 철학** 탭) | Admin a01 | `http://localhost:5174/assessment/evaluation-plans?devAdmin=adm_demo_a01` |
| B 김민서 한국사2 노트 v4 · 지금 저장 | Student | `http://localhost:5173/assessment?devStudent=stu_demo_001` |
| C 한국사2 PDF v5 · 연표 PNG · 과학탐구실험2 PDF·그래프 | Student | 같은 화면 → 결과물 |
| D 관리자 기록 도구 (검색 후 **Enter**) | Admin a01 | `http://localhost:5174/assessment/students?devAdmin=adm_demo_a01` |

- 운정고 PDF: `C:\learnershigh-extension\references\curriculum-plan\general-high-school\gyeong-gi\unjeong\2026\first-grade\second-semester\2026학년도 2학기 1학년 교과(목)별 교수학습및 평가운영계획서_운정고.pdf`
  - 운정고는 HWP 문서가 없다.
  - 분석이 막히면 §5의 충무고 PDF·가좌고 HWP로 대체한다. 이때 다른 학교 자료임을 밝힌다.

## 1. 서버 상태 (2026-11-12 오후 확인)

| 구성 | 주소 | 상태 |
|---|---|---|
| Student | `http://localhost:5173` | 정상 · **분석기 토큰 적용**(분석 Proxy 인증 통과) |
| Admin | `http://localhost:5174` | 정상 · **분석기 Proxy·HWP 실험 표시 적용** |
| Backend | 18080 | 정상 · **17:00 새 jar로 재시작**(`build\libs-demo\…jar`, 한국식 가명 60명 반영) · 시연 명단·분석 수신·HWP 실험 플래그 켜짐 |
| 분석기 | 127.0.0.1:8765 | 정상 (v21.1, LLM 호출 없음) |
| MySQL | 3307 | 정상 |

Vite 두 서버는 IPv6(`[::1]`)로만 대기한다 → 주소는 **`localhost`**로 연다(`127.0.0.1:5173`은 안 열림).
현재 학기 기본값 2026-2(학기 버튼으로 1학기 전환).

## 2. 대표 학생·관리자

| 지점 | 학생(가명) | 학교·학년 | 보여줄 것 | 링크 |
|---|---|---|---|---|
| A | **김민서** stu_demo_001 | 운정고 1학년 | 한국사2 노트 v4·PDF v5·연표 PNG, 과학탐구실험2 노트·PDF·그래프, 피드백 답변 완료 | `http://localhost:5173/assessment?devStudent=stu_demo_001` |
| B | **고은호** stu_demo_026 | 한림고 2학년 | 확률과 통계 노트 v4, 보고서 PDF v2·수면 시간 그래프 PNG v2 | `…?devStudent=stu_demo_026` |
| C | **변주원** stu_demo_041 | 충무고 1학년 | 통합과학2 노트 v3, 보고서 PDF v4·생존율 그래프 PNG v3 | `…?devStudent=stu_demo_041` |

| 관리자 | 범위 | 링크 |
|---|---|---|
| adm_demo_a01 | A지점 20명 | `http://localhost:5174/assessment/students?devAdmin=adm_demo_a01` |
| adm_demo_b01 | B지점 20명 | `…?devAdmin=adm_demo_b01` |
| adm_demo_c01 | C지점 20명 | `…?devAdmin=adm_demo_c01` |
| adm_demo_gangnam | 평가계획서 공식 운영(예시고) | `http://localhost:5174/assessment/evaluation-plans?devAdmin=adm_demo_gangnam` |

**학교별 평가계획서 (네 관리자 모두 사용 가능, 2026-11-12 저녁 수정)**: `http://localhost:5174/assessment/evaluation-plans?devAdmin=adm_demo_a01` (a02·b01·c01도 같은 형식) → 담당 5개교 → **자동 분석 미리보기**(아래 §6-1).

## 3. 시나리오 A — 학생 (변주원, C지점)

1. `http://localhost:5173/assessment?devStudent=stu_demo_041` → 왼쪽 위 **충무고등학교 · 1학년 2학기**, 왼쪽 아래 "시연 학생: 변주원".
2. 학교 수행평가 → 마감일 모두 미래 → **통합과학2 주제 탐구 보고서** 열기 → 탐구 노트 v3(주제·동기·목표·자료 조사·과정·자료 정리·분석·결과·배운 점·개선 방향).
3. 노트에 한 줄 추가 → **"지금 저장"** → "자동 저장됨 · v4" → F5 새로고침 → 유지 → **수정 이력**.
4. 결과물: **변주원_통합과학2_탐구보고서.pdf v4**(눈 모양 미리보기, 2쪽, 표·그래프), **결과그래프.png v3**, 내려받기.
5. (새 노트 쓰기 시연은 노트 없는 과제: 1학기 "공통영어1 토론")

## 4. 시나리오 B — 관리자 (adm_demo_c01)

1. `http://localhost:5174/assessment/students?devAdmin=adm_demo_c01` → 학생 20명, 학교 필터(충무·광명·세종·한솔·제주).
2. 학생 상세 → 학교·학년·학기·반·번호, 수강 과목, 수행평가(과목명·마감일).
3. 통합과학2 주제 탐구 보고서 클릭 → **"관리자 기록 도구"** 탭 → 학생 노트 최신 본문, 결과물 PDF·PNG 파일 이름·버전.
4. 학생 상세 탭 **피드백 이력·성장 기록**. (답변 완료 피드백 사례: a01 → 김민서)
5. a01로 바꿔 `…/students/stu_demo_041` → "이 학생의 기록을 볼 수 없어요"(지점 권한).

## 5. 시나리오 C·D — 학생 실시간 분석 (저장 안 되는 미리보기)

학교 수행평가 화면 오른쪽 위 **"평가계획서 가져오기"** → 위 배너 "로컬 분석기 연결됨 (기본 v21.1)" 확인 → 파일 선택 → **분석 시작** → 결과 페이지(과목은 **탭**).

| 파일 (실제 경로) | 탭 | 보여줄 값 (원문과 일치 확인) |
|---|---|---|
| PDF `C:\learnershigh-extension\references\curriculum-plan\general-high-school\jeonbug·jeonnam·gyeongbug·gyeongnam·jeju\chungmu\2026\first-grade\second-semester\2026학년도 충무고 2학기 1학년 전과목 교수학습 및 평가계획.pdf` (약 3초) | **체육2** | 윗몸일으키기 30% · 9~10월 · 100점 / 맨몸 크로스핏 70% · 11월 · 100점 · 근거 PDF 쪽 |
| HWP `C:\learnershigh-extension\references\curriculum-plan\general-high-school\incheon\gajwa\2026\first-semester\(가좌고등학교-3690 (첨부)) 2026학년도 1학기 수학과 교수학습 및 평가 운영 계획.hwp` (약 0.5초) | **공통수학1** / **경제수학** | 실생활 속 사례 분석 20%·6월 3주, 문제 해결 포트폴리오 20% / 문제해결능력 40%·경제 단어장 16%·경제기사 스크랩 30%·포트폴리오 14% · 근거 "구역·표·행·열"(쪽 번호 없음) |

결과 위쪽: "자동 분석 후보 · 관리자 확인 전 — 규칙 기반(AI·LLM 호출 없음)", 분석 상태 PARTIAL, 원본 SHA-256 일치, 경고 목록.

## 6. 시나리오 E — 관리자 등록 → 자동 분석

`adm_demo_gangnam` → **학교별 평가계획서** → **평가계획서 등록** → 학년·학기 선택 → 파일 `C:\Users\choi suyeon\LearnersHigh-local\curriculum-analysis\runs\v21-pdf-quality-backend-bridge-20261109\e2e\synthetic-e2e.pdf`(**합성 테스트 문서**) → 등록 → 자동 분석 → 검토 화면:
가상과학탐구 · 지필 1차 40% · 수행 탐구 보고서 30%·토론 활동 30% · 근거 쪽 · "관리자가 확인한 값 (0)"(자동 확정 없음).
(실제 학교 문서는 승인 전이라 Admin 등록에 쓰지 않는다. 등록 기록은 시연 DB에 남는다.)

## 6-1. 시나리오 F — 지점 관리자 평가계획서 자동 분석 (네 관리자 공통)

1. `http://localhost:5174/assessment/evaluation-plans?devAdmin=adm_demo_c01` → 왼쪽 담당 5개교(충무·광명·세종·한솔·제주, "자동 분석 미리보기").
2. **충무고등학교** 클릭 → 위 안내 "평가계획서 자동 분석 — 사용 가능 / 관리자 검토 및 공식 확정 — 제한(운영 권한 없음)" · "로컬 분석기 연결됨 (기본 v21.1)".
3. 학년도·고1·2학기 선택 → **파일 선택 (PDF·HWP)** → §5 표의 충무고 PDF → **분석 시작**(약 3초) → 과목 탭 **체육2**: 30%·9~10월 / 70%·11월 · 근거 PDF 쪽.
4. B지점(`adm_demo_b01`) → **가좌고등학교** → §5 표의 가좌고 HWP(약 1초) → **공통수학1** / **경제수학** 탭 · 근거 "구역·표".
5. 결과는 저장되지 않음(다른 학교 클릭 시 사라짐). 공식 등록·확정 버튼은 없음 — 운영 권한이 있는 gangnam만 §6 흐름 가능.

## 7. 문제가 생기면

| 증상 | 대체 |
|---|---|
| 분석 배너 "연결 안 됨" | `cd "C:\Users\choi suyeon\LearnersHigh-local\curriculum-analysis"; powershell -ExecutionPolicy Bypass -File tools\service\service.ps1 status` → 안 되면 Admin의 이미 등록된 검토 화면(예시고 고1 1·2학기, 고2 1학기 칸)으로 분석 결과·근거 시연 |
| 분석이 오래 걸림 | HWP 먼저(0.5초), PDF 3~4초 |
| 학교가 "예시고등학교" | 왼쪽 아래 전환 패널에서 시연 학생 선택(기본 학생 stu_001은 기존 Mock) |
| 화면이 이전 학생 데이터 | 전환 패널에서 다시 선택(새로고침 포함) |
| 502 | `http://localhost:18080` 응답만 확인(끄지 말 것) |

## 8. 미구현·주의

- 관리자 화면 학생 이름: **반영 완료**(Backend 재시작, 60명 모두 학생 화면과 같은 이름, "시연학생" 0건).
- 화면 맨 위 LearnersHigh 상단바 이름("최하은")은 기존 공용 Shell 고정값(Assessment 밖, 미수정). 현재 학생은 왼쪽 아래 패널에 표시.
- 분석: 채점기준표 추출 안 됨, 복잡한 표에서 항목 누락·이름 결합 있음. 삼각산고·진양고 문서는 쓰지 않는다.
- HWP·HWPX 공식 검토 확정은 막혀 있음(실제 관리자 인증 필요, 화면 안내).
- 지점 관리자 4명은 평가계획서 **공식 운영 권한이 없다**(OD-A08 미결, 서버가 403 유지). 화면은 담당 학생의 학교만 보여 주고 **저장되지 않는 자동 분석 미리보기**만 연다. 분석 미리보기는 개발 서버(분석기 Flag)에서만 있다.
- 실제 로그인·로그아웃 없음.

## 9. Backend 실행·되돌리기 (현재 방식)

Backend는 별도 PowerShell 창(제목 없음, `java` 실행 중)에서 돈다. **그 창을 닫지 않는다.**
다시 띄워야 하면 그 창에서 `Ctrl+C` 후:

```powershell
powershell -NoExit -ExecutionPolicy Bypass -File "C:\learnershigh-extension\docs\specs\suyeonssessment-demo-final-integration-20261112\scripts
un-backend-demo.ps1"
```

(DB 계정은 MySQL 컨테이너에서 읽어 화면에 출력하지 않음, 시연 플래그 3개 켬, 약 10초)

문제 시 이전 jar로 되돌리기(이름만 "시연학생NNN"으로 돌아감, 데이터 그대로):

```powershell
powershell -NoExit -ExecutionPolicy Bypass -File "…\scripts
un-backend-demo.ps1" -Jar "C:\learnershigh-extensionackenduild\libs-backup-20261112\learnershigh-extension-backend-0.0.1.jar"
```

상세: `BACKEND-RESTART-20261112.md`.
