import { CHOI_HAEUN_ID } from './adminStudents.fixture.ts'
import { evidenceFor, fileBackings } from './adminEvidence.fixture.ts'
import type { AdminTask, AdminTaskVersion, TaskStageNumber } from './types.ts'

/*
 * Admin Canonical Task (수행평가). 실제 Backend / 기존 LearnersHigh 수행평가 데이터가 아니다.
 *
 * 최하은 Task 9개 (fixture-task-01 ~ 09): Student Surface Canonical Fixture와 같은 Task다.
 *   taskId · 제목 · 과목 · 마감일 · 단계 · 단계 상태 · 제출물 · 다음 할 일 · Version · Evidence 수 · 평가 기준 · Case 연결은
 *   frontend/student/src/features/school-admissions/fixtures/(schoolTasks · schoolVersion · schoolEvidence · schoolTaskDetail) 값 그대로다.
 *   Student Fixture에 정보가 없는 값은 null(정보 없음)로 두고 Admin에서 만들지 않는다.
 *   예외: fixture-task-03은 Student 요약이 "V1 검토 대기"(공용 Queue 대기)라 V1 기록(lunch-v1)만 Admin에 둔다. (Student Version Seed 없음 → Gap 보고)
 *   과거 Admin Queue의 "최하은 · 항생제 포스터 Revision 확인 · 10월 10일"은 Student 사실(4단계 초안 미제출 · 10월 5일 마감)과 달라 없앴다.
 *
 * 나머지 Task는 Admin 전용 학생의 Task다. id = fixture-admin-task-NNN (Student id와 겹치지 않는다)
 * 단계 전이 의미는 Student Fixture 규칙을 따른다:
 *   2 주제(검토 대기 / 수정 필요) · 3 자료 조사 · 4 초안 미제출 · 5 V1 AI 사전 점검(분석 중 / 실패) · 6 V1 선생님 피드백
 *   7 수정본 V2 / V3 (AI 분석 중 · 실패 · 재검토 대기 · 피드백 확인 · 최종 제출 준비) · 8 최종 제출 완료
 */

const v = (
  versionId: string,
  number: number,
  fileName: string,
  submittedAt: string,
  aiStatus: AdminTaskVersion['aiStatus'] = 'success',
  aiAnalyzedAt?: string,
  retryAllowed?: boolean,
  extra: Pick<AdminTaskVersion, 'aiAttempts' | 'file'> = {},
): AdminTaskVersion => ({
  versionId,
  number,
  fileName,
  submittedAt,
  aiStatus,
  ...(aiAnalyzedAt ? { aiAnalyzedAt } : {}),
  ...(retryAllowed !== undefined ? { retryAllowed } : {}),
  ...extra,
})

const kst = (value: string) => `${value}:00+09:00`

interface TaskInput {
  n: number
  student: string
  subject: string
  title: string
  deadline: string
  stage: TaskStageNumber
  status: string
  deliverable: string
  next: string
  turn: AdminTask['turn']
  versions?: AdminTaskVersion[] | null
  topic?: AdminTask['topic']
  cases?: string[]
  artifact?: AdminTask['finalArtifact']
  criteria?: AdminTask['criteria']
  onHold?: boolean
}

const task = (input: TaskInput): AdminTask => ({
  taskId: `fixture-admin-task-${String(input.n).padStart(3, '0')}`,
  studentId: `fixture-student-${input.student}`,
  title: input.title,
  subject: input.subject,
  deadlineDate: input.deadline,
  currentStage: input.stage,
  stageStatus: input.status,
  deliverableSummary: input.deliverable,
  nextAction: input.next,
  turn: input.turn,
  ...(input.onHold ? { onHold: true } : {}),
  ...(input.topic ? { topic: input.topic } : {}),
  evidence: evidenceFor(`fixture-admin-task-${String(input.n).padStart(3, '0')}`),
  versions: input.versions ?? null,
  criteria: input.criteria ?? null,
  finalArtifact: input.artifact ?? null,
  relatedMentorCaseIds: input.cases ?? [],
})

const vid = (n: number, version: number) => `fixture-admin-version-${String(n).padStart(3, '0')}-v${version}`
const artifact = (n: number, fileName: string, parentShareStatus: NonNullable<AdminTask['finalArtifact']>['parentShareStatus']) => ({
  artifactId: `fixture-admin-artifact-${String(n).padStart(3, '0')}`,
  fileName,
  parentShareStatus,
})

// ---------- 최하은 (Student Surface와 같은 Task) ----------

const choiHaeunTasks: AdminTask[] = [
  {
    taskId: 'fixture-task-02',
    studentId: CHOI_HAEUN_ID,
    title: '사회 쟁점 3분 영어 Speech · How AI is Changing Education',
    subject: '영어',
    deadlineDate: '2026-10-16',
    currentStage: 6,
    stageStatus: 'V2 검토 대기',
    deliverableSummary: '2분 40초~3분 20초 Speech + 시각자료 1장',
    nextAction: '선생님이 V2를 검토하고 있어요.',
    turn: 'waiting',
    topic: { state: 'confirmed', text: 'How AI is Changing Education' },
    evidence: null,
    versions: [
      v('speech-v1', 1, 'speech_v1_612words.docx', '2026-10-01T22:10:00+09:00', 'success', '2026-10-01T22:12:00+09:00'),
      v('speech-v2', 2, 'speech_v2_548words.docx', '2026-10-03T20:45:00+09:00', 'success', '2026-10-03T20:47:00+09:00'),
    ],
    criteria: [
      { criterionId: 'thesis', name: '내용 구성 · thesis', points: 30, aiCheck: 'thesis가 두 번째 문단에 있어요. 앞쪽으로 옮기면 좋아요' },
      { criterionId: 'time', name: '시간 준수 (2분 40초~3분 20초)', points: 20, aiCheck: '3분 55초 · 35초 길어요' },
      { criterionId: 'delivery', name: '발음·전달', points: 20, aiCheck: '녹음이 없어 아직 점검 전이에요' },
      { criterionId: 'vocabulary', name: '어휘·표현', points: 20, aiCheck: '반복 표현이 2회 남아 있어요' },
      { criterionId: 'visual', name: '시각자료 활용', points: 10, aiCheck: '시각자료 1장이 아직 없어요' },
    ],
    finalArtifact: null,
    // Student Task Detail(schoolTaskDetail.fixture.ts speechDetail) 값 그대로: 안내문 · 참고 자료 · V1 → V2 내용 비교
    guideFile: { fileName: '2학기 영어 수행평가 안내문_Speech.pdf', registeredDate: '2026-09-22' },
    references: [{"referenceId": "unesco", "kind": "link", "title": "UNESCO · Guidance for generative AI in education", "source": "unesco.org", "usage": "thesis 근거 통계 1개"}, {"referenceId": "herald", "kind": "article", "title": "AI 디지털교과서 도입 관련 기사", "source": "The Korea Herald", "usage": "도입부 사례"}, {"referenceId": "textbook", "kind": "textbook", "title": "영어Ⅰ 교과서 4단원 Speech 예시", "source": "p.86~89", "usage": "구조 참고"}],
    revisionDiffs: [{"fromVersionId": "speech-v1", "toVersionId": "speech-v2", "appliedFeedbackId": "speech-teacher-v1", "blocks": [{"kind": "changed", "before": "Good morning, everyone. Today I want to talk about something very important. Artificial intelligence is very important in our lives, and it is also very important in education.", "after": "Good morning, everyone. Today I want to talk about how AI is changing the way we learn."}, {"kind": "same", "text": "First, AI can give students personal feedback. For example, writing apps can check grammar right away and show better expressions."}, {"kind": "removed", "before": "Also, my cousin used an AI chatbot to plan a family trip, and it was very convenient and very fast."}, {"kind": "changed", "before": "Second, AI is very very helpful for teachers because it is very helpful to make many quizzes.", "after": "Second, AI helps teachers make quizzes that fit each student."}, {"kind": "added", "after": "However, we should still check AI answers ourselves before we use them."}]}],
    // Task Detail Mentor Case 연결 (speechCase는 선생님 추천, 나머지 둘은 학생 참고 Case)
    relatedMentorCaseIds: ['fixture-content-case-06', 'fixture-content-case-07', 'fixture-content-case-15'],
  },
  {
    taskId: 'fixture-task-03',
    studentId: CHOI_HAEUN_ID,
    title: '생활 문제 해결 Python 데이터 프로젝트 · 급식 메뉴별 잔반량 분석',
    subject: '정보',
    deadlineDate: '2026-10-09',
    currentStage: 6,
    stageStatus: 'V1 검토 대기',
    deliverableSummary: '.py/.ipynb + 결과 화면 + 보고서 2쪽',
    nextAction: '선생님이 V1을 검토하고 있어요.',
    turn: 'waiting',
    evidence: null,
    // Admin 보충: Student 요약 "V1 검토 대기"를 Queue에 잇기 위한 V1 기록. 파일 이름은 Student Evidence(초안) 이름이다.
    versions: [v('lunch-v1', 1, '급식 잔반 데이터 분석.py', '2026-10-06T06:58:00+09:00', 'success', '2026-10-06T07:00:00+09:00')],
    criteria: null,
    finalArtifact: null,
    relatedMentorCaseIds: [],
  },
  {
    taskId: 'fixture-task-04',
    studentId: CHOI_HAEUN_ID,
    title: '함수를 활용한 실생활 모델링 · 자동차 속도와 제동거리',
    subject: '수학',
    deadlineDate: '2026-10-20',
    currentStage: 7,
    stageStatus: 'Revision',
    deliverableSummary: '탐구보고서 3쪽 + 그래프',
    nextAction: '피드백을 반영한 수정본을 올려주세요.',
    turn: 'student',
    evidence: null,
    versions: null,
    criteria: null,
    finalArtifact: null,
    relatedMentorCaseIds: [],
  },
  {
    taskId: 'fixture-task-05',
    studentId: CHOI_HAEUN_ID,
    title: '우리 지역 생활환경 조사 · 하천 주변 토지 이용과 환경 문제',
    subject: '한국지리',
    deadlineDate: '2026-10-27',
    currentStage: 2,
    stageStatus: '주제 검토 대기',
    deliverableSummary: '현장 사진 3장 이상 + 지도 표시 + A4 2쪽 보고서',
    nextAction: '선생님이 주제를 검토하고 있어요.',
    turn: 'waiting',
    // submittedAt: Student Fixture에 제출 시각이 없어 Admin Queue Metadata로 둔다.
    topic: { state: 'in-review', text: '하천 주변 토지 이용과 환경 문제', submittedAt: '2026-10-04T19:00:00+09:00' },
    evidence: null,
    versions: null,
    criteria: null,
    finalArtifact: null,
    relatedMentorCaseIds: [],
  },
  {
    taskId: 'fixture-task-01',
    studentId: CHOI_HAEUN_ID,
    title: '항생제 내성과 자연선택 탐구 포스터',
    subject: '생명과학Ⅰ',
    deadlineDate: '2026-10-05',
    currentStage: 4,
    stageStatus: '초안 미제출',
    deliverableSummary: 'A3 포스터 + 3분 발표',
    nextAction: '초안 V1을 올려주세요.',
    turn: 'student',
    evidence: null,
    versions: [],
    criteria: null,
    finalArtifact: null,
    // Mentor Hub Home Admin 추천 Case (2026-10-04)
    relatedMentorCaseIds: ['fixture-content-case-01'],
  },
  {
    taskId: 'fixture-task-06',
    studentId: CHOI_HAEUN_ID,
    title: '물의 전기분해 실험 보고서 · 기체 부피비 2:1 확인',
    subject: '화학Ⅰ',
    deadlineDate: '2026-10-15',
    currentStage: 5,
    stageStatus: 'AI 1차 분석 중',
    deliverableSummary: '실험 보고서 A4 3쪽 + 실험 사진 4장',
    nextAction: 'AI 사전 점검이 끝나면 알려드릴게요.',
    turn: 'waiting',
    evidence: null,
    versions: null,
    criteria: null,
    finalArtifact: null,
    relatedMentorCaseIds: [],
  },
  {
    taskId: 'fixture-task-07',
    studentId: CHOI_HAEUN_ID,
    title: '설문으로 알아본 우리 반 통학 시간 · 대푯값과 산포도',
    subject: '수학',
    deadlineDate: '2026-10-23',
    currentStage: 3,
    stageStatus: '자료 조사',
    deliverableSummary: '설문 탐구 보고서 2쪽 + 도수분포표·히스토그램',
    nextAction: '조사 자료를 1개 이상 올려주세요.',
    turn: 'student',
    evidence: null,
    versions: null,
    criteria: null,
    finalArtifact: null,
    relatedMentorCaseIds: [],
  },
  {
    taskId: 'fixture-task-08',
    studentId: CHOI_HAEUN_ID,
    title: '영어 독서 에세이 · 「Wonder」 주인공의 변화',
    subject: '영어',
    deadlineDate: '2026-09-30',
    currentStage: 8,
    stageStatus: '최종 제출 완료',
    deliverableSummary: '영어 에세이 250~300단어',
    nextAction: '최종 결과 확정을 기다리고 있어요.',
    turn: 'waiting',
    evidence: null,
    versions: null,
    criteria: null,
    // Student Fixture에 최종 결과물이 없다. (결과물 없이 완료 = Archive에는 남는다)
    finalArtifact: null,
    relatedMentorCaseIds: [],
  },
  {
    taskId: 'fixture-task-09',
    studentId: CHOI_HAEUN_ID,
    title: '독립협회와 만민공동회 사료 비교 분석',
    subject: '한국사',
    deadlineDate: '2026-10-30',
    currentStage: 1,
    stageStatus: '보류',
    deliverableSummary: '사료 비교표 + A4 3쪽 보고서',
    nextAction: '보류된 수행평가예요. 다시 진행되면 알려드릴게요.',
    turn: 'waiting',
    onHold: true,
    evidence: null,
    versions: null,
    criteria: null,
    finalArtifact: null,
    relatedMentorCaseIds: [],
  },
]

// ---------- Admin 전용 학생 ----------

const waitingV1 = '선생님이 V1을 검토하고 있어요.'
const draftNext = '초안 V1을 올려주세요.'
const researchNext = '조사 자료를 1개 이상 올려주세요.'

const adminOnlyTasks: AdminTask[] = [
  // 윤지민 (고1) — 학습 안정 + Task 정상 진행
  task({ n: 1, student: 'yoon-jimin', subject: '영어', title: '청소년 SNS 사용 영어 Opinion Essay', deadline: '2026-10-20', stage: 3, status: '자료 조사', deliverable: '영어 에세이 300~350단어', next: '자료를 추가하세요.', turn: 'student', topic: { state: 'confirmed', text: '청소년 SNS 사용 시간 제한에 대한 의견' } }),
  task({ n: 2, student: 'yoon-jimin', subject: '통합과학', title: '운동 후 심박수 회복 비교 실험', deadline: '2026-10-30', stage: 2, status: '주제 선정', deliverable: '실험 보고서 A4 2쪽', next: '주제를 정해 제출해주세요.', turn: 'student', topic: { state: 'not-submitted', text: '' } }),
  task({ n: 3, student: 'yoon-jimin', subject: '국어', title: '현대시 화자의 태도 비교', deadline: '2026-09-26', stage: 8, status: '최종 제출 완료', deliverable: '비교 감상문 A4 2쪽', next: '수행평가를 완료했어요.', turn: 'done', versions: [v(vid(3, 1), 1, '현대시_화자비교_v1.docx', kst('2026-09-20T21:30'), 'success', kst('2026-09-20T21:32'))], artifact: artifact(3, '현대시_화자비교_v1.docx', 'consented') }),
  // 서하진 (고1) — 모의 수학 상승 + 국어 발표 D-2
  task({ n: 4, student: 'seo-hajin', subject: '국어', title: '광고 속 설득 전략 분석 발표', deadline: '2026-10-08', stage: 6, status: 'V1 검토 대기', deliverable: '분석지 + 4분 발표', next: waitingV1, turn: 'waiting', versions: [v(vid(4, 1), 1, '광고설득전략_분석지_v1.pdf', kst('2026-10-05T14:58'), 'success', kst('2026-10-05T15:00'))], cases: ['fixture-content-case-04'], criteria: [{ criterionId: 'analysis', name: '설득 전략 분석', points: 40 }, { criterionId: 'evidence', name: '광고 사례 근거', points: 30 }, { criterionId: 'delivery', name: '발표 전달', points: 30 }] }),
  task({ n: 5, student: 'seo-hajin', subject: '수학', title: '카페 대기시간과 함수 모델링', deadline: '2026-10-21', stage: 3, status: '자료 조사', deliverable: '탐구 보고서 3쪽 + 그래프', next: '자료를 추가하세요.', turn: 'student' }),
  // 이도윤 (고1) — AI 사전 점검 실패 후 다시 시도 필요
  task({ n: 6, student: 'lee-doyun', subject: '통합과학', title: '농구공 포물선 운동 영상 분석', deadline: '2026-10-13', stage: 5, status: 'AI 사전 점검 실패', deliverable: '분석 보고서 + 영상 프레임 캡처', next: 'AI 사전 점검을 다시 시도해주세요.', turn: 'student', versions: [v(vid(6, 1), 1, '포물선운동_분석_v1.pdf', kst('2026-10-05T22:40'), 'failed', kst('2026-10-05T22:43'), true, { aiAttempts: [{ status: 'failed', at: kst('2026-10-05T22:43') }] })] }),
  task({ n: 7, student: 'lee-doyun', subject: '정보', title: '교통 데이터 시각화', deadline: '2026-10-27', stage: 4, status: '초안 미제출', deliverable: '시각화 결과 + 설명 1쪽', next: draftNext, turn: 'student', versions: [] }),
  task({ n: 8, student: 'lee-doyun', subject: '한국사', title: '지역 독립운동가 탐구', deadline: '2026-10-16', stage: 6, status: 'V1 피드백 확인', deliverable: '인물 탐구 보고서 A4 3쪽', next: '선생님 피드백을 확인하고 수정할 내용을 반영해주세요.', turn: 'student', versions: [v(vid(8, 1), 1, '독립운동가_탐구_v1.docx', kst('2026-10-04T19:58'), 'success', kst('2026-10-04T20:00'))] }),
  // 김하린 (고1) — 연속 미등원 + Plan 하락 + Speech D-1 초안 없음
  task({ n: 9, student: 'kim-harin', subject: '영어', title: '플라스틱 사용 규제 찬반 Speech', deadline: '2026-10-07', stage: 4, status: '초안 미제출', deliverable: '2분 Speech 원고 + 발표', next: draftNext, turn: 'student', versions: [] }),
  // 정현우 (고1) — Mentor Case 추천 필요 (연결 Case 없음)
  task({ n: 10, student: 'jung-hyunwoo', subject: '정보', title: '추천 알고리즘 편향 탐구', deadline: '2026-10-23', stage: 3, status: '자료 조사', deliverable: '탐구 보고서 A4 3쪽 + 실험 코드', next: '자료를 추가하세요.', turn: 'student', topic: { state: 'confirmed', text: '동영상 추천 알고리즘이 보여주는 콘텐츠의 편향' } }),
  task({ n: 11, student: 'jung-hyunwoo', subject: '진로', title: '관심 학과 탐색 보고서 · 컴퓨터공학', deadline: '2026-11-05', stage: 1, status: '안내문 등록', deliverable: '학과 탐색 보고서 A4 2쪽', next: '안내문을 확인하고 주제를 정해주세요.', turn: 'student' }),
  // 장예은 (고1)
  task({ n: 12, student: 'jang-yeeun', subject: '미술', title: '공공 안내 디자인 개선', deadline: '2026-10-15', stage: 7, status: 'V2 AI 사전 점검 중', deliverable: '개선 시안 2장 + 설명 1쪽', next: 'AI 사전 점검이 끝나면 알려드릴게요.', turn: 'waiting', versions: [v(vid(12, 1), 1, '안내디자인_개선_v1.pdf', kst('2026-09-30T20:58'), 'success', kst('2026-09-30T21:00')), v(vid(12, 2), 2, '안내디자인_개선_v2.pdf', kst('2026-10-06T09:00'), 'processing')] }),
  task({ n: 13, student: 'jang-yeeun', subject: '음악', title: '광고 음악과 감정 반응', deadline: '2026-10-12', stage: 6, status: 'V1 검토 대기', deliverable: '감상 분석지 + 2분 발표', next: waitingV1, turn: 'waiting', versions: [v(vid(13, 1), 1, '광고음악_감정반응_v1.pdf', kst('2026-10-06T03:58'), 'success', kst('2026-10-06T04:00'))] }),
  task({ n: 14, student: 'jang-yeeun', subject: '국어', title: '뉴스 기사 표현 방식 비교', deadline: '2026-10-29', stage: 2, status: '주제 수정 필요', deliverable: '비교 분석문 A4 2쪽', next: '방향을 확인하고 주제를 다시 제출하세요.', turn: 'student', topic: { state: 'direction-requested', text: '뉴스 기사의 표현 방식', guidance: '비교할 두 매체나 한 가지 사건을 정해 범위를 좁혀보세요.' } }),
  // 윤채원 (고1)
  task({ n: 15, student: 'yoon-chaewon', subject: '수학', title: '학교 계단 높이와 보폭의 일차함수 모델', deadline: '2026-10-13', stage: 6, status: 'V1 검토 대기', deliverable: '탐구 보고서 3쪽 + 측정표', next: waitingV1, turn: 'waiting', versions: [v(vid(15, 1), 1, '계단보폭_모델링_v1.pdf', kst('2026-10-05T08:20'), 'success', kst('2026-10-05T09:00'), undefined, { aiAttempts: [{ status: 'failed', at: kst('2026-10-05T08:23') }, { status: 'success', at: kst('2026-10-05T09:00') }] })] }),
  task({ n: 16, student: 'yoon-chaewon', subject: '통합과학', title: '산성 음료와 치아 부식 모형 실험', deadline: '2026-10-20', stage: 3, status: '자료 조사', deliverable: '실험 보고서 A4 2쪽', next: '자료를 추가하세요.', turn: 'student' }),
  // 정유나 (고2) — Feedback 48시간 초과 + Revision V2 재검토 대기
  task({ n: 17, student: 'jung-yuna', subject: '확률과통계', title: '고등학생의 수면시간과 시험 성적 설문 탐구', deadline: '2026-10-15', stage: 7, status: 'V2 재검토 대기', deliverable: '설문 탐구 보고서 3쪽', next: '선생님이 V2를 다시 검토하고 있어요.', turn: 'waiting', versions: [v(vid(17, 1), 1, '수면성적_설문_v1.pdf', kst('2026-09-28T19:58'), 'success', kst('2026-09-28T20:00')), v(vid(17, 2), 2, '수면성적_설문_v2.pdf', kst('2026-10-03T02:58'), 'success', kst('2026-10-03T03:00'))], cases: ['fixture-content-case-19'] }),
  task({ n: 18, student: 'jung-yuna', subject: '문학', title: '소설 속 인물 갈등 구조 분석', deadline: '2026-10-22', stage: 3, status: '자료 조사', deliverable: '분석 보고서 A4 2쪽', next: '자료를 추가하세요.', turn: 'student' }),
  task({ n: 19, student: 'jung-yuna', subject: '지구과학Ⅰ', title: '우리 동네 도시 열섬 현상 측정', deadline: '2026-10-09', stage: 4, status: '초안 미제출', deliverable: '측정 보고서 + 온도 지도', next: draftNext, turn: 'student', versions: [] }),
  // 김민서 (고2) — Plan 실행률 하락 + 시험 하락 + 화학 D-2
  task({ n: 20, student: 'kim-minseo', subject: '화학Ⅰ', title: '리튬이온 배터리 충·방전과 산화·환원 탐구', deadline: '2026-10-08', stage: 6, status: 'V1 검토 대기', deliverable: '탐구 보고서 A4 4쪽', next: waitingV1, turn: 'waiting', versions: [v(vid(20, 1), 1, '리튬이온_산화환원_v1.pdf', kst('2026-10-05T04:58'), 'success', kst('2026-10-05T05:00'))] }),
  task({ n: 21, student: 'kim-minseo', subject: '영어독해와작문', title: '영어 독해 지문 요약 발표', deadline: '2026-10-18', stage: 2, status: '주제 검토 대기', deliverable: '요약문 + 3분 발표', next: '선생님이 주제를 검토하고 있어요.', turn: 'waiting', topic: { state: 'in-review', text: '전기차 배터리 재활용 기사 요약과 의견', submittedAt: kst('2026-10-05T20:00') } }),
  task({ n: 22, student: 'kim-minseo', subject: '수학Ⅰ', title: '지수함수로 본 감염병 확산 모델', deadline: '2026-10-14', stage: 6, status: 'V2 수정 준비', deliverable: '탐구 보고서 3쪽 + 그래프', next: '수정본 V2를 준비해주세요.', turn: 'student', versions: [v(vid(22, 1), 1, '지수함수_감염병_v1.pdf', kst('2026-09-29T20:58'), 'success', kst('2026-09-29T21:00'))] }),
  // 문수아 (고2) — Activity Feedback 대기
  task({ n: 23, student: 'moon-sua', subject: '사회문화', title: '청소년 SNS와 또래문화 면접 조사', deadline: '2026-10-19', stage: 6, status: '최종 제출 준비', deliverable: '조사 보고서 A4 3쪽', next: '최종 제출을 준비해주세요.', turn: 'student', versions: [v(vid(23, 1), 1, 'SNS또래문화_조사_v1.pdf', kst('2026-10-03T08:58'), 'success', kst('2026-10-03T09:00'))] }),
  // 박서연 (고2) — SchoolRecord candidate
  task({ n: 24, student: 'park-seoyeon', subject: '생명과학Ⅰ', title: '수면과 기억 형성 문헌 탐구', deadline: '2026-10-26', stage: 3, status: '자료 조사', deliverable: '문헌 탐구 보고서 A4 3쪽', next: '자료를 추가하세요.', turn: 'student' }),
  task({ n: 25, student: 'park-seoyeon', subject: '한국지리', title: '우리 지역 상권 변화 조사', deadline: '2026-09-25', stage: 8, status: '최종 제출 완료', deliverable: '조사 보고서 + 지도 2장', next: '수행평가를 완료했어요.', turn: 'done', versions: [v(vid(25, 1), 1, '상권변화_조사_v1.pdf', kst('2026-09-15T21:58'), 'success', kst('2026-09-15T22:00'))], artifact: artifact(25, '상권변화_조사_v1.pdf', 'consented') }),
  task({ n: 26, student: 'park-seoyeon', subject: '수학Ⅱ', title: '미분으로 찾는 포장 용기 최소 겉넓이', deadline: '2026-10-20', stage: 4, status: '초안 미제출', deliverable: '탐구 보고서 3쪽', next: draftNext, turn: 'student', versions: [] }),
  // 이지아 (고2)
  task({ n: 27, student: 'lee-jia', subject: '화법과 작문', title: '교내 휴대폰 사용 규칙 건의문 발표', deadline: '2026-10-10', stage: 7, status: 'V3 재검토 대기', deliverable: '건의문 A4 1쪽 + 3분 발표', next: '선생님이 V3를 다시 검토하고 있어요.', turn: 'waiting', versions: [v(vid(27, 1), 1, '건의문_v1.txt', kst('2026-09-24T17:58'), 'success', kst('2026-09-24T18:00'), undefined, { file: fileBackings.petitionV1 }), v(vid(27, 2), 2, '건의문_v2.txt', kst('2026-09-30T20:00'), 'success', kst('2026-09-30T20:02'), undefined, { file: fileBackings.petitionV2 }), v(vid(27, 3), 3, '건의문_v3.txt', kst('2026-10-05T21:00'), 'success', kst('2026-10-05T21:02'), undefined, { file: fileBackings.petitionV3 })] }),
  task({ n: 28, student: 'lee-jia', subject: '물리학Ⅰ', title: '충돌 시 운동량 변화 탐구', deadline: '2026-10-16', stage: 7, status: '최종 제출 준비', deliverable: '실험 보고서 A4 3쪽', next: '최종 제출을 준비해주세요.', turn: 'student', versions: [v(vid(28, 1), 1, '운동량_충돌실험_v1.pdf', kst('2026-09-27T20:58'), 'success', kst('2026-09-27T21:00')), v(vid(28, 2), 2, '운동량_충돌실험_v2.pdf', kst('2026-10-02T19:00'), 'success', kst('2026-10-02T19:02'))] }),
  task({ n: 29, student: 'lee-jia', subject: '일본어Ⅰ', title: '일본 지역 축제 소개 발표', deadline: '2026-10-21', stage: 5, status: 'AI 1차 분석 중', deliverable: '발표 자료 5장 + 2분 발표', next: 'AI 사전 점검이 끝나면 알려드릴게요.', turn: 'waiting', versions: [v(vid(29, 1), 1, '일본축제_발표_v1.pptx', kst('2026-10-06T10:40'), 'processing')] }),
  // 장하린 (고2) — Mentor Plan 적용 중
  task({ n: 30, student: 'jang-harin', subject: '생활과윤리', title: 'AI 면접을 채용에 활용하는 것은 공정한가', deadline: '2026-10-10', stage: 6, status: 'V1 검토 대기', deliverable: '논증문 A4 2쪽', next: waitingV1, turn: 'waiting', versions: [v(vid(30, 1), 1, 'AI면접_공정성_논증문_v1.docx', kst('2026-10-05T16:58'), 'success', kst('2026-10-05T17:00'))], cases: ['fixture-content-case-15'], criteria: [{ criterionId: 'claim', name: '주장과 반론 구분', points: 40 }, { criterionId: 'evidence', name: '근거의 타당성', points: 40 }, { criterionId: 'form', name: '분량·형식', points: 20 }] }),
  task({ n: 31, student: 'jang-harin', subject: '미적분', title: '놀이기구 속도 변화 그래프 탐구', deadline: '2026-10-24', stage: 4, status: '초안 미제출', deliverable: '탐구 보고서 3쪽 + 그래프', next: draftNext, turn: 'student', versions: [] }),
  // 한서윤 (고2)
  task({ n: 32, student: 'han-seoyun', subject: '세계지리', title: '해수면 상승 위험 지역 비교', deadline: '2026-10-12', stage: 6, status: 'V1 검토 대기', deliverable: '비교 보고서 + 지도 2장', next: waitingV1, turn: 'waiting', versions: [v(vid(32, 1), 1, '해수면상승_비교_v1.pdf', kst('2026-10-04T15:58'), 'success', kst('2026-10-04T16:00'))] }),
  task({ n: 33, student: 'han-seoyun', subject: '중국어Ⅰ', title: '중국 명절 음식 소개 발표', deadline: '2026-10-17', stage: 3, status: '자료 조사', deliverable: '발표 자료 4장 + 2분 발표', next: researchNext, turn: 'student' }),
  task({ n: 34, student: 'han-seoyun', subject: '화학Ⅰ', title: '생활 속 세제 pH 비교 실험', deadline: '2026-10-08', stage: 7, status: 'V2 AI 사전 점검 실패', deliverable: '실험 보고서 A4 2쪽', next: 'AI 사전 점검을 다시 시도해주세요.', turn: 'student', versions: [v(vid(34, 1), 1, '세제pH_실험_v1.pdf', kst('2026-09-26T18:58'), 'success', kst('2026-09-26T19:00')), v(vid(34, 2), 2, '세제pH_실험_v2.pdf', kst('2026-10-05T22:00'), 'failed', kst('2026-10-05T22:03'), true, { aiAttempts: [{ status: 'failed', at: kst('2026-10-05T22:03') }] })] }),
  // 오민지 (고3) — Published Interview
  task({ n: 35, student: 'oh-minji', subject: '생활과윤리', title: '동물실험 윤리 찬반 토론문', deadline: '2026-09-18', stage: 8, status: '최종 제출 완료', deliverable: '토론문 A4 2쪽', next: '수행평가를 완료했어요.', turn: 'done', versions: [v(vid(35, 1), 1, '동물실험_토론문_v1.docx', kst('2026-09-10T19:58'), 'success', kst('2026-09-10T20:00')), v(vid(35, 2), 2, '동물실험_토론문_v2.docx', kst('2026-09-14T20:58'), 'success', kst('2026-09-14T21:00'))], artifact: artifact(35, '동물실험_토론문_v2.docx', 'not_shared') }),
  task({ n: 36, student: 'oh-minji', subject: '진로', title: '희망 전공 탐색 보고서 · 사회복지학', deadline: '2026-10-06', stage: 7, status: 'V2 재검토 대기', deliverable: '탐색 보고서 A4 3쪽', next: '선생님이 V2를 다시 검토하고 있어요.', turn: 'waiting', versions: [v(vid(36, 1), 1, '사회복지학_탐색_v1.pdf', kst('2026-10-01T07:58'), 'success', kst('2026-10-01T08:00')), v(vid(36, 2), 2, '사회복지학_탐색_v2.pdf', kst('2026-10-06T06:58'), 'success', kst('2026-10-06T07:00'))] }),
  // 김도현 (고3) — SchoolRecord confirmed · Archived Activity
  task({ n: 37, student: 'kim-dohyun', subject: '물리학Ⅰ', title: '엘리베이터 가속도와 겉보기 무게 측정', deadline: '2026-09-24', stage: 8, status: '최종 제출 완료', deliverable: '실험 보고서 A4 3쪽', next: '수행평가를 완료했어요.', turn: 'done', versions: [v(vid(37, 1), 1, '엘리베이터_가속도_v1.pdf', kst('2026-09-17T21:58'), 'success', kst('2026-09-17T22:00'))], artifact: artifact(37, '엘리베이터_가속도_v1.pdf', 'consented') }),
  task({ n: 38, student: 'kim-dohyun', subject: '기하', title: '휠체어 접근 경로 기하 분석', deadline: '2026-10-13', stage: 6, status: 'V1 검토 대기', deliverable: '분석 보고서 + 경로도', next: waitingV1, turn: 'waiting', versions: [v(vid(38, 1), 1, '휠체어경로_벡터분석_v1.pdf', kst('2026-10-02T08:58'), 'success', kst('2026-10-02T09:00'))] }),
  // 최민준 (고3) — Interview Draft만
  task({ n: 39, student: 'choi-minjun', subject: '미적분', title: '감염병 확산 변화율 분석', deadline: '2026-10-11', stage: 6, status: 'V1 검토 대기', deliverable: '분석 보고서 A4 3쪽', next: waitingV1, turn: 'waiting', versions: [v(vid(39, 1), 1, '감염병_변화율_v1.pdf', kst('2026-10-05T23:58'), 'success', kst('2026-10-06T00:00'))] }),
  task({ n: 40, student: 'choi-minjun', subject: '확률과통계', title: '스포츠 승률 시뮬레이션', deadline: '2026-11-05', stage: 1, status: '안내문 등록', deliverable: '시뮬레이션 결과 + 보고서 2쪽', next: '안내문을 확인하고 주제를 정해주세요.', turn: 'student' }),
  // 윤서준 (고3)
  task({ n: 41, student: 'yoon-seojun', subject: '독서', title: '과학 칼럼 논증 구조 분석', deadline: '2026-10-20', stage: 6, status: 'V1 검토 대기', deliverable: '분석문 A4 2쪽', next: waitingV1, turn: 'waiting', versions: [v(vid(41, 1), 1, '과학칼럼_논증분석_v1.docx', kst('2026-10-04T06:58'), 'success', kst('2026-10-04T07:00'))] }),
  task({ n: 42, student: 'yoon-seojun', subject: '지구과학Ⅰ', title: '미세먼지와 기상 조건 상관 분석', deadline: '2026-10-13', stage: 2, status: '주제 검토 대기', deliverable: '데이터 분석 보고서 3쪽', next: '선생님이 주제를 검토하고 있어요.', turn: 'waiting', topic: { state: 'in-review', text: '풍속과 습도에 따른 우리 지역 미세먼지 농도 변화', submittedAt: kst('2026-10-06T08:00') } }),
  task({ n: 43, student: 'yoon-seojun', subject: '정보', title: '학급 출결 데이터 대시보드', deadline: '2026-09-29', stage: 8, status: '최종 제출 완료', deliverable: '대시보드 화면 + 설명 1쪽', next: '수행평가를 완료했어요.', turn: 'done', versions: [v(vid(43, 1), 1, '출결대시보드_v1.ipynb', kst('2026-09-22T19:58'), 'success', kst('2026-09-22T20:00'))] }),
  // 신도현 (고3) — Plan 50% 미만
  task({ n: 44, student: 'shin-dohyun', subject: '영어독해와작문', title: 'Gap Year 찬반 영어 에세이', deadline: '2026-10-07', stage: 6, status: 'V1 검토 대기', deliverable: '영어 에세이 350단어', next: waitingV1, turn: 'waiting', versions: [v(vid(44, 1), 1, 'GapYear_essay_v1.docx', kst('2026-10-04T20:58'), 'success', kst('2026-10-04T21:00'))] }),
  task({ n: 45, student: 'shin-dohyun', subject: '한국사', title: '산업화 시기 생활 변화 구술 조사', deadline: '2026-10-20', stage: 3, status: '자료 조사', deliverable: '구술 조사 보고서 A4 3쪽', next: '자료를 추가하세요.', turn: 'student' }),
  // 이서연 (고3) — Published Interview · 마감 지난 Revision
  task({ n: 46, student: 'lee-seoyeon', subject: '사회문화', title: '1인 가구 증가와 생활 변화', deadline: '2026-10-03', stage: 7, status: 'V2 피드백 확인', deliverable: '조사 보고서 A4 3쪽', next: '선생님 피드백을 확인하고 수정할 내용을 반영해주세요.', turn: 'student', versions: [v(vid(46, 1), 1, '1인가구_조사_v1.pdf', kst('2026-09-22T20:58'), 'success', kst('2026-09-22T21:00')), v(vid(46, 2), 2, '1인가구_조사_v2.pdf', kst('2026-09-29T21:58'), 'success', kst('2026-09-29T22:00'))] }),
  task({ n: 47, student: 'lee-seoyeon', subject: '생명과학Ⅰ', title: '운동 강도별 젖산 축적 문헌 탐구', deadline: '2026-10-22', stage: 3, status: '자료 조사', deliverable: '문헌 탐구 보고서 A4 2쪽', next: '자료를 추가하세요.', turn: 'student' }),
  // 류지아 (고3)
  task({ n: 48, student: 'ryu-jia', subject: '정치와 법', title: '기후 난민의 법적 지위 찬반 토론', deadline: '2026-10-12', stage: 2, status: '주제 검토 대기', deliverable: '입론서 A4 2쪽', next: '선생님이 주제를 검토하고 있어요.', turn: 'waiting', topic: { state: 'in-review', text: '기후 난민을 국제법상 난민으로 인정해야 하는가', submittedAt: kst('2026-10-05T21:00') } }),
  task({ n: 49, student: 'ryu-jia', subject: '문학', title: '고전소설의 영웅 서사 비교', deadline: '2026-10-15', stage: 6, status: 'V1 검토 대기', deliverable: '비교 분석문 A4 2쪽', next: waitingV1, turn: 'waiting', versions: [v(vid(49, 1), 1, '영웅서사_비교_v1.docx', kst('2026-10-06T08:58'), 'success', kst('2026-10-06T09:00'))] }),
]

// 최하은 Task 과정 자료: Student Fixture에 자료 정보가 있는 Task(02 · 03 · 04 · 07)만 채운다. 나머지는 정보 없음(null)
const choiWithEvidence = choiHaeunTasks.map((item) => ({ ...item, evidence: evidenceFor(item.taskId) }))

export const adminTasksFixture: readonly AdminTask[] = [...choiWithEvidence, ...adminOnlyTasks]

/** Student Surface Fixture에도 있는 Task (같은 taskId) */
export const studentSurfaceTaskIds: readonly string[] = choiWithEvidence.map((item) => item.taskId)
