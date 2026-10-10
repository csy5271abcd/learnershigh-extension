// Mentor Hub 화면(Home / List / Profile)이 함께 쓰는 Canonical Mentor / Content Fixture.
// 실제 Mentor 데이터가 아니며 모든 인물은 가상이다.
// 같은 Mentor는 모든 화면에서 같은 값을 쓰도록 이 파일 한 곳에서만 정의한다. (domain.md §57)

import mentorMan01 from '../../../../assets/mentor-man/mentor-man-01.png'
import mentorMan02 from '../../../../assets/mentor-man/mentor-man-02.png'
import mentorMan03 from '../../../../assets/mentor-man/mentor-man-03.png'
import mentorMan04 from '../../../../assets/mentor-man/mentor-man-04.png'
import mentorMan05 from '../../../../assets/mentor-man/mentor-man-05.png'
import mentorMan06 from '../../../../assets/mentor-man/mentor-man-06.png'
import mentorMan08 from '../../../../assets/mentor-man/mentor-man-08.png'
import mentorWoman01 from '../../../../assets/mentor-woman/mentor-woman-01.png'
import mentorWoman02 from '../../../../assets/mentor-woman/mentor-woman-02.png'
import mentorWoman03 from '../../../../assets/mentor-woman/mentor-woman-03.png'
import mentorWoman04 from '../../../../assets/mentor-woman/mentor-woman-04.png'
import mentorWoman05 from '../../../../assets/mentor-woman/mentor-woman-05.png'
import mentorWoman06 from '../../../../assets/mentor-woman/mentor-woman-06.png'
import mentorWoman07 from '../../../../assets/mentor-woman/mentor-woman-07.png'
import mentorWoman08 from '../../../../assets/mentor-woman/mentor-woman-08.png'
import mentorWoman09 from '../../../../assets/mentor-woman/mentor-woman-09.png'
import mentorWoman10 from '../../../../assets/mentor-woman/mentor-woman-10.png'
import mentorWoman11 from '../../../../assets/mentor-woman/mentor-woman-11.png'
import mentorWoman12 from '../../../../assets/mentor-woman/mentor-woman-12.png'
import mentorWoman13 from '../../../../assets/mentor-woman/mentor-woman-13.png'
import mentorWoman14 from '../../../../assets/mentor-woman/mentor-woman-14.png'
import type { MentorContentSummary, MentorSummary } from '../model/types.ts'

// Profile Image는 화면 확인용 Visual Mapping이다. (Mentor별로 서로 다른 사진, 성별을 Domain 값으로 두지 않는다)
export const fixtureMentors = {
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
  // ---- Mentor List 탐색용 추가 Mentor (MentorProfile-00 Mockup의 멘토 목록 기준) ----
  yoonHaram: {
    mentorId: 'fixture-mentor-12',
    name: '윤하람',
    university: '성균관대',
    major: '미디어커뮤니케이션학과',
    admissionType: '논술',
    highSchoolContext: '일반고 · 모의고사 국어 1등급 · 논술 6회 응시 후 합격',
    representativeExperience: '인문 논술 기출 분석 노트, 교외 영상 제작 활동',
    tags: ['논술', '수능최저', '교외활동', '미디어'],
    profileImageUrl: mentorWoman02,
  },
  ohJunseok: {
    mentorId: 'fixture-mentor-13',
    name: '오준석',
    university: '한국외대',
    major: '영어교육과',
    admissionType: '학생부교과',
    highSchoolContext: '일반고 · 영어 내신 3년 1등급 · 교과 평균 1.4',
    representativeExperience: '영어 내신 3년 1등급 유지, 교내 영어 말하기 대회 수상',
    tags: ['내신', '교과전형', '교내대회', '영어'],
    profileImageUrl: mentorMan01,
  },
  parkSeohyun: {
    mentorId: 'fixture-mentor-14',
    name: '박서현',
    university: '고려대',
    major: '역사교육과',
    admissionType: '정시',
    highSchoolContext: '일반고 · 수능 국·수·탐 백분위 96 이상 · 한국사 1등급',
    representativeExperience: '국어 비문학 8주 계획으로 지문 구조 분석 연습',
    tags: ['정시', '수능', '성적향상', '사탐'],
    profileImageUrl: mentorWoman05,
  },
  leeHyunseo: {
    mentorId: 'fixture-mentor-15',
    name: '이현서',
    university: '성균관대',
    major: '사학과',
    admissionType: '정시',
    highSchoolContext: '일반고 · 재수 · 수능 표준점수 +34 상승',
    representativeExperience: '재수 기간 주간 모의고사 회고로 취약 영역 관리',
    tags: ['정시', '재수', '성적향상', '역사'],
    profileImageUrl: mentorWoman07,
  },
  jeongDain: {
    mentorId: 'fixture-mentor-16',
    name: '정다인',
    university: '연세대',
    major: '정치외교학과',
    admissionType: '논술',
    highSchoolContext: '일반고 · 논술 + 수능최저 충족 · 토론 경험',
    representativeExperience: '교내 토론대회 준우승, 시사 논술 주 1회 첨삭',
    tags: ['논술', '토론대회', '수능최저', '정치외교'],
    profileImageUrl: mentorWoman10,
  },
  kimDoyeon: {
    mentorId: 'fixture-mentor-17',
    name: '김도연',
    university: '서울대',
    major: '지리학과',
    admissionType: '학생부종합',
    highSchoolContext: '일반고 · 지리 탐구 동아리 · 지역 조사 프로젝트',
    representativeExperience: '도시 열섬 현상 지역 조사, 지리 탐구 동아리 운영',
    tags: ['학생부종합', '동아리', '탐구', '지리'],
    profileImageUrl: mentorWoman12,
  },
  joMinjae: {
    mentorId: 'fixture-mentor-18',
    name: '조민재',
    university: '연세대',
    major: '경제학부',
    admissionType: '정시',
    highSchoolContext: '일반고 · 수능 수학 1등급 · 경제 선택',
    representativeExperience: '수학 실전 모의고사 회차별 오답 정리',
    tags: ['정시', '수능', '수학', '경제'],
    profileImageUrl: mentorMan03,
  },
  seoJiho: {
    mentorId: 'fixture-mentor-19',
    name: '서지호',
    university: '고려대',
    major: '경영학과',
    admissionType: '학생부교과',
    highSchoolContext: '일반고 · 내신 1.2 · 교내 경제 동아리',
    representativeExperience: '내신 1.2 유지, 교내 창업 아이디어 대회 수상',
    tags: ['내신', '교과전형', '교내대회', '경영'],
    profileImageUrl: mentorMan04,
  },
  kimTaehyun: {
    mentorId: 'fixture-mentor-20',
    name: '김태현',
    university: '중앙대',
    major: '심리학과',
    admissionType: '논술',
    highSchoolContext: '일반고 · 수리논술 · 수능 최저 충족',
    representativeExperience: '심리학 독서 기록과 수리논술 주 2회 실전 연습',
    tags: ['논술', '수리논술', '수능최저', '심리'],
    profileImageUrl: mentorMan06,
  },
  // ---- Routine 목록 (Routine-00 Mockup) ----
  leeSubin: {
    mentorId: 'fixture-mentor-21',
    name: '이수빈',
    university: '서울시립대',
    major: '도시공학과',
    admissionType: '학생부종합',
    highSchoolContext: '일반고 · 수학 실전 모의 주 3회 · 교내 도시 탐구 동아리',
    representativeExperience: '평일 저녁 수학 실전 모의와 오답 정리를 1년 동안 반복',
    tags: ['학생부종합', '수학', 'Routine', '도시'],
    profileImageUrl: mentorWoman13,
  },
} satisfies Record<string, MentorSummary>

export const fixtureMentorContent = {
  antibioticCase: { contentId: 'fixture-content-case-01', kind: 'case', title: '항생제 내성과 자연선택' },
  literaturePlan: { contentId: 'fixture-content-plan-01', kind: 'plan', title: '국어 문학 내신 4주 정리 Plan' },
  environmentRecord: {
    contentId: 'fixture-content-record-01',
    kind: 'record',
    title: '환경 탐구를 생명과학 진로로 연결한 세특 기록',
  },
  riverCase: { contentId: 'fixture-content-case-02', kind: 'case', title: '학교 주변 하천의 수질과 생물 관찰' },
  scienceRoutine: { contentId: 'fixture-content-routine-01', kind: 'routine', title: '물리Ⅰ·화학Ⅰ 개념 복습 루틴' },
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
  nonliteraturePlan: { contentId: 'fixture-content-plan-03', kind: 'plan', title: '수능 국어 비문학 8주 Plan' },
  summerStory: { contentId: 'fixture-content-story-04', kind: 'story', title: '국어 비문학 시간이 모자랐던 고3 여름' },
  // ---- Plan 목록 (Plan-00 Mockup) ----
  performancePlan: { contentId: 'fixture-content-plan-04', kind: 'plan', title: '고2 수행평가 준비 3주 Plan' },
  englishPlan: { contentId: 'fixture-content-plan-05', kind: 'plan', title: '영어 빈칸·순서 유형 4주 Plan' },
  mathPlan: { contentId: 'fixture-content-plan-06', kind: 'plan', title: '수학Ⅱ 내신 5주 역산 Plan' },
  wrongAnswerPlan: { contentId: 'fixture-content-plan-07', kind: 'plan', title: '모의고사 이후 오답 7일 Plan' },
  // ---- Routine 목록 (Routine-00 Mockup) ----
  csatRoutine: { contentId: 'fixture-content-routine-03', kind: 'routine', title: '수능 D-100 하루 공부 루틴' },
  mathMockRoutine: { contentId: 'fixture-content-routine-04', kind: 'routine', title: '주간 수학 실전 모의 루틴' },
  examPeriodRoutine: { contentId: 'fixture-content-routine-05', kind: 'routine', title: '학교 시험기간 하루 공부 루틴' },
  codingRoutine: { contentId: 'fixture-content-routine-06', kind: 'routine', title: '수행평가와 코딩 프로젝트 병행 루틴' },
} satisfies Record<string, MentorContentSummary>

/** Plan 한 줄 요약. Home / Profile / Plan 목록이 같은 문장을 쓴다. (Plan-00 Mockup 문구 기준) */
export const fixturePlanSummaries: Record<string, string> = {
  [fixtureMentorContent.nonliteraturePlan.contentId]: '지문 구조 분석과 풀이 시간 단축을 8주로 나눈 계획이에요.',
  [fixtureMentorContent.midtermPlan.contentId]:
    '수학Ⅱ·화학Ⅰ·영어를 요일별로 나눈 4주 계획이에요. 2주차에 화학 수행평가를 배치했어요.',
  [fixtureMentorContent.literaturePlan.contentId]: '작품별 표현법과 주제를 주차별로 나눠 정리하는 계획이에요.',
  [fixtureMentorContent.performancePlan.contentId]: '주제 선정, 자료 조사, 초안을 3주로 나눈 수행평가 계획이에요.',
  [fixtureMentorContent.englishPlan.contentId]: '모의고사에서 자주 틀리는 빈칸·순서 유형만 4주 동안 집중하는 계획이에요.',
  [fixtureMentorContent.mathPlan.contentId]: '시험일에서 거꾸로 단원별 문제 풀이 분량을 정한 계획이에요.',
  [fixtureMentorContent.wrongAnswerPlan.contentId]: '모의고사 다음 날부터 7일 동안 오답을 정리하는 계획이에요.',
}

/** Routine 한 줄 요약. Home / Profile / Routine 목록이 같은 문장을 쓴다. (Routine-00 Mockup 문구 기준) */
export const fixtureRoutineSummaries: Record<string, string> = {
  [fixtureMentorContent.csatRoutine.contentId]: '기상부터 취침까지 과목별 시간을 고정한 하루 루틴이에요.',
  [fixtureMentorContent.mathMockRoutine.contentId]: '평일 저녁에 수학 실전 모의와 오답을 이어서 하는 루틴이에요.',
  [fixtureMentorContent.englishRoutine.contentId]: '아침·저녁 30분씩 단어와 구문을 반복하는 루틴이에요.',
  [fixtureMentorContent.examPeriodRoutine.contentId]: '시험기간 하루를 과목별 시간 블록으로 나눈 루틴이에요.',
  [fixtureMentorContent.codingRoutine.contentId]: '평일 저녁을 수행평가와 코딩으로 나눈 주간 루틴이에요.',
  [fixtureMentorContent.scienceRoutine.contentId]: '물리 공식 유도와 화학 계산 문제를 번갈아 복습하는 루틴이에요.',
}
