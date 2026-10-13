// UI 검증용 Mentor Activity Case Fixture다. 실제 Mentor의 수행평가 / 활동 자료가 아니다. (모든 인물 / 내용 가상)
// - Case 제목 / Mentor / 과목 · 영역 / 주요 활동 · 결과물은 기준 Source(UI Renewal / Expansion 통합본 5-6 Activity Case Pool)를 쓴다.
// - 항생제 Case의 단계 / 문장은 ActivityCase-01 ~ 08 Mockup 문구를 쓴다. 나머지 Case의 단계 설명 / 당시 학년 / Reflection은 가상이다.
// - 단계는 활동 성격에 맞게 Case마다 다르다. Feedback / Revision은 실제로 있었던 Case(항생제)에만 둔다. (Source 6-3)
// - 학교명 / 교사 / 학번 / 반 · 번호 / 제3자 실명을 넣지 않는다.
// - 과정 자료 / 결과물은 role과 관계없이 original이 있으면 다운로드, preview가 있으면 미리보기가 된다.
//   지금은 항생제 Case의 과정 자료 4개 + 최종본 1개가 둘 다 있다. 미리보기 내용은 같은 자료의 원본 파일 내용과 같다.
//   original은 실제 Mentor 제출 파일이 아니라 개발 검증용 Sample 원본(development fixture)이다.
// - Published + 검수 완료된 Case만 있다고 가정한다. 검수 상태 값은 두지 않는다. (OD-05)

import antibioticPosterFinalUrl from '../../../../assets/activity-case/antibiotic-natural-selection/antibiotic-poster-final.sample.pptx?url'
import antibioticPosterV1Url from '../../../../assets/activity-case/antibiotic-natural-selection/antibiotic-poster-v1.sample.hwp?url'
import antibioticPosterV2Url from '../../../../assets/activity-case/antibiotic-natural-selection/antibiotic-poster-v2.sample.hwp?url'
import antibioticResearchUrl from '../../../../assets/activity-case/antibiotic-natural-selection/antibiotic-research.sample.xlsx?url'
import antibioticV1FeedbackUrl from '../../../../assets/activity-case/antibiotic-natural-selection/antibiotic-v1-feedback.sample.pdf?url'
import type {
  CaseMaterial,
  CaseStage,
  MentorActivityCase,
  MentorContentSummary,
  MentorSummary,
  MixedContentItem,
} from '../model/types.ts'
import {
  fixtureMentorContent as content,
  fixtureMentors as mentors,
  fixturePlanSummaries,
  fixtureRecordSummaries,
  fixtureRoutineSummaries,
  fixtureStorySummaries,
} from './mentors.fixture.ts'

const stage = (
  stageId: string,
  title: string,
  summary: string,
  description: string,
  checklist: string[] = [],
  extra: Pick<CaseStage, 'planChange' | 'feedback'> = {},
): CaseStage => ({ stageId, title, summary, description, checklist, ...extra })

const material = (
  materialId: string,
  role: CaseMaterial['role'],
  title: string,
  format: string,
  description: string,
  stageId: string,
  file: Pick<CaseMaterial, 'fileName' | 'preview' | 'original'> = {},
): CaseMaterial => ({ materialId, role, title, format, description, stageId, ...file })

/** 개발 검증용 Sample 원본 안내 (원본 파일과 미리보기에 같은 문장이 들어 있다) */
const sampleNote = '개발 검증용 Sample 원본 (development fixture) · 실제 Mentor 제출 파일이 아닙니다.'

/** 원본 파일 MIME (original이 있는 형식만) */
const mime = {
  pdf: 'application/pdf',
  hwp: 'application/x-hwp',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

/** 관련 콘텐츠: [Content, 작성 Mentor]. 요약은 Canonical 요약을 쓴다. (Case 요약은 아래에서 채운다) */
type RelatedSource = [MentorContentSummary, MentorSummary]

type CaseSource = Omit<MentorActivityCase, 'contentId' | 'kind' | 'title' | 'relatedContent'> & {
  content: MentorContentSummary
  related: RelatedSource[]
}

// Pool 순서 (Source 5-6 A → D)
const caseSources: CaseSource[] = [
  {
    content: content.deliveryAdCase,
    mentor: mentors.leeChaerin,
    grade: 2,
    subject: '국어',
    activityType: '매체 분석 발표',
    summary: '광고 영상 분석 · 표현 분류 · A4 분석지 2쪽 · 4분 발표 과정을 정리한 Activity Case예요.',
    activities: ['광고 영상 분석', '과장·반복·감정 호소 표현 분류', 'A4 분석지 2쪽', '4분 발표'],
    stages: [
      stage('guide', '활동 안내', '국어 매체 단원 수행평가', '광고 한 편을 골라 언어적 설득 전략을 분석하고 4분 동안 발표하는 국어 수행평가였어요.', [
        '분석할 광고 1편 선정',
        'A4 분석지 2쪽',
        '4분 발표',
      ]),
      stage('topic', '광고 선정', '배달앱 광고 1편', '자주 보던 배달앱 광고 3편을 비교한 뒤, 표현이 가장 다양하게 쓰인 한 편을 골랐어요.', [], {
        planChange: { before: '광고 전반의 설득 전략', after: '배달앱 광고 1편의 언어 표현' },
      }),
      stage('classify', '표현 분류', '과장 · 반복 · 감정 호소', '광고 문구를 받아 적고 과장, 반복, 감정 호소 표현으로 나눠 표로 정리했어요. 두 유형에 걸치는 문장은 이유를 메모로 남겼어요.', [
        '광고 문구 받아 적기',
        '표현 유형 3가지로 분류',
        '애매한 문장은 근거 메모',
      ]),
      stage('write', '분석지 작성', 'A4 분석지 2쪽', '분류 결과를 바탕으로 각 표현이 보는 사람의 판단에 어떤 영향을 주는지 분석지 2쪽에 정리했어요.'),
      stage('present', '발표', '4분 발표', '분석지 순서대로 광고 문구를 보여주며 4분 동안 발표했어요.', ['문구 중심 발표 자료', '4분 시간 맞추기']),
    ],
    materials: [
      material('classify-table', 'evidence', '광고 문구 분류표', 'XLSX', '과장 · 반복 · 감정 호소 표현 분류', 'classify'),
      material('analysis-sheet', 'final', '배달앱 광고 분석지', 'HWP', 'A4 2쪽 분석지', 'write'),
      material('slides', 'final', '발표 자료', 'PPTX', '4분 발표에 쓴 자료', 'present'),
    ],
    reflection: '같은 문장도 어떤 장면과 함께 나오느냐에 따라 설득 방식이 달라진다는 걸 알게 됐어요.',
    followUp: '독서토론 동아리에서 광고와 뉴스의 설득 방식을 비교하는 토론으로 이어갔어요.',
    related: [
      [content.readingClubRecord, mentors.leeChaerin],
      [content.performancePlan, mentors.leeChaerin],
      [content.thumbnailCase, mentors.yoonHaram],
    ],
    saveCount: 372,
  },
  {
    content: content.thumbnailCase,
    mentor: mentors.yoonHaram,
    grade: 2,
    subject: '언어와 매체',
    activityType: '매체 분석 보고서',
    summary: '뉴스 영상 12개 비교 · 제목·썸네일 표현 분류 · 분석표 · 보고서 과정을 정리한 Activity Case예요.',
    activities: ['뉴스 영상 12개 비교', '제목·썸네일 표현 분류', '분석표', '보고서'],
    stages: [
      stage('guide', '활동 안내', '언어와 매체 탐구 보고서', '매체 언어의 특징을 하나 골라 자료를 비교하고 보고서로 쓰는 과제였어요.'),
      stage('collect', '자료 수집', '뉴스 영상 12개', '같은 사건을 다룬 유튜브 뉴스 영상 12개를 모아 제목과 썸네일 문구를 기록했어요.', [
        '같은 사건을 다룬 영상 12개',
        '제목 · 썸네일 문구 기록',
        '채널 이름은 분석에서 빼기',
      ]),
      stage('classify', '표현 분류', '분석표 작성', '의문형, 강조 부호, 감정어, 숫자 강조 네 가지 기준으로 표현을 나눠 분석표를 만들었어요.'),
      stage('report', '보고서 작성', '분석 보고서', '같은 사건이라도 표현에 따라 시청자가 받는 인상이 달라질 수 있다는 점을 분류 결과와 함께 보고서로 정리했어요.'),
    ],
    materials: [
      material('video-list', 'evidence', '뉴스 영상 목록', 'XLSX', '영상 12개의 제목 · 썸네일 문구', 'collect'),
      material('analysis-table', 'evidence', '썸네일 표현 분석표', 'XLSX', '표현 기준 4가지로 분류', 'classify'),
      material('report', 'final', '뉴스 썸네일 표현 분석 보고서', 'PDF', '분석 보고서', 'report'),
    ],
    reflection: '분류 기준을 먼저 정해두니 영상이 늘어나도 비교가 흔들리지 않았어요.',
    related: [
      [content.nonliteraturePlan, mentors.yoonHaram],
      [content.deliveryAdCase, mentors.leeChaerin],
    ],
    saveCount: 351,
  },
  {
    content: content.speechCase,
    mentor: mentors.ohJunseok,
    grade: 1,
    subject: '영어',
    activityType: '영어 Speech',
    summary: '기사 조사 · 영어 원고 · 시각자료 1장 · 발표시간 조정 · 3분 Speech 과정을 정리한 Activity Case예요.',
    activities: ['기사 조사', '영어 원고', '시각자료 1장', '발표시간 조정', '3분 Speech'],
    stages: [
      stage('guide', '활동 안내', '3분 영어 Speech', '사회 이슈 하나를 골라 3분 동안 영어로 의견을 말하는 수행평가였어요.', ['3분 내외', '시각자료 1장', '원고 제출']),
      stage('research', '기사 조사', '청소년 스마트폰 사용', '청소년 스마트폰 사용 시간에 관한 영어 기사 두 편을 읽고 근거로 쓸 문장을 골랐어요.'),
      stage('script', '원고 작성', '영어 원고', '주장 → 근거 → 제안 순서로 영어 원고를 썼어요.'),
      stage('timing', '시간 조정', '3분에 맞추기', '처음 연습에서 3분을 훌쩍 넘겨 근거 하나를 빼고 문장을 짧게 바꿨어요.', [], {
        planChange: { before: '근거 3개 · 약 4분', after: '근거 2개 · 3분' },
      }),
      stage('speech', '발표', '3분 Speech', '시각자료 한 장을 띄우고 원고를 보지 않고 3분 동안 발표했어요.'),
    ],
    materials: [
      material('script', 'draft', '영어 Speech 원고', 'DOCX', '주장 · 근거 · 제안 순서 원고', 'script'),
      material('final-script', 'final', '영어 Speech 최종 원고', 'DOCX', '3분에 맞춘 원고', 'timing'),
      material('visual', 'final', '시각자료 1장', 'PPTX', '발표 중 띄운 자료', 'speech'),
    ],
    reflection: '시간을 맞추려고 줄인 문장이 오히려 더 잘 들렸어요.',
    related: [
      [content.englishPlan, mentors.ohJunseok],
      [content.tourGuideCase, mentors.choiEunchae],
    ],
    saveCount: 396,
  },
  {
    content: content.tourGuideCase,
    mentor: mentors.choiEunchae,
    grade: 2,
    subject: '영어',
    activityType: '개선 프로젝트',
    summary: '안내판 조사 · 한·영 문구 비교 · 표현 수정 · Before/After · 영어 발표 과정을 정리한 Activity Case예요.',
    activities: ['실제 안내판 조사', '한·영 문구 비교', '표현 수정', 'Before/After', '영어 발표'],
    stages: [
      stage('guide', '활동 안내', '영어 실생활 프로젝트', '생활 속 영어 표현을 조사하고 더 나은 표현을 제안하는 영어 프로젝트였어요.'),
      stage('survey', '안내판 조사', '관광지 두 곳', '우리 지역 관광지 두 곳의 영어 안내판 문구를 직접 보고 기록했어요.', ['영어 문구 기록', '한국어 원문 함께 기록']),
      stage('compare', '한·영 비교', '직역 표현 찾기', '한국어 원문과 영어 문구를 나란히 놓고, 직역 때문에 방문자에게 필요한 정보가 빠진 부분을 찾았어요.'),
      stage('revise', '표현 수정', 'Before / After', '안내문의 목적과 읽는 사람을 기준으로 문구를 고치고 Before / After 표로 정리했어요.'),
      stage('present', '영어 발표', '개선안 발표', '문구를 왜 그렇게 고쳤는지 영어로 발표했어요.'),
    ],
    materials: [
      material('survey-sheet', 'evidence', '안내판 문구 기록표', 'XLSX', '관광지 두 곳의 한 · 영 문구', 'survey'),
      material('before-after', 'final', 'Before / After 비교표', 'PDF', '수정 전후 문구', 'revise'),
      material('slides', 'final', '영어 발표 자료', 'PPTX', '개선안 발표', 'present'),
    ],
    reflection: '정확한 번역보다 읽는 사람이 무엇을 알고 싶은지가 먼저라는 걸 배웠어요.',
    followUp: '학교 행사 영어 안내자료 제작으로 활동을 넓혔어요.',
    related: [
      [content.tradeCareerRecord, mentors.choiEunchae],
      [content.englishRoutine, mentors.choiEunchae],
      [content.speechCase, mentors.ohJunseok],
    ],
    saveCount: 441,
  },
  {
    content: content.independenceCase,
    mentor: mentors.parkSeohyun,
    grade: 2,
    subject: '한국사',
    activityType: '사료 분석 보고서',
    summary: '독립신문·헌의 6조 사료 분석 · 비교표 · A4 3쪽 보고서 과정을 정리한 Activity Case예요.',
    activities: ['독립신문·헌의 6조 등 사료 분석', '비교표', 'A4 3쪽 보고서'],
    stages: [
      stage('guide', '활동 안내', '한국사 사료 탐구', '근대 개혁 운동과 관련된 사료를 두 개 이상 비교해 보고서를 쓰는 과제였어요.', ['사료 2개 이상', '비교표', 'A4 3쪽']),
      stage('select', '사료 선정', '독립신문 · 헌의 6조', '교과서에 나온 독립신문 기사와 헌의 6조를 중심 사료로 골랐어요.'),
      stage('analyze', '사료 분석', '주장 · 대상 · 배경', '각 사료가 누구에게 무엇을 주장했는지, 어떤 배경에서 나왔는지 나눠 읽었어요.'),
      stage('compare', '비교표 작성', '공통점 · 차이점', '두 사료의 공통 요구와 표현 차이를 비교표로 정리했어요.'),
      stage('report', '보고서', 'A4 3쪽', '비교표를 근거로 독립협회와 만민공동회의 활동 방향을 정리한 보고서를 냈어요.'),
    ],
    materials: [
      material('reading-note', 'evidence', '사료 읽기 메모', 'HWP', '사료별 주장 · 대상 · 배경', 'analyze'),
      material('compare-table', 'evidence', '사료 비교표', 'HWP', '공통점 · 차이점 정리', 'compare'),
      material('report', 'final', '사료 비교 분석 보고서', 'HWP', 'A4 3쪽 보고서', 'report'),
    ],
    reflection: '사료를 요약하기보다 누가 누구에게 쓴 글인지 먼저 보니 해석이 분명해졌어요.',
    related: [
      [content.summerStory, mentors.parkSeohyun],
      [content.industrialCase, mentors.leeHyunseo],
    ],
    saveCount: 486,
  },
  {
    content: content.industrialCase,
    mentor: mentors.leeHyunseo,
    grade: 2,
    subject: '세계사',
    activityType: '조사 보고서',
    summary: '공장·노동 자료 조사 · 아동노동·도시화 분석 · 사료 분석표 · 보고서 과정을 정리한 Activity Case예요.',
    activities: ['공장·노동 자료 조사', '아동노동·도시화 분석', '사료 분석표', '보고서'],
    stages: [
      stage('guide', '활동 안내', '세계사 주제 탐구', '세계사 단원에서 주제를 하나 정해 자료를 조사하고 보고서를 쓰는 과제였어요.'),
      stage('research', '자료 조사', '공장 · 노동 자료', '산업혁명 시기 공장 노동 시간과 임금에 관한 자료를 교과서와 도서관 자료에서 찾았어요.'),
      stage('analyze', '주제 분석', '아동노동 · 도시화', '자료를 아동노동과 도시화 두 주제로 나눠 변화의 원인과 결과를 정리했어요.'),
      stage('table', '사료 분석표', '자료별 관점 정리', '자료마다 누가, 어떤 입장에서 남긴 기록인지 분석표로 정리했어요.'),
      stage('report', '보고서', '조사 보고서', '분석표를 근거로 노동환경 변화가 사회에 미친 영향을 보고서로 썼어요.'),
    ],
    materials: [
      material('source-table', 'evidence', '사료 분석표', 'XLSX', '자료별 작성자 · 입장', 'table'),
      material('report', 'final', '산업혁명 노동환경 조사 보고서', 'PDF', '조사 보고서', 'report'),
    ],
    reflection: '숫자 자료와 당시 사람들의 기록을 함께 보니 변화가 더 구체적으로 보였어요.',
    related: [
      [content.admissionSwitchStory, mentors.leeHyunseo],
      [content.independenceCase, mentors.parkSeohyun],
    ],
    saveCount: 555,
  },
  {
    content: content.snsSurveyCase,
    mentor: mentors.choiAreum,
    grade: 2,
    subject: '사회문화',
    activityType: '설문조사 연구',
    summary: '58명 설문 · 평균 비교 · 그래프 · 연구보고서 · 조사 한계 분석 과정을 정리한 Activity Case예요.',
    activities: ['58명 설문', '평균 비교', '그래프', '연구보고서', '조사 한계 분석'],
    stages: [
      stage('guide', '활동 안내', '사회문화 연구 과제', '사회 현상 하나를 정해 직접 자료를 모으고 연구보고서를 쓰는 과제였어요.'),
      stage('design', '설문 설계', '이용시간 · 행복감 문항', '이용시간과 행복감을 묻는 문항을 나누고, 응답한 사람을 알 수 있는 질문은 넣지 않았어요.', [
        '이용시간 구간 문항',
        '행복감 5점 척도',
        '응답자를 알 수 있는 질문 빼기',
      ]),
      stage('collect', '설문 조사', '58명 응답', '같은 학년 학생 58명의 응답을 익명으로 모았어요.'),
      stage('analyze', '결과 분석', '평균 비교 · 그래프', '이용시간 구간별 행복감 평균을 비교하고 막대그래프로 나타냈어요.'),
      stage('report', '연구보고서', '조사 한계 분석', '결과와 함께 응답자가 한 학년뿐이라는 점, 스스로 답한 응답이라는 한계를 보고서에 적었어요.'),
    ],
    materials: [
      material('questionnaire', 'evidence', '설문 문항지', 'PDF', '이용시간 · 행복감 문항', 'design'),
      material('tally', 'evidence', '응답 집계표', 'XLSX', '58명 응답 집계', 'analyze'),
      material('report', 'final', '연구보고서', 'HWP', '조사 한계 분석 포함', 'report'),
    ],
    reflection: '결과보다 조사 한계를 쓰는 부분에서 더 많이 고민했어요.',
    related: [
      [content.broadTopicStory, mentors.choiAreum],
      [content.sleepCase, mentors.jeongSejin],
    ],
    saveCount: 626,
  },
  {
    content: content.climateRefugeeCase,
    mentor: mentors.jeongDain,
    grade: 2,
    subject: '정치와 법',
    activityType: '토론',
    summary: '난민협약 조사 · 입론서 · 예상 반론 · 토론 · 후속 정책 비교 과정을 정리한 Activity Case예요.',
    activities: ['난민협약 조사', '입론서', '예상 반론', '토론', '후속 정책 비교'],
    stages: [
      stage('guide', '활동 안내', '모둠 토론 수행평가', '국제 문제 하나를 정해 찬반으로 나눠 토론하는 수행평가였어요.'),
      stage('research', '자료 조사', '난민협약 · 기후 난민', '난민협약의 난민 정의를 찾아보고, 기후 변화로 이주한 사람들이 왜 보호 대상에서 빠지는지 조사했어요.'),
      stage('opening', '입론 작성', '찬성 측 입론서', '보호가 필요한 이유를 근거 세 가지로 나눠 입론서를 썼어요.'),
      stage('rebuttal', '반론 준비', '예상 반론 3개', '상대 측이 낼 만한 반론 세 가지를 정리하고 각각 답할 근거를 붙였어요.'),
      stage('debate', '토론', '모둠 토론', '입론 → 반론 → 최종 발언 순서로 토론했어요.'),
    ],
    materials: [
      material('opening', 'evidence', '입론서', 'HWP', '찬성 측 근거 3가지', 'opening'),
      material('rebuttal', 'evidence', '예상 반론 정리', 'HWP', '반론 3개와 답변 근거', 'rebuttal'),
    ],
    reflection: '반론을 미리 써보니 내 입론에서 약한 근거가 먼저 보였어요.',
    followUp: '토론 뒤 여러 나라의 기후 이주 관련 정책을 비교해 정리했어요.',
    related: [
      [content.algorithmCase, mentors.kimTaehyun],
      [content.aiInterviewCase, mentors.goMinjeong],
    ],
    saveCount: 697,
  },
  {
    content: content.transitCase,
    mentor: mentors.kimDoyeon,
    grade: 2,
    subject: '한국지리',
    activityType: '지역 조사',
    summary: '버스정류장·배차간격 조사 · 생활권 지도 · 접근성 분석 · 개선안 과정을 정리한 Activity Case예요.',
    activities: ['버스정류장·배차간격 조사', '생활권 지도', '접근성 분석', '개선안'],
    stages: [
      stage('guide', '활동 안내', '지역 조사 보고서', '우리 지역의 문제 하나를 직접 조사하고 개선안을 제안하는 과제였어요.'),
      stage('field', '현장 조사', '정류장 · 배차간격', '생활권 안의 버스정류장 위치와 노선별 배차간격을 조사했어요.'),
      stage('map', '지도 작성', '생활권 지도', '조사한 정류장을 생활권 지도에 표시하고 걸어서 갈 수 있는 범위를 그렸어요.'),
      stage('analyze', '접근성 분석', '취약 구역 찾기', '정류장까지 거리와 배차간격을 함께 보고 접근성이 낮은 구역을 찾았어요.'),
      stage('propose', '개선안', '노선 · 정류장 제안', '접근성이 낮은 구역에 필요한 노선 조정과 정류장 위치를 개선안으로 정리했어요.'),
    ],
    materials: [
      material('field-sheet', 'evidence', '정류장 · 배차간격 조사표', 'XLSX', '정류장 위치와 노선별 배차간격', 'field'),
      material('map', 'evidence', '생활권 지도', 'PDF', '정류장과 도보 범위 표시', 'map'),
      material('report', 'final', '대중교통 접근성 조사 보고서', 'HWP', '분석과 개선안', 'propose'),
    ],
    reflection: '지도에 직접 그려보니 숫자로만 볼 때 놓친 구역이 보였어요.',
    related: [
      [content.wrongAnswerPlan, mentors.kimDoyeon],
      [content.safetyMapCase, mentors.leeSubin],
    ],
    saveCount: 768,
  },
  {
    content: content.convenienceCase,
    mentor: mentors.joMinjae,
    grade: 2,
    subject: '경제',
    activityType: '경제 보고서',
    summary: '편의점 3곳·상품 15개 가격조사 · 32명 설문 · 그래프 · 경제 보고서 과정을 정리한 Activity Case예요.',
    activities: ['편의점 3곳·상품 15개 가격조사', '32명 설문', '그래프', '경제 보고서'],
    stages: [
      stage('guide', '활동 안내', '경제 개념 적용 보고서', '배운 경제 개념을 생활 속 사례에 적용해 보고서로 쓰는 과제였어요.'),
      stage('price', '가격 조사', '편의점 3곳 · 상품 15개', '편의점 3곳에서 같은 상품 15개의 가격과 행사 여부를 기록했어요.'),
      stage('survey', '소비자 설문', '32명 응답', '상품을 고를 때 가격, 행사, 브랜드 중 무엇을 먼저 보는지 32명에게 물었어요.'),
      stage('analyze', '분석', '그래프 정리', '가격 차이와 설문 결과를 그래프로 나란히 놓고 비교했어요.'),
      stage('report', '경제 보고서', '보고서 제출', '가격만으로 설명되지 않는 소비자 선택을 수요 개념과 연결해 보고서로 정리했어요.'),
    ],
    materials: [
      material('price-sheet', 'evidence', '가격 조사표', 'XLSX', '3곳 · 상품 15개 가격', 'price'),
      material('report', 'final', '편의점 가격과 소비자 선택 보고서', 'HWP', '경제 보고서', 'report'),
    ],
    reflection: '가장 싼 상품이 가장 많이 팔리지는 않는다는 결과가 수요 개념을 다시 보게 했어요.',
    related: [
      [content.csatRoutine, mentors.joMinjae],
      [content.storeDataCase, mentors.seoJiho],
    ],
    saveCount: 839,
  },
  {
    content: content.storeDataCase,
    mentor: mentors.seoJiho,
    grade: 2,
    subject: '경제·수학',
    activityType: '데이터 분석',
    summary: '가격·판매량·행사 여부 비교 · Spreadsheet · 그래프 · 분석보고서 과정을 정리한 Activity Case예요.',
    activities: ['가격·판매량·행사 여부 비교', 'Spreadsheet', '그래프', '분석보고서'],
    stages: [
      stage('guide', '활동 안내', '경제 · 수학 융합 과제', '경제 개념을 실제 데이터로 확인하는 융합 과제였어요.'),
      stage('data', '데이터 정리', '판매 기록 정리', '교내 매점 상품별 판매 기록을 Spreadsheet로 정리했어요.'),
      stage('compare', '비교 분석', '가격 · 판매량 · 행사', '가격, 판매량, 행사 여부를 함께 놓고 행사 기간에 판매량이 어떻게 달라졌는지 비교했어요.'),
      stage('graph', '그래프', '상품별 그래프', '상품별 판매량 변화를 그래프로 나타냈어요.'),
      stage('report', '분석보고서', '보고서 제출', '그래프를 근거로 가격과 행사가 수요에 미친 영향을 분석보고서로 정리했어요.'),
    ],
    materials: [
      material('spreadsheet', 'evidence', '판매 데이터 Spreadsheet', 'XLSX', '가격 · 판매량 · 행사 여부', 'data'),
      material('graph', 'evidence', '상품별 판매량 그래프', 'PDF', '판매량 변화 그래프', 'graph'),
      material('report', 'final', '상품 수요 분석보고서', 'HWP', '분석보고서', 'report'),
    ],
    reflection: '그래프를 그리기 전에 비교 기준을 정해두는 게 분석의 절반이었어요.',
    related: [
      [content.examPeriodRoutine, mentors.seoJiho],
      [content.convenienceCase, mentors.joMinjae],
    ],
    saveCount: 910,
  },
  {
    content: content.aiInterviewCase,
    mentor: mentors.goMinjeong,
    grade: 2,
    subject: '생활과 윤리',
    activityType: '윤리 논증문',
    summary: '알고리즘 편향 조사 · 찬반 논거 비교 · 1,700자 논증문 과정을 정리한 Activity Case예요.',
    activities: ['알고리즘 편향 조사', '찬반 논거 비교', '1,700자 논증문'],
    stages: [
      stage('guide', '활동 안내', '윤리 논증문 수행평가', '현대 윤리 쟁점 하나에 대해 자신의 입장을 논증하는 1,700자 글을 쓰는 과제였어요.', ['쟁점 1개', '찬반 검토', '1,700자 내외']),
      stage('research', '자료 조사', '알고리즘 편향', '알고리즘 편향과 사람 평가자의 편향을 다룬 자료를 찾아 비교했어요.'),
      stage('arguments', '찬반 논거 비교', '찬성 · 반대 논거', '찬성과 반대 논거를 세 가지씩 표로 정리하고 각 근거의 한계를 적었어요.'),
      stage('write', '논증문 작성', '1,700자 논증문', '찬반을 검토한 뒤 조건을 붙여 활용 방안을 제안하는 방향으로 논증문을 썼어요.'),
    ],
    materials: [
      material('arguments', 'evidence', '찬반 논거 비교표', 'HWP', '찬성 · 반대 논거와 한계', 'arguments'),
      material('essay', 'final', 'AI 면접 공정성 논증문', 'HWP', '1,700자 논증문', 'write'),
    ],
    reflection: '한쪽 입장을 고르기보다 어떤 조건에서 괜찮은지 따지는 게 더 설득력 있었어요.',
    followUp: '심리탐구 동아리에서 같은 주제로 토론을 이어갔어요.',
    related: [
      [content.psychologyClubRecord, mentors.goMinjeong],
      [content.midtermPlan, mentors.goMinjeong],
      [content.algorithmCase, mentors.kimTaehyun],
    ],
    saveCount: 981,
  },
  {
    content: content.algorithmCase,
    mentor: mentors.kimTaehyun,
    grade: 2,
    subject: '생활과 윤리',
    activityType: '윤리 토론',
    summary: 'Filter Bubble 조사 · 표현의 자유·플랫폼 책임 비교 · 토론 개요서 과정을 정리한 Activity Case예요.',
    activities: ['Filter Bubble 조사', '표현의 자유·플랫폼 책임 비교', '토론 개요서'],
    stages: [
      stage('guide', '활동 안내', '윤리 토론 수행평가', '정보 사회의 윤리 쟁점을 골라 토론 개요서를 쓰고 토론하는 과제였어요.'),
      stage('research', 'Filter Bubble 조사', '추천 알고리즘 자료', '추천 알고리즘이 비슷한 정보만 보여주는 Filter Bubble 현상을 다룬 자료를 찾았어요.'),
      stage('compare', '쟁점 비교', '표현의 자유 · 플랫폼 책임', '표현의 자유와 플랫폼 책임이 부딪히는 지점을 나눠 비교했어요.'),
      stage('outline', '토론 개요서', '주장 · 근거 · 반론', '주장, 근거, 예상 반론을 한 장의 개요서로 정리했어요.'),
      stage('debate', '토론', '모둠 토론', '개요서를 바탕으로 토론에 참여했어요.'),
    ],
    materials: [material('outline', 'final', '토론 개요서', 'HWP', '주장 · 근거 · 예상 반론', 'outline')],
    reflection: '추천을 막자는 주장과 그대로 두자는 주장 사이에 사용자에게 선택권을 주는 방법도 있다는 걸 토론에서 들었어요.',
    related: [
      [content.undecidedCareerStory, mentors.kimTaehyun],
      [content.aiInterviewCase, mentors.goMinjeong],
    ],
    saveCount: 1100,
  },
  {
    content: content.filmMusicCase,
    mentor: mentors.seoYewon,
    grade: 2,
    subject: '음악',
    activityType: '음악 비교 분석 발표',
    summary: '영화 장면 3개 비교 · 빠르기·악기·음량 분석 · 비교표 · 5분 발표 과정을 정리한 Activity Case예요.',
    activities: ['영화 장면 3개 비교', '빠르기·악기·음량 분석', '비교표', '5분 발표'],
    stages: [
      stage('guide', '활동 안내', '음악 감상 발표', '음악이 쓰인 매체 하나를 골라 음악 요소를 분석하고 5분 동안 발표하는 과제였어요.'),
      stage('select', '장면 선정', '영화 장면 3개', '분위기가 서로 다른 영화 장면 3개를 골랐어요.'),
      stage('analyze', '음악 분석', '빠르기 · 악기 · 음량', '장면마다 음악의 빠르기, 쓰인 악기, 음량 변화를 들으며 기록했어요.'),
      stage('table', '비교표', '장면별 비교', '세 장면의 음악 요소를 한 표에 놓고 분위기와 연결했어요.'),
      stage('present', '발표', '5분 발표', '비교표 순서대로 장면과 음악 요소를 설명하며 5분 동안 발표했어요.'),
    ],
    materials: [
      material('compare-table', 'evidence', '장면별 음악 비교표', 'HWP', '빠르기 · 악기 · 음량 비교', 'table'),
      material('slides', 'final', '발표 자료', 'PPTX', '5분 발표 자료', 'present'),
    ],
    reflection: '같은 장면에 음악만 바꿔 상상해보니 분위기를 만드는 요소가 분명하게 보였어요.',
    related: [[content.deliveryAdCase, mentors.leeChaerin]],
    saveCount: 305,
  },
  {
    content: content.brakingCase,
    mentor: mentors.kangMinho,
    grade: 2,
    subject: '수학',
    activityType: '수학 탐구 보고서',
    summary: '속도별 제동거리 데이터 · 함수 모델 비교 · 그래프 · 탐구보고서 과정을 정리한 Activity Case예요.',
    activities: ['속도별 제동거리 데이터', '함수 모델 비교', '그래프', '탐구보고서'],
    stages: [
      stage('guide', '활동 안내', '수학 탐구 보고서', '생활 속 현상을 함수로 나타내고 탐구보고서를 쓰는 과제였어요.'),
      stage('data', '데이터 수집', '속도별 제동거리', '공개된 자료에서 속도별 제동거리 데이터를 모아 표로 정리했어요.'),
      stage('model', '함수 모델 비교', '일차 · 이차 함수', '일차함수와 이차함수 모델을 각각 맞춰보고 오차를 비교했어요.', [], {
        planChange: { before: '일차함수 하나로 설명', after: '일차 · 이차 함수 모델 비교' },
      }),
      stage('graph', '그래프', '데이터와 모델 그래프', '데이터와 두 모델을 한 그래프에 그려 차이를 보여줬어요.'),
      stage('report', '탐구보고서', '보고서 제출', '이차함수 모델이 더 잘 맞는 이유를 속도와 에너지 관계로 설명했어요.'),
    ],
    materials: [
      material('data', 'evidence', '속도별 제동거리 데이터', 'XLSX', '속도 · 제동거리 표', 'data'),
      material('report', 'final', '제동거리 탐구보고서', 'HWP', '함수 모델 비교와 그래프', 'report'),
    ],
    reflection: '데이터에 맞는 함수를 고르면서 수식이 무엇을 뜻하는지 다시 생각하게 됐어요.',
    related: [
      [content.mathStory, mentors.kangMinho],
      [content.sleepCase, mentors.jeongSejin],
    ],
    saveCount: 327,
  },
  {
    content: content.sleepCase,
    mentor: mentors.jeongSejin,
    grade: 2,
    subject: '확률과통계',
    activityType: '통계 조사',
    summary: '52명 설문 · CSV · 산점도 · 상관계수 · 통계 보고서 과정을 정리한 Activity Case예요.',
    activities: ['52명 설문', 'CSV', '산점도', '상관계수', '통계 보고서'],
    stages: [
      stage('guide', '활동 안내', '통계 탐구 과제', '두 변수의 관계를 직접 조사한 자료로 분석하는 과제였어요.'),
      stage('design', '설문 설계', '사용시간 · 수면시간', '하루 스마트폰 사용시간과 수면시간을 숫자로 답하게 문항을 만들었어요.'),
      stage('collect', '자료 수집', '52명 응답', '52명의 응답을 익명으로 모아 CSV로 정리했어요.'),
      stage('analyze', '분석', '산점도 · 상관계수', '산점도를 그리고 상관계수를 계산했어요.'),
      stage('report', '통계 보고서', '해석과 한계', '상관관계가 있다는 결과와 함께 원인이라고 단정할 수 없는 이유를 보고서에 적었어요.'),
    ],
    materials: [
      material('csv', 'evidence', '설문 응답 데이터', 'CSV', '52명 익명 응답', 'collect'),
      material('report', 'final', '스마트폰 사용과 수면 통계 보고서', 'PDF', '산점도 · 상관계수 · 해석', 'report'),
    ],
    reflection: '상관관계가 있다고 해서 원인이라고 쓸 수는 없다는 걸 보고서에 꼭 적었어요.',
    related: [
      [content.mathPlan, mentors.jeongSejin],
      [content.snsSurveyCase, mentors.choiAreum],
    ],
    saveCount: 418,
  },
  {
    content: content.safetyMapCase,
    mentor: mentors.leeSubin,
    grade: 2,
    subject: '수학·지리 융합',
    activityType: '안전지도 제작',
    summary: '통학로 조사 · 신호시간·차량량 기록 · 위험도 점수화 · 안전지도 과정을 정리한 Activity Case예요.',
    activities: ['통학로 조사', '신호시간·차량량 기록', '위험도 점수화', '안전지도'],
    stages: [
      stage('guide', '활동 안내', '수학 · 지리 융합 프로젝트', '수학으로 생활 공간의 문제를 분석하고 결과물을 만드는 융합 프로젝트였어요.'),
      stage('survey', '통학로 조사', '주요 통학로', '학생들이 많이 다니는 통학로를 정하고 직접 걸으며 위험해 보이는 곳을 표시했어요.'),
      stage('record', '현장 기록', '신호시간 · 차량량', '횡단보도 신호시간과 정해진 시간 동안 지나가는 차량 수를 기록했어요.'),
      stage('score', '위험도 점수화', '점수 기준 정하기', '신호시간, 차량량, 보도 폭을 기준으로 위험도 점수를 매기는 방법을 정했어요.'),
      stage('map', '안전지도', '안전지도 완성', '구간별 위험도 점수를 색으로 나눠 안전지도를 만들었어요.'),
    ],
    materials: [
      material('record-sheet', 'evidence', '신호시간 · 차량량 기록표', 'XLSX', '구간별 현장 기록', 'record'),
      material('safety-map', 'final', '학교 주변 보행 안전지도', 'PDF', '위험도 점수별 색 구분', 'map'),
    ],
    reflection: '위험도를 숫자로 정하는 기준을 친구들과 맞추는 데 시간이 가장 오래 걸렸어요.',
    related: [
      [content.mathMockRoutine, mentors.leeSubin],
      [content.transitCase, mentors.kimDoyeon],
    ],
    saveCount: 463,
  },
  // ActivityCase-01 ~ 08 Mockup 문구
  {
    content: content.antibioticCase,
    mentor: mentors.hanJisu,
    grade: 2,
    subject: '생명과학Ⅰ',
    activityType: '탐구 포스터',
    summary: '탐구계획부터 Staff Feedback, 최종 포스터, 미생물 배양 후속 활동까지 정리한 Activity Case예요.',
    activities: ['내성균 자료 조사', '자연선택 과정 정리', 'A3 포스터', '3분 발표', '후속 미생물 실험'],
    stages: [
      stage(
        'guide',
        '안내문 등록',
        '진화 단원 연계 포스터',
        '생명과학Ⅰ 진화 단원과 연계한 탐구 포스터 과제였어요. A3 한 장에 탐구 질문, 자료, 결론을 담고 3분 동안 발표해야 했어요.',
        ['탐구 질문의 명확성 30점', '자료 근거 30점', '도식 표현 20점', '발표 20점'],
      ),
      stage(
        'topic',
        '주제 선정',
        '국내 통계 1개로 범위 축소',
        '처음에는 여러 나라의 항생제 사용량과 내성균 비율을 비교하려고 했어요. 3주 안에 자료를 모으기 어려워 국내 통계 하나로 범위를 줄였어요.',
        [],
        { planChange: { before: '항생제 사용량과 내성균 비율 (여러 나라 비교)', after: '국내 통계 1개로 범위 축소' } },
      ),
      stage(
        'research',
        '자료 조사',
        '질병관리청 통계 + 교과서 모형',
        '질병관리청 통계와 교과서의 자연선택 모형을 함께 사용했어요. 통계는 연도별 변화만 골라 표 하나로 정리했어요.',
        ['질병관리청 항생제 내성 통계', '교과서 자연선택 모형', '연도별 내성균 비율 표 1개'],
      ),
      stage('draft', '초안 V1 제출', 'V1 제출', 'V1 초안은 통계 표가 포스터의 절반을 차지했어요.'),
      stage(
        'ai-check',
        'AI 사전 점검',
        '분량·형식 확인',
        '멘토는 제출 전에 분량, 형식, 평가 기준 누락을 스스로 점검했어요. LearnersHigh의 8단계 구조에 맞춰 이 단계로 표시해요.',
        ['분량·시간 확인', '평가 기준 항목 누락 확인', '반복 표현 확인'],
      ),
      stage('feedback', '선생님 피드백', '피드백 받음', 'V1 초안을 보고 선생님이 남긴 피드백이에요.', [], {
        feedback: {
          source: '선생님 피드백',
          text: '자연선택 4단계를 중앙에 도식화해보세요.',
          note: 'V1 초안에 받은 선생님 피드백 · V2에서 반영',
        },
      }),
      stage(
        'revision',
        'Revision',
        'V2 수정',
        'V1 초안은 통계 표가 포스터의 절반을 차지했어요. Feedback을 받고 자연선택 4단계를 가운데 두고 통계는 근거로만 배치했어요.',
      ),
      stage(
        'final',
        '최종 제출 / 발표',
        '최종 포스터 + 3분 발표',
        'V2 포스터는 변이 → 선택 → 생존·번식 → 내성균 증가 순서로 읽히도록 구성했어요. 발표도 도식 순서를 그대로 따라갔어요.',
        ['A3 포스터 V2 제출', '3분 발표 완료'],
      ),
    ],
    materials: [
      // 파일 이름은 ActivityCase-01 ~ 09 Mockup 그대로
      material('research', 'evidence', '탐구 자료 조사', 'XLSX', '질병관리청 통계 + 교과서 모형', 'research', {
        fileName: '항생제_내성과_자연선택_탐구_자료조사.xlsx',
        // 원본 XLSX의 표 그대로 (ActivityCase-03 문구, 통계 수치는 없음)
        preview: {
          kind: 'table',
          title: '항생제 내성과 자연선택 탐구 · 자료 조사',
          description: '질병관리청 통계와 교과서의 자연선택 모형을 함께 사용했어요. 통계는 연도별 변화만 골라 표 하나로 정리했어요.',
          columns: ['자료', '사용 방법'],
          rows: [
            ['질병관리청 항생제 내성 통계', '연도별 변화만 골라 사용'],
            ['교과서 자연선택 모형', '자연선택 과정 정리'],
            ['연도별 내성균 비율 표 1개', '통계를 표 하나로 정리'],
          ],
          footnote: sampleNote,
        },
        original: { url: antibioticResearchUrl, mimeType: mime.xlsx, fileSizeBytes: 9387 },
      }),
      material('v1', 'draft', '탐구 포스터 V1 초안', 'HWP', '처음 제출한 초안이에요.', 'draft', {
        fileName: '항생제_내성과_자연선택_탐구_V1.hwp',
        // 원본 HWP 문단 그대로 (ActivityCase-04 / 07: 통계 표가 절반을 차지한 V1)
        preview: {
          kind: 'document',
          pages: [
            {
              pageNumber: 1,
              title: '항생제 내성과 자연선택 탐구 포스터 · V1 초안',
              paragraphs: [
                'V1 초안은 통계 표가 포스터의 절반을 차지했어요.',
                '자료: 질병관리청 통계 + 교과서 자연선택 모형, 연도별 내성균 비율 표 1개',
              ],
              footnote: sampleNote,
            },
          ],
        },
        original: { url: antibioticPosterV1Url, mimeType: mime.hwp, fileSizeBytes: 18944 },
      }),
      material('feedback', 'feedback', 'V1 선생님 피드백', 'PDF', '자연선택 4단계를 중앙에 도식화해보세요.', 'feedback', {
        fileName: 'V1_선생님피드백.pdf',
        // 원본 PDF 내용 그대로 (ActivityCase-06)
        preview: {
          kind: 'document',
          pages: [
            {
              pageNumber: 1,
              title: 'V1 선생님 피드백',
              paragraphs: ['자연선택 4단계를 중앙에 도식화해보세요.', 'V1 초안에 받은 선생님 피드백 · V2에서 반영'],
              footnote: sampleNote,
            },
          ],
        },
        original: { url: antibioticV1FeedbackUrl, mimeType: mime.pdf, fileSizeBytes: 49810 },
      }),
      material('v2', 'revision', '탐구 포스터 V2 수정본', 'HWP', '반영한 피드백: 자연선택 4단계를 중앙에 도식화해보세요.', 'revision', {
        fileName: '항생제_내성과_자연선택_탐구_V2_수정본.hwp',
        // 원본 HWP 문단 그대로 (ActivityCase-07: 자연선택 4단계를 가운데 두고 통계는 근거로만)
        preview: {
          kind: 'document',
          pages: [
            {
              pageNumber: 1,
              title: '항생제 내성과 자연선택 탐구 포스터 · V2 수정본',
              paragraphs: [
                'Feedback을 받고 자연선택 4단계를 가운데 두고 통계는 근거로만 배치했어요.',
                '변이 → 선택 → 생존·번식 → 내성균 증가',
                '반영한 피드백: 자연선택 4단계를 중앙에 도식화해보세요.',
              ],
              footnote: sampleNote,
            },
          ],
        },
        original: { url: antibioticPosterV2Url, mimeType: mime.hwp, fileSizeBytes: 20992 },
      }),
      material('final', 'final', '탐구 포스터 최종본', 'PPTX', 'A3 포스터 V2 제출 · 3분 발표 완료', 'final', {
        fileName: '항생제_내성과_자연선택_탐구_최종본.pptx',
        // ActivityCase-09 Mockup에 보이는 Page만 둔다. (원본 PPTX도 같은 두 Slide)
        preview: {
          kind: 'slides',
          pages: [
          {
            pageNumber: 1,
            title: '항생제 내성과 자연선택 탐구 포스터',
            lead: '최종 포스터 + 3분 발표',
            body: 'V2 포스터는 변이 → 선택 → 생존·번식 → 내성균 증가 순서로 읽히도록 구성했어요. 발표도 도식 순서를 그대로 따라갔어요.',
          },
          {
            pageNumber: 2,
            title: '문제 제기',
            bullets: [
              '처음에는 여러 나라의 항생제 사용량과 내성균 비율을 비교하려고 했어요.',
              '3주 안에 자료를 모으기 어려워 국내 통계 하나로 범위를 줄였어요.',
              '왜 이 주제를 골랐는지',
            ],
          },
          ],
        },
        // 개발 검증용 Sample 원본 (같은 두 Page를 담은 실제 PPTX)
        original: { url: antibioticPosterFinalUrl, mimeType: mime.pptx, fileSizeBytes: 38339 },
      }),
    ],
    reflection: '통계를 그대로 옮기면 내 탐구가 아니라는 점을 배웠어요.',
    followUp: '동아리 미생물 배양 실험으로 이어갔고, 생명과학Ⅰ 세특과 동아리 기록에 연결됐어요.',
    related: [
      [content.mockExamStory, mentors.hanJisu],
      [content.literaturePlan, mentors.hanJisu],
      [content.snsSurveyCase, mentors.choiAreum],
      [content.antibioticRecord, mentors.hanJisu],
    ],
    saveCount: 1500,
  },
  {
    content: content.riverCase,
    mentor: mentors.hanYerin,
    grade: 2,
    subject: '통합과학·환경',
    activityType: '현장 탐구',
    summary: '두 지점 현장조사 · pH·수온·식생·생물 관찰 · 지도 · 탐구보고서 과정을 정리한 Activity Case예요.',
    activities: ['두 지점 현장조사', 'pH·수온·식생·생물 관찰', '지도', '탐구보고서'],
    stages: [
      stage('guide', '활동 안내', '환경 탐구 과제', '주변 환경 하나를 정해 직접 관찰하고 탐구보고서를 쓰는 과제였어요.'),
      stage('plan', '조사 계획', '두 지점 선정', '하천 상류와 하류 쪽 두 지점을 정하고 측정 항목을 미리 정했어요.', ['pH', '수온', '식생', '관찰 생물']),
      stage('field', '현장 조사', 'pH · 수온 · 식생 · 생물', '두 지점에서 pH와 수온을 재고 주변 식생과 관찰한 생물을 기록했어요.'),
      stage('map', '지도 정리', '조사 지점 지도', '조사 지점과 관찰 결과를 지도에 함께 표시했어요.'),
      stage('report', '탐구보고서', '보고서 제출', '두 지점의 차이를 정리하고, 한 번의 측정으로는 단정하기 어렵다는 한계를 적었어요.'),
    ],
    materials: [
      material('field-sheet', 'evidence', '현장 관찰 기록표', 'XLSX', '두 지점 측정 · 관찰 기록', 'field'),
      material('map', 'evidence', '조사 지점 지도', 'PDF', '지점별 결과 표시', 'map'),
      material('report', 'final', '하천 수질과 생물 관찰 탐구보고서', 'HWP', '탐구보고서', 'report'),
    ],
    reflection: '한 번 측정한 값으로는 단정하기 어렵다는 걸 알고 계절별로 다시 재기로 했어요.',
    followUp: '계절별 측정으로 이어가 환경 탐구 세특 기록과 연결됐어요.',
    related: [
      [content.environmentRecord, mentors.hanYerin],
      [content.beverageCase, mentors.parkNayun],
    ],
    saveCount: 507,
  },
  {
    content: content.beverageCase,
    mentor: mentors.parkNayun,
    grade: 2,
    subject: '기술가정',
    activityType: '비교 분석',
    summary: '음료 12종 영양정보 조사 · 당류 비교표·막대그래프 · 식생활 개선안 과정을 정리한 Activity Case예요.',
    activities: ['음료 12종 영양정보 조사', '당류 비교표·막대그래프', '식생활 개선안'],
    stages: [
      stage('guide', '활동 안내', '식생활 탐구 과제', '자주 먹는 식품의 영양 정보를 조사하고 식생활 개선안을 제안하는 과제였어요.'),
      stage('collect', '영양정보 조사', '음료 12종', '친구들이 자주 마시는 가공음료 12종의 영양정보 표시를 기록했어요.'),
      stage('compare', '당류 비교', '비교표 · 막대그래프', '당류 함량을 비교표와 막대그래프로 정리하고 하루 섭취 기준과 비교했어요.'),
      stage('propose', '식생활 개선안', '개선안 제안', '하루 섭취량을 기준으로 음료를 고르는 방법을 개선안으로 정리했어요.'),
    ],
    materials: [
      material('nutrition', 'evidence', '음료 영양정보 조사표', 'XLSX', '12종 당류 함량', 'collect'),
      material('chart', 'evidence', '당류 비교 막대그래프', 'PDF', '비교표 · 막대그래프', 'compare'),
      material('proposal', 'final', '식생활 개선안', 'HWP', '하루 섭취량 기준 개선안', 'propose'),
    ],
    reflection: '하루 섭취 기준과 비교하니 숫자가 훨씬 와닿았어요.',
    related: [
      [content.scienceRoutine, mentors.parkNayun],
      [content.riverCase, mentors.hanYerin],
    ],
    saveCount: 578,
  },
  {
    content: content.lunchDataCase,
    mentor: mentors.jeongMinhyuk,
    grade: 1,
    subject: '정보',
    activityType: '데이터 분석 프로젝트',
    summary: '4주 급식 데이터 · CSV · Python 분석 · Matplotlib · 보고서 · 3분 시연 과정을 정리한 Activity Case예요.',
    activities: ['4주 급식 데이터', 'CSV', 'Python 분석', 'Matplotlib', '보고서', '3분 시연'],
    stages: [
      stage('guide', '활동 안내', '정보 데이터 프로젝트', '학교생활에서 데이터를 모아 분석하고 결과를 시연하는 정보 프로젝트였어요.'),
      stage('collect', '데이터 수집', '4주 메뉴별 잔반', '4주 동안 메뉴별 잔반 데이터를 CSV로 정리했어요.'),
      stage('analyze', 'Python 분석', '평균 · 항목별 차이', 'Python으로 메뉴별 평균과 항목별 차이를 계산했어요.'),
      stage('graph', '시각화', 'Matplotlib 그래프', 'Matplotlib으로 메뉴별 잔반량 그래프를 그렸어요.'),
      stage('report', '보고서 · 시연', '3분 시연', '분석 결과와 원인에 대한 추측을 나눠 보고서에 쓰고 3분 동안 시연했어요.'),
    ],
    materials: [
      material('csv', 'evidence', '급식 잔반 데이터', 'CSV', '4주 메뉴별 잔반', 'collect'),
      material('code', 'evidence', '분석 코드', 'PY', '평균 · 항목별 차이 계산', 'analyze'),
      material('report', 'final', '급식 잔반 데이터 분석 보고서', 'PDF', '분석 결과와 추측 구분', 'report'),
    ],
    reflection: '분석 결과와 원인에 대한 추측을 나눠 써야 데이터가 말하는 범위가 분명해졌어요.',
    followUp: '추가 설문이 필요하다는 제안을 보고서 마지막에 남겼어요.',
    related: [
      [content.lunchDataRecord, mentors.jeongMinhyuk],
      [content.codingRoutine, mentors.jeongMinhyuk],
      [content.libraryDataCase, mentors.songJihoo],
    ],
    saveCount: 649,
  },
  {
    content: content.libraryDataCase,
    mentor: mentors.songJihoo,
    grade: 2,
    subject: '정보',
    activityType: '데이터 시각화 프로젝트',
    summary: '익명 대출 CSV · Pandas 분석 · 월별·분야별 그래프 · .ipynb · 보고서 과정을 정리한 Activity Case예요.',
    activities: ['익명 대출 CSV', 'Pandas 분석', '월별·분야별 그래프', '.ipynb', '보고서'],
    stages: [
      stage('guide', '활동 안내', '정보 자율 프로젝트', '학교 안의 데이터를 골라 시각화하고 의미를 해석하는 자율 프로젝트였어요.'),
      stage('data', '데이터 준비', '익명 대출 CSV', '빌린 사람 정보를 지운 도서관 대출 기록 CSV로 분석을 시작했어요.'),
      stage('analyze', 'Pandas 분석', '월별 · 분야별 집계', 'Pandas로 월별, 분야별 대출 수를 집계했어요.'),
      stage('graph', '시각화', '월별 · 분야별 그래프', '시험 기간과 방학에 대출이 어떻게 달라지는지 그래프로 나타냈어요.'),
      stage('report', '보고서', '보고서 제출', '그래프 해석과 도서관 운영에 대한 제안을 보고서로 정리했어요.'),
    ],
    materials: [
      material('csv', 'evidence', '익명 대출 데이터', 'CSV', '빌린 사람 정보 없는 대출 기록', 'data'),
      material('notebook', 'evidence', '분석 Notebook', 'IPYNB', 'Pandas 집계 · 그래프', 'graph'),
      material('report', 'final', '도서관 대출 데이터 시각화 보고서', 'PDF', '해석과 제안', 'report'),
    ],
    reflection: '개인 정보가 없는 데이터로도 충분히 의미 있는 질문을 할 수 있었어요.',
    related: [
      [content.physicsStory, mentors.songJihoo],
      [content.lunchDataCase, mentors.jeongMinhyuk],
    ],
    saveCount: 720,
  },
  {
    content: content.pictogramCase,
    mentor: mentors.kimHaram,
    grade: 2,
    subject: '미술',
    activityType: '디자인 프로젝트',
    summary: '기존 표지 분석 · 스케치 3안 · 친구 8명 테스트 · 최종 픽토그램 과정을 정리한 Activity Case예요.',
    activities: ['기존 표지 분석', '스케치 3안', '친구 8명 테스트', '최종 픽토그램'],
    stages: [
      stage('guide', '활동 안내', '시각 디자인 프로젝트', '생활 속 시각 정보를 개선하는 디자인 프로젝트였어요.'),
      stage('research', '문제 조사', '기존 표지 분석', '학교 안전시설 표지를 찾아 무엇을 뜻하는지 바로 알기 어려운 표지를 골랐어요.'),
      stage('sketch', '스케치', '스케치 3안', '같은 의미를 다르게 표현한 스케치 3안을 그렸어요.'),
      stage('test', '사용자 테스트', '친구 8명', '친구 8명에게 3안을 보여주고 무엇으로 보이는지 물었어요.'),
      stage('final', '최종안', '최종 픽토그램', '테스트에서 가장 헷갈림이 적었던 안을 다듬어 최종 픽토그램을 만들었어요.'),
    ],
    materials: [
      material('sketches', 'draft', '스케치 3안', 'PDF', '같은 의미의 표현 3가지', 'sketch'),
      material('test', 'evidence', '사용자 테스트 기록', 'XLSX', '친구 8명 응답', 'test'),
      material('final', 'final', '최종 픽토그램', 'PDF', '최종안', 'final'),
    ],
    reflection: '내가 보기엔 분명한 그림도 처음 보는 사람에게는 다르게 읽힐 수 있었어요.',
    related: [[content.festivalMapCase, mentors.joAra]],
    saveCount: 791,
  },
  {
    content: content.festivalMapCase,
    mentor: mentors.joAra,
    grade: 2,
    subject: '미술',
    activityType: '디자인 프로젝트',
    summary: '학교 지도 단순화 · 행사 아이콘 · 관람 동선 · 사용자 테스트 · A3 안내지도 과정을 정리한 Activity Case예요.',
    activities: ['학교 지도 단순화', '행사 아이콘', '관람 동선', '사용자 테스트', 'A3 안내지도'],
    stages: [
      stage('guide', '활동 안내', '교내 행사 디자인', '학교 축제에서 쓸 안내지도를 만드는 활동이었어요.'),
      stage('research', '정보 조사', '행사 위치 · 이동 동선', '행사 위치와 이동 동선을 조사하고 어떤 정보를 먼저 보여줄지 우선순위를 정했어요.'),
      stage('draft', '지도 초안', '지도 단순화 · 아이콘', '학교 지도를 단순하게 다시 그리고 행사별 아이콘을 만들었어요.'),
      stage('test', '길 찾기 테스트', '아이콘 · 안내 순서 수정', '친구들에게 초안으로 길을 찾아보게 한 뒤 아이콘과 안내 순서를 고쳤어요.', [], {
        planChange: { before: '행사 이름 순서로 안내', after: '관람 동선 순서로 안내' },
      }),
      stage('final', '안내지도 완성', 'A3 안내지도', '수정한 내용을 반영해 A3 안내지도를 완성했어요.'),
    ],
    materials: [
      material('draft', 'draft', '안내지도 초안', 'PDF', '지도 단순화 · 행사 아이콘', 'draft'),
      material('final', 'final', 'A3 안내지도', 'PDF', '사용자 테스트 반영', 'final'),
    ],
    reflection: '친구들이 길을 헤매는 걸 직접 보니 어떤 정보를 먼저 보여줘야 할지 알게 됐어요.',
    related: [
      [content.eventDesignRecord, mentors.joAra],
      [content.pictogramCase, mentors.kimHaram],
    ],
    saveCount: 862,
  },
]

/** Case 한 줄 요약. Home / Profile / Case 목록 / 관련 콘텐츠가 같은 문장을 쓴다. */
export const fixtureCaseSummaries: Record<string, string> = Object.fromEntries(
  caseSources.map((source) => [source.content.contentId, source.summary]),
)

const summaryOf = (item: MentorContentSummary): string =>
  ({
    plan: fixturePlanSummaries,
    routine: fixtureRoutineSummaries,
    story: fixtureStorySummaries,
    record: fixtureRecordSummaries,
    case: fixtureCaseSummaries,
    qna: {} as Record<string, string>,
  })[item.kind][item.contentId] ?? ''

const relatedItem = ([item, mentor]: RelatedSource): MixedContentItem => ({ ...item, summary: summaryOf(item), mentor })

const activityCases: MentorActivityCase[] = caseSources.map(({ content: item, related, ...rest }) => ({
  contentId: item.contentId,
  kind: 'case',
  title: item.title,
  ...rest,
  relatedContent: related.map(relatedItem),
}))

/** Case 목록 기본 순서: ActivityCase-00 Mockup처럼 저장 수가 많은 순 */
export const fixtureActivityCases: MentorActivityCase[] = [...activityCases].sort((a, b) => b.saveCount - a.saveCount)

const caseById = new Map(activityCases.map((item) => [item.contentId, item]))

export function findActivityCaseFixture(contentId: string): MentorActivityCase | null {
  return caseById.get(contentId) ?? null
}

/** Admin 추천 Case Panel의 "이 Case에서 볼 수 있는 과정" (Case 단계 이름을 그대로 쓴다) */
export function caseStageTitles(contentId: string): string[] {
  return findActivityCaseFixture(contentId)?.stages.map((item) => item.title) ?? []
}
