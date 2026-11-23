// 개발용 시연 명단 생성: 시연 지점 3개 × 합성 학생 20명 = 60명, 지점 관리자 Mock 4개.
// usage: node build-demo-roster.mjs
// 출력:
//   backend/src/main/resources/assessment/demo-roster/demo-roster-2026.json  (Backend DemoRoster 원천, 플래그 ON일 때만 로드)
//   ../SYNTHETIC-STUDENTS.json                                               (문서·Seed 스크립트용, 같은 내용 + 생성 Key)
// 결정적(Deterministic) 생성: 같은 입력이면 같은 ID·반·번호·과목. 학생 ID는 Seed Batch·학교 Key·학년·Slot으로 정한다.
// 모든 학생은 합성 시연 인물이다. 실명·주민등록번호·전화번호·주소·이메일을 만들지 않는다.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DOC_DIR = resolve(HERE, '..')
const REPO = resolve(HERE, '../../../../..')
const BACKEND_OUT = join(REPO, 'backend/src/main/resources/assessment/demo-roster/demo-roster-2026.json')
const DOC_OUT = join(DOC_DIR, 'SYNTHETIC-STUDENTS.json')
const catalog = JSON.parse(readFileSync(join(DOC_DIR, 'SUBJECT-CATALOG.json'), 'utf8'))

const BATCH = 'DEMO-STUDENT-2026'
// 합성 학생 표시 이름(2026-11-12 시연 요청): 자연스러운 한국식 **가명**. 실제 학생·재학생 명단이 아니다. 순서 = stu_demo_001~060.
const DEMO_NAMES = ['김민서', '이준호', '박서연', '최지우', '정하윤', '강도윤', '한서진', '윤지호', '오유진', '임현우', '송채원', '배시윤', '권유나', '신도현', '장서아', '문지훈', '남수빈', '유시현', '조하린', '백서준', '서예린', '황준서', '안지민', '전태윤', '홍다인', '고은호', '양소율', '손건우', '노하은', '구민재', '류채아', '차승민', '주예서', '우진혁', '진가온', '표하람', '곽태린', '탁서율', '나윤재', '엄지안', '변주원', '성하준', '석다연', '하은찬', '도서윤', '마지성', '제윤서', '길현서', '천소민', '방재윤', '민도하', '육예준', '라시온', '편하진', '봉수아', '옥지환', '채은서', '인태경', '설아린', '명준우']
const YEAR = 2026

const BRANCHES = [
  { branchId: 'br_demo_a', name: '러너스하이 시연 A지점', letter: 'A' },
  { branchId: 'br_demo_b', name: '러너스하이 시연 B지점', letter: 'B' },
  { branchId: 'br_demo_c', name: '러너스하이 시연 C지점', letter: 'C' },
]
const ADMINS = [
  { adminId: 'adm_demo_a01', displayName: '시연 A지점 관리자 01', branchIds: ['br_demo_a'] },
  { adminId: 'adm_demo_a02', displayName: '시연 A지점 관리자 02', branchIds: ['br_demo_a'] },
  { adminId: 'adm_demo_b01', displayName: '시연 B지점 관리자 01', branchIds: ['br_demo_b'] },
  { adminId: 'adm_demo_c01', displayName: '시연 C지점 관리자 01', branchIds: ['br_demo_c'] },
]
// 학교 = 학생 소속 정보, 지점 = 학원 관리 단위 (서로 다른 개념)
const SCHOOLS = [
  ['unjeong', '운정고등학교', 'br_demo_a', 'GENERAL'], ['munhyeon', '문현고등학교', 'br_demo_a', 'GENERAL'], ['hoseo', '호서고등학교', 'br_demo_a', 'GENERAL'],
  ['haneul', '인천하늘고등학교', 'br_demo_a', 'AUTONOMOUS_PRIVATE'], ['sehwa', '세화고등학교', 'br_demo_a', 'AUTONOMOUS_PRIVATE'],
  ['daeshin', '대신고등학교', 'br_demo_b', 'GENERAL'], ['hanlim', '한림고등학교', 'br_demo_b', 'GENERAL'], ['jinyang', '진양고등학교', 'br_demo_b', 'GENERAL'],
  ['samgaksan', '삼각산고등학교', 'br_demo_b', 'GENERAL'], ['gajwa', '가좌고등학교', 'br_demo_b', 'GENERAL'],
  ['chungmu', '충무고등학교', 'br_demo_c', 'GENERAL'], ['gwangmyeong', '광명고등학교', 'br_demo_c', 'GENERAL'], ['sejong', '세종고등학교', 'br_demo_c', 'GENERAL'],
  ['hansol', '한솔고등학교', 'br_demo_c', 'GENERAL'], ['jeju', '제주고등학교', 'br_demo_c', 'GENERAL'],
].map(([key, name, branchId, schoolType]) => ({ key, schoolId: `sch_demo_${key}`, name, branchId, schoolType }))

// 학년별 수강 패턴 (학기별 과목명). 실제 카탈로그에 있는 과목만 쓴다(없으면 생성 실패).
const G1_CORE = (s) => [`공통국어${s}`, `공통수학${s}`, `공통영어${s}`, `한국사${s}`, `통합사회${s}`, `통합과학${s}`, `과학탐구실험${s}`]
const G1_EXTRAS = [
  { profile: '공통과목 중심', extras: [] },
  { profile: '공통 + 정보', extras: ['정보', '기술·가정'] },
  { profile: '공통 + 음악', extras: ['음악', '진로와 직업'] },
  { profile: '공통 + 미술', extras: ['미술', '정보'] },
  { profile: '공통 + 체육', extras: (s) => [`체육${s}`, '음악'] },
  { profile: '공통 + 교양', extras: ['진로와 직업', '미술'] },
]
const G2_PROFILES = [
  { profile: '자연과학', s1: ['문학', '대수', '영어Ⅰ', '물리학', '화학', '생명과학'], s2: ['화법과 언어', '미적분Ⅰ', '영어Ⅱ', '역학과 에너지', '물질과 에너지', '세포와 물질대사'] },
  { profile: '인문사회', s1: ['문학', '대수', '영어Ⅰ', '사회와 문화', '세계사', '현대사회와 윤리'], s2: ['독서와 작문', '확률과 통계', '영어Ⅱ', '경제', '법과 사회', '윤리와 사상'] },
  { profile: '수학·정보', s1: ['대수', '미적분Ⅰ', '영어Ⅰ', '정보', '인공지능 수학', '물리학'], s2: ['확률과 통계', '기하', '영어Ⅱ', '데이터 과학', '인공지능 기초', '전자기와 양자'] },
  { profile: '생명·지구', s1: ['문학', '대수', '영어Ⅰ', '생명과학', '지구과학', '화학'], s2: ['화법과 언어', '확률과 통계', '영어Ⅱ', '세포와 물질대사', '지구시스템과학', '화학 반응의 세계'] },
  { profile: '어문·예술', s1: ['문학', '주제 탐구 독서', '영어Ⅰ', '영미 문학 읽기', '미술 창작', '일본어'], s2: ['문학과 영상', '영어 발표와 토론', '영어 독해와 작문', '미술 창작', '일본어 회화', '도시의 미래 탐구'] },
]
const G2_ELECTIVES = { s1: ['운동과 건강', '음악 연주와 창작', '중국어', '세계시민과 지리', '윤리와 사상', '한국지리 탐구', '동아시아 역사 기행'], s2: ['스포츠 과학', '음악 연주와 창작', '중국어 회화', '정치', '윤리문제 탐구', '경제 수학', '동아시아 역사 기행'] }
const G3_PROFILES = [
  { profile: '인문사회', s1: ['화법과 작문', '심화 국어', '영어 독해와 작문', '사회·문화', '사회문제 탐구', '생활과 윤리'], s2: ['언어와 매체', '고전 읽기', '심화 영어Ⅰ', '사회문제 탐구', '고전과 윤리', '정치와 법'] },
  { profile: '자연과학', s1: ['언어와 매체', '미적분', '기하', '물리학Ⅱ', '화학Ⅱ', '영어Ⅱ'], s2: ['화법과 작문', '미적분', '기하', '물리학Ⅱ', '화학Ⅱ', '영어권 문화'] },
  { profile: '생명과학', s1: ['화법과 작문', '확률과 통계', '심화 영어 독해Ⅰ', '생명과학Ⅱ', '화학Ⅱ', '수학과제 탐구'], s2: ['언어와 매체', '확률과 통계', '심화 영어 독해Ⅰ', '생명과학Ⅱ', '화학 실험', '생명과학 실험'] },
  { profile: '수학·정보', s1: ['확률과 통계', '경제 수학', '고급 수학Ⅰ', '프로그래밍', '정보', '영어 독해와 작문'], s2: ['수학과제 탐구', '경제 수학', '정보', '인공지능 기초', '진로 영어', '확률과 통계'] },
  { profile: '교육·심리', s1: ['문학', '교육학', '심리학', '생활과 윤리', '여행지리', '영어권 문화'], s2: ['문학', '교육학', '심리학', '생활과 윤리', '여행지리', '영어 독해와 작문'] },
]
const G3_ELECTIVES = { s1: ['스포츠 생활', '운동과 건강', '미술 창작', '환경', '논술', '지구과학Ⅱ', '세계지리', '동아시아사', '생활과 과학'], s2: ['스포츠 생활', '음악 연주', '미술 창작', '환경', '논술', '지구과학Ⅱ', '세계지리', '동아시아사', '융합과학'] }

const idOf = (grade, semester, name) => {
  const slot = catalog.slots.find((s) => s.grade === grade && s.semester === semester)
  const subject = slot?.subjects.find((s) => s.name === name)
  if (!subject) throw new Error(`카탈로그 ${grade}-${semester}에 없는 과목: ${name}`)
  return subject.subjectId
}

// 결정적 의사난수 (FNV-1a)
const hash = (text) => {
  let h = 0x811c9dc5
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0), 0x01000193) >>> 0
  return h
}

const students = []
const seats = new Set()
let seq = 0
SCHOOLS.forEach((school, schoolIndex) => {
  const extraGrade = (schoolIndex % 3) + 1
  const grades = [1, 2, 3, extraGrade]
  grades.forEach((grade, slotIndex) => {
    seq += 1
    const seedKey = `${BATCH}|${school.key}|g${grade}|slot${slotIndex + 1}`
    const h = hash(seedKey)
    let classNumber = 1 + (h % 9)
    let studentNumber = 1 + ((h >>> 8) % 28)
    while (seats.has(`${school.schoolId}|${grade}|${classNumber}|${studentNumber}`)) studentNumber = (studentNumber % 28) + 1
    seats.add(`${school.schoolId}|${grade}|${classNumber}|${studentNumber}`)
    const variant = schoolIndex + slotIndex * 2 + (slotIndex === 3 ? 2 : 0) // 학생마다 다른 수강 패턴 (같은 학교·학년의 추가 학생은 한 칸 밀기)
    let profile
    const subjects = { 1: [], 2: [] }
    if (grade === 1) {
      const pattern = G1_EXTRAS[variant % G1_EXTRAS.length]
      profile = pattern.profile
      for (const s of [1, 2]) {
        const extras = typeof pattern.extras === 'function' ? pattern.extras(s) : pattern.extras
        subjects[s] = [...G1_CORE(s), ...extras]
      }
    } else {
      const profiles = grade === 2 ? G2_PROFILES : G3_PROFILES
      const electives = grade === 2 ? G2_ELECTIVES : G3_ELECTIVES
      const pattern = profiles[variant % profiles.length]
      profile = pattern.profile
      for (const s of [1, 2]) {
        const pool = electives[`s${s}`].filter((name) => !pattern[`s${s}`].includes(name))
        const extra = pool[(h >>> (4 * s)) % pool.length]
        subjects[s] = [...pattern[`s${s}`], extra]
      }
    }
    const branch = BRANCHES.find((b) => b.branchId === school.branchId)
    const number = String(seq).padStart(3, '0')
    students.push({
      studentId: `stu_demo_${number}`,
      branchId: school.branchId,
      displayName: DEMO_NAMES[seq - 1],
      academyClassName: `시연 ${branch.letter}지점 고${grade}반`,
      school: { schoolId: school.schoolId, name: school.name },
      academicYear: YEAR,
      grade,
      schoolClassNumber: classNumber,
      schoolStudentNumber: studentNumber,
      subjectIds: { 1: subjects[1].map((name) => idOf(grade, 1, name)), 2: subjects[2].map((name) => idOf(grade, 2, name)) },
      // 아래는 문서·Seed용 (Backend 명단 파일에는 넣지 않는다)
      _doc: { seedKey, schoolKey: school.key, schoolType: school.schoolType, profile, subjectNames: subjects },
    })
  })
})

const backend = {
  rosterVersion: '2026-11-12.1',
  branches: BRANCHES.map(({ branchId, name }) => ({ branchId, name })),
  admins: ADMINS,
  students: students.map(({ _doc, ...rest }) => rest),
}
mkdirSync(dirname(BACKEND_OUT), { recursive: true })
writeFileSync(BACKEND_OUT, JSON.stringify(backend, null, 2) + '\n', 'utf8')
writeFileSync(DOC_OUT, JSON.stringify({ batch: BATCH, academicYear: YEAR, synthetic: true, branches: BRANCHES, admins: ADMINS, schools: SCHOOLS, students }, null, 2) + '\n', 'utf8')

// 개발 서버 전용 Context 선택 UI 명단 (Student·Admin 공용, Production 번들에 포함되지 않게 동적 import로만 읽는다).
// ID·표시 이름·지점·학교·학년만 담는다. 기존 Mock 학생·관리자(Shared MockExistingStudentClient / MockHeaderAssessmentActorProvider와 같은 ID)도 함께 둔다.
const DEV_OUT = join(REPO, 'frontend/student/src/features/assessment/dev/demoContextRoster.json')
const legacyStudents = [
  ['stu_001', '김서준', 'br_gangnam'], ['stu_002', '최학생', 'br_gangnam'], ['stu_003', '한유진', 'br_gangnam'], ['stu_004', '정예준', 'br_gangnam'],
  ['stu_005', '윤서연', 'br_gangnam'], ['stu_006', '이학생', 'br_gangnam'], ['stu_007', '오시윤', 'br_gangnam'], ['stu_008', '장하준', 'br_gangnam'],
  ['stu_009', '박민지', 'br_gangnam'], ['stu_010', '이도현', 'br_gangnam'], ['stu_101', '강하늘', 'br_bundang'], ['stu_102', '서지우', 'br_bundang'], ['stu_103', '문지호', 'br_bundang'],
]
const devRoster = {
  note: '개발 서버 전용 시연 Context 선택 명단. 실제 로그인·계정 목록이 아니다. 생성: docs/specs/suyeon/assessment-15schools-60students-seed-202611/scripts/build-demo-roster.mjs',
  branches: [...BRANCHES.map(({ branchId, name }) => ({ branchId, name, demo: true })), { branchId: 'br_gangnam', name: '러너스하이 강남점(기존)', demo: false }, { branchId: 'br_bundang', name: '러너스하이 분당점(기존)', demo: false }],
  students: [
    ...students.map((s) => ({ studentId: s.studentId, displayName: s.displayName, branchId: s.branchId, schoolName: s.school.name, grade: s.grade })),
    ...legacyStudents.map(([studentId, displayName, branchId]) => ({ studentId, displayName, branchId, schoolName: '예시고등학교(기존 Mock)', grade: 1 })),
  ],
  admins: [
    ...ADMINS.map((a) => ({ adminId: a.adminId, label: a.displayName, scope: `${a.branchIds.map((b) => BRANCHES.find((x) => x.branchId === b).name).join(', ')} 학생 20명 · 평가계획서 운영 권한 없음`, demo: true })),
    { adminId: 'adm_demo_gangnam', label: '기존 시연 관리자', scope: '강남 지점 학생 + 예시고등학교 평가계획서 운영', demo: false },
    { adminId: 'adm_plan_operator', label: '평가계획서 운영자', scope: '예시고등학교 평가계획서 운영만 (학생 기록 없음)', demo: false },
    { adminId: 'adm_gangnam', label: '강남 지점 관리자', scope: '강남 지점 학생', demo: false },
    { adminId: 'adm_bundang', label: '분당 지점 관리자', scope: '분당 지점 학생', demo: false },
  ],
}
mkdirSync(dirname(DEV_OUT), { recursive: true })
writeFileSync(DEV_OUT, JSON.stringify(devRoster, null, 2) + '\n', 'utf8')

const by = (key) => students.reduce((acc, s) => ({ ...acc, [key(s)]: (acc[key(s)] ?? 0) + 1 }), {})
console.log('students', students.length, 'grades', JSON.stringify(by((s) => s.grade)), 'branches', JSON.stringify(by((s) => s.branchId)))
console.log('distinct subject sets', new Set(students.map((s) => JSON.stringify(s.subjectIds))).size)
console.log('wrote', BACKEND_OUT, DOC_OUT)
