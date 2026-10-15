// 현재 Mentor(한지수, fixture-mentor-01)의 Content Fixture. 실제 기록 / 경험이 아니다. (모든 내용 가상)
//
// TEMPORARY FIXTURE DUPLICATION:
// Published Content 7개는 Student Mentor Hub에서 한지수 Profile로 보이는 Content와 같은 contentId / 제목 / 요약 / 저장 수를 쓴다.
// (frontend/student/src/features/mentor-hub/fixtures/mentors.fixture.ts, mentorProfile.fixture.ts, mentorStory.fixture.ts,
//  mentorPlan.fixture.ts, mentorRecord.fixture.ts, activityCases.fixture.ts)
// Draft는 Student에게 보이지 않으므로 Mentor Surface에만 있다. Draft contentId는 Student Fixture가 쓰지 않은 다음 번호다.
//
// Record / Case에는 학교명 / 교사명 / 학번 / 반·번호 / 수험번호 / 제3자 실명을 넣지 않는다. (domain.md §33)
// 조회 / 저장 / Apply 수는 Contract Gap이라 화면 확인용 값이다. (저장 수는 Student Fixture 값과 같다)

import type { MentorContentDetail, PlanBodyWeek, PlanDay } from '../types.ts'

type PlanRow = [day: PlanDay, task: string, subject: string, memo?: string]

function planWeeks(contentId: string, rows: PlanRow[][]): PlanBodyWeek[] {
  return rows.map((weekRows, weekIndex) => ({
    week: weekIndex + 1,
    items: weekRows.map(([day, task, subject, memo], itemIndex) => ({
      itemId: `${contentId}-w${weekIndex + 1}-${itemIndex + 1}`,
      day,
      task,
      subject,
      memo: memo ?? '',
    })),
  }))
}

const notInReview = { publishRequestSubmitted: false, publishRequestedAt: null }

export const contentFixtures: MentorContentDetail[] = [
  // ---------- Published (Student Mentor Hub 한지수 Profile과 같은 Content) ----------
  {
    contentId: 'fixture-content-plan-01',
    type: 'PLAN',
    title: '국어 문학 내신 4주 정리 Plan',
    tags: ['내신', '국어', '문학'],
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    metrics: { viewCount: 3120, saveCount: 640, applyCount: 212 },
    review: notInReview,
    updatedAt: '2026-09-14T21:10:00+09:00',
    publishedAt: '2026-09-14T21:10:00+09:00',
    body: {
      description: '작품을 갈래별로 묶어 주차마다 표현법과 주제를 정리해요.',
      weeks: planWeeks('fixture-content-plan-01', [
        [
          ['화', '현대시 작품 표현법 정리', '국어', '시어마다 표시'],
          ['금', '현대시 주제 한 줄 정리', '국어'],
        ],
        [
          ['화', '고전시가 작품 표현법 정리', '국어'],
          ['금', '고전시가 주제 한 줄 정리', '국어'],
        ],
        [
          ['화', '현대소설 인물 관계 정리', '국어'],
          ['금', '고전소설 인물 관계 정리', '국어'],
        ],
        [
          ['화', '갈래별 작품 비교표 만들기', '국어', '표 한 장으로'],
          ['금', '문학 기출 서술형 쓰기', '국어'],
        ],
      ]),
    },
  },
  {
    contentId: 'fixture-content-story-06',
    type: 'STORY',
    title: '모의고사 성적이 흔들렸을 때 관리 방법',
    tags: ['모의고사', '멘탈', '생명과학'],
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    metrics: { viewCount: 8930, saveCount: 1400, applyCount: null },
    review: notInReview,
    updatedAt: '2026-09-28T19:40:00+09:00',
    publishedAt: '2026-09-28T19:40:00+09:00',
    body: {
      summary: '점수가 흔들린 다음 날 무엇을 했는지 정리했어요.',
      topics: ['recovery', 'mental'],
      text: [
        '고2 6월 모의고사 성적표를 받은 날, 생명과학이 두 등급이나 떨어져 있었어요. 내신 준비에만 집중하느라 모의고사 유형을 거의 안 풀었던 게 그대로 드러났어요.',
        '솔직히 그날은 아무것도 안 했어요. 다음 날 아침에 일어나서 제일 먼저 한 건 틀린 문제를 다시 펴보는 것도 아니고, 그냥 무엇 때문에 시간이 모자랐는지 적어보는 거였어요.',
        '그 뒤로 모의고사 다음 날은 무조건 틀린 문항만 봤어요. 단원별이 아니라 "자료를 잘못 읽음", "시간 부족", "개념 헷갈림" 이렇게 이유별로 나눴더니 제가 약한 게 개념이 아니라 자료 해석이라는 걸 알게 됐어요.',
        '평일에는 자료 해석 3문항만 고정으로 풀었고, 9월 모의고사에서 원래 등급으로 돌아왔어요. 그래서 교과 전형을 바꾸지 않고 끝까지 갈 수 있었어요.',
      ].join('\n\n'),
    },
  },
  {
    contentId: 'fixture-content-story-05',
    type: 'STORY',
    title: '생명과학 4등급에서 1등급까지',
    tags: ['성적 변화', '공부법', '생명과학'],
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    metrics: { viewCount: 12480, saveCount: 2400, applyCount: null },
    review: notInReview,
    updatedAt: '2026-09-21T20:05:00+09:00',
    publishedAt: '2026-09-21T20:05:00+09:00',
    body: {
      summary: '오답 루틴과 시간 배분을 바꾸며 성적을 올린 과정이에요.',
      topics: ['grade-change', 'study-method'],
      text: [
        '고1 1학기 생명과학 내신이 4등급이었어요. 개념은 안다고 생각했는데 시험에서는 시간이 늘 모자랐어요.',
        '틀린 문제를 "개념", "자료 해석", "시간" 세 칸으로 나눠 적었더니 대부분이 자료 해석에서 나온다는 걸 알게 됐어요.',
        '그 뒤로는 시험 2주 전부터 자료 해석 문항만 하루 5개씩 시간을 재고 풀었고, 고2 2학기에 1등급이 나왔어요.',
      ].join('\n\n'),
    },
  },
  {
    contentId: 'fixture-content-story-02',
    type: 'STORY',
    title: '탐구 주제를 진로 기록으로 이어간 과정',
    tags: ['진로', '탐구', '세특'],
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    metrics: { viewCount: 4210, saveCount: 910, applyCount: null },
    review: notInReview,
    updatedAt: '2026-09-02T22:30:00+09:00',
    publishedAt: '2026-09-02T22:30:00+09:00',
    body: {
      summary: '교내 탐구대회 주제를 세특과 진로 활동으로 연결한 이야기예요.',
      topics: ['career', 'success'],
      text: [
        '고2 1학기에 생명과학 진화 단원 포스터 과제로 항생제 내성을 골랐어요. 처음엔 과제 하나로 끝날 줄 알았어요.',
        '포스터를 준비하면서 통계를 그대로 옮기면 제 탐구가 아니라는 걸 느꼈고, 자료의 한계를 설명하려고 다시 조사했어요.',
        '그 질문이 동아리 미생물 배양 실험으로 이어졌고, 교내 탐구대회까지 같은 주제를 끌고 갔어요. 따로따로 한 활동이 아니라 한 질문을 계속 키운 거라 기록에도 자연스럽게 연결됐어요.',
      ].join('\n\n'),
    },
  },
  {
    contentId: 'fixture-content-story-03',
    type: 'STORY',
    title: '1학년 1.8에서 1.3까지 오답노트 운영기',
    tags: ['내신', '오답노트', '공부법'],
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    metrics: { viewCount: 6750, saveCount: 1320, applyCount: null },
    review: notInReview,
    updatedAt: '2026-08-24T21:00:00+09:00',
    publishedAt: '2026-08-24T21:00:00+09:00',
    body: {
      summary: '과목별 오답노트를 주간 단위로 다시 보는 방법을 정리했어요.',
      topics: ['study-method', 'grade-change'],
      text: [
        '1학년 때는 오답노트를 예쁘게 만드는 데 시간을 다 썼어요. 정작 다시 본 적은 거의 없었어요.',
        '2학년부터는 틀린 문제를 옮겨 적지 않고 문제집에 날짜만 적었어요. 대신 일요일 저녁 1시간은 그 주에 날짜를 적은 문제만 다시 풀었어요.',
        '두 번 틀린 문제만 노트에 옮겼더니 노트 양이 3분의 1로 줄었고, 시험 전에는 그 노트만 봤어요.',
      ].join('\n\n'),
    },
  },
  {
    contentId: 'fixture-content-record-02',
    type: 'RECORD',
    title: '생명과학Ⅰ · 세부능력 및 특기사항',
    tags: ['세특', '생명과학', '탐구'],
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    metrics: { viewCount: 5320, saveCount: 1180, applyCount: null },
    review: { publishRequestSubmitted: true, publishRequestedAt: '2026-09-05T18:20:00+09:00' },
    updatedAt: '2026-09-09T10:00:00+09:00',
    publishedAt: '2026-09-09T10:00:00+09:00',
    body: {
      grade: 2,
      semester: 1,
      area: 'subject-detail',
      subjectOrActivity: '생명과학Ⅰ',
      recordText:
        '항생제 내성균 증가 현상을 자연선택의 원리와 연결하여 탐구함. 국내 항생제 내성 관련 통계 자료를 찾아 자료의 변화 양상을 정리하고, 내성 변이를 가진 개체의 생존과 번식이 집단 내 형질 빈도 변화로 이어지는 과정을 도식화하여 발표함. 자료의 수치를 단순 제시하기보다 조사 범위와 해석의 한계를 함께 설명하려는 태도가 돋보임.',
      linkedActivity: '항생제 내성과 자연선택 탐구 포스터',
      mentorNote: '포스터를 만들 때보다 자료의 한계를 설명하려고 다시 조사한 과정이 기록에 남았어요.',
    },
  },
  {
    contentId: 'fixture-content-case-01',
    type: 'CASE',
    title: '항생제 내성과 자연선택 탐구 포스터',
    tags: ['수행평가', '탐구 포스터', '생명과학'],
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    metrics: { viewCount: 7040, saveCount: 1500, applyCount: null },
    review: { publishRequestSubmitted: true, publishRequestedAt: '2026-09-05T18:30:00+09:00' },
    updatedAt: '2026-09-10T11:00:00+09:00',
    publishedAt: '2026-09-10T11:00:00+09:00',
    body: {
      grade: 2,
      subject: '생명과학Ⅰ',
      activityType: '탐구 포스터',
      summary: '탐구계획부터 Staff Feedback, 최종 포스터, 미생물 배양 후속 활동까지 정리한 Activity Case예요.',
      stages: [
        {
          stageId: 'guide',
          title: '안내문 등록',
          description:
            '생명과학Ⅰ 진화 단원과 연계한 탐구 포스터 과제였어요. A3 한 장에 탐구 질문, 자료, 결론을 담고 3분 동안 발표해야 했어요.',
        },
        {
          stageId: 'topic',
          title: '주제 선정',
          description:
            '처음에는 여러 나라의 항생제 사용량과 내성균 비율을 비교하려고 했어요. 3주 안에 자료를 모으기 어려워 국내 통계 하나로 범위를 줄였어요.',
        },
        {
          stageId: 'research',
          title: '자료 조사',
          description: '질병관리청 통계와 교과서의 자연선택 모형을 함께 사용했어요. 통계는 연도별 변화만 골라 표 하나로 정리했어요.',
        },
        { stageId: 'draft', title: '초안 V1 제출', description: 'V1 초안은 통계 표가 포스터의 절반을 차지했어요.' },
        {
          stageId: 'revision',
          title: 'Revision',
          description:
            'Feedback을 받고 자연선택 4단계를 가운데 두고 통계는 근거로만 배치했어요.',
        },
        {
          stageId: 'final',
          title: '최종 제출 / 발표',
          description:
            'V2 포스터는 변이 → 선택 → 생존·번식 → 내성균 증가 순서로 읽히도록 구성했어요. 발표도 도식 순서를 그대로 따라갔어요.',
        },
      ],
      evidenceSummary: '질병관리청 항생제 내성 통계(연도별 변화), 교과서 자연선택 모형, 연도별 내성균 비율 표 1개',
      result: 'A3 포스터 V2 제출, 3분 발표 완료',
      reflection: '통계를 그대로 옮기면 내 탐구가 아니라는 점을 배웠어요.',
      followUp: '동아리 미생물 배양 실험으로 이어갔고, 생명과학Ⅰ 세특과 동아리 기록에 연결됐어요.',
    },
  },

  // ---------- Draft (Mentor Surface에만 보임) ----------
  {
    contentId: 'fixture-content-plan-08',
    type: 'PLAN',
    title: '고2 기말고사 3주 생명과학·화학 Plan',
    tags: ['내신', '생명과학', '화학'],
    status: 'DRAFT',
    visibility: 'PUBLIC',
    metrics: { viewCount: 0, saveCount: 0, applyCount: 0 },
    review: notInReview,
    updatedAt: '2026-10-12T22:40:00+09:00',
    publishedAt: null,
    body: {
      description: '기말고사 3주 전부터 생명과학Ⅰ과 화학Ⅰ을 번갈아 보는 계획이에요. 3주차는 서술형만 따로 잡았어요.',
      weeks: planWeeks('fixture-content-plan-08', [
        [
          ['월', '생명과학Ⅰ 유전 단원 개념 정리', '생명과학Ⅰ', '교과서 탐구 활동까지'],
          ['수', '화학Ⅰ 몰 계산 문제 20개', '화학Ⅰ', '단위 끝까지 쓰기'],
          ['금', '1주차 오답 다시 풀기', '전 과목'],
        ],
        [
          ['월', '생명과학Ⅰ 가계도 분석 문제', '생명과학Ⅰ', '시간 재고 풀기'],
          ['수', '화학Ⅰ 화학 반응식 정리', '화학Ⅰ'],
          ['금', '2주차 오답 다시 풀기', '전 과목'],
        ],
        [
          ['월', '생명과학Ⅰ 서술형 답안 써보기', '생명과학Ⅰ', '채점 기준 옆에 두고'],
          ['수', '화학Ⅰ 서술형 기출 모으기', '화학Ⅰ'],
        ],
      ]),
    },
  },
  {
    contentId: 'fixture-content-routine-07',
    type: 'ROUTINE',
    title: '평일 아침 영어 독해 20분 루틴',
    tags: ['영어', '아침 루틴', '독해'],
    status: 'DRAFT',
    visibility: 'PUBLIC',
    metrics: { viewCount: 0, saveCount: 0, applyCount: 0 },
    review: notInReview,
    updatedAt: '2026-10-11T07:55:00+09:00',
    publishedAt: null,
    body: {
      description: '등교 전 20분만 영어 지문을 읽었어요. 길게 하지 않는 대신 평일에는 빼먹지 않는 게 목표였어요.',
      habits: [
        {
          habitId: 'fixture-content-routine-07-h1',
          title: '모의고사 지문 2개 읽기',
          frequency: '평일',
          start: '07:00',
          end: '07:12',
          description: '시간을 재고 읽고, 주제 문장에만 밑줄을 쳐요.',
        },
        {
          habitId: 'fixture-content-routine-07-h2',
          title: '모르는 단어 5개만 적기',
          frequency: '평일',
          start: '07:12',
          end: '07:20',
          description: '단어장은 따로 만들지 않고 휴대폰 메모에 적어 둬요.',
        },
        {
          habitId: 'fixture-content-routine-07-h3',
          title: '주간 단어 다시 보기',
          frequency: '토요일',
          start: '10:00',
          end: '10:30',
          description: '한 주 동안 적은 단어를 가리고 뜻을 말해 봐요.',
        },
      ],
    },
  },
  {
    contentId: 'fixture-content-story-11',
    type: 'STORY',
    title: '수학 4등급에서 2등급까지 올린 1년',
    tags: ['수학', '성적 변화', '공부법'],
    status: 'DRAFT',
    visibility: 'PUBLIC',
    metrics: { viewCount: 0, saveCount: 0, applyCount: null },
    review: notInReview,
    updatedAt: '2026-10-13T23:15:00+09:00',
    publishedAt: null,
    body: {
      summary: '수학은 끝까지 1등급이 안 나왔지만, 교과 전형에서 버틸 수 있게 만든 방법이에요.',
      topics: ['grade-change', 'study-method'],
      text: [
        '생명과학과 달리 수학은 고1 내내 4등급이었어요. 문제집을 바꿔도 결과가 비슷했어요.',
        '고2부터는 새 문제를 푸는 시간보다 틀린 문제를 다시 푸는 시간을 더 길게 잡았어요. 하루 1시간 중 40분은 복습이었어요.',
      ].join('\n\n'),
    },
  },
  {
    contentId: 'fixture-content-record-08',
    type: 'RECORD',
    title: '진로활동 · 대학 연계 실험캠프',
    tags: ['진로활동', '실험캠프', '생명과학'],
    status: 'DRAFT',
    visibility: 'PUBLIC',
    metrics: { viewCount: 0, saveCount: 0, applyCount: null },
    // Canonical Review State 확정 전 UI-only representation (검수 대기 화면 표시용)
    review: { publishRequestSubmitted: true, publishRequestedAt: '2026-10-12T20:30:00+09:00' },
    updatedAt: '2026-10-12T20:30:00+09:00',
    publishedAt: null,
    body: {
      grade: 2,
      semester: null,
      area: 'career',
      subjectOrActivity: '진로활동',
      recordText:
        '대학 연계 생명과학 실험캠프(3일)에 참여하여 PCR의 원리를 학습하고 DNA 증폭 실험을 수행함. 실험 결과 밴드가 예상과 다르게 나타난 원인을 프라이머 설계와 온도 조건에서 찾아 보고서로 정리하는 등 실패한 결과를 분석하려는 태도를 보임.',
      linkedActivity: '교외 · 대학 연계 생명과학 여름캠프',
      mentorNote: '실험이 실패한 이유를 정리한 보고서가 기록의 중심이 됐어요.',
    },
  },
  {
    contentId: 'fixture-content-case-25',
    type: 'CASE',
    title: '효모 발효 조건에 따른 이산화탄소 발생량 비교 실험',
    tags: ['동아리', '실험', '생명과학'],
    status: 'DRAFT',
    visibility: 'PUBLIC',
    metrics: { viewCount: 0, saveCount: 0, applyCount: null },
    review: notInReview,
    updatedAt: '2026-10-09T21:20:00+09:00',
    publishedAt: null,
    body: {
      grade: 1,
      subject: '통합과학 · 생명과학 동아리',
      activityType: '실험 보고서',
      summary: '설탕 농도와 온도를 바꿔 효모 발효를 비교한 동아리 실험이에요. 측정 방법을 한 번 바꿨어요.',
      stages: [
        {
          stageId: 'plan',
          title: '실험 설계',
          description: '설탕 농도 3단계 × 온도 2단계로 조건을 나눴어요. 풍선 둘레로 기체 양을 재기로 했어요.',
        },
        {
          stageId: 'first-run',
          title: '1차 실험',
          description: '풍선 둘레 측정값이 사람마다 달라 비교가 어려웠어요.',
        },
        {
          stageId: 'second-run',
          title: '측정 방법 변경 후 2차 실험',
          description: '눈금 실린더에 물을 채워 밀려난 부피로 측정 방법을 바꿨어요.',
        },
      ],
      evidenceSummary: '조건별 측정표 2회분, 실험 사진 메모',
      result: '',
      reflection: '',
      followUp: '',
    },
  },
]
