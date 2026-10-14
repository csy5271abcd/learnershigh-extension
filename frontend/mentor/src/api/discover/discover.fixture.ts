// Mentor Discover Source Fixture. 실제 인물 / 기록이 아니다. (모든 인물 / 내용 가상)
//
// TEMPORARY FIXTURE DUPLICATION:
// Mentor 공개 Profile, 사진, Content id / 제목 / 요약 / 본문은 Student Mentor Hub Canonical Fixture
// (frontend/student/src/features/mentor-hub/fixtures/*)에서 옮겨 적었다. 같은 Mentor는 모든 화면에서 같은 값을 쓴다. (domain.md §57)
// 사진은 Student 사진을 192px WebP로 줄인 사본이다. (TEMPORARY ASSET DUPLICATION)
//
// 공개 범위 검증을 위해 Source에는 비공개 Field(status / metrics / review)와 Draft · 검수 대기 Content가 섞여 있다.
// 화면은 projection.ts를 거친 공개 값만 받는다.

import mentor03 from '../../assets/mentors/fixture-mentor-03.webp'
import mentor06 from '../../assets/mentors/fixture-mentor-06.webp'
import mentor07 from '../../assets/mentors/fixture-mentor-07.webp'
import mentor09 from '../../assets/mentors/fixture-mentor-09.webp'
import mentor10 from '../../assets/mentors/fixture-mentor-10.webp'
import mentor11 from '../../assets/mentors/fixture-mentor-11.webp'
import mentor15 from '../../assets/mentors/fixture-mentor-15.webp'
import type { CaseBody, MentorProfile, PlanBodyWeek, PlanDay, RecordBody, RoutineHabit, StoryBody } from '../types.ts'
import type { DiscoverSourceContent } from './projection.ts'

export const discoverMentorFixtures: MentorProfile[] = [
  {
    mentorId: 'fixture-mentor-10',
    name: '고민정',
    university: '성균관대',
    major: '심리학과',
    admissionType: '학생부종합',
    highSchoolContext: '일반고 · 내신 관리',
    representativeExperience: '중간고사 대비 4주 계획 운영',
    verified: true,
    tags: ['학생부종합', 'Plan'],
    profileImageUrl: mentor10,
  },
  {
    mentorId: 'fixture-mentor-11',
    name: '최은채',
    university: '한국외대',
    major: '국제통상학과',
    admissionType: '학생부종합',
    highSchoolContext: '일반고 · 영어 우수',
    representativeExperience: '영어 단어·구문 매일 30분 루틴 유지',
    verified: true,
    tags: ['학생부종합', 'Routine'],
    profileImageUrl: mentor11,
  },
  {
    mentorId: 'fixture-mentor-07',
    name: '정민혁',
    university: '한양대',
    major: '컴퓨터소프트웨어학부',
    admissionType: '학생부종합',
    highSchoolContext: '일반고 · 정보 동아리',
    representativeExperience: '교내 SW 경진대회 수상, 프로그래밍 동아리 운영',
    verified: true,
    tags: ['학생부종합', 'SW'],
    profileImageUrl: mentor07,
  },
  {
    mentorId: 'fixture-mentor-06',
    name: '강민호',
    university: '한양대',
    major: '기계공학과',
    admissionType: '학생부교과',
    highSchoolContext: '일반고 · 내신 1.5',
    representativeExperience: '내신 1.5, 교내 과학탐구대회 참가',
    verified: true,
    tags: ['내신', '공부법'],
    profileImageUrl: mentor06,
  },
  {
    mentorId: 'fixture-mentor-03',
    name: '박나윤',
    university: '경희대',
    major: '식품영양학과',
    admissionType: '논술',
    highSchoolContext: '일반고 · 자연계 논술 · 수능 최저 충족',
    representativeExperience: '경희대 자연계 논술 합격, 수능 최저 충족, 기술·가정 수행평가',
    verified: true,
    tags: ['논술', '수리논술', '수능최저', '식품영양'],
    profileImageUrl: mentor03,
  },
  {
    mentorId: 'fixture-mentor-09',
    name: '이채린',
    university: '고려대',
    major: '국어교육과',
    admissionType: '학생부종합',
    highSchoolContext: '일반고 · 독서토론 활동',
    representativeExperience: '독서토론부 부장 2년, 교내 독서 토론대회 참여',
    verified: true,
    tags: ['학생부종합', '독서'],
    profileImageUrl: mentor09,
  },
  {
    mentorId: 'fixture-mentor-15',
    name: '이현서',
    university: '성균관대',
    major: '사학과',
    admissionType: '정시',
    highSchoolContext: '일반고 · 재수 · 수능 표준점수 +34 상승',
    representativeExperience: '재수 기간 주간 모의고사 회고로 취약 영역 관리',
    verified: true,
    tags: ['정시', '재수', '성적향상', '역사'],
    profileImageUrl: mentor15,
  },
]

// ---------- Content builders ----------

type Base = Pick<DiscoverSourceContent, 'contentId' | 'title' | 'tags' | 'mentorId'> & { publishedAt: string; saveCount: number }

function base({ publishedAt, saveCount, ...rest }: Base) {
  return {
    ...rest,
    status: 'PUBLISHED' as const,
    visibility: 'PUBLIC' as const,
    // 비공개 Field: Projection이 버린다.
    metrics: { viewCount: saveCount * 5, saveCount, applyCount: null },
    review: { publishRequestSubmitted: false, publishRequestedAt: null },
    updatedAt: `${publishedAt}T20:00:00+09:00`,
    publishedAt: `${publishedAt}T20:00:00+09:00`,
  }
}

type PlanRow = [day: PlanDay, task: string, subject: string, memo?: string]
const weeks = (id: string, rows: PlanRow[][]): PlanBodyWeek[] =>
  rows.map((week, w) => ({
    week: w + 1,
    items: week.map(([day, task, subject, memo], i) => ({ itemId: `${id}-w${w + 1}-${i + 1}`, day, task, subject, memo: memo ?? '' })),
  }))

const habits = (id: string, rows: [title: string, frequency: string, start: string, end: string, description: string][]): RoutineHabit[] =>
  rows.map(([title, frequency, start, end, description], i) => ({ habitId: `${id}-h${i + 1}`, title, frequency, start, end, description }))

const stages = (rows: [stageId: string, title: string, description: string][]): CaseBody['stages'] =>
  rows.map(([stageId, title, description]) => ({ stageId, title, description }))

const story = (summary: string, topics: StoryBody['topics'], paragraphs: string[]): StoryBody => ({ summary, topics, text: paragraphs.join('\n\n') })

const record = (body: Omit<RecordBody, 'semester'> & { semester?: 1 | 2 }): RecordBody => ({ semester: null, ...body })

export const discoverContentFixtures: DiscoverSourceContent[] = [
  // ---- 고민정 ----
  {
    ...base({ contentId: 'fixture-content-plan-02', mentorId: 'fixture-mentor-10', title: '고2 중간고사 4주 Plan', tags: ['내신', 'Plan', '수행평가'], publishedAt: '2026-09-30', saveCount: 1200 }),
    type: 'PLAN',
    body: {
      description: '시험 4주 전부터 과목별 분량을 주차로 나눴어요. 2주차는 화학 수행평가가 있어서 학원 없는 날 다음에 배치했어요.',
      weeks: weeks('fixture-content-plan-02', [
        [['월', '수학Ⅱ 미분 개념 정리', '수학Ⅱ', '교과서 예제부터'], ['화', '화학Ⅰ 1단원 개념 정리', '화학Ⅰ', '수업 필기와 함께 보기'], ['수', '영어 본문 1~2과 읽기', '영어', '모르는 단어 표시'], ['목', '수학Ⅱ 유형 문제 풀이', '수학Ⅱ', '틀린 문제에 별표'], ['금', '1주차 범위 점검', '전 과목', '밀린 분량만 보충']],
        [['월', '화학Ⅰ 수행평가 자료 정리', '화학Ⅰ', '학원 없는 날이라 길게 잡기'], ['화', '화학Ⅰ 수행평가 보고서 마무리', '화학Ⅰ', '제출 전 채점 기준 확인'], ['수', '영어 본문 3~4과 읽기', '영어'], ['목', '수학Ⅱ 적분 개념 정리', '수학Ⅱ'], ['금', '2주차 범위 점검', '전 과목', '밀린 분량만 보충']],
        [['월', '수학Ⅱ 기출 1회', '수학Ⅱ', '시간 재고 풀기'], ['화', '화학Ⅰ 2단원 문제 풀이', '화학Ⅰ'], ['수', '영어 본문 문법 포인트 정리', '영어'], ['목', '화학Ⅰ 서술형 기출 모으기', '화학Ⅰ'], ['금', '오답 노트 정리', '전 과목', '별표 표시까지만']],
        [['월', '수학Ⅱ 실전 모의 1회', '수학Ⅱ', '시험과 같은 시간대에 풀기'], ['화', '화학Ⅰ 서술형 대비', '화학Ⅰ', '답안을 직접 써보기'], ['수', '영어 본문 암기 점검', '영어', '빈칸으로 만들어 확인하기'], ['목', '전 과목 오답 다시 보기', '수학Ⅱ 중심', '별표 친 문제만'], ['금', '시험 전날 개념 요약 1장', '화학Ⅰ', 'A4 한 장을 넘기지 않기']],
      ]),
    },
  },
  {
    ...base({ contentId: 'fixture-content-record-04', mentorId: 'fixture-mentor-10', title: '심리탐구 동아리 · 동아리활동', tags: ['동아리', '심리', '토론'], publishedAt: '2026-09-18', saveCount: 640 }),
    type: 'RECORD',
    body: record({
      grade: 2,
      area: 'club',
      subjectOrActivity: '심리탐구 동아리',
      recordText:
        '인간의 판단과 의사결정에 관심을 가지고 모둠 토론과 간단한 행동 관찰 활동에 지속적으로 참여함. AI 면접의 공정성을 주제로 알고리즘 편향과 인간 평가자의 편향을 비교하여 자료를 정리하고, 찬반 의견을 검토한 뒤 조건부 활용 방안을 제안함.',
      linkedActivity: 'AI 면접의 공정성에 관한 윤리 논증문',
      mentorNote: '찬성과 반대를 모두 정리한 뒤 조건을 붙여 결론을 낸 과정이 기록됐어요.',
    }),
  },
  {
    ...base({ contentId: 'fixture-content-case-15', mentorId: 'fixture-mentor-10', title: 'AI 면접의 공정성에 관한 윤리 논증문', tags: ['수행평가', '윤리', '논증문'], publishedAt: '2026-09-11', saveCount: 981 }),
    type: 'CASE',
    body: {
      grade: 2,
      subject: '생활과 윤리',
      activityType: '윤리 논증문',
      summary: '알고리즘 편향 조사 · 찬반 논거 비교 · 1,700자 논증문 과정을 정리한 Activity Case예요.',
      stages: stages([
        ['guide', '활동 안내', '현대 윤리 쟁점 하나에 대해 자신의 입장을 논증하는 1,700자 글을 쓰는 과제였어요.'],
        ['research', '자료 조사', '알고리즘 편향과 사람 평가자의 편향을 다룬 자료를 찾아 비교했어요.'],
        ['arguments', '찬반 논거 비교', '찬성과 반대 논거를 세 가지씩 표로 정리하고 각 근거의 한계를 적었어요.'],
        ['write', '논증문 작성', '찬반을 검토한 뒤 조건을 붙여 활용 방안을 제안하는 방향으로 논증문을 썼어요.'],
      ]),
      evidenceSummary: '알고리즘 편향 / 사람 평가자 편향 자료, 찬반 논거 비교표',
      result: '1,700자 논증문 제출',
      reflection: '한쪽 입장을 고르기보다 어떤 조건에서 괜찮은지 따지는 게 더 설득력 있었어요.',
      followUp: '심리탐구 동아리에서 같은 주제로 토론을 이어갔어요.',
    },
  },
  // ---- 최은채 ----
  {
    ...base({ contentId: 'fixture-content-routine-02', mentorId: 'fixture-mentor-11', title: '영어 단어·구문 매일 30분', tags: ['영어', 'Routine', '아침 루틴'], publishedAt: '2026-10-02', saveCount: 890 }),
    type: 'ROUTINE',
    body: {
      description: '아침·저녁 30분씩 단어와 구문을 반복하는 루틴이에요.',
      habits: habits('fixture-content-routine-02', [
        ['아침 단어 30개', '매일', '07:00', '07:30', '하루 시작을 짧은 암기로 열어요.'],
        ['저녁 구문 5개', '매일', '22:30', '23:00', '아침에 본 단어를 문장으로 다시 써요.'],
      ]),
    },
  },
  {
    ...base({ contentId: 'fixture-content-record-06', mentorId: 'fixture-mentor-11', title: '국제통상 · 진로활동', tags: ['진로활동', '영어', '국제통상'], publishedAt: '2026-09-20', saveCount: 410 }),
    type: 'RECORD',
    body: record({
      grade: 2,
      area: 'career',
      subjectOrActivity: '국제통상',
      recordText:
        '지역 관광지의 영어 안내문을 조사하면서 직역된 표현과 실제 방문자에게 필요한 정보의 차이를 분석함. 안내 문구를 목적과 독자에 맞게 수정하고, 이후 학교 행사 영어 안내자료 제작으로 활동을 확장하여 언어 사용과 국제적 의사소통에 대한 관심을 구체화함.',
      linkedActivity: '우리 지역 관광지 영어 안내문 개선',
      mentorNote: '안내문을 고친 뒤 학교 행사 자료로 이어간 흐름이 진로활동에 남았어요.',
    }),
  },
  {
    ...base({ contentId: 'fixture-content-case-07', mentorId: 'fixture-mentor-11', title: '우리 지역 관광지 영어 안내문 개선', tags: ['영어', '프로젝트', '수행평가'], publishedAt: '2026-09-08', saveCount: 441 }),
    type: 'CASE',
    body: {
      grade: 2,
      subject: '영어',
      activityType: '개선 프로젝트',
      summary: '안내판 조사 · 한·영 문구 비교 · 표현 수정 · Before/After · 영어 발표 과정을 정리한 Activity Case예요.',
      stages: stages([
        ['guide', '활동 안내', '생활 속 영어 표현을 조사하고 더 나은 표현을 제안하는 영어 프로젝트였어요.'],
        ['survey', '안내판 조사', '우리 지역 관광지 두 곳의 영어 안내판 문구를 직접 보고 기록했어요.'],
        ['compare', '한·영 비교', '한국어 원문과 영어 문구를 나란히 놓고, 직역 때문에 방문자에게 필요한 정보가 빠진 부분을 찾았어요.'],
        ['revise', '표현 수정', '안내문의 목적과 읽는 사람을 기준으로 문구를 고치고 Before / After 표로 정리했어요.'],
        ['present', '영어 발표', '문구를 왜 그렇게 고쳤는지 영어로 발표했어요.'],
      ]),
      evidenceSummary: '관광지 두 곳 안내판 기록, 한·영 문구 비교표',
      result: 'Before / After 표, 영어 발표',
      reflection: '정확한 번역보다 읽는 사람이 무엇을 알고 싶은지가 먼저라는 걸 배웠어요.',
      followUp: '학교 행사 영어 안내자료 제작으로 활동을 넓혔어요.',
    },
  },
  // ---- 정민혁 ----
  {
    ...base({ contentId: 'fixture-content-routine-06', mentorId: 'fixture-mentor-07', title: '수행평가와 코딩 프로젝트 병행 루틴', tags: ['정보', 'Routine', '수행평가'], publishedAt: '2026-10-08', saveCount: 530 }),
    type: 'ROUTINE',
    body: {
      description: '평일 저녁을 수행평가와 코딩으로 나눈 주간 루틴이에요.',
      habits: habits('fixture-content-routine-06', [
        ['수행평가 자료 정리', '평일', '19:00', '20:00', '마감이 가까운 과목부터 해요.'],
        ['코딩 프로젝트', '평일', '20:30', '21:50', '기능 하나씩 끝내요.'],
        ['작업 메모 남기기', '평일', '21:50', '22:00', '다음 날 이어서 할 일을 적어요.'],
      ]),
    },
  },
  {
    ...base({ contentId: 'fixture-content-record-03', mentorId: 'fixture-mentor-07', title: '정보 · 세부능력 및 특기사항', tags: ['세특', '정보', '데이터'], publishedAt: '2026-09-25', saveCount: 720 }),
    type: 'RECORD',
    body: record({
      grade: 1,
      area: 'subject-detail',
      subjectOrActivity: '정보',
      recordText:
        '학교생활에서 발견한 급식 잔반 문제를 데이터 분석 주제로 설정하고, 4주간의 메뉴별 잔반 데이터를 CSV 형태로 정리하여 Python으로 평균과 항목별 차이를 분석함. 분석 결과와 원인에 대한 추측을 구분하여 서술하고 추가 설문의 필요성을 제안하는 등 데이터 해석의 한계를 인식함.',
      linkedActivity: '학교 급식 잔반 데이터 분석 프로젝트',
      mentorNote: '분석 결과와 제 추측을 나눠 쓰려고 했던 부분이 기록에 그대로 남았어요.',
    }),
  },
  {
    ...base({ contentId: 'fixture-content-case-21', mentorId: 'fixture-mentor-07', title: '학교 급식 잔반 데이터 분석 프로젝트', tags: ['정보', '데이터', '프로젝트'], publishedAt: '2026-09-15', saveCount: 649 }),
    type: 'CASE',
    body: {
      grade: 1,
      subject: '정보',
      activityType: '데이터 분석 프로젝트',
      summary: '4주 급식 데이터 · CSV · Python 분석 · Matplotlib · 보고서 · 3분 시연 과정을 정리한 Activity Case예요.',
      stages: stages([
        ['guide', '활동 안내', '학교생활에서 데이터를 모아 분석하고 결과를 시연하는 정보 프로젝트였어요.'],
        ['collect', '데이터 수집', '4주 동안 메뉴별 잔반 데이터를 CSV로 정리했어요.'],
        ['analyze', 'Python 분석', 'Python으로 메뉴별 평균과 항목별 차이를 계산했어요.'],
        ['graph', '시각화', 'Matplotlib으로 메뉴별 잔반량 그래프를 그렸어요.'],
        ['report', '보고서 · 시연', '분석 결과와 원인에 대한 추측을 나눠 보고서에 쓰고 3분 동안 시연했어요.'],
      ]),
      evidenceSummary: '4주 메뉴별 잔반 CSV, Python 분석 결과, 그래프',
      result: '보고서 제출, 3분 시연',
      reflection: '분석 결과와 원인에 대한 추측을 나눠 써야 데이터가 말하는 범위가 분명해졌어요.',
      followUp: '추가 설문이 필요하다는 제안을 보고서 마지막에 남겼어요.',
    },
  },
  // ---- 강민호 ----
  {
    ...base({ contentId: 'fixture-content-story-01', mentorId: 'fixture-mentor-06', title: '수학 3등급에서 내신 1등급까지', tags: ['수학', '성적 변화', '공부법'], publishedAt: '2026-08-24', saveCount: 720 }),
    type: 'STORY',
    body: story('개념 노트 대신 풀이 과정을 말로 설명하며 공부법을 바꾼 이야기예요.', ['success', 'grade-change', 'study-method'], [
      '수학 개념 노트를 예쁘게 정리하는 데만 시간을 쓰고, 정작 시험에서는 3등급이었어요.',
      '문제를 풀고 나서 친구에게 설명하듯 풀이 과정을 소리 내어 말했어요. 막히는 지점이 곧 제가 모르는 부분이었어요.',
      '노트를 쓰는 시간보다 설명하다 막히는 순간이 더 많이 가르쳐 줬어요.',
    ]),
  },
  {
    ...base({ contentId: 'fixture-content-case-18', mentorId: 'fixture-mentor-06', title: '자동차 속도와 제동거리의 관계 탐구', tags: ['수학', '탐구보고서', '함수'], publishedAt: '2026-09-05', saveCount: 327 }),
    type: 'CASE',
    body: {
      grade: 2,
      subject: '수학',
      activityType: '수학 탐구 보고서',
      summary: '속도별 제동거리 데이터 · 함수 모델 비교 · 그래프 · 탐구보고서 과정을 정리한 Activity Case예요.',
      stages: stages([
        ['guide', '활동 안내', '생활 속 현상을 함수로 나타내고 탐구보고서를 쓰는 과제였어요.'],
        ['data', '데이터 수집', '공개된 자료에서 속도별 제동거리 데이터를 모아 표로 정리했어요.'],
        ['model', '함수 모델 비교', '일차함수와 이차함수 모델을 각각 맞춰보고 오차를 비교했어요.'],
        ['graph', '그래프', '데이터와 두 모델을 한 그래프에 그려 차이를 보여줬어요.'],
        ['report', '탐구보고서', '이차함수 모델이 더 잘 맞는 이유를 속도와 에너지 관계로 설명했어요.'],
      ]),
      evidenceSummary: '속도별 제동거리 공개 자료, 모델별 오차 비교표',
      result: '탐구보고서 제출',
      reflection: '데이터에 맞는 함수를 고르면서 수식이 무엇을 뜻하는지 다시 생각하게 됐어요.',
      followUp: '',
    },
  },
  // 비공개 (Draft): Discover에 나오면 안 된다.
  {
    ...base({ contentId: 'fixture-content-story-91', mentorId: 'fixture-mentor-06', title: '물리 실험 보고서를 다시 쓴 이유 (초안)', tags: ['물리'], publishedAt: '2026-10-10', saveCount: 0 }),
    status: 'DRAFT',
    publishedAt: null,
    type: 'STORY',
    body: story('아직 쓰는 중이에요.', ['failure'], ['초안 본문']),
  },
  // ---- 박나윤 ----
  {
    ...base({ contentId: 'fixture-content-routine-01', mentorId: 'fixture-mentor-03', title: '물리Ⅰ·화학Ⅰ 개념 복습 루틴', tags: ['과학', 'Routine', '개념 복습'], publishedAt: '2026-09-28', saveCount: 610 }),
    type: 'ROUTINE',
    body: {
      description: '물리 공식 유도와 화학 계산 문제를 번갈아 복습하는 루틴이에요.',
      habits: habits('fixture-content-routine-01', [
        ['공식 한 줄 유도', '매일', '21:00', '21:30', '하루 한 공식만 처음부터 유도해요.'],
        ['화학 계산 문제', '매일', '21:30', '22:00', '단위를 끝까지 써요.'],
      ]),
    },
  },
  {
    ...base({ contentId: 'fixture-content-case-03', mentorId: 'fixture-mentor-03', title: '가공음료의 당류 함량 비교와 하루 섭취량 분석', tags: ['기술가정', '비교 분석', '수행평가'], publishedAt: '2026-09-03', saveCount: 578 }),
    type: 'CASE',
    body: {
      grade: 2,
      subject: '기술가정',
      activityType: '비교 분석',
      summary: '음료 12종 영양정보 조사 · 당류 비교표·막대그래프 · 식생활 개선안 과정을 정리한 Activity Case예요.',
      stages: stages([
        ['guide', '활동 안내', '자주 먹는 식품의 영양 정보를 조사하고 식생활 개선안을 제안하는 과제였어요.'],
        ['collect', '영양정보 조사', '친구들이 자주 마시는 가공음료 12종의 영양정보 표시를 기록했어요.'],
        ['compare', '당류 비교', '당류 함량을 비교표와 막대그래프로 정리하고 하루 섭취 기준과 비교했어요.'],
        ['propose', '식생활 개선안', '하루 섭취량을 기준으로 음료를 고르는 방법을 개선안으로 정리했어요.'],
      ]),
      evidenceSummary: '음료 12종 영양정보 기록, 당류 비교표 · 막대그래프',
      result: '식생활 개선안 제출',
      reflection: '하루 섭취 기준과 비교하니 숫자가 훨씬 와닿았어요.',
      followUp: '',
    },
  },
  // ---- 이채린 ----
  {
    ...base({ contentId: 'fixture-content-plan-04', mentorId: 'fixture-mentor-09', title: '고2 수행평가 준비 3주 Plan', tags: ['수행평가', 'Plan', '국어'], publishedAt: '2026-10-06', saveCount: 470 }),
    type: 'PLAN',
    body: {
      description: '수행평가 제출 3주 전부터 주제 선정, 자료 조사, 초안을 한 주씩 나눴어요.',
      weeks: weeks('fixture-content-plan-04', [
        [['월', '주제 후보 3개 적기', '국어', '수업 내용과 연결'], ['목', '주제 1개 고르기', '국어']],
        [['월', '자료 3개 찾기', '국어', '출처 함께 적기'], ['목', '자료 요약하기', '국어']],
        [['월', '초안 쓰기', '국어'], ['목', '평가 기준으로 초안 점검', '국어', '제출 이틀 전까지']],
      ]),
    },
  },
  {
    ...base({ contentId: 'fixture-content-record-05', mentorId: 'fixture-mentor-09', title: '독서토론 동아리 · 동아리활동', tags: ['동아리', '독서', '토론'], publishedAt: '2026-09-22', saveCount: 380 }),
    type: 'RECORD',
    body: record({
      grade: 2,
      area: 'club',
      subjectOrActivity: '독서토론 동아리',
      recordText:
        '다양한 매체의 설득 방식을 주제로 광고와 뉴스 자료를 비교하며 언어 표현이 독자의 판단에 미치는 영향을 분석함. 토론 과정에서 다른 의견의 근거를 정리해 재질문하고 자신의 주장과 구분하여 기록하는 등 비판적 읽기 태도를 보임.',
      linkedActivity: '배달앱 광고의 언어적 설득 전략 분석',
      mentorNote: '다른 의견의 근거를 다시 물어본 습관이 동아리 기록의 중심이 됐어요.',
    }),
  },
  {
    ...base({ contentId: 'fixture-content-case-04', mentorId: 'fixture-mentor-09', title: '배달앱 광고의 언어적 설득 전략 분석', tags: ['국어', '매체 분석', '발표'], publishedAt: '2026-09-01', saveCount: 372 }),
    type: 'CASE',
    body: {
      grade: 2,
      subject: '국어',
      activityType: '매체 분석 발표',
      summary: '광고 영상 분석 · 표현 분류 · A4 분석지 2쪽 · 4분 발표 과정을 정리한 Activity Case예요.',
      stages: stages([
        ['guide', '활동 안내', '광고 한 편을 골라 언어적 설득 전략을 분석하고 4분 동안 발표하는 국어 수행평가였어요.'],
        ['topic', '광고 선정', '자주 보던 배달앱 광고 3편을 비교한 뒤, 표현이 가장 다양하게 쓰인 한 편을 골랐어요.'],
        ['classify', '표현 분류', '광고 문구를 받아 적고 과장, 반복, 감정 호소 표현으로 나눠 표로 정리했어요.'],
        ['write', '분석지 작성', '분류 결과를 바탕으로 각 표현이 보는 사람의 판단에 어떤 영향을 주는지 분석지 2쪽에 정리했어요.'],
        ['present', '발표', '분석지 순서대로 광고 문구를 보여주며 4분 동안 발표했어요.'],
      ]),
      evidenceSummary: '광고 문구 기록, 표현 유형 분류표',
      result: 'A4 분석지 2쪽, 4분 발표',
      reflection: '같은 문장도 어떤 장면과 함께 나오느냐에 따라 설득 방식이 달라진다는 걸 알게 됐어요.',
      followUp: '독서토론 동아리에서 광고와 뉴스의 설득 방식을 비교하는 토론으로 이어갔어요.',
    },
  },
  // 비공개 (검수 대기 Case): Discover에 나오면 안 된다.
  {
    ...base({ contentId: 'fixture-content-case-92', mentorId: 'fixture-mentor-09', title: '시 낭송 영상 제작 활동 (검수 대기)', tags: ['국어'], publishedAt: '2026-10-11', saveCount: 0 }),
    status: 'DRAFT',
    publishedAt: null,
    review: { publishRequestSubmitted: true, publishRequestedAt: '2026-10-11T20:00:00+09:00' },
    type: 'CASE',
    body: {
      grade: 3,
      subject: '국어',
      activityType: '영상 제작',
      summary: '검수 전 Case',
      stages: stages([['plan', '기획', '검수 전']]),
      evidenceSummary: '',
      result: '',
      reflection: '',
      followUp: '',
    },
  },
  // ---- 이현서 ----
  {
    ...base({ contentId: 'fixture-content-story-07', mentorId: 'fixture-mentor-15', title: '수시 준비를 중단하고 정시로 전환한 이유', tags: ['정시', '전형 선택', '진로'], publishedAt: '2026-09-14', saveCount: 1100 }),
    type: 'STORY',
    body: story('전형을 바꾸기로 한 시점과 기준을 적었어요.', ['admission-switch', 'career'], [
      '고2 겨울방학에 내신과 모의고사 성적을 나란히 놓고 보니, 모의고사 쪽이 꾸준히 더 좋았어요.',
      '"3월 모의고사에서 국어·탐구가 2등급 안에 들면 정시로 간다"는 기준을 정하고, 그 전까지는 내신도 놓지 않았어요.',
      '전형을 바꾼 게 아니라, 제 성적이 더 잘 나오는 쪽을 고른 거였어요.',
    ]),
  },
  {
    ...base({ contentId: 'fixture-content-case-09', mentorId: 'fixture-mentor-15', title: '산업혁명 시기 노동환경과 사회 변화 조사', tags: ['세계사', '조사 보고서', '사료 분석'], publishedAt: '2026-08-28', saveCount: 555 }),
    type: 'CASE',
    body: {
      grade: 2,
      subject: '세계사',
      activityType: '조사 보고서',
      summary: '공장·노동 자료 조사 · 아동노동·도시화 분석 · 사료 분석표 · 보고서 과정을 정리한 Activity Case예요.',
      stages: stages([
        ['guide', '활동 안내', '세계사 단원에서 주제를 하나 정해 자료를 조사하고 보고서를 쓰는 과제였어요.'],
        ['research', '자료 조사', '산업혁명 시기 공장 노동 시간과 임금에 관한 자료를 교과서와 도서관 자료에서 찾았어요.'],
        ['analyze', '주제 분석', '자료를 아동노동과 도시화 두 주제로 나눠 변화의 원인과 결과를 정리했어요.'],
        ['table', '사료 분석표', '자료마다 누가, 어떤 입장에서 남긴 기록인지 분석표로 정리했어요.'],
        ['report', '보고서', '분석표를 근거로 노동환경 변화가 사회에 미친 영향을 보고서로 썼어요.'],
      ]),
      evidenceSummary: '공장 노동 시간 · 임금 자료, 사료 분석표',
      result: '조사 보고서 제출',
      reflection: '숫자 자료와 당시 사람들의 기록을 함께 보니 변화가 더 구체적으로 보였어요.',
      followUp: '',
    },
  },
] as DiscoverSourceContent[]
