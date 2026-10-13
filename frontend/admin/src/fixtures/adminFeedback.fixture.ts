import type { AdminAiItem, TaskReview, TaskReviewDelivery } from './types.ts'

/*
 * Task Feedback(선생님 검토) Canonical Fixture. Shared Feedback Queue의 원본이다.
 * - Version 하나에 검토 하나. delivery === null이면 공용 Queue에서 기다리는 중이다. (Queue는 이 Collection에서 계산, 별도 Counter 없음)
 * - queuedAt = AI 사전 점검 성공 시각 (Version.aiAnalyzedAt과 같은 값). 대기 시간 = Snapshot 시각 - queuedAt
 * - 최하은 fixture-task-02: Student Fixture(schoolFeedback.fixture.ts) 값 그대로
 *     speech-teacher-v1 = V1 전달(comment · nextAction · 10월 2일 16:10, 수정본 필요), speech-teacher-v2 = V2 검토 중
 *     V2 AI 항목은 Student의 speech-ai-v2 항목(time · thesis · repeat) 그대로다.
 * - reviewedBy는 작성자 Audit 정보일 뿐 배정이 아니다. (특정 Staff / 과목 Routing 없음)
 * - AI 항목은 확인할 곳만 짚는 표시용 가상 문장이다. 점수 · 등급 · 학생 원고 대필 없음.
 */

const kst = (value: string) => `${value}:00+09:00`
const ai = (itemId: string, summary: string, criterionName?: string): AdminAiItem => ({ itemId, summary, ...(criterionName ? { criterionName } : {}) })

const delivered = (
  deliveredAt: string,
  studentComment: string,
  nextAction: string,
  needsAnotherRevision: boolean,
  reviewedBy = '학원 선생님',
): TaskReviewDelivery => ({
  deliveredAt,
  reviewedBy,
  studentComment,
  nextAction,
  needsAnotherRevision,
  parentReportCandidate: false,
  deliveredAiItems: [],
})

const review = (feedbackId: string, taskId: string, versionId: string, queuedAt: string, aiItems: AdminAiItem[], delivery: TaskReviewDelivery | null = null): TaskReview => ({
  feedbackId,
  taskId,
  versionId,
  queuedAt,
  aiItems,
  delivery,
})

const t = (n: number) => `fixture-admin-task-${String(n).padStart(3, '0')}`
const ver = (n: number, version: number) => `fixture-admin-version-${String(n).padStart(3, '0')}-v${version}`
const fid = (n: number, version: number) => `fixture-feedback-${String(n).padStart(3, '0')}-v${version}`

export const taskReviewsFixture: readonly TaskReview[] = [
  // ---- 최하은 (Student Surface와 같은 Feedback) ----
  review('speech-teacher-v1', 'fixture-task-02', 'speech-v1', '2026-10-01T22:12:00+09:00', [ai('time', '분량이 4분 20초예요. 목표 시간보다 길어요.', '시간 준수 (2분 40초~3분 20초)')], {
    ...delivered('2026-10-02T16:10:00+09:00', '도입부가 길어서 핵심 주장이 늦게 나와요. 같은 표현이 여러 번 반복되는 부분도 다시 읽어보세요.', '도입부를 줄이고 반복 표현을 정리한 V2를 제출하세요.', true),
  }),
  review('speech-teacher-v2', 'fixture-task-02', 'speech-v2', '2026-10-03T20:47:00+09:00', [
    ai('time', '분량이 3분 55초예요. 목표 3분보다 55초 길어요.', '시간 준수 (2분 40초~3분 20초)'),
    ai('thesis', 'thesis가 두 번째 문단에 있어요. 처음 듣는 사람이 주장을 언제 알 수 있을지 생각해보세요.', '내용 구성 · thesis'),
    ai('repeat', '같은 표현이 2회 반복돼요. 어느 부분인지 다시 읽어보세요.', '어휘·표현'),
  ]),
  review('lunch-v1-review', 'fixture-task-03', 'lunch-v1', '2026-10-06T07:00:00+09:00', [
    ai('lunch-data', '메뉴별 잔반량을 비교할 때 배식량 차이를 어떻게 맞췄는지 보고서에 드러나는지 확인해보세요.'),
    ai('lunch-code', '결과 화면의 그래프 축 이름이 비어 있어요. 단위를 함께 적으면 읽기 쉬워요.'),
  ]),

  // ---- Admin 전용 학생: 검토 대기 (공용 Queue) ----
  review(fid(4, 1), t(4), ver(4, 1), kst('2026-10-05T15:00'), [
    ai('ad-1', '광고 3편 중 1편은 설득 전략 이름만 있고 근거 장면이 없어요.', '설득 전략 분석'),
    ai('ad-2', '발표 시간 4분 기준에 비해 분석지 분량이 많아요. 발표에서 다룰 범위를 확인해보세요.', '발표 전달'),
  ]),
  review(fid(13, 1), t(13), ver(13, 1), kst('2026-10-06T04:00'), [
    ai('music-1', '감정 반응을 기록한 기준(예: 긴장 · 기대)이 광고마다 다르게 쓰였어요.'),
    ai('music-2', '광고 음악의 템포와 장면 전환을 연결한 설명이 한 문단에만 있어요.'),
  ]),
  review(fid(15, 1), t(15), ver(15, 1), kst('2026-10-05T09:00'), [
    ai('stair-1', '측정한 계단 수가 6개라 일차함수 관계를 설명하기에 충분한지 확인해보세요.'),
    ai('stair-2', '기울기의 의미(계단 한 칸당 높이)를 결론에서 다시 정리하면 좋아요.'),
  ]),
  review(fid(17, 1), t(17), ver(17, 1), kst('2026-09-28T20:00'), [ai('sleep-1', '설문 문항에 수면시간 구간이 겹쳐 있어요.')], {
    ...delivered(kst('2026-09-30T12:00'), '설문 구간이 겹치지 않게 다시 정리해주세요. 표본 수도 결론에 함께 적어주세요.', '수정본 요청', true),
  }),
  review(fid(17, 2), t(17), ver(17, 2), kst('2026-10-03T03:00'), [
    ai('sleep-2', '수정된 구간으로 다시 집계했는지 표 제목과 본문 숫자가 같은지 확인해보세요.'),
    ai('sleep-3', '상관관계와 인과관계를 구분하는 문장이 결론에 없어요.'),
    ai('sleep-4', '이상치 3건을 어떻게 처리했는지 기준이 보이지 않아요.'),
  ]),
  review(fid(20, 1), t(20), ver(20, 1), kst('2026-10-05T05:00'), [
    ai('li-1', '충전과 방전 때 산화되는 전극이 바뀌는 부분의 설명이 반대로 쓰인 문장이 있는지 확인해보세요.', '내용 정확성'),
    ai('li-2', '반응식 2개 중 1개에 전자 수가 빠져 있어요.'),
    ai('li-3', '참고 자료 출처가 1개뿐이에요.'),
  ]),
  review(fid(30, 1), t(30), ver(30, 1), kst('2026-10-05T17:00'), [
    ai('aiview-1', '반론 문단에서 "공정하지 않다"의 기준이 무엇인지 드러나지 않아요.', '주장과 반론 구분'),
    ai('aiview-2', '통계 자료의 출처 연도가 오래됐는지 확인해보세요.', '근거의 타당성'),
  ]),
  review(fid(32, 1), t(32), ver(32, 1), kst('2026-10-04T16:00'), [
    ai('sea-1', '두 지역 비교 기준(고도 · 인구 · 대응 정책) 중 대응 정책 자료가 한 지역에만 있어요.'),
    ai('sea-2', '지도 2장의 범례 단위가 서로 달라요.'),
  ]),
  review(fid(36, 1), t(36), ver(36, 1), kst('2026-10-01T08:00'), [ai('sw-1', '학과 교육과정 설명이 학교 홈페이지 문장과 거의 같아요.')], {
    ...delivered(kst('2026-10-02T10:00'), '학과 설명은 내 경험과 연결해 다시 써보세요. 관심을 갖게 된 계기가 더 드러나면 좋아요.', '수정본 요청', true),
  }),
  review(fid(36, 2), t(36), ver(36, 2), kst('2026-10-06T07:00'), [
    ai('sw-2', '봉사 경험과 전공 관심을 잇는 문단이 새로 생겼어요. 경험의 날짜 · 장소가 앞 문단과 같은지 확인해보세요.'),
    ai('sw-3', '결론의 진로 계획이 두 가지로 나뉘어 있어요.'),
  ]),
  review(fid(38, 1), t(38), ver(38, 1), kst('2026-10-02T09:00'), [
    ai('wheel-1', '경로 벡터의 크기를 계산할 때 경사로 길이가 빠져 있는지 확인해보세요.'),
    ai('wheel-2', '경로도에 축척이 없어요.'),
  ]),
  review(fid(39, 1), t(39), ver(39, 1), kst('2026-10-06T00:00'), [
    ai('rate-1', '평균변화율과 순간변화율을 구분해 쓴 곳과 섞어 쓴 곳이 있어요.'),
    ai('rate-2', '자료 출처의 기간(주 단위 / 일 단위)이 그래프마다 달라요.'),
  ]),
  review(fid(41, 1), t(41), ver(41, 1), kst('2026-10-04T07:00'), [
    ai('column-1', '칼럼의 핵심 주장과 근거를 나눈 표에서 근거 1개가 주장 칸에 들어가 있어요.'),
    ai('column-2', '반박 가능성에 대한 내 생각이 한 줄뿐이에요.'),
  ]),
  review(fid(44, 1), t(44), ver(44, 1), kst('2026-10-04T21:00'), [
    ai('gap-1', '에세이 분량이 412단어예요. 기준 350단어보다 길어요.'),
    ai('gap-2', 'thesis가 결론에서 반대 입장으로 바뀌어 보이는 문장이 있어요.'),
  ]),
  review(fid(49, 1), t(49), ver(49, 1), kst('2026-10-06T09:00'), [
    ai('hero-1', '두 작품의 영웅 서사 단계를 비교한 표에 한 작품의 결말 단계가 비어 있어요.'),
    ai('hero-2', '인용 쪽수가 빠진 인용문이 2개 있어요.'),
  ]),

  // ---- Admin 전용 학생: 전달 완료 이력 (이번 주 완료 · 수정 미반영 · 평균 첫 검토시간 근거) ----
  review(fid(3, 1), t(3), ver(3, 1), kst('2026-09-20T21:32'), [], delivered(kst('2026-09-22T09:00'), '두 시의 화자 태도 차이가 잘 드러나요. 그대로 최종 제출해도 좋아요.', '다음 단계 진행', false)),
  review(fid(8, 1), t(8), ver(8, 1), kst('2026-10-04T20:00'), [], delivered(kst('2026-10-05T14:00'), '인물의 활동 연도를 사료와 다시 맞춰보세요. 지역과의 관련성이 더 드러나면 좋아요.', '수정본 요청', true)),
  review(fid(22, 1), t(22), ver(22, 1), kst('2026-09-29T21:00'), [], delivered(kst('2026-10-01T11:00'), '모델의 밑을 정한 이유를 자료와 연결해 설명해주세요.', '수정본 요청', true)),
  review(fid(23, 1), t(23), ver(23, 1), kst('2026-10-03T09:00'), [], delivered(kst('2026-10-05T10:00'), '면접 질문 구성과 정리가 탄탄해요. 표 번호만 맞춘 뒤 최종 제출하세요.', '다음 단계 진행', false)),
  review(fid(25, 1), t(25), ver(25, 1), kst('2026-09-15T22:00'), [], delivered(kst('2026-09-16T18:00'), '현장 사진과 지도 표시가 잘 연결돼 있어요.', '다음 단계 진행', false)),
  review(fid(27, 1), t(27), ver(27, 1), kst('2026-09-24T18:00'), [], delivered(kst('2026-09-26T10:00'), '건의 대상과 요청 사항이 앞부분에 오도록 순서를 바꿔보세요.', '수정본 요청', true)),
  review(fid(27, 2), t(27), ver(27, 2), kst('2026-09-30T20:02'), [], delivered(kst('2026-10-05T16:00'), '근거 설문 결과를 한 문장으로 요약해 넣어주세요.', '자료 보완 요청', true)),
  review(fid(27, 3), t(27), ver(27, 3), kst('2026-10-05T21:02'), [
    ai('petition-1', '설문 결과 문장이 새로 들어갔어요. 설문 대상(2학년 100명)과 찬성 비율이 설문 결과 파일과 같은지 확인해보세요.', '근거 제시'),
    ai('petition-2', '마지막 문단의 "시범 운영" 제안이 건의 사항과 따로 떨어져 보여요. 요청 사항과 연결되는지 읽어보세요.', '구성'),
  ]),
  review(fid(28, 1), t(28), ver(28, 1), kst('2026-09-27T21:00'), [], delivered(kst('2026-09-29T09:00'), '충돌 전후 속도 측정 방법을 그림으로 보여주세요.', '수정본 요청', true)),
  review(fid(28, 2), t(28), ver(28, 2), kst('2026-10-02T19:02'), [], delivered(kst('2026-10-05T09:00'), '측정 방법이 잘 보완됐어요. 최종 제출을 준비하세요.', '다음 단계 진행', false)),
  review(fid(34, 1), t(34), ver(34, 1), kst('2026-09-26T19:00'), [], delivered(kst('2026-09-29T15:00'), 'pH 시험지 대신 측정기 값을 썼다면 측정 조건을 함께 적어주세요.', '수정본 요청', true)),
  review(fid(12, 1), t(12), ver(12, 1), kst('2026-09-30T21:00'), [], delivered(kst('2026-10-02T15:00'), '개선 전후 비교 기준을 하나로 정해 설명해주세요.', '수정본 요청', true)),
  review(fid(35, 1), t(35), ver(35, 1), kst('2026-09-10T20:00'), [], delivered(kst('2026-09-12T10:00'), '반대 측 근거를 하나 더 다뤄보세요.', '수정본 요청', true)),
  review(fid(35, 2), t(35), ver(35, 2), kst('2026-09-14T21:00'), [], delivered(kst('2026-09-15T15:00'), '양측 근거가 균형 있게 정리됐어요.', '다음 단계 진행', false)),
  review(fid(37, 1), t(37), ver(37, 1), kst('2026-09-17T22:00'), [], delivered(kst('2026-09-19T11:00'), '측정 그래프와 해석이 잘 맞아요.', '다음 단계 진행', false)),
  review(fid(43, 1), t(43), ver(43, 1), kst('2026-09-22T20:00'), [], delivered(kst('2026-09-23T18:00'), '대시보드 설명이 분명해요.', '다음 단계 진행', false)),
  review(fid(46, 1), t(46), ver(46, 1), kst('2026-09-22T21:00'), [], delivered(kst('2026-09-24T09:00'), '통계청 자료의 기준 연도를 적어주세요.', '수정본 요청', true)),
  review(fid(46, 2), t(46), ver(46, 2), kst('2026-09-29T22:00'), [], delivered(kst('2026-10-01T10:00'), '인터뷰 내용과 통계 자료가 따로 놀아요. 하나의 질문으로 묶어보세요.', '수정본 요청', true)),
]

/** Feedback Review Next Action 선택지 (FeedbackDetail Mockup 문구). Contract nextAction은 문자열이다. */
export const nextActionOptions = ['수정본 요청', '자료 보완 요청', '다음 단계 진행'] as const
export type NextActionOption = (typeof nextActionOptions)[number]
