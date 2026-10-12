import { CHOI_HAEUN_ID } from './adminStudents.fixture.ts'
import type { MentorApplication, MentorCaseRecommendation, MentorCaseRef } from './types.ts'

/*
 * Mentor Case · 추천 · 적용 Canonical Fixture.
 * - Case 목록은 Student Mentor Hub Canonical Activity Case 24개(activityCases.fixture.ts)를 같은 contentId로 가리킨다.
 *   제목 · Mentor(mentors.fixture.ts) · 학년 · 과목 · 활동 유형은 Student 값 그대로다. Admin에서 새 Case를 만들지 않는다.
 * - 추천(Recommendation): 최하은 case-01 → fixture-task-01은 Mentor Hub Home adminRecommendedCases(2026-10-04) 그대로,
 *   case-06 → fixture-task-02는 Task Detail "선생님 추천" 연결(teacherRecommended) 그대로다. (추천 날짜가 Student Fixture에 없어 null)
 * - 적용(Application): 기존 LearnersHigh Plan에 적용된 Snapshot (Existing Plan 연결 대상, Plan을 다시 만들지 않는다)
 *   최하은은 Student Fixture에 적용 Seed가 없어 적용 기록을 두지 않는다.
 */

const mentor = {
  hanJisu: ['fixture-mentor-01', '한지수', '이화여대 생명과학과'],
  hanYerin: ['fixture-mentor-02', '한예린', '건국대 환경보건과학과'],
  parkNayun: ['fixture-mentor-03', '박나윤', '경희대 식품영양학과'],
  jeongSejin: ['fixture-mentor-04', '정세진', '숙명여대 통계학과'],
  choiAreum: ['fixture-mentor-05', '최아름', '서강대 경제학과'],
  kangMinho: ['fixture-mentor-06', '강민호', '한양대 기계공학과'],
  jeongMinhyuk: ['fixture-mentor-07', '정민혁', '한양대 컴퓨터소프트웨어학부'],
  kimHaram: ['fixture-mentor-08', '김하람', '홍익대 시각디자인과'],
  leeChaerin: ['fixture-mentor-09', '이채린', '고려대 국어교육과'],
  goMinjeong: ['fixture-mentor-10', '고민정', '성균관대 심리학과'],
  choiEunchae: ['fixture-mentor-11', '최은채', '한국외대 국제통상학과'],
  yoonHaram: ['fixture-mentor-12', '윤하람', '성균관대 미디어커뮤니케이션학과'],
  ohJunseok: ['fixture-mentor-13', '오준석', '한국외대 영어교육과'],
  parkSeohyun: ['fixture-mentor-14', '박서현', '고려대 역사교육과'],
  leeHyunseo: ['fixture-mentor-15', '이현서', '성균관대 사학과'],
  jeongDain: ['fixture-mentor-16', '정다인', '연세대 정치외교학과'],
  kimDoyeon: ['fixture-mentor-17', '김도연', '서울대 지리학과'],
  joMinjae: ['fixture-mentor-18', '조민재', '연세대 경제학부'],
  seoJiho: ['fixture-mentor-19', '서지호', '고려대 경영학과'],
  kimTaehyun: ['fixture-mentor-20', '김태현', '중앙대 심리학과'],
  leeSubin: ['fixture-mentor-21', '이수빈', '서울시립대 도시공학과'],
  songJihoo: ['fixture-mentor-22', '송지후', '아주대 소프트웨어학과'],
  joAra: ['fixture-mentor-23', '조아라', '국민대 시각디자인학과'],
  seoYewon: ['fixture-mentor-24', '서예원', '이화여대 음악교육과'],
} as const

type MentorKey = keyof typeof mentor

const caseRef = (n: number, title: string, key: MentorKey, grade: number, subject: string, activityType: string): MentorCaseRef => ({
  contentId: `fixture-content-case-${String(n).padStart(2, '0')}`,
  title,
  mentorId: mentor[key][0],
  mentorName: mentor[key][1],
  mentorAffiliation: mentor[key][2],
  gradeLabel: `고${grade}`,
  subject,
  activityType,
})

export const mentorCaseCatalogFixture: readonly MentorCaseRef[] = [
  caseRef(1, '항생제 내성과 자연선택 탐구 포스터', 'hanJisu', 2, '생명과학Ⅰ', '탐구 포스터'),
  caseRef(2, '학교 주변 하천의 수질과 생물 관찰', 'hanYerin', 2, '통합과학·환경', '현장 탐구'),
  caseRef(3, '가공음료의 당류 함량 비교와 하루 섭취량 분석', 'parkNayun', 2, '기술가정', '비교 분석'),
  caseRef(4, '배달앱 광고의 언어적 설득 전략 분석', 'leeChaerin', 2, '국어', '매체 분석 발표'),
  caseRef(5, '유튜브 뉴스 썸네일의 표현 방식 분석', 'yoonHaram', 2, '언어와 매체', '매체 분석 보고서'),
  caseRef(6, '청소년 스마트폰 사용에 대한 3분 영어 Speech', 'ohJunseok', 1, '영어', '영어 Speech'),
  caseRef(7, '우리 지역 관광지 영어 안내문 개선', 'choiEunchae', 2, '영어', '개선 프로젝트'),
  caseRef(8, '독립협회와 만민공동회 관련 사료 비교 분석', 'parkSeohyun', 2, '한국사', '사료 분석 보고서'),
  caseRef(9, '산업혁명 시기 노동환경과 사회 변화 조사', 'leeHyunseo', 2, '세계사', '조사 보고서'),
  caseRef(10, '청소년의 SNS 이용시간과 행복감 설문조사', 'choiAreum', 2, '사회문화', '설문조사 연구'),
  caseRef(11, '기후 난민의 국제적 보호 필요성 토론', 'jeongDain', 2, '정치와 법', '토론'),
  caseRef(12, '우리 지역의 대중교통 접근성 조사', 'kimDoyeon', 2, '한국지리', '지역 조사'),
  caseRef(13, '편의점 상품 가격과 소비자 선택 조사', 'joMinjae', 2, '경제', '경제 보고서'),
  caseRef(14, '교내 매점 판매 데이터를 활용한 상품 수요 분석', 'seoJiho', 2, '경제·수학', '데이터 분석'),
  caseRef(15, 'AI 면접의 공정성에 관한 윤리 논증문', 'goMinjeong', 2, '생활과 윤리', '윤리 논증문'),
  caseRef(16, 'SNS 추천 알고리즘과 정보 편향에 관한 윤리 토론', 'kimTaehyun', 2, '생활과 윤리', '윤리 토론'),
  caseRef(17, '영화 음악이 장면의 분위기에 미치는 영향 분석', 'seoYewon', 2, '음악', '음악 비교 분석 발표'),
  caseRef(18, '자동차 속도와 제동거리의 관계 탐구', 'kangMinho', 2, '수학', '수학 탐구 보고서'),
  caseRef(19, '스마트폰 사용시간과 수면시간의 관계 조사', 'jeongSejin', 2, '확률과통계', '통계 조사'),
  caseRef(20, '학교 주변 보행 안전지도 제작', 'leeSubin', 2, '수학·지리 융합', '안전지도 제작'),
  caseRef(21, '학교 급식 잔반 데이터 분석 프로젝트', 'jeongMinhyuk', 1, '정보', '데이터 분석 프로젝트'),
  caseRef(22, '학교 도서관 대출 데이터 시각화 프로젝트', 'songJihoo', 2, '정보', '데이터 시각화 프로젝트'),
  caseRef(23, '학교 안전시설 픽토그램 개선 프로젝트', 'kimHaram', 2, '미술', '디자인 프로젝트'),
  caseRef(24, '학교 축제 안내지도 디자인', 'joAra', 2, '미술', '디자인 프로젝트'),
]

const sid = (id: string) => `fixture-student-${id}`
const task = (n: number) => `fixture-admin-task-${String(n).padStart(3, '0')}`

export const mentorCaseRecommendationsFixture: readonly MentorCaseRecommendation[] = [
  {
    recommendationId: 'fixture-recommendation-001',
    studentId: CHOI_HAEUN_ID,
    caseId: 'fixture-content-case-01',
    taskId: 'fixture-task-01',
    activityId: null,
    reason: '진행 중인 탐구 포스터와 주제가 같고, 자료 조사부터 발표까지의 과정을 참고할 수 있어요.',
    recommendedDate: '2026-10-04',
  },
  {
    recommendationId: 'fixture-recommendation-002',
    studentId: CHOI_HAEUN_ID,
    caseId: 'fixture-content-case-06',
    taskId: 'fixture-task-02',
    activityId: null,
    reason: '분량 초과를 줄여간 과정이 지금 V2와 같아요.',
    recommendedDate: null,
  },
  { recommendationId: 'fixture-recommendation-003', studentId: sid('seo-hajin'), caseId: 'fixture-content-case-04', taskId: task(4), activityId: null, reason: '광고 설득 전략을 장면 근거와 연결한 분석 과정을 참고할 수 있어요.', recommendedDate: '2026-10-05' },
  { recommendationId: 'fixture-recommendation-004', studentId: sid('jung-yuna'), caseId: 'fixture-content-case-19', taskId: task(17), activityId: null, reason: '수면시간 설문의 구간 설계와 상관관계 해석 과정이 지금 Revision과 같아요.', recommendedDate: '2026-09-29' },
  { recommendationId: 'fixture-recommendation-005', studentId: sid('jang-harin'), caseId: 'fixture-content-case-15', taskId: task(30), activityId: null, reason: '같은 주제로 주장과 반론을 나눠 쓴 논증 과정을 볼 수 있어요.', recommendedDate: '2026-10-03' },
]

/** Mentor Hub 추천 Mentor (Student Mentor Hub Home recommendedMentors 그대로, 최하은만). 추천 Algorithm 결과가 아니라 표시용 문장이다. */
export const mentorHubRecommendedMentorsFixture: readonly { studentId: string; mentorId: string; mentorName: string; mentorAffiliation: string; reason: string }[] = [
  { studentId: CHOI_HAEUN_ID, mentorId: 'fixture-mentor-01', mentorName: '한지수', mentorAffiliation: '이화여대 생명과학과', reason: "지금 진행 중인 '항생제 내성과 자연선택' 탐구 포스터와 같은 주제로 활동한 경험이 있어요." },
  { studentId: CHOI_HAEUN_ID, mentorId: 'fixture-mentor-02', mentorName: '한예린', mentorAffiliation: '건국대 환경보건과학과', reason: '저장한 #환경생물 관심사처럼, 환경 탐구를 생명과학 진로로 이어간 경험이 있어요.' },
  { studentId: CHOI_HAEUN_ID, mentorId: 'fixture-mentor-03', mentorName: '박나윤', mentorAffiliation: '경희대 식품영양학과', reason: '생명 계열과 가까운 식품영양학과에 진학했고, 탐구 활동과 수능 최저 준비를 함께 한 경험이 있어요.' },
]

/** 저장한 Content 관심 Tag (Student Mentor Hub studentContext.savedContentTags 그대로, 최하은만) */
export const mentorSavedContentTagsFixture: Readonly<Record<string, readonly string[]>> = {
  [CHOI_HAEUN_ID]: ['미생물', '유전', '생명공학', '의생명', '환경생물'],
}

export const mentorApplicationsFixture: readonly MentorApplication[] = [
  { applicationId: 'fixture-application-001', studentId: sid('jang-harin'), kind: 'plan', contentId: 'fixture-content-plan-04', title: '고2 수행평가 준비 3주 Plan', mentorName: '이채린', appliedDate: '2026-09-28', progress: { done: 9, total: 15 } },
  { applicationId: 'fixture-application-002', studentId: sid('jang-harin'), kind: 'routine', contentId: 'fixture-content-routine-05', title: '학교 시험기간 하루 공부 루틴', mentorName: '서지호', appliedDate: '2026-10-01', progress: { done: 4, total: 7 } },
  { applicationId: 'fixture-application-003', studentId: sid('kim-minseo'), kind: 'plan', contentId: 'fixture-content-plan-02', title: '고2 중간고사 4주 Plan', mentorName: '고민정', appliedDate: '2026-09-14', progress: { done: 6, total: 20 } },
  { applicationId: 'fixture-application-004', studentId: sid('shin-dohyun'), kind: 'routine', contentId: 'fixture-content-routine-03', title: '수능 D-100 하루 공부 루틴', mentorName: '조민재', appliedDate: '2026-08-01', progress: { done: 30, total: 66 } },
  { applicationId: 'fixture-application-005', studentId: sid('choi-minjun'), kind: 'routine', contentId: 'fixture-content-routine-04', title: '주간 수학 실전 모의 루틴', mentorName: '이수빈', appliedDate: '2026-09-01', progress: { done: 12, total: 20 } },
  { applicationId: 'fixture-application-006', studentId: sid('lee-doyun'), kind: 'routine', contentId: 'fixture-content-routine-06', title: '수행평가와 코딩 프로젝트 병행 루틴', mentorName: '정민혁', appliedDate: '2026-09-20', progress: { done: 5, total: 12 } },
]
