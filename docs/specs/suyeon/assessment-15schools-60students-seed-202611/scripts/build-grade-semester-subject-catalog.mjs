// 2026학년도 학년·학기별 공통 과목 후보 카탈로그 생성 (학교별 카탈로그 아님).
// usage: node build-grade-semester-subject-catalog.mjs [--analysis <analysis15.json>]
//   --analysis: 15개교 평가계획서 텍스트 집계(scratchpad 산출물). 주면 과목별 "확인 학교"를 근거로 붙인다. 없으면 기존 SUBJECT-CATALOG.json의 근거를 유지한다.
// 출력:
//   ../SUBJECT-CATALOG.json                                   (근거 포함, 문서용)
//   backend/src/main/resources/assessment/subject-catalog/subject-catalog-2026.json (Backend Mock 원천, 근거 제외)
// 원칙: 과목 ID는 한 번 정하면 바꾸지 않는다. 목록 순서는 추가만 한다(append-only). 기존 Mock ID(subj_01~04, subj_11~14)는 그대로 쓴다.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DOC_DIR = resolve(HERE, '..')
const REPO = resolve(HERE, '../../../../..')
const BACKEND_OUT = join(REPO, 'backend/src/main/resources/assessment/subject-catalog/subject-catalog-2026.json')
const DOC_OUT = join(DOC_DIR, 'SUBJECT-CATALOG.json')
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, value, index, all) => (value.startsWith('--') ? [...acc, [value.slice(2), all[index + 1]]] : acc), []))

// 기존 Mock 학업 Context ID (MockAcademicContextProvider, Frontend assessmentFixture) — 바꾸지 않는다.
const LEGACY_IDS = {
  '1|1|공통국어1': 'subj_11', '1|1|통합과학1': 'subj_12', '1|1|통합사회1': 'subj_13', '1|1|과학탐구실험1': 'subj_14',
  '1|2|공통국어2': 'subj_01', '1|2|통합과학2': 'subj_02', '1|2|통합사회2': 'subj_03', '1|2|과학탐구실험2': 'subj_04',
}

// [과목명, 교과군, 사전 이름(집계 키, 생략 시 과목명)]
// 1·2학년: 2022 개정 교육과정(2025학년도 1학년부터 적용) / 3학년: 2015 개정 교육과정.
const SLOTS = [
  { grade: 1, semester: 1, curriculumVersion: '2022', subjects: [
    ['공통국어1', '국어'], ['공통수학1', '수학'], ['공통영어1', '영어'], ['한국사1', '사회'], ['통합사회1', '사회'], ['통합과학1', '과학'],
    ['과학탐구실험1', '과학'], ['정보', '정보'], ['체육1', '체육'], ['음악', '예술'], ['미술', '예술'], ['기술·가정', '기술·가정'], ['진로와 직업', '교양'],
  ] },
  { grade: 1, semester: 2, curriculumVersion: '2022', subjects: [
    ['공통국어2', '국어'], ['공통수학2', '수학'], ['공통영어2', '영어'], ['한국사2', '사회'], ['통합사회2', '사회'], ['통합과학2', '과학'],
    ['과학탐구실험2', '과학'], ['정보', '정보'], ['체육2', '체육'], ['음악', '예술'], ['미술', '예술'], ['기술·가정', '기술·가정'], ['진로와 직업', '교양'],
  ] },
  { grade: 2, semester: 1, curriculumVersion: '2022', subjects: [
    ['문학', '국어'], ['주제 탐구 독서', '국어'], ['대수', '수학'], ['미적분Ⅰ', '수학'], ['인공지능 수학', '수학'], ['영어Ⅰ', '영어'], ['영미 문학 읽기', '영어'],
    ['사회와 문화', '사회'], ['현대사회와 윤리', '사회'], ['세계시민과 지리', '사회'], ['세계사', '사회'], ['윤리와 사상', '사회'], ['동아시아 역사 기행', '사회'], ['한국지리 탐구', '사회'],
    ['물리학', '과학'], ['화학', '과학'], ['생명과학', '과학'], ['지구과학', '과학'],
    ['정보', '정보'], ['인공지능 기초', '정보'], ['운동과 건강', '체육'], ['음악 연주와 창작', '예술'], ['미술 창작', '예술'], ['일본어', '제2외국어'], ['중국어', '제2외국어'],
  ] },
  { grade: 2, semester: 2, curriculumVersion: '2022', subjects: [
    ['화법과 언어', '국어'], ['독서와 작문', '국어'], ['문학과 영상', '국어'], ['미적분Ⅰ', '수학'], ['확률과 통계', '수학'], ['기하', '수학'], ['경제 수학', '수학'],
    ['영어Ⅱ', '영어'], ['영어 발표와 토론', '영어'], ['영어 독해와 작문', '영어'],
    ['법과 사회', '사회'], ['정치', '사회'], ['경제', '사회'], ['윤리와 사상', '사회'], ['도시의 미래 탐구', '사회'], ['윤리문제 탐구', '사회'], ['동아시아 역사 기행', '사회'],
    ['역학과 에너지', '과학'], ['물질과 에너지', '과학'], ['세포와 물질대사', '과학'], ['지구시스템과학', '과학'], ['화학 반응의 세계', '과학'], ['전자기와 양자', '과학'],
    ['데이터 과학', '정보'], ['인공지능 기초', '정보'], ['스포츠 과학', '체육'], ['음악 연주와 창작', '예술'], ['미술 창작', '예술'], ['일본어 회화', '제2외국어'], ['중국어 회화', '제2외국어'],
  ] },
  { grade: 3, semester: 1, curriculumVersion: '2015', subjects: [
    ['화법과 작문', '국어'], ['언어와 매체', '국어'], ['심화 국어', '국어'], ['고전 읽기', '국어'], ['문학', '국어'],
    ['확률과 통계', '수학'], ['미적분', '수학'], ['기하', '수학'], ['수학과제 탐구', '수학'], ['경제 수학', '수학'], ['고급 수학Ⅰ', '수학'],
    ['영어 독해와 작문', '영어'], ['영어Ⅱ', '영어'], ['심화 영어 독해Ⅰ', '영어'], ['영어권 문화', '영어'], ['영미 문학 읽기', '영어'],
    ['사회·문화', '사회'], ['사회문제 탐구', '사회'], ['생활과 윤리', '사회'], ['윤리와 사상', '사회'], ['여행지리', '사회'], ['한국지리', '사회'], ['세계지리', '사회'], ['정치와 법', '사회'], ['동아시아사', '사회'],
    ['물리학Ⅱ', '과학'], ['화학Ⅱ', '과학'], ['생명과학Ⅱ', '과학'], ['지구과학Ⅱ', '과학'], ['생활과 과학', '과학'], ['융합과학', '과학'], ['고급 물리학', '과학'],
    ['정보', '정보'], ['프로그래밍', '정보'], ['스포츠 생활', '체육'], ['운동과 건강', '체육'], ['미술 창작', '예술'], ['교육학', '교양'], ['심리학', '교양'], ['환경', '교양'], ['논술', '교양'],
  ] },
  { grade: 3, semester: 2, curriculumVersion: '2015', subjects: [
    ['화법과 작문', '국어'], ['언어와 매체', '국어'], ['심화 국어', '국어'], ['고전 읽기', '국어'], ['문학', '국어'],
    ['확률과 통계', '수학'], ['미적분', '수학'], ['기하', '수학'], ['수학과제 탐구', '수학'], ['경제 수학', '수학'],
    ['영어 독해와 작문', '영어'], ['심화 영어 독해Ⅰ', '영어'], ['영어권 문화', '영어'], ['진로 영어', '영어'], ['심화 영어Ⅰ', '영어'],
    ['사회·문화', '사회'], ['사회문제 탐구', '사회'], ['생활과 윤리', '사회'], ['여행지리', '사회'], ['고전과 윤리', '사회'], ['정치와 법', '사회'], ['동아시아사', '사회'], ['세계지리', '사회'],
    ['물리학Ⅱ', '과학'], ['화학Ⅱ', '과학'], ['생명과학Ⅱ', '과학'], ['지구과학Ⅱ', '과학'], ['생활과 과학', '과학'], ['융합과학', '과학'], ['화학 실험', '과학'], ['생명과학 실험', '과학'],
    ['정보', '정보'], ['인공지능 기초', '정보'], ['스포츠 생활', '체육'], ['음악 연주', '예술'], ['미술 창작', '예술'], ['교육학', '교양'], ['심리학', '교양'], ['환경', '교양'], ['논술', '교양'],
  ] },
]

const SCHOOL_NAMES = {
  unjeong: '운정고', munhyeon: '문현고', hoseo: '호서고', haneul: '인천하늘고', sehwa: '세화고', daeshin: '대신고', hanlim: '한림고', jinyang: '진양고',
  samgaksan: '삼각산고', gajwa: '가좌고', chungmu: '충무고', gwangmyeong: '광명고', sejong: '세종고', hansol: '한솔고', jeju: '제주고',
}

// 근거: 학교 슬롯(학교|학년|학기)에서 과목명이 3회 이상 나온 학교
let observed = null
if (args.analysis) {
  const analysis = JSON.parse(readFileSync(args.analysis, 'utf8'))
  observed = {}
  for (const [slotKey, value] of Object.entries(analysis.slots)) {
    const [schoolId, grade, semester] = slotKey.split('|')
    for (const [name, count] of Object.entries(value.subjects)) {
      if (count < 3) continue
      const key = `${grade}|${semester}|${name}`
      ;(observed[key] ??= []).push({ schoolId, school: SCHOOL_NAMES[schoolId] ?? schoolId, mentions: count })
    }
  }
} else if (existsSync(DOC_OUT)) {
  const previous = JSON.parse(readFileSync(DOC_OUT, 'utf8'))
  observed = {}
  for (const slot of previous.slots) for (const subject of slot.subjects) observed[`${slot.grade}|${slot.semester}|${subject.name}`] = subject.observedIn
}

const usedIds = new Set()
const docSlots = SLOTS.map((slot) => {
  const subjects = slot.subjects.map(([name, subjectGroup, dictName], index) => {
    const key = `${slot.grade}|${slot.semester}|${name}`
    const subjectId = LEGACY_IDS[key] ?? `subj26_g${slot.grade}s${slot.semester}_${String(index + 1).padStart(2, '0')}`
    if (usedIds.has(subjectId)) throw new Error(`중복 ID ${subjectId}`)
    usedIds.add(subjectId)
    const observedIn = (observed?.[`${slot.grade}|${slot.semester}|${dictName ?? name}`] ?? []).sort((a, b) => b.mentions - a.mentions)
    return {
      subjectId, name, subjectGroup, originalNames: [name], observedIn,
      basis: observedIn.length >= 2 ? 'PDF_OBSERVED_2PLUS' : observedIn.length === 1 ? 'PDF_OBSERVED_1_PLUS_CURRICULUM' : 'CURRICULUM_STANDARD',
    }
  })
  return { grade: slot.grade, semester: slot.semester, curriculumVersion: slot.curriculumVersion, subjects }
})

const doc = {
  catalogVersion: '2026-11-12.1',
  academicYear: 2026,
  scope: '학년·학기별 공통 후보 (학교별 카탈로그 아님, 공식 개설·필수 과목 아님)',
  sourceCorpus: '15개교 2026학년도 교수학습 및 평가 운영 계획 (references/curriculum-plan, 읽기 전용)',
  curriculumNote: '2026학년도 1·2학년 = 2022 개정, 3학년 = 2015 개정. 과목명을 한 교육과정으로 통일하지 않는다.',
  idNote: '과목 ID는 학년·학기 슬롯 단위다. 같은 이름(예: 정보)도 학기 슬롯이 다르면 다른 ID다. subj_01~04·subj_11~14는 기존 Mock ID 재사용.',
  slots: docSlots,
}
writeFileSync(DOC_OUT, JSON.stringify(doc, null, 2) + '\n', 'utf8')
mkdirSync(dirname(BACKEND_OUT), { recursive: true })
const backend = {
  catalogVersion: doc.catalogVersion,
  academicYear: doc.academicYear,
  slots: docSlots.map((slot) => ({
    grade: slot.grade, semester: slot.semester, curriculumVersion: slot.curriculumVersion,
    subjects: slot.subjects.map(({ subjectId, name, subjectGroup }) => ({ subjectId, name, subjectGroup })),
  })),
}
writeFileSync(BACKEND_OUT, JSON.stringify(backend, null, 2) + '\n', 'utf8')
for (const slot of docSlots) {
  const counts = slot.subjects.reduce((acc, s) => ({ ...acc, [s.basis]: (acc[s.basis] ?? 0) + 1 }), {})
  console.log(`${slot.grade}학년 ${slot.semester}학기 (${slot.curriculumVersion}) ${slot.subjects.length}과목`, JSON.stringify(counts))
}
console.log('wrote', DOC_OUT, BACKEND_OUT)
