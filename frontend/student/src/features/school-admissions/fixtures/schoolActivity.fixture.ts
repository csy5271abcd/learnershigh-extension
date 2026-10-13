// UI 검증용 Growth Activity Fixture. 실제 /api/student/activities(목록 · 생성 · 수정 · 제출 · Evidence · Reflection ·
// 피드백 요청 · 피드백 · Archive) 대신 메모리 저장소를 쓴다.
// - Canonical Activity 하나를 목록 · Detail · Reflection · 피드백 · Archive가 함께 읽는다. 화면마다 다른 Activity 객체를 만들지 않는다.
// - Task와 다른 Entity다. Activity 과정 자료도 Task Evidence 저장소와 따로 둔다.
// - 로그인 학생(최하은)의 활동만 둔다. A01은 Activities-00 / ActivitiesDetail-01·02 Mockup의 기록 그대로이고,
//   A02~A12는 상태 · 유형별 화면 확인용 Canonical Seed다. (Archive 전용 데이터가 아니다 → Archive는 여기서 계산)
// - Seed 과정 자료는 파일 이름만 있고 원본 파일이 없다. (미리보기는 "원본 파일이 아직 준비되지 않아" 안내)
// - 상태 흐름: 작성 중 → 제출 → (피드백 대기 → 피드백 도착) → 보완 완료 → Archive 저장. 피드백 요청은 선택이다.
// - 실제 Backend가 아니다. 새로고침하면 Seed로 돌아간다.

import type {
  ActivityEvidence,
  ActivityRecordFields,
  ActivityReflection,
  ActivityStatus,
  ActivityTeacherFeedback,
  GrowthActivity,
  GrowthActivityDetail,
  GrowthActivityListItem,
} from '../model/activity.ts'
import { activityTypeLabel, reflectionAnsweredCount } from '../model/activity.ts'
import { semesterLabel } from '../model/period.ts'
import type { ArchiveItemView } from '../model/types.ts'
import { SCHOOL_SNAPSHOT_DATE } from './schoolTasks.fixture.ts'

type SeedInput = Omit<GrowthActivity, 'visibility' | 'reflection' | 'feedback'> & {
  reflection?: ActivityReflection
  feedback?: ActivityTeacherFeedback
  files: string[]
}

const seedActivities: SeedInput[] = [
  // A01: Activities-00 / ActivitiesDetail-01·02 Mockup의 최하은 기록 (내용 · id 그대로)
  {
    activityId: 'fixture-activity-biology-club',
    title: '생명과학 탐구동아리',
    type: 'club',
    organizer: '교내 생명과학 탐구동아리',
    startDate: '2026-09-12',
    endDate: '2026-09-26',
    role: '배지 촬영과 관찰 기록지 정리',
    participationReason: '',
    process: '',
    contribution: '손 씻기 전후 손가락을 배지에 찍어 3일 동안 세균 집락 수 변화를 조별로 관찰했어요.',
    result: '손 씻기 후 집락 수가 평균 70% 정도 줄어든 결과를 조별 결과표로 정리했어요.',
    followUp: '',
    tags: [],
    status: 'feedback-delivered',
    reflection: {
      participationReason: '수행평가에서 다룬 항생제 내성이 실제 세균에서 어떻게 보이는지 궁금했어요.',
      role: '배지 사진을 같은 각도로 찍고 집락 수를 세어 기록지에 정리했어요.',
      whatIDid: '손 씻기 전, 물로만 씻은 후, 비누로 씻은 후 세 조건으로 배지를 만들었어요.',
      difficulty: '집락이 겹쳐 있어 개수를 세는 기준이 사람마다 달랐어요.',
      learning: '관찰 기준을 먼저 정하지 않으면 같은 배지도 결과가 달라질 수 있다는 걸 알았어요.',
      nextChange: '집락을 세는 기준을 사진 예시로 먼저 정하고 시작하고 싶어요.',
      followUpActivity: '',
    },
    feedback: {
      author: '김현우',
      deliveredAt: '2026-10-02T17:10:00+09:00',
      strength: '조건을 세 가지로 나눠 비교한 점과 관찰 기준 문제를 스스로 발견한 점이 잘 드러나요.',
      needsDetail: '집락 수를 셀 때 조원끼리 어떤 기준으로 맞췄는지 한 문장 추가해보세요.',
      question: '같은 배지를 다른 사람이 세면 결과가 얼마나 달라질까요?',
      nextSuggestion: '다음 관찰에서는 기준 사진을 먼저 만들어 조원과 공유해볼 수 있어요.',
    },
    files: ['배지 사진 6장.zip', '관찰 기록지.pdf', '조별 결과표.xlsx'],
  },
  {
    activityId: 'fixture-activity-a02-lunch-waste',
    title: '교내 급식 잔반 데이터 분석 프로젝트',
    type: 'school-project',
    organizer: '학생자치회 환경부',
    startDate: '2026-10-01',
    endDate: '2026-10-25',
    role: '잔반량 기록 정리 및 데이터 시각화',
    participationReason: '급식 메뉴에 따라 남는 음식의 양이 달라지는 것 같아 실제 데이터를 확인해보고 싶었다.',
    process: '점심시간마다 메뉴와 잔반량을 기록하고 요일별 차이를 표로 정리하고 있다.',
    contribution: '기록 양식을 만들고 모인 값을 스프레드시트로 정리했다.',
    result: '',
    followUp: '',
    tags: ['급식', '환경', '데이터분석', '시각화'],
    status: 'draft',
    files: ['급식_잔반량_10월1주차.csv', '급식소_관찰메모.txt'],
  },
  {
    activityId: 'fixture-activity-a03-book-talk',
    title: '영어 원서 북토크 기획',
    type: 'club',
    organizer: '교내 영어독서동아리',
    startDate: '2026-10-08',
    endDate: '2026-11-05',
    role: '발표 도서 선정 및 질문 구성',
    participationReason: '책의 줄거리만 소개하는 발표보다 서로 다른 해석을 비교하는 북토크를 해보고 싶었다.',
    process: '후보 도서 세 권을 비교하고 토론 질문을 정리하고 있다.',
    contribution: '후보 도서 비교표를 만들고 첫 번째 토론 질문 초안을 작성했다.',
    result: '',
    followUp: '',
    tags: ['영어', '독서', '북토크', '토론'],
    status: 'draft',
    files: ['북토크_후보도서_목록.pdf'],
  },
  {
    activityId: 'fixture-activity-a04-data-viz',
    title: '교내 데이터 시각화 경진대회',
    type: 'school-competition',
    organizer: '교내 정보교과부',
    startDate: '2026-09-14',
    endDate: '2026-09-30',
    role: '데이터 정리 및 그래프 제작',
    participationReason: '통학 시간이 시간대별로 어떻게 달라지는지 데이터를 이용해 직접 보여주고 싶었다.',
    process: '2주 동안 등교 시간을 기록하고 평균과 편차를 비교했다.',
    contribution: '원자료를 정리하고 시간대별 막대그래프와 분포 그래프를 제작했다.',
    result: '교내 발표 자료 제출 완료',
    followUp: '다음에는 날씨와 지하철 지연 여부도 함께 기록해보고 싶다.',
    tags: ['정보', '데이터', '통학', '시각화'],
    status: 'submitted',
    files: ['통학시간_원자료.csv', '통학시간_시각화_v1.png'],
  },
  {
    activityId: 'fixture-activity-a05-library',
    title: '도서관 디지털 이용 안내 봉사',
    type: 'volunteer',
    organizer: '학교 도서관',
    startDate: '2026-09-05',
    endDate: '2026-09-26',
    role: '전자책 및 키오스크 이용 안내',
    participationReason: '전자책 검색이나 무인 대출기를 어려워하는 학생들이 있어 사용 방법을 정리해보고 싶었다.',
    process: '자주 묻는 질문을 기록하고 실제 화면 순서에 맞춰 안내 문구를 정리했다.',
    contribution: '전자책 검색과 무인 대출 절차를 한 장짜리 안내자료로 만들었다.',
    result: '점심시간 디지털 이용 안내 4회 참여',
    followUp: '질문이 많이 나온 기능을 중심으로 안내자료를 다시 정리해볼 예정이다.',
    tags: ['봉사', '도서관', '디지털', '안내'],
    status: 'submitted',
    files: ['전자책_이용안내_1페이지.pdf'],
  },
  {
    activityId: 'fixture-activity-a06-fine-dust',
    title: '학교 주변 미세먼지 센서 비교 탐구',
    type: 'self-study',
    organizer: '개인 자율 탐구',
    startDate: '2026-09-21',
    endDate: '2026-10-07',
    role: '측정 설계 및 데이터 기록',
    participationReason: '같은 시간에도 학교 정문과 운동장의 미세먼지 수치가 다른지 확인해보고 싶었다.',
    process: '등교 직후와 점심시간에 두 지점에서 센서 값을 반복 측정했다.',
    contribution: '측정 위치와 시간을 고정하고 수치를 표로 정리했다.',
    result: '두 위치의 평균값 차이를 확인하고 원인 후보를 정리함',
    followUp: '측정 횟수를 늘리고 풍속 자료와 함께 비교할 계획이다.',
    tags: ['환경', '미세먼지', '센서', '자율탐구'],
    status: 'feedback-waiting',
    files: ['미세먼지_센서기록.csv', '센서설치사진.jpg'],
  },
  {
    activityId: 'fixture-activity-a07-coding-volunteer',
    title: '지역 아동센터 코딩 보조 봉사',
    type: 'volunteer',
    organizer: '지역 아동센터',
    startDate: '2026-09-12',
    endDate: '2026-10-10',
    role: '블록 코딩 실습 보조',
    participationReason: '처음 코딩을 접하는 학생에게 어떤 설명 방식이 이해하기 쉬운지 직접 경험해보고 싶었다.',
    process: '조건문과 반복문 실습 중 막힌 학생의 화면을 확인하고 단계별 질문으로 해결을 도왔다.',
    contribution: '정답을 바로 알려주지 않고 학생이 직접 오류 위치를 찾도록 질문 순서를 정리했다.',
    result: '총 4회 실습 보조 참여',
    followUp: '초보자가 자주 실수하는 부분을 짧은 체크리스트로 정리해보고 싶다.',
    tags: ['봉사', '코딩', '교육', '블록코딩'],
    status: 'feedback-waiting',
    files: ['코딩활동_진행메모.txt'],
  },
  {
    activityId: 'fixture-activity-a08-science-idea',
    title: '지역 청소년 과학 아이디어 발표대회',
    type: 'external-competition',
    organizer: '지역 청소년과학문화센터',
    startDate: '2026-08-18',
    endDate: '2026-09-20',
    role: '센서 활용 아이디어 조사 및 발표자료 구성',
    participationReason: '센서를 이용해 교실 환경을 직접 측정하고 개선 방법까지 연결해보고 싶었다.',
    process: '온도와 이산화탄소 측정 방식을 조사하고 센서 설치 위치를 비교했다.',
    contribution: '센서 구성도를 만들고 발표에서 데이터 수집 방법을 설명했다.',
    result: '본선 발표 참가',
    followUp: '실제 교실에서 일주일 이상 데이터를 모아 시간대별 변화를 확인해보고 싶다.',
    tags: ['과학', '센서', '발표', '교외대회'],
    status: 'feedback-delivered',
    reflection: {
      participationReason: '단순 아이디어 제안이 아니라 실제 측정이 가능한 방법을 고민해보고 싶어서 참여했다.',
      role: '센서 조사와 발표자료 구성을 맡았다.',
      whatIDid: '센서별 측정 범위와 설치 위치를 조사하고 비교표와 구성도를 만들었다.',
      difficulty: '측정값이 달라질 수 있는 조건을 어느 범위까지 설명해야 할지 결정하기 어려웠다.',
      learning: '결과보다 측정 조건을 명확하게 기록하는 것이 중요하다는 점을 배웠다.',
      nextChange: '다음에는 발표 전에 실제 측정 데이터를 조금이라도 확보하고 싶다.',
      followUpActivity: '교실 환경 센서 데이터를 일주일간 기록해볼 계획이다.',
    },
    feedback: {
      author: '이서진',
      deliveredAt: '2026-09-28T16:30:00+09:00',
      strength: '측정 방법과 설치 위치를 실제 조건과 연결해서 설명한 점이 구체적이에요.',
      needsDetail: '센서를 선택한 기준과 다른 센서를 제외한 이유를 한두 문장 더 적어보세요.',
      question: '실제 교실에서 측정한다면 결과에 영향을 줄 수 있는 조건은 무엇이 있을까요?',
      nextSuggestion: '후속 활동에서 시간대별 값을 기록하면 발표 아이디어를 실제 탐구로 확장할 수 있어요.',
    },
    files: ['과학아이디어_발표자료.pdf', '센서구성도.png'],
  },
  {
    activityId: 'fixture-activity-a09-festival-booth',
    title: '학교 축제 분리배출 안내 부스 운영',
    type: 'school-project',
    organizer: '학교 축제 환경 캠페인팀',
    startDate: '2026-09-16',
    endDate: '2026-09-18',
    role: '분리배출 안내판 제작 및 현장 안내',
    participationReason: '축제 때 음료 용기와 일반 쓰레기가 섞여 버려지는 경우가 많아 안내 방법을 직접 개선해보고 싶었다.',
    process: '쓰레기 종류를 조사해 안내 문구를 줄이고 실제 배출 위치에 맞춰 표지판을 배치했다.',
    contribution: '안내판 디자인과 부스 현장 설명을 맡았다.',
    result: '축제 기간 동안 분리배출 안내 부스 운영 완료',
    followUp: '다음 행사에서는 가장 많이 헷갈린 쓰레기 종류를 먼저 조사해 안내판에 반영하고 싶다.',
    tags: ['환경', '축제', '캠페인', '디자인'],
    status: 'reflected',
    reflection: {
      participationReason: '행사장에서 안내문이 많아도 사람들이 읽지 않는 경우가 있어 더 단순한 안내 방식을 만들어보고 싶었다.',
      role: '안내판 제작과 부스 설명을 맡았다.',
      whatIDid: '버려지는 쓰레기 유형을 확인하고 안내판 문구와 배치 위치를 수정했다.',
      difficulty: '정보를 많이 넣으면 정확하지만 한눈에 보기 어려워지는 문제가 있었다.',
      learning: '내용을 줄이더라도 사용자가 행동해야 할 순간에 필요한 정보가 먼저 보여야 한다는 점을 배웠다.',
      nextChange: '다음에는 행사 전에 몇 명에게 안내판을 보여주고 이해되는지 먼저 확인하고 싶다.',
      followUpActivity: '학교 행사 안내물의 가독성을 비교하는 작은 디자인 실험을 해보고 싶다.',
    },
    files: ['분리배출_안내포스터.png', '부스운영_기록.pdf'],
  },
  {
    activityId: 'fixture-activity-a10-caffeine-log',
    title: '카페인 섭취 시간과 집중도 자율 기록',
    type: 'self-study',
    organizer: '개인 자율 탐구',
    startDate: '2026-09-22',
    endDate: '2026-10-05',
    role: '기록 설계 및 결과 정리',
    participationReason: '시험 기간에 커피를 마시는 시간이 공부 집중도와 관련이 있는지 궁금했다.',
    process: '섭취 시간, 공부 시작 시간, 집중한 시간을 매일 같은 형식으로 기록했다.',
    contribution: '기록 기준을 직접 정하고 날짜별 데이터를 표로 정리했다.',
    result: '늦은 시간 섭취일에 취침 시간이 늦어지는 경향을 관찰함',
    followUp: '카페인 외에 수면 시간과 운동 여부도 같이 기록해보고 싶다.',
    tags: ['자율탐구', '생활데이터', '집중', '기록'],
    status: 'reflected',
    reflection: {
      participationReason: '평소 습관을 감으로 판단하지 않고 기록으로 확인해보고 싶었다.',
      role: '개인 탐구라 기록 기준 설정부터 정리까지 직접 수행했다.',
      whatIDid: '매일 같은 항목을 기록하고 일주일 단위로 패턴을 비교했다.',
      difficulty: '집중도를 숫자로 표현하는 기준이 매일 달라지지 않게 정하는 것이 어려웠다.',
      learning: '개인 기록도 기준을 일정하게 유지해야 비교할 의미가 생긴다는 점을 알게 됐다.',
      nextChange: '다음에는 집중도 기준을 미리 더 구체적으로 정의하고 싶다.',
      followUpActivity: '수면 시간과 집중도 기록을 추가해 비교해볼 예정이다.',
    },
    files: ['집중도_자기기록.csv', '탐구_정리노트.txt'],
  },
  {
    activityId: 'fixture-activity-a11-bioinformatics',
    title: '바이오인포매틱스 전공 체험',
    type: 'career',
    organizer: '대학 연계 진로체험 프로그램',
    startDate: '2026-07-22',
    endDate: '2026-07-22',
    role: '염기서열 비교 실습 참여',
    participationReason: '생명과학과 소프트웨어가 실제 연구에서 어떻게 함께 사용되는지 궁금했다.',
    process: '짧은 염기서열 데이터를 비교하고 차이가 있는 위치를 찾는 실습을 했다.',
    contribution: '실습 결과를 표로 정리하고 조별로 차이가 의미하는 점을 발표했다.',
    result: '염기서열 비교 실습 및 조별 발표 완료',
    followUp: 'Python으로 간단한 문자열 비교 프로그램을 직접 만들어보고 싶다.',
    tags: ['진로', '생명과학', '소프트웨어', '바이오인포매틱스'],
    status: 'archived',
    reflection: {
      participationReason: '소프트웨어가 생명과학 연구에서 실제로 어떻게 쓰이는지 직접 보고 싶었다.',
      role: '염기서열 비교 실습과 결과 정리를 맡았다.',
      whatIDid: '두 서열을 비교해 다른 위치를 표시하고 결과를 조별 표로 정리했다.',
      difficulty: '문자가 다른 위치를 찾는 것과 그 차이가 생물학적으로 어떤 의미인지 해석하는 것은 전혀 다른 문제라는 점이 어려웠다.',
      learning: '데이터 처리 기술과 생명과학 지식이 함께 있어야 분석 결과를 제대로 해석할 수 있다는 점을 배웠다.',
      nextChange: '다음에는 분석 도구가 어떤 알고리즘으로 서열을 비교하는지 미리 공부해보고 싶다.',
      followUpActivity: 'Python 문자열 비교로 간단한 서열 차이 찾기 프로그램을 작성해볼 예정이다.',
    },
    files: ['염기서열_실습결과.txt', '전공체험_활동지.pdf'],
  },
  {
    activityId: 'fixture-activity-a12-broadcast',
    title: '교내 방송 행사 운영 기록',
    type: 'etc',
    organizer: '교내 방송 지원팀',
    startDate: '2026-05-20',
    endDate: '2026-05-22',
    role: '행사 순서표 확인 및 방송 장비 체크',
    participationReason: '학교 행사 진행 과정에서 방송팀이 어떤 준비를 하는지 경험해보고 싶었다.',
    process: '행사 순서에 맞춰 마이크와 음원 재생 시점을 확인하고 장비 체크리스트를 작성했다.',
    contribution: '행사 전 장비 점검표를 정리하고 리허설 중 수정된 순서를 다시 반영했다.',
    result: '교내 발표 행사 방송 운영 지원 완료',
    followUp: '다음에는 방송 장비별 기본 설정 방법을 미리 정리해보고 싶다.',
    tags: ['행사', '방송', '운영', '기록'],
    status: 'archived',
    reflection: {
      participationReason: '무대 뒤에서 행사가 어떻게 준비되는지 직접 경험해보고 싶었다.',
      role: '순서표 확인과 장비 점검을 맡았다.',
      whatIDid: '리허설 전에 장비를 확인하고 실제 행사 순서가 바뀔 때 큐시트를 수정했다.',
      difficulty: '현장에서 순서가 바뀌었을 때 여러 사람에게 같은 변경 내용을 빠르게 전달하는 것이 어려웠다.',
      learning: '행사 운영에서는 장비 자체보다 변경된 정보를 팀 전체가 같은 상태로 공유하는 것이 중요하다는 점을 배웠다.',
      nextChange: '다음에는 변경사항을 표시하는 규칙을 미리 정해두고 싶다.',
      followUpActivity: '간단한 행사 운영 체크리스트를 다시 만들어볼 계획이다.',
    },
    feedback: {
      author: '박지훈',
      deliveredAt: '2026-05-28T15:00:00+09:00',
      strength: '현장에서 순서 변경을 처리한 과정이 구체적으로 기록되어 있어요.',
      needsDetail: '변경 내용을 누구와 어떤 방식으로 공유했는지 한 가지 사례를 더 적어보세요.',
      question: '여러 명이 동시에 같은 변경사항을 확인하려면 어떤 기록 방식이 효과적일까요?',
      nextSuggestion: '다음 행사에서는 수정 이력을 남길 수 있는 공용 체크리스트 방식을 시험해보세요.',
    },
    files: ['행사_큐시트.docx', '방송장비_체크리스트.xlsx'],
  },
]

const activities: GrowthActivity[] = []
const evidence = new Map<string, ActivityEvidence[]>()
for (const { files, reflection, feedback, ...fields } of seedActivities) {
  activities.push({ ...fields, visibility: 'PRIVATE', reflection: reflection ?? null, feedback: feedback ?? null })
  evidence.set(
    fields.activityId,
    files.map((fileName, index) => {
      const evidenceId = `${fields.activityId}-file-${index + 1}`
      return { evidenceId, activityId: fields.activityId, fileName, fileRef: `fixture-seed:${evidenceId}`, createdAt: `${fields.endDate || fields.startDate}T18:00:00+09:00` }
    }),
  )
}

let revision = 0
let createdCount = 0
let addedEvidenceCount = 0

/** 저장소가 바뀔 때마다 증가한다. 목록 / Detail / Archive Loader가 이 값으로 다시 읽는다. */
export const activityStoreRevision = () => revision

const findActivity = (activityId: string) => activities.find((item) => item.activityId === activityId)

/** 다른 School 읽기 모델(Interview 관련 활동)이 같은 Canonical Activity를 참조할 때 쓴다. (복사본을 만들지 않는다) */
export const findGrowthActivity = (activityId: string): GrowthActivity | null => findActivity(activityId) ?? null

// ---------- 목록 / Detail Loader ----------

export type SchoolActivityLoadScenario = 'success' | 'loading' | 'error' | 'empty'
const loadScenarios: SchoolActivityLoadScenario[] = ['success', 'loading', 'error', 'empty']

export function readSchoolActivityLoadScenario(search: string): SchoolActivityLoadScenario {
  const value = new URLSearchParams(search).get('fixture')
  return loadScenarios.find((scenario) => scenario === value) ?? 'success'
}

export type SchoolActivityListLoader = () => Promise<GrowthActivityListItem[]>
export type SchoolActivityDetailLoader = (activityId: string) => Promise<GrowthActivityDetail | null>

const listLoaders = new Map<string, SchoolActivityListLoader>()
const detailLoaders = new Map<string, SchoolActivityDetailLoader>()

/** 로그인 학생(최하은)의 활동 전체. 검색 / 유형 Filter는 화면이 이 목록에 적용한다. (GET /api/student/activities 한 번) */
export function createSchoolActivityListLoader(scenario: SchoolActivityLoadScenario): SchoolActivityListLoader {
  const key = `${scenario}|${revision}`
  let loader = listLoaders.get(key)
  if (!loader) {
    loader = () => {
      switch (scenario) {
        case 'loading':
          return new Promise<GrowthActivityListItem[]>(() => {})
        case 'error':
          return Promise.reject(new Error('School activity list fixture error'))
        case 'empty':
          return Promise.resolve([])
        case 'success':
          // 최근에 시작한 활동이 먼저 (같으면 등록 순서 역순)
          return Promise.resolve(
            activities
              .map((activity, index) => ({ activity, index }))
              .sort((a, b) => b.activity.startDate.localeCompare(a.activity.startDate) || b.index - a.index)
              .map(({ activity }) => ({ activity, evidenceCount: evidence.get(activity.activityId)?.length ?? 0 })),
          )
      }
    }
    listLoaders.set(key, loader)
  }
  return loader
}

export function createSchoolActivityDetailLoader(scenario: SchoolActivityLoadScenario): SchoolActivityDetailLoader {
  const key = `${scenario}|${revision}`
  let loader = detailLoaders.get(key)
  if (!loader) {
    loader = (activityId) => {
      switch (scenario) {
        case 'loading':
          return new Promise<GrowthActivityDetail | null>(() => {})
        case 'error':
          return Promise.reject(new Error('School activity detail fixture error'))
        case 'empty':
        case 'success': {
          const activity = findActivity(activityId)
          return Promise.resolve(activity ? { activity, evidence: evidence.get(activityId) ?? [] } : null)
        }
      }
    }
    detailLoaders.set(key, loader)
  }
  return loader
}

// ---------- 생성 / 수정 / 제출 / 과정 자료 / Reflection / 피드백 요청 / Archive Service ----------

const actionScenarios = [
  'success',
  'activity-create-fail-once',
  'activity-save-fail-once',
  'activity-submit-fail-once',
  'activity-evidence-add-fail-once',
  'activity-evidence-delete-fail-once',
  'activity-reflection-fail-once',
  'activity-feedback-request-fail-once',
  'activity-archive-fail-once',
] as const
export type SchoolActivityActionScenario = (typeof actionScenarios)[number]

export function readSchoolActivityActionScenario(search: string): SchoolActivityActionScenario {
  const value = new URLSearchParams(search).get('fixture')
  return actionScenarios.find((scenario) => scenario === value) ?? 'success'
}

export interface SchoolActivityService {
  create: (fields: ActivityRecordFields) => Promise<GrowthActivity>
  update: (activityId: string, fields: ActivityRecordFields) => Promise<void>
  submit: (activityId: string) => Promise<void>
  addEvidence: (activityId: string, file: File) => Promise<ActivityEvidence>
  removeEvidence: (activityId: string, evidenceId: string) => Promise<void>
  /** 학생 원문 그대로 저장. 제출 / 피드백 도착 상태면 보완 완료로, 피드백 대기 중이면 그대로 둔다. */
  saveReflection: (activityId: string, reflection: ActivityReflection) => Promise<void>
  /** 선택: 제출 → 피드백 대기 (공용 Activity Feedback Queue) */
  requestFeedback: (activityId: string) => Promise<void>
  /** 보완 완료 → Archive 저장 */
  archive: (activityId: string) => Promise<void>
}

const services = new Map<SchoolActivityActionScenario, SchoolActivityService>()

/** 응답 지연을 흉내 내 중복 클릭을 확인할 수 있게 한다. 실패 시나리오는 그 동작의 첫 요청만 실패한다. */
function respond<T>(fail: boolean, run: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (fail) {
        reject(new Error('School activity fixture error'))
        return
      }
      try {
        const value = run()
        revision += 1
        resolve(value)
      } catch (error) {
        reject(error)
      }
    }, 250)
  })
}

const requireActivity = (activityId: string) => {
  const activity = findActivity(activityId)
  if (!activity) throw new Error('ACTIVITY_NOT_FOUND')
  return activity
}

const requireStatus = (activity: GrowthActivity, allowed: ActivityStatus[]) => {
  if (!allowed.includes(activity.status)) throw new Error('ACTIVITY_STATE_NOT_ALLOWED')
}

export function createSchoolActivityService(scenario: SchoolActivityActionScenario): SchoolActivityService {
  let service = services.get(scenario)
  if (!service) {
    const attempts: Record<string, number> = {}
    const firstFails = (name: SchoolActivityActionScenario) => {
      attempts[name] = (attempts[name] ?? 0) + 1
      return scenario === name && attempts[name] === 1
    }
    const editable = (activityId: string) => {
      const activity = requireActivity(activityId)
      requireStatus(activity, ['draft'])
      return activity
    }
    service = {
      create: (fields) =>
        respond(firstFails('activity-create-fail-once'), () => {
          createdCount += 1
          const activity: GrowthActivity = {
            ...fields,
            activityId: `fixture-activity-${String(createdCount).padStart(3, '0')}`,
            // 처음 기록은 늘 작성 중(Draft)
            status: 'draft',
            visibility: 'PRIVATE',
            reflection: null,
            feedback: null,
          }
          activities.push(activity)
          evidence.set(activity.activityId, [])
          return activity
        }),
      update: (activityId, fields) =>
        respond(firstFails('activity-save-fail-once'), () => {
          Object.assign(editable(activityId), fields)
        }),
      submit: (activityId) =>
        respond(firstFails('activity-submit-fail-once'), () => {
          const activity = requireActivity(activityId)
          // 이미 제출했으면 그대로 둔다. (한 번만 바뀐다) 피드백 요청은 선택이라 자동으로 피드백 대기로 바꾸지 않는다.
          if (activity.status === 'draft') activity.status = 'submitted'
        }),
      addEvidence: (activityId, file) =>
        respond(firstFails('activity-evidence-add-fail-once'), () => {
          editable(activityId)
          addedEvidenceCount += 1
          const evidenceId = `fixture-activity-evidence-${String(addedEvidenceCount).padStart(3, '0')}`
          const item: ActivityEvidence = {
            evidenceId,
            activityId,
            fileName: file.name,
            fileRef: `fixture-local:${evidenceId}`,
            createdAt: `${SCHOOL_SNAPSHOT_DATE}T11:00:00+09:00`,
            mimeType: file.type,
            sizeBytes: file.size,
            file,
          }
          evidence.set(activityId, [...(evidence.get(activityId) ?? []), item])
          return item
        }),
      removeEvidence: (activityId, evidenceId) =>
        respond(firstFails('activity-evidence-delete-fail-once'), () => {
          editable(activityId)
          evidence.set(
            activityId,
            (evidence.get(activityId) ?? []).filter((item) => item.evidenceId !== evidenceId),
          )
        }),
      saveReflection: (activityId, reflection) =>
        respond(firstFails('activity-reflection-fail-once'), () => {
          const activity = requireActivity(activityId)
          requireStatus(activity, ['submitted', 'feedback-waiting', 'feedback-delivered'])
          if (reflectionAnsweredCount({ reflection }) === 0) throw new Error('REFLECTION_EMPTY')
          // 학생 원문 그대로 (고치거나 요약하지 않는다)
          activity.reflection = { ...reflection }
          // 피드백 대기 중에는 그대로 둔다. (피드백이 오기 전에는 보완 완료가 아니다)
          if (activity.status === 'submitted' || activity.status === 'feedback-delivered') activity.status = 'reflected'
        }),
      requestFeedback: (activityId) =>
        respond(firstFails('activity-feedback-request-fail-once'), () => {
          const activity = requireActivity(activityId)
          // 제출 상태에서만 (중복 요청 없음)
          if (activity.status === 'submitted') activity.status = 'feedback-waiting'
          else if (activity.status !== 'feedback-waiting') throw new Error('ACTIVITY_STATE_NOT_ALLOWED')
        }),
      archive: (activityId) =>
        respond(firstFails('activity-archive-fail-once'), () => {
          const activity = requireActivity(activityId)
          // 이미 저장했으면 그대로 둔다. (Archive 항목은 하나)
          if (activity.status === 'reflected') activity.status = 'archived'
          else if (activity.status !== 'archived') throw new Error('ACTIVITY_STATE_NOT_ALLOWED')
        }),
    }
    services.set(scenario, service)
  }
  return service
}

// ---------- 개발용: 선생님 활동 피드백 전달 재현 (Admin 결과, Student 화면 버튼 없음) ----------

export function readActivityFeedbackFixture(search: string): boolean {
  return new URLSearchParams(search).get('fixtureActivityFeedback') === 'delivered'
}

/**
 * 피드백 대기 중인 활동에 선생님 피드백이 전달된 상태를 만든다. (공용 Queue에서 검토한 결과를 흉내 낸다)
 * 표시용 가상 문장이며, 작성자는 특정 담당자 배정을 뜻하지 않는다. 바꿨으면 true.
 */
export function applyActivityFeedbackFixture(activityId: string): boolean {
  const activity = findActivity(activityId)
  if (!activity || activity.status !== 'feedback-waiting') return false
  activity.feedback = {
    author: '학원 선생님',
    deliveredAt: `${SCHOOL_SNAPSHOT_DATE}T16:00:00+09:00`,
    strength: '활동 과정을 순서대로 기록해 무엇을 했는지 잘 드러나요.',
    needsDetail: '내가 직접 결정한 부분이 무엇이었는지 한 가지 예를 더 적어보세요.',
    question: '같은 활동을 다시 한다면 무엇부터 바꾸고 싶나요?',
    nextSuggestion: '이번 기록을 바탕으로 이어서 해볼 작은 후속 활동을 정해보세요.',
  }
  activity.status = 'feedback-delivered'
  revision += 1
  return true
}

// ---------- Archive Projection (source = growth) ----------

/**
 * Archive 저장(archived)한 활동만 Archive 항목으로 계산한다. 별도 Archive 데이터를 두지 않는다.
 * reflectionSummary는 학생이 쓴 "배운 점" 원문 그대로 (AI 요약 없음). result는 학생이 쓴 결과 그대로 (비면 빈 값).
 */
export function growthArchiveEntries(): { item: ArchiveItemView; sortDate: string }[] {
  return activities
    .filter((activity) => activity.status === 'archived')
    .map((activity) => ({
      sortDate: activity.endDate || activity.startDate,
      item: {
        source: 'growth',
        sourceId: activity.activityId,
        title: activity.title,
        periodLabel: semesterLabel(activity.startDate),
        category: activityTypeLabel(activity.type),
        result: activity.result,
        reflectionSummary: activity.reflection?.learning.trim() || null,
        evidenceCount: evidence.get(activity.activityId)?.length ?? 0,
      },
    }))
}
