import type {
  AcademicContext,
  ArtifactRecord,
  ArtifactVersionRecord,
  EnrichmentTask,
  FeedbackRequestRecord,
  GrowthRecord,
  NoteBlock,
  NoteRecord,
  SchoolAssessmentRecord,
} from '../canonicalSource.ts'
import type { AdminStudentRef } from '../types.ts'

// Admin 시연용 다학교 Demo Fixture (2026-10-29, P-29 PROPOSED).
// - 학교·학생·과목·수행평가는 모두 **합성 데이터**다. 실존 학교·학생·평가정보가 아니며 과목명도 교육과정 공식 편성을 뜻하지 않는다.
// - Student Canonical Fixture(student_001 '최하은')와 기존 명단(student_002·003)은 그대로 두고, 이 파일은 `demo_` 접두 ID만 쓴다
//   (Student 데이터 ID와 충돌하지 않게). 같은 시드로 항상 같은 값을 만든다 (새로고침·테스트마다 동일).
// - 학생 기록은 Admin Mock Store 안에서만 쓰인다. Student 앱 저장소와 연동된 데이터가 아니다.
// - 숫자(KPI)는 여기 적지 않는다. 화면 수치는 Mock Adapter가 이 Entity들에서 계산한다.

export const demoAsOf = '2026-10-16'

interface DemoSchool {
  schoolId: string
  name: string
  branchId: string
}

/** 바른고등학교는 다른 지점(branch_002) 소속이다 — 담당 범위 밖 학생 접근 차단(403) 확인용 */
export const demoSchools: DemoSchool[] = [
  { schoolId: 'demo_school_garam', name: '가람고등학교', branchId: 'branch_001' },
  { schoolId: 'demo_school_hanbit', name: '한빛고등학교', branchId: 'branch_001' },
  { schoolId: 'demo_school_mirae', name: '미래고등학교', branchId: 'branch_001' },
  { schoolId: 'demo_school_saesol', name: '새솔고등학교', branchId: 'branch_001' },
  { schoolId: 'demo_school_neulbom', name: '늘봄고등학교', branchId: 'branch_001' },
  { schoolId: 'demo_school_bareun', name: '바른고등학교', branchId: 'branch_002' },
]

/** 학년·학기별 시연 과목 후보. 학교마다 이 중 일부를 개설한 것으로 둔다 (합성 데이터) */
const subjectPool: Record<string, string[]> = {
  '1-1': ['공통국어1', '공통수학1', '공통영어1', '통합사회1', '통합과학1', '한국사1', '과학탐구실험1'],
  '1-2': ['공통국어2', '공통수학2', '공통영어2', '통합사회2', '통합과학2', '한국사2', '과학탐구실험2'],
  '2-1': ['문학', '대수', '영어Ⅰ', '물리학', '화학', '생명과학', '세계시민과 지리', '사회와 문화', '정보'],
  '2-2': ['독서와 작문', '미적분Ⅰ', '영어Ⅱ', '지구과학', '화학', '생명과학', '한국지리 탐구', '윤리와 사상', '기술·가정'],
  '3-1': ['화법과 언어', '확률과 통계', '영어 독해와 작문', '역학과 에너지', '물질과 에너지', '세포와 물질대사', '사회문제 탐구', '경제'],
  '3-2': ['언어생활 탐구', '기하', '심화 영어', '전자기와 양자', '화학 반응의 세계', '생물의 유전', '정치', '인공지능 기초'],
}

type Area = 'korean' | 'math' | 'english' | 'science' | 'social' | 'info'

const areaOf = (subject: string): Area => {
  if (/국어|문학|독서|화법|언어/.test(subject)) return 'korean'
  if (/수학|대수|미적|확률|기하/.test(subject)) return 'math'
  if (/영어/.test(subject)) return 'english'
  if (/과학|물리|화학|생명|지구|역학|물질|세포|전자기|생물/.test(subject)) return 'science'
  if (/정보|인공지능|기술/.test(subject)) return 'info'
  return 'social'
}

const topicPool: Record<Area, string[]> = {
  korean: ['비판적 매체 읽기와 논설문 쓰기', '현대시 감상문 작성', '토론 개요서 작성과 발표', '고전 산문 인물 분석 보고서', '독서 포트폴리오'],
  math: ['실생활 문제 모델링 보고서', '함수 그래프 탐구 발표', '통계 자료 분석 프로젝트', '수학 개념 설명 영상 만들기', '서술형 문제 풀이 포트폴리오'],
  english: ['영어 에세이 쓰기', '주제 발표(Presentation)', '영어 기사 요약과 의견 쓰기', '영어 토론 준비 노트', '영문 서평 쓰기'],
  science: ['실험 설계와 결과 보고서', '탐구 주제 포스터 발표', '과학 기사 비평문', '측정 데이터 그래프 분석', '모형 제작과 원리 설명'],
  social: ['지역 문제 조사 발표', '시사 쟁점 토론문', '통계로 보는 사회 변화 보고서', '정책 제안서 작성', '역사 인물 탐구 신문'],
  info: ['알고리즘 설계 보고서', '데이터 수집·시각화 프로젝트', '생활 속 자동화 프로그램 만들기', 'AI 윤리 토론문', '웹 페이지 기획서'],
}

const familyNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황']
const givenNames = ['서윤', '도현', '하린', '민재', '지우', '예준', '수아', '시우', '하윤', '준서', '지민', '현우', '채원', '유준', '서진', '다은', '건우', '소율', '은호', '나연', '태윤', '하준', '윤서', '지환']

/** 같은 입력이면 같은 값을 주는 의사난수 (mulberry32) */
function seeded(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pad = (value: number, size = 2) => String(value).padStart(size, '0')
const isoDay = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
const addDays = (day: string, days: number) => {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return isoDay(date)
}
const at = (day: string, hour: number, minute = 0) => `${day}T${pad(hour)}:${pad(minute)}:00+09:00`

/** 학기 시작일 (시연용 가정) */
const termStart = (year: number, semester: number) => (semester === 1 ? `${year}-03-03` : `${year}-08-24`)

export interface DemoStudentRecords {
  roster: (AdminStudentRef & { branchId: string })[]
  academicContexts: Record<string, AcademicContext[]>
  schoolAssessments: (SchoolAssessmentRecord & { studentId: string })[]
  enrichmentTasks: (EnrichmentTask & { studentId: string })[]
  growthRecords: (GrowthRecord & { studentId: string })[]
  notes: (NoteRecord & { studentId: string })[]
  artifacts: (ArtifactRecord & { studentId: string })[]
  artifactVersions: ArtifactVersionRecord[]
  feedbackRequests: (FeedbackRequestRecord & { studentId: string })[]
}

const blockSets = (topic: string, subject: string, revision: number): NoteBlock[] => {
  const id = (n: number) => `blk_${revision}_${n}`
  const base: NoteBlock[] = [
    { blockId: id(1), type: 'HEADING', text: '📌 탐구 질문', attrs: { level: 2 } },
    { blockId: id(2), type: 'PARAGRAPH', text: `${topic}에서 내가 가장 궁금한 점을 한 문장으로 정리했다.` },
    { blockId: id(3), type: 'CHECKLIST', text: '평가 기준 다시 읽기', attrs: { checked: true } },
    { blockId: id(4), type: 'CHECKLIST', text: '자료 3개 이상 찾기', attrs: { checked: revision > 1 } },
  ]
  if (revision >= 2) {
    base.push(
      { blockId: id(5), type: 'HEADING', text: '🔍 조사한 내용', attrs: { level: 2 } },
      { blockId: id(6), type: 'BULLET', text: `${subject} 교과서 단원 개념 정리` },
      { blockId: id(7), type: 'BULLET', text: '관련 기사·통계 비교' },
      { blockId: id(8), type: 'TABLE', text: '자료 비교표', attrs: { rows: [['자료', '핵심 내용', '신뢰도'], ['교과서', '개념 정의', '높음'], ['기사', '최근 사례', '확인 필요']] } },
      { blockId: id(9), type: 'QUOTE', text: '출처와 작성일을 꼭 함께 적는다.' },
    )
  }
  if (revision >= 3) {
    base.push(
      { blockId: id(10), type: 'HEADING', text: '💭 나의 결론', attrs: { level: 2 } },
      { blockId: id(11), type: 'NUMBERED', text: '자료에서 확인한 사실' },
      { blockId: id(12), type: 'NUMBERED', text: '내 해석과 근거' },
      { blockId: id(13), type: 'CALLOUT', text: '다음 시간에 선생님께 질문할 것 정리하기', attrs: { emoji: '💡' } },
    )
    if (areaOf(subject) === 'math' || areaOf(subject) === 'science') base.push({ blockId: id(14), type: 'MATH', text: 'y = ax^2 + bx + c' })
    if (areaOf(subject) === 'info') base.push({ blockId: id(15), type: 'CODE', text: 'for item in data:\n    print(item)', attrs: { language: 'python' } })
  }
  return base
}

const fileKinds = [
  { ext: 'pdf', contentType: 'application/pdf' },
  { ext: 'hwp', contentType: 'application/x-hwp' },
  { ext: 'docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { ext: 'pptx', contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  { ext: 'png', contentType: 'image/png' },
]

/** 시연 학생 7명 × 6개 학교 = 42명. 학년은 학교마다 1·2·3학년이 섞인다 */
export function buildDemoRecords(catalogTaskIds: string[]): DemoStudentRecords {
  const random = seeded(20261029)
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)]
  const out: DemoStudentRecords = {
    roster: [],
    academicContexts: {},
    schoolAssessments: [],
    enrichmentTasks: [],
    growthRecords: [],
    notes: [],
    artifacts: [],
    artifactVersions: [],
    feedbackRequests: [],
  }
  let studentNo = 0
  let seq = 0
  const next = (prefix: string) => `demo_${prefix}_${pad(++seq, 4)}`

  demoSchools.forEach((school, schoolIndex) => {
    /** 학교가 개설한 과목 (학교·학년도·학년·학기별 고정 ID) */
    const offered = (year: number, grade: number, semester: number) => {
      const pool = subjectPool[`${grade}-${semester}`]
      const count = Math.max(5, pool.length - (schoolIndex % 3))
      return pool.slice(0, count).map((name, index) => ({ subjectId: `demo_subj_${schoolIndex + 1}_${year}${semester}_${grade}_${pad(index + 1)}`, name }))
    }
    for (let k = 0; k < 7; k += 1) {
      studentNo += 1
      const studentId = `demo_student_${pad(studentNo, 3)}`
      const grade = ((k + schoolIndex) % 3) + 1
      const displayName = `${familyNames[(studentNo * 7) % familyNames.length]}${givenNames[(studentNo * 5 + schoolIndex) % givenNames.length]}`
      out.roster.push({ studentId, displayName, school: { schoolId: school.schoolId, name: school.name }, grade, branchId: school.branchId })

      // 학기: 2026-2(현재) · 2026-1, 2학년 이상은 2025학년도 두 학기도 있다
      const terms: { year: number; semester: number; grade: number }[] = [
        { year: 2026, semester: 2, grade },
        { year: 2026, semester: 1, grade },
      ]
      if (grade >= 2) terms.push({ year: 2025, semester: 2, grade: grade - 1 }, { year: 2025, semester: 1, grade: grade - 1 })
      const contexts: AcademicContext[] = []
      const studentAssessments: (SchoolAssessmentRecord & { studentId: string })[] = []
      for (const term of terms) {
        const all = offered(term.year, term.grade, term.semester)
        // 학생마다 4~6과목 (선택 과목 조합이 학생마다 다르다)
        const take = 4 + Math.floor(random() * 3)
        const offset = Math.floor(random() * all.length)
        const subjects = Array.from({ length: Math.min(take, all.length) }, (_, index) => all[(offset + index) % all.length])
        contexts.push({ school: { schoolId: school.schoolId, name: school.name }, academicYear: term.year, grade: term.grade, semester: term.semester, subjects, source: 'DEMO_FIXTURE' })

        const isCurrent = term.year === 2026 && term.semester === 2
        // 수행평가 0~5건 (일부 학생은 0건 — Empty 확인)
        const assessmentCount = (studentNo + term.semester) % 6 === 0 ? 0 : 1 + Math.floor(random() * (isCurrent ? 5 : 3))
        for (let a = 0; a < assessmentCount; a += 1) {
          const subject = subjects[a % subjects.length]
          const start = termStart(term.year, term.semester)
          const deadlineDate = random() < 0.12 ? null : addDays(start, 20 + Math.floor(random() * 100))
          const status = !isCurrent
            ? 'COMPLETED'
            : deadlineDate && deadlineDate < demoAsOf
              ? random() < 0.8
                ? 'COMPLETED'
                : 'IN_PROGRESS'
              : pick(['BEFORE_START', 'IN_PROGRESS', 'IN_PROGRESS'] as const)
          studentAssessments.push({
            studentId,
            assessmentId: next('assessment'),
            title: topicPool[areaOf(subject.name)][(a + studentNo) % 5],
            subjectId: subject.subjectId,
            status,
            deadlineDate,
            createdAt: at(addDays(start, 3 + a * 4), 9),
            evaluationItemRef: null,
            academicYear: term.year,
            semester: term.semester,
            description: random() < 0.3 ? '모둠 활동 후 개인 보고서 제출 (시연 문장)' : null,
          })
        }
      }
      out.academicContexts[studentId] = contexts
      out.schoolAssessments.push(...studentAssessments)

      // 노트·결과물·피드백: 진행 중/완료 수행평가 일부에만 둔다
      for (const assessment of studentAssessments) {
        if (assessment.status === 'BEFORE_START' || random() < 0.35) continue
        const subjectName = contexts.flatMap((context) => context.subjects).find((subject) => subject.subjectId === assessment.subjectId)?.name ?? ''
        const created = assessment.createdAt.slice(0, 10)
        const revisionCount = 1 + Math.floor(random() * 3)
        const noteId = next('note')
        const revisions = Array.from({ length: revisionCount }, (_, index) => ({
          revisionId: next('rev'),
          revisionNumber: index + 1,
          savedAt: at(addDays(created, 2 + index * 3), 19 + index, 10 * index),
          title: '탐구 노트',
          blocks: blockSets(assessment.title, subjectName, index + 1),
        }))
        out.notes.push({ studentId, noteId, sourceType: 'SCHOOL_ASSESSMENT', sourceId: assessment.assessmentId, revisions })

        const versionIds: string[] = []
        if (random() < 0.7) {
          const artifactCount = 1 + Math.floor(random() * 2)
          for (let i = 0; i < artifactCount; i += 1) {
            const artifactId = next('artifact')
            const title = i === 0 ? '결과 보고서' : '발표 자료'
            out.artifacts.push({ studentId, artifactId, sourceType: 'SCHOOL_ASSESSMENT', sourceId: assessment.assessmentId, title, kind: null })
            const versionCount = 1 + Math.floor(random() * 3)
            for (let v = 1; v <= versionCount; v += 1) {
              const kind = i === 0 ? fileKinds[(v + studentNo) % 3] : fileKinds[3 + (v % 2)]
              const versionId = next('version')
              out.artifactVersions.push({
                versionId,
                artifactId,
                versionNumber: v,
                file: { fileRef: `file_${versionId}`, fileName: `${assessment.title.slice(0, 10)}_${title}_v${v}.${kind.ext}`, contentType: kind.contentType, sizeBytes: 120_000 + Math.floor(random() * 1_800_000) },
                changeNote: v === 1 ? null : pick(['자료 출처 보완', '그래프 단위 수정', '결론 문단 다시 쓰기', '오탈자 수정']),
                uploadedAt: at(addDays(created, 3 + v * 3), 21, v * 5),
              })
              if (v === versionCount) versionIds.push(versionId)
            }
          }
        }

        // 피드백 요청 (선택 사항): 일부만 요청, 요청 당시 Revision·파일 버전을 Snapshot으로 고정
        if (random() < 0.4) {
          const snapshotRevision = revisions[revisions.length - 1]
          const delivered = random() < 0.55
          out.feedbackRequests.push({
            studentId,
            requestId: next('fbr'),
            status: delivered ? 'DELIVERED' : 'PENDING',
            requestedAt: at(addDays(snapshotRevision.savedAt.slice(0, 10), 1), 20),
            snapshot: { noteRevisionId: snapshotRevision.revisionId, artifactVersionIds: versionIds.slice(0, 1), locked: true },
            sourceType: 'SCHOOL_ASSESSMENT',
            sourceId: assessment.assessmentId,
            reply: delivered
              ? {
                  overallComment: '탐구 질문이 분명해요. 조사한 자료의 출처와 작성일을 표에 함께 적어 보세요. (시연 답변)',
                  comments: [],
                  recommendations: [],
                }
              : null,
            ...(delivered ? { deliveredAt: at(addDays(snapshotRevision.savedAt.slice(0, 10), 3), 17) } : {}),
          })
        }
      }

      // 심화 탐구 0~3건 (공개 Task에서 시작하거나 학생이 직접 시작)
      const current = contexts[0]
      const taskCount = studentNo % 4 === 0 ? 0 : Math.floor(random() * 4)
      for (let t = 0; t < taskCount; t += 1) {
        const subject = current.subjects[(t + 1) % current.subjects.length]
        const fromCatalog = catalogTaskIds.length > 0 && random() < 0.4
        const created = addDays('2026-09-01', Math.floor(random() * 40))
        const taskId = next('task')
        const related = studentAssessments.find((assessment) => assessment.subjectId === subject.subjectId)
        out.enrichmentTasks.push({
          studentId,
          taskId,
          title: `${subject.name} 심화: ${topicPool[areaOf(subject.name)][(t + 2) % 5]}`,
          subjectId: subject.subjectId,
          goal: random() < 0.75 ? '수업에서 배운 개념을 실제 자료로 확인해 본다.' : null,
          relatedAssessmentId: related && random() < 0.5 ? related.assessmentId : null,
          catalogTaskId: fromCatalog ? pick(catalogTaskIds) : null,
          status: pick(['BEFORE_START', 'IN_PROGRESS', 'IN_PROGRESS', 'COMPLETED'] as const),
          deadlineDate: random() < 0.5 ? addDays(created, 30) : null,
          sourceReference: null,
          createdAt: at(created, 18),
          updatedAt: at(addDays(created, 5), 21),
        })
        if (random() < 0.5) {
          out.notes.push({
            studentId,
            noteId: next('note'),
            sourceType: 'ENRICHMENT_TASK',
            sourceId: taskId,
            revisions: [{ revisionId: next('rev'), revisionNumber: 1, savedAt: at(addDays(created, 2), 20), title: '탐구 노트', blocks: blockSets(subject.name, subject.name, 2) }],
          })
        }
      }

      // 성장 기록 0~2건 (완료 수행평가와 연결)
      const completed = studentAssessments.filter((assessment) => assessment.status === 'COMPLETED')
      const growthCount = Math.min(completed.length, studentNo % 3)
      for (let g = 0; g < growthCount; g += 1) {
        const source = completed[g]
        const day = source.deadlineDate ?? source.createdAt.slice(0, 10)
        out.growthRecords.push({
          studentId,
          recordId: next('growth'),
          title: source.title,
          subjectId: source.subjectId,
          activityStartDate: source.createdAt.slice(0, 10),
          role: '자료 조사와 정리를 맡았다. (시연 문장)',
          motivation: null,
          process: '평가 기준을 먼저 확인하고 자료를 표로 비교했다.',
          contribution: null,
          difficulty: random() < 0.5 ? '자료마다 기준이 달라 비교가 어려웠다.' : null,
          solution: null,
          outcome: '근거를 갖춘 결론을 정리했다.',
          reflection: '출처를 함께 적는 습관이 필요하다는 걸 알았다.',
          followUp: null,
          relatedSourceType: 'SCHOOL_ASSESSMENT',
          relatedSourceId: source.assessmentId,
          artifactIds: [],
          createdAt: at(addDays(day, 2), 21),
          updatedAt: at(addDays(day, 2), 21),
        })
      }
    }
  })
  return out
}
