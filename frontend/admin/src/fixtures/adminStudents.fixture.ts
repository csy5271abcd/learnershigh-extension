import type { AdminStudent, ExistingStudySnapshot } from './types.ts'

/*
 * Admin Canonical Student 24명 (고1 8 · 고2 8 · 고3 8). 모든 인물은 가상이다.
 * - 최하은(fixture-student-choi-haeun)만 Student Surface의 로그인 학생과 같은 사람이다. 이름 · 학년 · 관심 분야는 Student Fixture
 *   (mentorHubHome.fixture.ts studentContext) 값 그대로다. Student Fixture에 studentId가 없어 id는 이전 Admin Fixture 값을 이어 쓴다. (Contract Gap)
 * - 나머지 23명은 Admin 전용 학생이다. 한 학생은 모든 Admin 화면에서 이 값 하나만 쓴다.
 * - Mentor / Staff 이름과 겹치지 않게 했다. (Mentor 한지수 · 이수빈 · 서지호, Staff 김현우 · 이서진 · 박지훈)
 * - desiredMajor는 학생이 알려준 경우에만 둔다. (없으면 생략)
 */

const s = (id: string, displayName: string, grade: AdminStudent['grade'], interestField?: string, desiredMajor?: string): AdminStudent => ({
  studentId: `fixture-student-${id}`,
  displayName,
  grade,
  ...(interestField ? { interestField } : {}),
  ...(desiredMajor ? { desiredMajor } : {}),
})

export const CHOI_HAEUN_ID = 'fixture-student-choi-haeun'

export const adminStudentsFixture: readonly AdminStudent[] = [
  // 고1
  s('yoon-jimin', '윤지민', '고1', 'AI · 교육', '교육공학'),
  s('seo-hajin', '서하진', '고1', '미디어 · 광고', '미디어커뮤니케이션'),
  s('lee-doyun', '이도윤', '고1', '물리 · 스포츠 과학'),
  s('kim-harin', '김하린', '고1'),
  s('jung-hyunwoo', '정현우', '고1', '소프트웨어', '컴퓨터공학'),
  s('song-jiho', '송지호', '고1', '수학'),
  s('jang-yeeun', '장예은', '고1', '시각디자인', '산업디자인'),
  s('yoon-chaewon', '윤채원', '고1', '수학 · 공학'),
  // 고2
  s('choi-haeun', '최하은', '고2', '생명과학 · 생명공학'),
  s('jung-yuna', '정유나', '고2', '통계 · 심리'),
  s('kim-minseo', '김민서', '고2', '화학공학', '화학공학'),
  s('moon-sua', '문수아', '고2', '언론 · 사회'),
  s('park-seoyeon', '박서연', '고2', '생명과학', '약학'),
  s('lee-jia', '이지아', '고2', '법 · 정책', '행정학'),
  s('jang-harin', '장하린', '고2', '철학 · 윤리'),
  s('han-seoyun', '한서윤', '고2', '지리 · 환경'),
  // 고3
  s('oh-minji', '오민지', '고3', '사회복지', '사회복지학'),
  s('kim-dohyun', '김도현', '고3', '기계 · 로봇', '기계공학'),
  s('choi-minjun', '최민준', '고3', '의공학', '의공학'),
  s('yoon-seojun', '윤서준', '고3', '과학 저널리즘'),
  s('shin-dohyun', '신도현', '고3', '국제학'),
  s('lee-seoyeon', '이서연', '고3', '도시 · 환경', '도시계획'),
  s('ryu-jia', '류지아', '고3', '정치외교'),
  s('baek-seungho', '백승호', '고3', '정시 · 수학'),
]

/*
 * 기존 LearnersHigh 등원 · 순공 · Plan 실행 기록 (Integration Boundary 대상, Snapshot 2026-10-06 11:00).
 * Extension이 Study Timer / Plan을 다시 만들지 않는다. 실제 Adapter가 생기면 이 값 대신 기존 데이터를 읽는다.
 */
const study = (
  id: string,
  attendance: ExistingStudySnapshot['attendance'],
  checkInTime: string | undefined,
  consecutiveAbsentDays: number,
  todayStudyMinutes: number,
  recent: number,
  previous: number,
  subjects: [string, number][],
): ExistingStudySnapshot => ({
  studentId: `fixture-student-${id}`,
  attendance,
  ...(checkInTime ? { checkInTime } : {}),
  consecutiveAbsentDays,
  todayStudyMinutes,
  recent7DayPlanRate: recent,
  previous7DayPlanRate: previous,
  subjectMinutes7d: subjects.map(([subject, minutes]) => ({ subject, minutes })),
})

// 오늘 순공은 Snapshot 시각 기준 기존 Timer 기록이다. (등원 시각이 늦은 학생은 전날 밤 / 자습 기록 포함, 기존 집계 방식 그대로)
export const existingStudyFixture: readonly ExistingStudySnapshot[] = [
  study('yoon-jimin', 'attended', '08:20', 0, 160, 0.8, 0.78, [['영어', 320], ['수학', 300], ['통합과학', 260], ['국어', 200]]),
  study('seo-hajin', 'attended', '08:35', 0, 150, 0.81, 0.79, [['국어', 360], ['수학', 280], ['영어', 240]]),
  study('lee-doyun', 'attended', '08:10', 0, 95, 0.69, 0.72, [['통합과학', 300], ['수학', 260], ['정보', 120]]),
  study('kim-harin', 'absent', undefined, 2, 0, 0.41, 0.66, [['영어', 140], ['수학', 120], ['국어', 50]]),
  study('jung-hyunwoo', 'attended', '09:05', 0, 120, 0.74, 0.7, [['정보', 340], ['수학', 300], ['영어', 180]]),
  study('song-jiho', 'attended', '07:50', 0, 185, 0.91, 0.89, [['수학', 520], ['영어', 300], ['국어', 260]]),
  study('jang-yeeun', 'attended', '08:45', 0, 110, 0.77, 0.8, [['미술', 280], ['국어', 220], ['음악', 160], ['영어', 150]]),
  study('yoon-chaewon', 'attended', '08:15', 0, 160, 0.83, 0.81, [['수학', 420], ['통합과학', 280], ['영어', 200]]),
  study('choi-haeun', 'attended', '08:40', 0, 185, 0.88, 0.86, [['생명과학Ⅰ', 380], ['영어', 300], ['수학', 280], ['화학Ⅰ', 220]]),
  study('jung-yuna', 'attended', '09:10', 0, 125, 0.72, 0.74, [['확률과통계', 340], ['문학', 260], ['지구과학Ⅰ', 200]]),
  study('kim-minseo', 'attended', '09:40', 0, 80, 0.58, 0.84, [['화학Ⅰ', 260], ['수학Ⅰ', 180], ['영어독해와작문', 120]]),
  study('moon-sua', 'attended', '08:30', 0, 140, 0.79, 0.77, [['사회문화', 300], ['문학', 240], ['영어', 220]]),
  study('park-seoyeon', 'not-yet', undefined, 0, 0, 0.7, 0.68, [['생명과학Ⅰ', 320], ['화학Ⅰ', 260], ['수학Ⅰ', 240]]),
  study('lee-jia', 'attended', '08:05', 0, 200, 0.86, 0.85, [['화법과 작문', 300], ['물리학Ⅰ', 280], ['일본어Ⅰ', 160], ['수학Ⅰ', 260]]),
  study('jang-harin', 'attended', '08:50', 0, 130, 0.77, 0.62, [['생활과윤리', 300], ['미적분', 280], ['영어', 180]]),
  study('han-seoyun', 'attended', '09:20', 0, 100, 0.63, 0.67, [['세계지리', 260], ['화학Ⅰ', 220], ['중국어Ⅰ', 120]]),
  study('oh-minji', 'attended', '07:40', 0, 230, 0.87, 0.88, [['생활과윤리', 360], ['국어', 420], ['영어', 380]]),
  study('kim-dohyun', 'attended', '07:55', 0, 215, 0.84, 0.8, [['물리학Ⅰ', 420], ['기하', 380], ['영어', 300]]),
  study('choi-minjun', 'attended', '08:00', 0, 205, 0.79, 0.81, [['미적분', 460], ['확률과통계', 300], ['생명과학Ⅰ', 280]]),
  study('yoon-seojun', 'attended', '07:45', 0, 240, 0.9, 0.91, [['독서', 400], ['지구과학Ⅰ', 360], ['정보', 260]]),
  study('shin-dohyun', 'attended', '09:30', 0, 175, 0.48, 0.71, [['영어독해와작문', 300], ['한국사', 200], ['국어', 260]]),
  study('lee-seoyeon', 'attended', '07:50', 0, 210, 0.88, 0.86, [['사회문화', 380], ['생명과학Ⅰ', 300], ['국어', 340]]),
  study('ryu-jia', 'absent', undefined, 1, 0, 0.74, 0.76, [['문학', 320], ['사회문화', 260], ['영어', 240]]),
  study('baek-seungho', 'attended', '07:30', 0, 260, 0.93, 0.92, [['수학', 620], ['국어', 420], ['영어', 360]]),
]
