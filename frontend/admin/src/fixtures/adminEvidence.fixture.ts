import petitionV1Url from '../assets/fixture-files/lee-jia-petition-v1.txt?url'
import petitionV2Url from '../assets/fixture-files/lee-jia-petition-v2.txt?url'
import petitionV3Url from '../assets/fixture-files/lee-jia-petition-v3.txt?url'
import phoneSurveyUrl from '../assets/fixture-files/lee-jia-phone-survey.csv?url'
import algorithmMemoUrl from '../assets/fixture-files/jung-hyunwoo-algorithm-memo.txt?url'
import accelerationCsvUrl from '../assets/fixture-files/kim-dohyun-acceleration.csv?url'
import accelerationPngUrl from '../assets/fixture-files/kim-dohyun-acceleration-graph.png?url'
import sleepSurveyUrl from '../assets/fixture-files/jung-yuna-sleep-survey.csv?url'
import stairGraphUrl from '../assets/fixture-files/yoon-chaewon-stair-graph.svg?url'
import snsSummaryUrl from '../assets/fixture-files/yoon-jimin-sns-article-summary.pdf?url'
import type { AdminTaskEvidence, EvidenceStageTag, FileBacking } from './types.ts'

/*
 * Task 과정 자료(Evidence) Canonical Fixture. Version(제출본)과 다른 Entity다.
 * - 최하은 fixture-task-02 / 03 / 04 / 07: Student schoolEvidence.fixture.ts 값 그대로 (id · 파일 이름 · 단계 Tag · 등록 시각). 원본 파일 없음.
 * - 그 외 최하은 Task는 Student Fixture에도 자료 정보가 없어 null(정보 없음)로 둔다. (adminTasks.fixture.ts)
 * - Admin 전용 학생 자료는 파일 이름만 있는 것이 기본이다. 일부만 Admin assets에 실제 Sample 원본을 둔다.
 *   (미리보기 지원 형식 검증용: CSV · TXT · PDF · SVG · PNG. 원본이 없는 파일은 미리보기 / 다운로드하지 않는다)
 * - 학생이 올린 원문이다. Admin / AI가 고쳐 쓰지 않는다.
 */

export const fileBackings = {
  petitionV1: { url: petitionV1Url, mimeType: 'text/plain', sizeBytes: 415 },
  petitionV2: { url: petitionV2Url, mimeType: 'text/plain', sizeBytes: 430 },
  petitionV3: { url: petitionV3Url, mimeType: 'text/plain', sizeBytes: 544 },
  phoneSurvey: { url: phoneSurveyUrl, mimeType: 'text/csv', sizeBytes: 177 },
  algorithmMemo: { url: algorithmMemoUrl, mimeType: 'text/plain', sizeBytes: 475 },
  accelerationCsv: { url: accelerationCsvUrl, mimeType: 'text/csv', sizeBytes: 198 },
  accelerationPng: { url: accelerationPngUrl, mimeType: 'image/png', sizeBytes: 1103 },
  sleepSurvey: { url: sleepSurveyUrl, mimeType: 'text/csv', sizeBytes: 175 },
  stairGraph: { url: stairGraphUrl, mimeType: 'image/svg+xml', sizeBytes: 987 },
  snsSummary: { url: snsSummaryUrl, mimeType: 'application/pdf', sizeBytes: 981 },
} satisfies Record<string, FileBacking>

type BackingKey = keyof typeof fileBackings
type Row = [fileName: string, stageTag: EvidenceStageTag, date: string, backing?: BackingKey]

const seed = (taskId: string, evidenceId: string, fileName: string, stageTag: EvidenceStageTag, date: string): AdminTaskEvidence => ({
  evidenceId,
  taskId,
  fileName,
  stageTag,
  createdAt: `${date}T09:00:00+09:00`,
})

/** 최하은 (Student schoolEvidence.fixture.ts seedEvidence 그대로) */
const choiHaeunEvidence: Record<string, AdminTaskEvidence[]> = {
  'fixture-task-02': [
    seed('fixture-task-02', 'speech-outline', 'speech_outline.png', 'plan', '2026-09-27'),
    seed('fixture-task-02', 'speech-articles', 'AI 교육 기사 3건 요약.pdf', 'research', '2026-09-28'),
    seed('fixture-task-02', 'speech-v1-file', 'speech_v1_612words.docx', 'draft', '2026-10-01'),
    seed('fixture-task-02', 'speech-v2-file', 'speech_v2_548words.docx', 'draft', '2026-10-03'),
  ],
  'fixture-task-03': [
    seed('fixture-task-03', 'lunch-data', '급식 잔반 데이터.csv', 'research', '2026-10-06'),
    seed('fixture-task-03', 'lunch-analysis', '급식 잔반 데이터 분석.py', 'draft', '2026-10-06'),
  ],
  'fixture-task-04': [
    seed('fixture-task-04', 'braking-data', '도로교통공단 속도별 제동거리.png', 'research', '2026-09-25'),
    seed('fixture-task-04', 'braking-v1', '제동거리_탐구보고서_v1.pdf', 'draft', '2026-09-29'),
    seed('fixture-task-04', 'braking-final', '최종 제출.py', 'final', '2026-10-06'),
  ],
  'fixture-task-07': [],
}

/** Admin 전용 학생 Task (fixture-admin-task-NNN) */
const adminRows: Record<number, Row[]> = {
  1: [['SNS_usage_article_summary.pdf', 'research', '2026-09-24', 'snsSummary'], ['opinion_essay_outline.docx', 'plan', '2026-09-26']],
  3: [['현대시_두편_원문.pdf', 'research', '2026-09-14'], ['화자태도_비교표.xlsx', 'plan', '2026-09-17'], ['현대시_화자비교_v1.docx', 'draft', '2026-09-20']],
  4: [['광고3편_캡처.zip', 'research', '2026-09-30'], ['설득전략_분류표.xlsx', 'plan', '2026-10-02'], ['발표_대본_초안.docx', 'presentation', '2026-10-05']],
  5: [['카페_대기시간_측정기록.xlsx', 'research', '2026-10-03']],
  6: [['농구공_슛_영상_프레임.zip', 'research', '2026-10-02'], ['포물선_좌표_기록.xlsx', 'research', '2026-10-04']],
  7: [['교통량_공공데이터.csv', 'research', '2026-10-01'], ['시각화_스케치.jpg', 'plan', '2026-10-03']],
  8: [['지역_독립운동가_공훈록.pdf', 'research', '2026-09-27'], ['인물_연표.xlsx', 'plan', '2026-09-30'], ['독립운동가_탐구_v1.docx', 'draft', '2026-10-04']],
  9: [['플라스틱_규제_기사.pdf', 'research', '2026-09-29']],
  10: [['추천알고리즘_탐구메모.txt', 'research', '2026-09-29', 'algorithmMemo']],
  12: [['교내_안내판_현황사진.zip', 'research', '2026-09-22'], ['개선시안_스케치.jpg', 'plan', '2026-09-26'], ['안내디자인_개선_v1.pdf', 'draft', '2026-09-30'], ['안내디자인_개선_v2.pdf', 'draft', '2026-10-06']],
  13: [['광고음악_목록.xlsx', 'research', '2026-10-01'], ['감정반응_기록지.pdf', 'research', '2026-10-04']],
  15: [['계단_높이_측정_그래프.svg', 'research', '2026-10-02', 'stairGraph'], ['계단_측정_기록.xlsx', 'research', '2026-10-01'], ['계단보폭_모델링_v1.pdf', 'draft', '2026-10-05']],
  16: [['산성음료_pH_측정.xlsx', 'research', '2026-10-02'], ['달걀껍질_실험사진.jpg', 'research', '2026-10-04'], ['실험_설계서.docx', 'plan', '2026-09-30']],
  17: [['수면시간_성적_설문결과.csv', 'research', '2026-09-25', 'sleepSurvey'], ['설문지_v1.docx', 'plan', '2026-09-20'], ['수면성적_설문_v1.pdf', 'draft', '2026-09-28'], ['수면성적_설문_v2.pdf', 'draft', '2026-10-03']],
  18: [['소설_발췌_원문.pdf', 'research', '2026-10-01'], ['인물관계도.png', 'plan', '2026-10-03']],
  19: [['동네_온도측정_기록.xlsx', 'research', '2026-09-30'], ['측정지점_지도.png', 'plan', '2026-10-01'], ['기상청_열섬_자료.pdf', 'research', '2026-10-02']],
  20: [['리튬이온_전지_교과서정리.pdf', 'research', '2026-09-30'], ['리튬이온_산화환원_v1.pdf', 'draft', '2026-10-05']],
  22: [['감염병_통계_자료.xlsx', 'research', '2026-09-26'], ['지수함수_감염병_v1.pdf', 'draft', '2026-09-29']],
  23: [['면접질문지.docx', 'plan', '2026-09-24'], ['면접녹취_정리.docx', 'research', '2026-09-28'], ['응답_코딩표.xlsx', 'research', '2026-09-30'], ['SNS또래문화_조사_v1.pdf', 'draft', '2026-10-03'], ['참고문헌_목록.docx', 'research', '2026-10-02']],
  24: [['수면_기억_논문요약.pdf', 'research', '2026-10-03']],
  25: [['상권_현장사진.zip', 'research', '2026-09-08'], ['상권변화_지도.png', 'research', '2026-09-11'], ['상권변화_조사_v1.pdf', 'draft', '2026-09-15'], ['발표자료.pptx', 'presentation', '2026-09-22']],
  26: [['포장용기_치수측정.xlsx', 'research', '2026-10-02'], ['겉넓이_계산메모.jpg', 'research', '2026-10-04']],
  27: [['휴대폰_사용규칙_설문결과.csv', 'research', '2026-09-22', 'phoneSurvey'], ['건의문_v1.txt', 'draft', '2026-09-24', 'petitionV1'], ['건의문_v2.txt', 'draft', '2026-09-30', 'petitionV2']],
  28: [['충돌실험_영상.zip', 'research', '2026-09-24'], ['속도측정_기록.xlsx', 'research', '2026-09-25'], ['운동량_충돌실험_v1.pdf', 'draft', '2026-09-27'], ['운동량_충돌실험_v2.pdf', 'draft', '2026-10-02']],
  29: [['축제_소개자료_조사.pdf', 'research', '2026-10-02'], ['일본축제_발표_v1.pptx', 'draft', '2026-10-06']],
  30: [['AI면접_관련기사.pdf', 'research', '2026-09-30'], ['찬반_근거표.xlsx', 'plan', '2026-10-02'], ['AI면접_공정성_논증문_v1.docx', 'draft', '2026-10-05']],
  31: [['놀이기구_속도데이터.xlsx', 'research', '2026-10-03'], ['속도그래프_스케치.jpg', 'plan', '2026-10-04']],
  32: [['해수면상승_보고서요약.pdf', 'research', '2026-09-29'], ['비교지역_지도.png', 'research', '2026-10-01'], ['해수면상승_비교_v1.pdf', 'draft', '2026-10-04']],
  34: [['세제_pH_측정.xlsx', 'research', '2026-09-23'], ['세제pH_실험_v1.pdf', 'draft', '2026-09-26'], ['세제pH_실험_v2.pdf', 'draft', '2026-10-05']],
  35: [['동물실험_찬반자료.pdf', 'research', '2026-09-05'], ['동물실험_토론문_v1.docx', 'draft', '2026-09-10'], ['동물실험_토론문_v2.docx', 'draft', '2026-09-14']],
  36: [['사회복지학과_교육과정.pdf', 'research', '2026-09-26'], ['봉사활동_기록.docx', 'research', '2026-09-28'], ['사회복지학_탐색_v1.pdf', 'draft', '2026-10-01'], ['사회복지학_탐색_v2.pdf', 'draft', '2026-10-06']],
  37: [['가속도_측정값.csv', 'research', '2026-09-12'], ['측정앱_설정화면.jpg', 'plan', '2026-09-10'], ['겉보기무게_그래프.png', 'research', '2026-09-14'], ['엘리베이터_가속도_v1.pdf', 'draft', '2026-09-17'], ['발표자료.pptx', 'presentation', '2026-09-22']],
  38: [['교내_경사로_측정.xlsx', 'research', '2026-09-28'], ['경로도_스케치.jpg', 'plan', '2026-09-29'], ['휠체어경로_벡터분석_v1.pdf', 'draft', '2026-10-02']],
  39: [['주간_확진자_공공데이터.csv', 'research', '2026-10-02'], ['감염병_변화율_v1.pdf', 'draft', '2026-10-05']],
  41: [['과학칼럼_원문.pdf', 'research', '2026-10-01'], ['과학칼럼_논증분석_v1.docx', 'draft', '2026-10-04']],
  43: [['학급_출결_원자료.csv', 'research', '2026-09-15'], ['대시보드_화면캡처.png', 'final', '2026-09-22'], ['출결대시보드_v1.ipynb', 'draft', '2026-09-22']],
  44: [['GapYear_찬반기사.pdf', 'research', '2026-09-30'], ['GapYear_essay_v1.docx', 'draft', '2026-10-04']],
  45: [['구술면담_녹음정리.docx', 'research', '2026-10-01'], ['면담질문지.docx', 'plan', '2026-09-28']],
  46: [['통계청_1인가구_자료.xlsx', 'research', '2026-09-18'], ['인터뷰_정리.docx', 'research', '2026-09-20'], ['1인가구_조사_v1.pdf', 'draft', '2026-09-22'], ['1인가구_조사_v2.pdf', 'draft', '2026-09-29']],
  47: [['젖산_관련논문1.pdf', 'research', '2026-10-01'], ['젖산_관련논문2.pdf', 'research', '2026-10-02'], ['운동강도별_정리표.xlsx', 'research', '2026-10-04'], ['탐구계획서.docx', 'plan', '2026-09-28']],
  49: [['고전소설_원문발췌.pdf', 'research', '2026-10-02'], ['영웅서사_비교_v1.docx', 'draft', '2026-10-06']],
}

const pad = (n: number) => String(n).padStart(3, '0')

function adminEvidence(n: number): AdminTaskEvidence[] {
  const taskId = `fixture-admin-task-${pad(n)}`
  return (adminRows[n] ?? []).map(([fileName, stageTag, date, backing], index) => ({
    evidenceId: `fixture-admin-evidence-${pad(n)}-${index + 1}`,
    taskId,
    fileName,
    stageTag,
    createdAt: `${date}T21:00:00+09:00`,
    ...(backing ? { file: fileBackings[backing] } : {}),
  }))
}

/** taskId → 과정 자료. 없는 Key = 정보 없음(null). Admin 전용 Task는 자료가 없으면 빈 배열 */
export function evidenceFor(taskId: string): AdminTaskEvidence[] | null {
  if (taskId in choiHaeunEvidence) return choiHaeunEvidence[taskId]
  const match = /^fixture-admin-task-(\d{3})$/.exec(taskId)
  return match ? adminEvidence(Number(match[1])) : null
}

/** 성장활동 과정 자료 원본 (Activity id → 파일 이름 → 원본). 그 외 활동 자료는 파일 이름만 있다. */
export const activityFileBackings: Record<string, Record<string, FileBacking>> = {
  'fixture-admin-activity-007': { '가속도_측정값.csv': fileBackings.accelerationCsv, '그래프.png': fileBackings.accelerationPng },
}
