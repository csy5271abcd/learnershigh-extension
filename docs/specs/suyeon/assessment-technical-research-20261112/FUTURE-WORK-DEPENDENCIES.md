# 향후 작업 선행 관계

> ID는 `FUTURE-WORK-BACKLOG.md`와 같다.

## 1. 분석 정확도 경로

```mermaid
flowchart LR
    P1_01["P1-01 개발 10개 사람 검토·판정"] --> P1_02["P1-02 실제 문서 Baseline 지표"]
    P1_02 --> P1_03["P1-03 검증·시험 분할 Benchmark"]
    P1_01 --> P1_09["P1-09 v21.2 기본 반영 결정"] --> P1_10["P1-10 HWPX 0.2 기본화"]
    P1_11["P1-11 실제 문서 추가 확보"] --> P1_04["P1-04 세부표 연결"]
    P1_11 --> P1_06["P1-06 쪽 넘김 표"]
    P1_05["P1-05 PdfLayout 칸 복원"] --> P1_04
    P1_02 --> P2_12["P2-12 계약 필드 확장"] --> P1_13["P1-13 운영계획 구조화"]
    P1_02 --> P3_01["P3-01 선택적 LLM 결합"]
    P3_01 --> CMP["성능 비교(같은 시험 분할)"] --> APPLY["개선 기능 적용"]
    P1_18["P1-18 스캔 PDF 식별"] --> P3_02["P3-02 OCR"]
```

핵심: **사람 정답(P1-01) 없이는 정확도 개선·LLM 결합의 효과를 판단할 수 없다.** 지금까지의 개선(v21.1·v21.2)은 모두 "도구 기준 개수 증가"이고 맞았는지는 모른다.

## 2. 운영 경로

```mermaid
flowchart LR
    AUTH["P2-01 실제 인증"] --> SCOPE["P2-02 학교·지점 권한"]
    AUTH --> HWPOP["P2-03 HWP·HWPX 운영 확정"]
    P1_15["P1-15 실제 HWP 검토 E2E"] --> HWPOP
    STO["P2-05 운영 Storage·원본 보관"] --> MAL["P2-06 악성코드 검사"]
    STO --> REV["P3-04 개정본 비교"]
    STO --> DIFF["P3-06 내용 Diff"]
    DEPLOY["배포 위치 결정"] --> P2_07["P2-07 분석기 Backend 뒤로"] --> P2_08["P2-08 비동기·재시도"]
    AUTH --> P2_07
    P2_11["P2-11 analysis-imports 계약 반영"] --> P2_07
```

## 3. 시연·회귀 경로

```mermaid
flowchart LR
    SCH["새 시험 Schema 권한"] --> P0_01["P0-01 미실행 기준선 재실행"]
    P0_02["P0-02 낡은 스크립트 갱신"] --> P0_01
    P0_01 --> P1_16["P1-16 실문서 E2E"]
    APPROVE["실제 문서 DB 반입 승인"] --> P1_16
    APPROVE --> P1_15["P1-15 실제 HWP 검토 E2E"]
```

## 4. 외부 결정 대기 (작업이 아니라 결정)

| 결정 | 막는 작업 | 출처 |
|---|---|---|
| API-OD-A01 기존 인증 | P2-01·02·03·07 | `api-contract.md` |
| API-OD-07 학업 Context Client | P2-04 | 같음 |
| API-OD-A03 File Storage | P2-05·06, P3-04·06 | 같음 |
| API-OD-A10 AI Provider·비용 | P2-14, P3-01(Backend 경로) | §47-A |
| OD-A11 보존·삭제 | P2-09 | Phase B |
| 실제 학교 문서 DB 반입·외부 전송 승인 | P1-15·16, P3-01 | 분석기 `approvals/real-docs.json`(모두 false) |
| v21.2 기본 전환 | P1-09·10 | v21.2 NEXT-STEPS |
