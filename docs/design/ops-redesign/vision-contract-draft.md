# 비전 관찰 응답 형태 초안

작성 2026-11-07. **초안이며 채택되지 않았다.** `docs/api/api-contract.md`는 이 문서 때문에 바뀌지 않는다. 학생 케어 개선안(`/student-care/ops`)이 비전 관찰을 보조 정보로 보여줄 때 프론트엔드 예시 데이터를 이 형태로 만들고, 화면에는 "예시"를 표시한다. 실제 계약은 비전 팀과 학생 케어 담당이 아래 미정 사항을 정한 뒤 `api-contract.md`에 따로 올린다.

## 근거로 읽은 비전 팀 자료

비전 저장소(`runners_hi_vision_ai`)의 `packages/contracts/src/vision.ts`에서 사진 한 장의 결과는 `VisionRunResult`다. 관찰 축은 `person_visible`, `head_down`, `phone_interaction`, `reading_or_writing` 네 개이고 값은 축마다 `yes`·`no`·`unknown` 중 하나다(`VisionObservations`). 실행이 실패하면(`runStatus`가 `ok`가 아님: `timeout`, `input_error` 등 9종) `observations`는 `null`이고 `reasonCode`가 붙는다. 모델이 지원하지 않는 축은 `capabilities[axis] = false`이고 값은 `unknown`, 사유는 `unsupported_observation`이다. 버전은 `profileVersion`, `adapterId`, `modelRevision`으로 남는다. 모델 프롬프트는 집중도·이해도·수면·전화 사용 이유를 추론하지 말라고 못박는다.

`docs/service/overview.md`는 관찰 비율이 사진 표본의 비율이며 촬영 사이의 지속 시간이나 학습 성과가 아니라고 적고, 사진별 즉시 경고 대신 주기적으로 학생별 확인 권고를 주는 방향을 제안한다. 촬영 간격, 사진 보관·열람, 집계 주체, 백엔드는 미정(S-01, S-05, S-07, S-09)이다. ADR-0002는 EfficientNet-B0 + MLP128을 개발 주력 구조로 정했지만 운영 가중치와 서비스 배포는 승인하지 않았다.

## 단위와 규칙

응답 한 건은 **학생 한 명의 하루**다. 네 축은 한 사진에서 동시에 `yes`일 수 있다(머리를 숙이고 필기하는 사진은 `head_down`과 `reading_or_writing`이 둘 다 `yes`). 그래서 축은 서로 독립된 네 개의 셈으로 두고, 한 전체를 나누는 몫으로 만들지 않는다. 화면에서도 축을 누적 막대나 원그래프로 합치지 않는다.

축마다 `yes + no + unknown = analyzedPhotos`가 성립한다. 실패한 사진은 축 셈에 넣지 않고 `failedPhotos`와 사유별 셈으로 따로 둔다. `photosReceived = analyzedPhotos + failedPhotos`다. 미지원 축의 `unknown`도 같은 `unknown`에 들어가며, 모델 목록의 `unsupportedAxes`로 구분한다.

응답에 비율 필드는 두지 않는다. 화면이 비율을 보여줄 때는 "분석한 45장 중 22장"처럼 분모와 `unknown` 수를 함께 쓰고, 이것이 **사진 표본의 비율**이라는 문구를 붙인다. 시간("2시간 공부"), 집중도, 수면, 학습 성과로 바꿔 쓰지 않는다. 판정 공식(관리 필요 여부)에는 넣지 않는다.

촬영 간격을 모르므로 그날 몇 장이 와야 했는지(기대 장수)를 계산할 수 없다. 그래서 `coverage`에는 실제로 받은 첫·마지막 촬영 시각만 두고, `expectedPhotos`는 `null`과 사유를 둔다.

## 필드

| 필드 | 타입 | 의미 |
|---|---|---|
| `studentId`, `branchId` | string | 학생 케어 기존 식별자와 같은 값 |
| `date` | `YYYY-MM-DD` | 집계 날짜. 날짜 경계(시간대·자정 넘는 학습)는 미정 |
| `source` | `"example" \| "actual"` | 개선안에서는 항상 `"example"` |
| `photosReceived` | int | 그날 받은 사진 수 |
| `analyzedPhotos` | int | `runStatus = ok`인 사진 수. 축 셈의 분모 |
| `failedPhotos` | int | 실패한 사진 수 |
| `failures` | `{ [runStatus]: int }` | 실패 사유별 수. 합은 `failedPhotos` |
| `axes` | `{ [axis]: { yes, no, unknown } }` | 네 축 각각의 사진 수 |
| `coverage.firstCaptureAt`, `lastCaptureAt` | ISO 시각 \| null | 받은 사진의 처음과 끝. 사진이 없으면 null |
| `coverage.expectedPhotos` | int \| null | 지금은 항상 null |
| `coverage.expectedPhotosReason` | string \| null | `"capture_interval_unknown"` |
| `models` | 배열 | 그날 쓰인 모델별 `{ profileVersion, adapterId, modelRevision, photos, unsupportedAxes }`. 정해지지 않은 식별자는 null. 하루 중 모델이 바뀌면 두 줄 이상 |
| `ratioMeaning` | 고정 문자열 | `"photo_sample_ratio"`. 시간·집중도가 아님을 응답 안에서도 밝힌다 |

## 예시

```json
{
  "studentId": "student_001",
  "branchId": "br_gangnam",
  "date": "2026-10-27",
  "source": "example",
  "photosReceived": 48,
  "analyzedPhotos": 45,
  "failedPhotos": 3,
  "failures": { "timeout": 2, "input_error": 1 },
  "axes": {
    "person_visible":     { "yes": 40, "no": 3,  "unknown": 2 },
    "head_down":          { "yes": 9,  "no": 30, "unknown": 6 },
    "phone_interaction":  { "yes": 4,  "no": 35, "unknown": 6 },
    "reading_or_writing": { "yes": 22, "no": 15, "unknown": 8 }
  },
  "coverage": {
    "firstCaptureAt": "2026-10-27T15:02:10+09:00",
    "lastCaptureAt": "2026-10-27T21:48:33+09:00",
    "expectedPhotos": null,
    "expectedPhotosReason": "capture_interval_unknown"
  },
  "models": [
    {
      "profileVersion": null,
      "adapterId": null,
      "modelRevision": "efficientnet-b0-mlp128-v6-t0",
      "photos": 48,
      "unsupportedAxes": []
    }
  ],
  "ratioMeaning": "photo_sample_ratio"
}
```

네 축의 `yes`를 더하면 75로 분석한 45장보다 많다. 축이 겹칠 수 있다는 뜻이며 오류가 아니다.

모델 줄의 값은 일부러 비워 두었다. `vision.ts`의 `VISION_ADAPTER_IDS`는 `lightweight`(MediaPipe, `frontend/lib/vision/adapters/lightweight.ts`), `small-vlm`, `gemma` 세 개뿐이고 ADR-0002가 고른 EfficientNet 분류기의 어댑터 ID는 없다. `profileVersion`(`web-vision-v4`)도 VLM 프롬프트 프로필이라 분류기에 그대로 쓰는지 알 수 없다. `modelRevision` 값은 비전 저장소 보고서의 v6 T0를 가리키도록 지은 예시 이름이며 실제 배포 식별자는 정해지지 않았다.

조회 경로를 둔다면 기존 학생 케어 경로 아래 `GET /api/admin/student-care/vision-observations?branchId=…&date=…`(학습관 전체 학생 배열)를 후보로 적어 둔다. 이것도 초안이고 백엔드에 만들지 않는다.

## 미정 사항

| 항목 | 지금 상태 | 정할 사람·근거 |
|---|---|---|
| 촬영 간격·운영 시간 | 모름(비전 개요 S-01). 그래서 기대 장수와 누락률을 못 냄 | 기존 촬영 서비스 담당 확인 |
| 사진 보관·교사 열람 | 미정(S-09). 이 초안은 사진 URL이나 사진 ID를 넣지 않음 | 서비스·개인정보 정책 결정 후 필드 추가 여부 결정 |
| 집계 주체 | 태블릿 추론 결과를 누가 학생·날짜로 묶는지 미정(서버 누적 방향만 제안됨) | 비전 팀과 학생 케어 백엔드 담당 |
| 날짜 경계 | 자정 넘는 학습, 시간대 미정(S-07) | 학생 케어 기준일 규칙과 맞춰 결정 |
| 학생·좌석 귀속 | 좌석 변경·결석일의 사진 처리 미정(S-02) | 비전 팀 |
| 운영 모델 | ADR-0002는 구조만 정했고 운영 가중치·보류 기준은 미정 | 비전 팀 |
| 판정 반영 | 이 초안은 판정 공식에 넣지 않음 | 반영하려면 별도 결정과 `api-contract.md` 변경 필요 |
