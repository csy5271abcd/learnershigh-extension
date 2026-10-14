import type { AdminParentReport, AdminSchoolRecord, AdminTestResult } from './types.ts'

/*
 * TestResult · SchoolRecordSnapshot · ParentReport 읽기 상태 Canonical Fixture (Admin 전용, Student Surface Fixture에는 없다)
 *
 * TestResult (api-contract §35): 시험 유형마다 실제로 있는 값만 둔다. (입력되지 않은 값은 만들지 않는다)
 *   school_exam = score + rank (+ 직전 점수 · 변화), mock_exam = grade + percentile (+ 직전 등급), academy_test = score (+ 직전 점수)
 *   서로 다른 시험 유형을 하나의 평균으로 합치지 않는다. 입력 · 수정 Flow는 미확정(§35-2)이라 읽기만 한다.
 *   mock_exam의 등급 변화는 change 값으로 두지 않는다. (등급은 작을수록 높아 부호 의미가 Contract에 없다 → 직전 등급만)
 * SchoolRecordSnapshot (§36): candidate는 아직 학교생활기록부에 반영 확정된 기록이 아니다.
 * ParentReport (§40): 2026년 9월 Report의 상태만 읽는다. (Parent Report 편집 / 생성 / 발송은 이 Branch 범위 밖, Status Enum 미확정 API-OD-01)
 */

const sid = (id: string) => `fixture-student-${id}`
let testSeq = 0
const test = (student: string, type: AdminTestResult['type'], name: string, subject: string, date: string, values: Partial<Pick<AdminTestResult, 'score' | 'grade' | 'percentile' | 'rank' | 'previousResult' | 'change'>>): AdminTestResult => {
  testSeq += 1
  return { testResultId: `fixture-test-${String(testSeq).padStart(3, '0')}`, studentId: sid(student), type, name, subject, date, ...values }
}

const FINAL_1 = '1학기 기말고사'
const MOCK_9 = '9월 모의고사'
const MOCK_6 = '6월 모의고사'

export const adminTestResultsFixture: readonly AdminTestResult[] = [
  test('yoon-jimin', 'school_exam', FINAL_1, '영어', '2026-07-08', { score: 88, rank: 9, previousResult: 86, change: 2 }),
  test('yoon-jimin', 'academy_test', '영어 어휘 주간 테스트', '영어', '2026-10-04', { score: 92 }),
  test('seo-hajin', 'mock_exam', MOCK_9, '수학', '2026-09-03', { grade: 2, percentile: 89, previousResult: 3 }),
  test('seo-hajin', 'academy_test', '수학 함수 단원평가', '수학', '2026-09-26', { score: 84, previousResult: 76, change: 8 }),
  test('lee-doyun', 'academy_test', '통합과학 역학 단원평가', '통합과학', '2026-10-04', { score: 70, previousResult: 78, change: -8 }),
  test('kim-harin', 'school_exam', FINAL_1, '영어', '2026-07-08', { score: 71, rank: 24, previousResult: 79, change: -8 }),
  test('kim-harin', 'academy_test', '영어 독해 주간 테스트', '영어', '2026-09-26', { score: 64 }),
  test('jung-hyunwoo', 'mock_exam', MOCK_9, '국어', '2026-09-03', { grade: 3, percentile: 72 }),
  test('song-jiho', 'school_exam', FINAL_1, '수학', '2026-07-08', { score: 96, rank: 2, previousResult: 94, change: 2 }),
  test('song-jiho', 'mock_exam', MOCK_9, '수학', '2026-09-03', { grade: 1, percentile: 98, previousResult: 1 }),
  test('jang-yeeun', 'academy_test', '국어 문학 단원평가', '국어', '2026-09-26', { score: 82 }),
  test('yoon-chaewon', 'school_exam', FINAL_1, '수학', '2026-07-08', { score: 91, rank: 5, previousResult: 91, change: 0 }),
  test('choi-haeun', 'school_exam', FINAL_1, '생명과학Ⅰ', '2026-07-08', { score: 94, rank: 3, previousResult: 90, change: 4 }),
  test('choi-haeun', 'mock_exam', MOCK_9, '영어', '2026-09-03', { grade: 2, percentile: 90, previousResult: 2 }),
  test('jung-yuna', 'school_exam', FINAL_1, '문학', '2026-07-08', { score: 85, rank: 11, previousResult: 85, change: 0 }),
  test('jung-yuna', 'academy_test', '확률과통계 단원평가', '확률과통계', '2026-10-04', { score: 78 }),
  test('kim-minseo', 'school_exam', FINAL_1, '영어', '2026-07-08', { score: 81, rank: 15, previousResult: 87, change: -6 }),
  test('kim-minseo', 'mock_exam', MOCK_9, '화학Ⅰ', '2026-09-03', { grade: 3, percentile: 76, previousResult: 2 }),
  test('kim-minseo', 'academy_test', '화학Ⅰ 산화·환원 단원평가', '화학Ⅰ', '2026-10-04', { score: 72, previousResult: 85, change: -13 }),
  test('moon-sua', 'mock_exam', MOCK_9, '국어', '2026-09-03', { grade: 2, percentile: 91, previousResult: 3 }),
  test('park-seoyeon', 'school_exam', FINAL_1, '생명과학Ⅰ', '2026-07-08', { score: 89, rank: 6, previousResult: 84, change: 5 }),
  test('lee-jia', 'academy_test', '물리학Ⅰ 운동량 단원평가', '물리학Ⅰ', '2026-09-26', { score: 88, previousResult: 80, change: 8 }),
  test('lee-jia', 'mock_exam', MOCK_9, '영어', '2026-09-03', { grade: 1, percentile: 97, previousResult: 2 }),
  test('jang-harin', 'school_exam', FINAL_1, '생활과윤리', '2026-07-08', { score: 93, rank: 4, previousResult: 88, change: 5 }),
  test('jang-harin', 'academy_test', '미적분 단원평가', '미적분', '2026-10-04', { score: 65, previousResult: 61, change: 4 }),
  test('han-seoyun', 'mock_exam', MOCK_9, '세계지리', '2026-09-03', { grade: 4, percentile: 60, previousResult: 4 }),
  test('oh-minji', 'mock_exam', MOCK_6, '국어', '2026-06-04', { grade: 2, percentile: 90 }),
  test('oh-minji', 'mock_exam', MOCK_9, '국어', '2026-09-03', { grade: 2, percentile: 92, previousResult: 2 }),
  test('oh-minji', 'academy_test', '국어 실전 모의', '국어', '2026-10-04', { score: 88 }),
  test('kim-dohyun', 'school_exam', FINAL_1, '물리학Ⅰ', '2026-07-08', { score: 92, rank: 7, previousResult: 88, change: 4 }),
  test('kim-dohyun', 'mock_exam', MOCK_9, '수학', '2026-09-03', { grade: 2, percentile: 94, previousResult: 3 }),
  test('choi-minjun', 'mock_exam', MOCK_9, '수학', '2026-09-03', { grade: 1, percentile: 98, previousResult: 2 }),
  test('yoon-seojun', 'mock_exam', MOCK_9, '국어', '2026-09-03', { grade: 1, percentile: 99, previousResult: 1 }),
  test('shin-dohyun', 'mock_exam', MOCK_9, '영어', '2026-09-03', { grade: 3, percentile: 78, previousResult: 2 }),
  test('shin-dohyun', 'academy_test', '영어 독해 실전 테스트', '영어', '2026-10-04', { score: 74, previousResult: 82, change: -8 }),
  test('lee-seoyeon', 'school_exam', FINAL_1, '사회문화', '2026-07-08', { score: 90, rank: 8, previousResult: 92, change: -2 }),
  test('baek-seungho', 'mock_exam', MOCK_9, '수학', '2026-09-03', { grade: 1, percentile: 99, previousResult: 1 }),
  test('baek-seungho', 'mock_exam', MOCK_9, '국어', '2026-09-03', { grade: 2, percentile: 93, previousResult: 2 }),
  test('baek-seungho', 'academy_test', '수학 실전 모의', '수학', '2026-10-04', { score: 96, previousResult: 96, change: 0 }),
]

let recordSeq = 0
const record = (student: string, status: AdminSchoolRecord['status'], category: AdminSchoolRecord['category'], summary: string, snapshotDate: string, subject?: string): AdminSchoolRecord => {
  recordSeq += 1
  return { schoolRecordSnapshotId: `fixture-record-${String(recordSeq).padStart(3, '0')}`, studentId: sid(student), status, category, ...(subject ? { subject } : {}), summary, snapshotDate }
}

// confirmed = 1학기 학교생활기록부 마감 Snapshot(8월 20일), candidate = 2학기 활동에서 학원이 정리한 반영 후보(10월 2일)
const CONFIRMED_AT = '2026-08-20'
const CANDIDATE_AT = '2026-10-02'

export const adminSchoolRecordsFixture: readonly AdminSchoolRecord[] = [
  record('kim-dohyun', 'confirmed', '세부능력 및 특기사항', '스마트폰 가속도 센서로 엘리베이터의 가속 · 감속 구간을 측정하고 겉보기 무게 변화를 그래프로 해석함.', CONFIRMED_AT, '물리학Ⅰ'),
  record('kim-dohyun', 'confirmed', '진로활동', '교내 창업 아이디어 대회에서 등굣길 우산 공유 아이디어를 사용자 인터뷰 기반으로 설계함.', CONFIRMED_AT),
  record('kim-dohyun', 'candidate', '동아리활동', '수학 탐구 발표회에서 휠체어 이동 경로를 벡터로 모델링한 과정을 정리 중.', CANDIDATE_AT),
  record('oh-minji', 'confirmed', '진로활동', '사회복지관 진로 체험에서 사례 회의 역할 분담을 관찰 · 기록하고 동아리에서 발표함.', CONFIRMED_AT),
  record('oh-minji', 'candidate', '자율활동', '노인복지관 디지털 기기 사용 보조 경험을 바탕으로 큰 글씨 안내지를 제작함.', CANDIDATE_AT),
  record('lee-seoyeon', 'confirmed', '동아리활동', '환경 동아리에서 하천 세 지점의 pH · 탁도를 월 2회 측정하고 기록 양식을 설계함.', CONFIRMED_AT),
  record('lee-seoyeon', 'candidate', '세부능력 및 특기사항', '1인 가구 증가와 생활 변화를 통계 자료와 인터뷰로 조사 중.', CANDIDATE_AT, '사회문화'),
  record('choi-minjun', 'confirmed', '진로활동', '의공학과 학과 체험에서 심전도 신호의 잡음 조건을 비교함.', CONFIRMED_AT),
  record('choi-minjun', 'candidate', '세부능력 및 특기사항', '감염병 확산 자료로 평균변화율과 순간변화율을 비교하는 탐구를 진행 중.', CANDIDATE_AT, '미적분'),
  record('park-seoyeon', 'candidate', '세부능력 및 특기사항', '지역 상권 변화 조사에서 현장 사진과 지도를 연결해 변화 원인을 정리함.', CANDIDATE_AT, '한국지리'),
  record('park-seoyeon', 'candidate', '진로활동', '바이오 연구소 진로체험에서 세포 배양 조건과 실패 기록의 의미를 정리함.', CANDIDATE_AT),
  record('lee-jia', 'confirmed', '자율활동', '학급 휴대폰 사용 규칙 논의에서 설문을 설계하고 결과를 발표함.', CONFIRMED_AT),
  record('yoon-seojun', 'confirmed', '세부능력 및 특기사항', '학급 출결 데이터를 정리해 요일별 지각 경향을 보여주는 대시보드를 제작함.', CONFIRMED_AT, '정보'),
  record('jang-harin', 'candidate', '세부능력 및 특기사항', 'AI 면접의 공정성을 주제로 주장과 반론을 구분한 논증문을 작성 중.', CANDIDATE_AT, '생활과윤리'),
  record('moon-sua', 'candidate', '동아리활동', '신문 제작 동아리에서 설문으로 기획 기사 주제를 정하고 학생회 인터뷰를 진행함.', CANDIDATE_AT),
  record('yoon-jimin', 'confirmed', '세부능력 및 특기사항', '현대시 두 편의 화자 태도를 비교해 시어 선택의 차이를 설명함.', CONFIRMED_AT, '국어'),
]

// ---------- ParentReport 읽기 상태 (2026년 9월) ----------

const report = (student: string, status: AdminParentReport['status'], sentAt: string | null = null): AdminParentReport => ({
  parentReportId: `fixture-parent-report-2026-09-${student}`,
  studentId: sid(student),
  period: '2026-09',
  status,
  sentAt,
})

const SENT = (day: string) => `2026-10-${day}T18:00:00+09:00`

export const PARENT_REPORT_PERIOD = '2026-09'

export const adminParentReportsFixture: readonly AdminParentReport[] = [
  report('yoon-jimin', 'Sent', SENT('02')),
  report('song-jiho', 'Sent', SENT('02')),
  report('yoon-chaewon', 'Sent', SENT('03')),
  report('jung-yuna', 'Sent', SENT('03')),
  report('lee-jia', 'Sent', SENT('03')),
  report('oh-minji', 'Sent', SENT('02')),
  report('kim-dohyun', 'Sent', SENT('02')),
  report('yoon-seojun', 'Sent', SENT('04')),
  report('baek-seungho', 'Sent', SENT('04')),
  report('lee-seoyeon', 'Sent', SENT('05')),
  report('seo-hajin', 'Ready'),
  report('jang-harin', 'Ready'),
  report('park-seoyeon', 'Reviewing'),
  report('choi-minjun', 'Reviewing'),
  report('kim-minseo', 'Draft'),
  report('kim-harin', 'Draft'),
  report('shin-dohyun', 'Draft'),
  report('han-seoyun', 'Draft'),
]
