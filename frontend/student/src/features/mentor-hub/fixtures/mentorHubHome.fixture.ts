// UI 검증용 Fixture다. 실제 Backend / LearnersHigh / Student / Mentor 데이터가 아니다.
// 모든 인물은 가상이며, 추천 이유는 추천 Algorithm 결과가 아니라 미리 작성한 표시용 문장이다.
// 같은 Mentor는 모든 영역에서 같은 값을 쓰도록 아래 mentors 한 곳에서만 정의한다. (domain.md §57)

import mentorMan02 from '../../../../assets/mentor-man/mentor-man-02.png'
import mentorMan05 from '../../../../assets/mentor-man/mentor-man-05.png'
import mentorMan08 from '../../../../assets/mentor-man/mentor-man-08.png'
import mentorWoman01 from '../../../../assets/mentor-woman/mentor-woman-01.png'
import mentorWoman03 from '../../../../assets/mentor-woman/mentor-woman-03.png'
import mentorWoman04 from '../../../../assets/mentor-woman/mentor-woman-04.png'
import mentorWoman06 from '../../../../assets/mentor-woman/mentor-woman-06.png'
import mentorWoman08 from '../../../../assets/mentor-woman/mentor-woman-08.png'
import mentorWoman09 from '../../../../assets/mentor-woman/mentor-woman-09.png'
import mentorWoman11 from '../../../../assets/mentor-woman/mentor-woman-11.png'
import mentorWoman14 from '../../../../assets/mentor-woman/mentor-woman-14.png'
import type {
  LinkedTask,
  MentorContentSummary,
  MentorHubHome,
  MentorSummary,
} from '../model/types.ts'

// Profile Image는 화면 확인용 Visual Mapping이다. (Mentor별로 서로 다른 사진, 성별을 Domain 값으로 두지 않는다)
const mentors = {
  hanJisu: {
    mentorId: 'fixture-mentor-01',
    name: '한지수',
    university: '이화여대',
    major: '생명과학과',
    admissionType: '학생부교과',
    highSchoolContext: '일반고 · 내신 1.3 · 생명과학I·화학I 3년 1등급',
    representativeExperience: '내신 1.3 유지, 교내 생명과학 탐구대회 금상, 교외 · 대학 연계 실험캠프',
    tags: ['내신', '교과전형', '교내대회', '생명과학'],
    profileImageUrl: mentorWoman01,
  },
  hanYerin: {
    mentorId: 'fixture-mentor-02',
    name: '한예린',
    university: '건국대',
    major: '환경보건과학과',
    admissionType: '학생부교과',
    highSchoolContext: '일반고 · 내신 1.6 · 통합과학·화학 우수',
    representativeExperience: '교내 환경 탐구대회 은상, 환경 동아리 부장',
    tags: ['내신', '교과전형', '교내대회', '환경'],
    profileImageUrl: mentorWoman08,
  },
  parkNayun: {
    mentorId: 'fixture-mentor-03',
    name: '박나윤',
    university: '경희대',
    major: '식품영양학과',
    admissionType: '논술',
    highSchoolContext: '일반고 · 자연계 논술 · 수능 최저 충족',
    representativeExperience: '경희대 자연계 논술 합격, 수능 최저 충족, 기술·가정 수행평가',
    tags: ['논술', '수리논술', '수능최저', '식품영양'],
    profileImageUrl: mentorWoman11,
  },
  jeongSejin: {
    mentorId: 'fixture-mentor-04',
    name: '정세진',
    university: '숙명여대',
    major: '통계학과',
    admissionType: '정시',
    highSchoolContext: '일반고 · 정시 집중',
    representativeExperience: '수능 수학 백분위 97, 9월 모의고사 이후 실전 루틴 정비',
    tags: ['정시', '수능수학'],
    profileImageUrl: mentorWoman04,
  },
  choiAreum: {
    mentorId: 'fixture-mentor-05',
    name: '최아름',
    university: '서강대',
    major: '경제학과',
    admissionType: '학생부종합',
    highSchoolContext: '일반고 · 사회탐구 중심',
    representativeExperience: '교내 사회탐구 보고서 대회 수상, 경제 동아리 활동',
    tags: ['학생부종합', '보고서'],
    profileImageUrl: mentorWoman03,
  },
  kangMinho: {
    mentorId: 'fixture-mentor-06',
    name: '강민호',
    university: '한양대',
    major: '기계공학과',
    admissionType: '학생부교과',
    highSchoolContext: '일반고 · 내신 1.5',
    representativeExperience: '내신 1.5, 교내 과학탐구대회 참가',
    tags: ['내신', '공부법'],
    profileImageUrl: mentorMan02,
  },
  jeongMinhyuk: {
    mentorId: 'fixture-mentor-07',
    name: '정민혁',
    university: '한양대',
    major: '컴퓨터소프트웨어학부',
    admissionType: '학생부종합',
    highSchoolContext: '일반고 · 정보 동아리',
    representativeExperience: '교내 SW 경진대회 수상, 프로그래밍 동아리 운영',
    tags: ['학생부종합', 'SW'],
    profileImageUrl: mentorMan08,
  },
  kimHaram: {
    mentorId: 'fixture-mentor-08',
    name: '김하람',
    university: '홍익대',
    major: '시각디자인과',
    admissionType: '실기',
    highSchoolContext: '일반고 · 미술 실기 병행',
    representativeExperience: '교외 · 공공디자인 공모전 참여, 실기 포트폴리오 준비',
    tags: ['실기', '디자인'],
    profileImageUrl: mentorMan05,
  },
  leeChaerin: {
    mentorId: 'fixture-mentor-09',
    name: '이채린',
    university: '고려대',
    major: '국어교육과',
    admissionType: '학생부종합',
    highSchoolContext: '일반고 · 독서토론 활동',
    representativeExperience: '독서토론부 부장 2년, 교내 독서 토론대회 참여',
    tags: ['학생부종합', '독서'],
    profileImageUrl: mentorWoman09,
  },
  goMinjeong: {
    mentorId: 'fixture-mentor-10',
    name: '고민정',
    university: '성균관대',
    major: '심리학과',
    admissionType: '학생부종합',
    highSchoolContext: '일반고 · 내신 관리',
    representativeExperience: '중간고사 대비 4주 계획 운영',
    tags: ['학생부종합', 'Plan'],
    profileImageUrl: mentorWoman14,
  },
  choiEunchae: {
    mentorId: 'fixture-mentor-11',
    name: '최은채',
    university: '한국외대',
    major: '국제통상학과',
    admissionType: '학생부종합',
    highSchoolContext: '일반고 · 영어 우수',
    representativeExperience: '영어 단어·구문 매일 30분 루틴 유지',
    tags: ['학생부종합', 'Routine'],
    profileImageUrl: mentorWoman06,
  },
} satisfies Record<string, MentorSummary>

const content = {
  antibioticCase: { contentId: 'fixture-content-case-01', kind: 'case', title: '항생제 내성과 자연선택' },
  literaturePlan: { contentId: 'fixture-content-plan-01', kind: 'plan', title: '국어 문학 내신 4주 정리 Plan' },
  environmentRecord: {
    contentId: 'fixture-content-record-01',
    kind: 'record',
    title: '환경 탐구를 생명과학 진로로 연결한 세특 기록',
  },
  riverCase: { contentId: 'fixture-content-case-02', kind: 'case', title: '학교 주변 하천의 수질과 생물 관찰' },
  scienceRoutine: { contentId: 'fixture-content-routine-01', kind: 'routine', title: '물리·화학 개념 복습 루틴' },
  beverageCase: {
    contentId: 'fixture-content-case-03',
    kind: 'case',
    title: '가공음료의 당류 함량 비교와 하루 섭취 기준',
  },
  midtermPlan: { contentId: 'fixture-content-plan-02', kind: 'plan', title: '고2 중간고사 4주 Plan' },
  englishRoutine: { contentId: 'fixture-content-routine-02', kind: 'routine', title: '영어 단어·구문 매일 30분' },
  mathStory: { contentId: 'fixture-content-story-01', kind: 'story', title: '수학 3등급에서 내신 1등급까지' },
  posterQna: {
    contentId: 'fixture-content-qna-01',
    kind: 'qna',
    title: '탐구 포스터 주제를 좁힐 때 무엇부터 봤나요?',
  },
} satisfies Record<string, MentorContentSummary>

const currentTask: LinkedTask = {
  taskId: 'fixture-task-01',
  title: '항생제 내성과 자연선택 탐구 포스터',
}

export const mentorHubHomeFixture: MentorHubHome = {
  studentContext: {
    displayName: '최하은',
    grade: '고2',
    interestField: '생명과학 · 생명공학',
    currentTask,
    savedContentTags: ['미생물', '유전', '생명공학', '의생명', '환경생물'],
  },
  recommendedMentors: [
    {
      mentor: mentors.hanJisu,
      recommendationReason: "지금 진행 중인 '항생제 내성과 자연선택' 탐구 포스터와 같은 주제로 활동한 경험이 있어요.",
      relatedContent: [content.antibioticCase, content.literaturePlan],
    },
    {
      mentor: mentors.hanYerin,
      recommendationReason: '저장한 #환경생물 관심사처럼, 환경 탐구를 생명과학 진로로 이어간 경험이 있어요.',
      relatedContent: [content.environmentRecord, content.riverCase],
    },
    {
      mentor: mentors.parkNayun,
      recommendationReason: '생명 계열과 가까운 식품영양학과에 진학했고, 탐구 활동과 수능 최저 준비를 함께 한 경험이 있어요.',
      relatedContent: [content.scienceRoutine, content.beverageCase],
    },
  ],
  otherMentors: [
    mentors.jeongSejin,
    mentors.choiAreum,
    mentors.kangMinho,
    mentors.jeongMinhyuk,
    mentors.kimHaram,
    mentors.leeChaerin,
  ],
  adminRecommendedCases: [
    {
      caseId: content.antibioticCase.contentId,
      title: content.antibioticCase.title,
      mentor: mentors.hanJisu,
      relationReason: '진행 중인 탐구 포스터와 주제가 같고, 자료 조사부터 발표까지의 과정을 참고할 수 있어요.',
      recommendedDate: '2026-10-04',
      linkedTask: currentTask,
      processSteps: [
        '안내문 등록',
        '주제 선정',
        '자료 조사',
        '초안 V1 제출',
        'AI 사전 점검',
        '선생님 피드백',
        'Revision',
        '최종 제출 / 발표',
      ],
    },
  ],
  mixedContent: [
    {
      ...content.midtermPlan,
      summary: '수학·화학·영어를 요일별로 나눈 4주 계획이에요. 2주차에 화학 수행평가를 배치했어요.',
      mentor: mentors.goMinjeong,
    },
    {
      ...content.englishRoutine,
      summary: '아침·저녁 30분씩 단어와 구문을 반복하는 루틴이에요.',
      mentor: mentors.choiEunchae,
    },
    {
      ...content.mathStory,
      summary: '개념 노트 대신 풀이 과정을 말로 설명하며 공부법을 바꾼 이야기예요.',
      mentor: mentors.kangMinho,
    },
    {
      ...content.posterQna,
      summary: '교과 개념에서 출발해 직접 확인할 수 있는 범위로 주제를 줄인 과정을 답했어요.',
      mentor: mentors.hanJisu,
    },
    {
      ...content.environmentRecord,
      summary: '환경 탐구 활동이 생명과학 진로 기록으로 이어진 흐름을 볼 수 있어요.',
      mentor: mentors.hanYerin,
    },
    {
      ...content.beverageCase,
      summary: '실험 설계부터 결과 발표까지의 과정이 정리된 Activity Case예요.',
      mentor: mentors.parkNayun,
    },
  ],
}

/** Empty State 확인용: Student Context는 있고 추천 결과가 모두 비어 있는 경우 */
export const emptyMentorHubHomeFixture: MentorHubHome = {
  studentContext: mentorHubHomeFixture.studentContext,
  recommendedMentors: [],
  otherMentors: [],
  adminRecommendedCases: [],
  mixedContent: [],
}

export type MentorHubHomeFixtureScenario = 'success' | 'empty' | 'loading' | 'error'

const scenarios: MentorHubHomeFixtureScenario[] = ['success', 'empty', 'loading', 'error']

/** 개발 중 `?fixture=empty|loading|error`로 화면 상태를 확인한다. */
export function readFixtureScenario(search: string): MentorHubHomeFixtureScenario {
  const value = new URLSearchParams(search).get('fixture')
  return scenarios.find((scenario) => scenario === value) ?? 'success'
}

/** 실제 API 대신 Fixture를 돌려주는 Data Source. API 연결 시 같은 시그니처의 함수로 교체한다. */
export function createMentorHubHomeFixtureLoader(
  scenario: MentorHubHomeFixtureScenario,
): () => Promise<MentorHubHome> {
  switch (scenario) {
    case 'loading':
      return () => new Promise<MentorHubHome>(() => {})
    case 'error':
      return () => Promise.reject(new Error('Mentor Hub Home fixture error'))
    case 'empty':
      return () => Promise.resolve(emptyMentorHubHomeFixture)
    case 'success':
      return () => Promise.resolve(mentorHubHomeFixture)
  }
}
