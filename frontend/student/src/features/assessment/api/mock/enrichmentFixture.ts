import type {
  EnrichmentCatalogItem,
  EnrichmentTask,
  MockExamMaterial,
  PersonalMockExamMaterial,
} from '../types.ts'

// 심화 탐구 Canonical Fixture (Stage 1, 시연 데이터). assessmentFixture.ts와 같은 과목·수행평가 ID를 쓴다.
// Shape은 api-contract.md §16·17·18·27을 따르고, 응답 Shape이 없는 부분은 types.ts 주석(MM-27~29)의 가정을 따른다.
// 모든 탐구 소재는 LearnersHigh가 만든 시연용 주제다. 실제 시험 지문·실제 대학 문서를 옮기거나 존재를 주장하지 않는다.

/** §16 관리자 공개 Task. published=false 항목은 학생 응답에서 빠진다 (원본 비공개 시 기존 학생 Task 보존 확인용). */
export const fixtureCatalog: EnrichmentCatalogItem[] = [
  {
    catalogTaskId: 'catalog_001',
    title: '우리 학교에 적합한 AI 학습도구 이용 원칙 만들기',
    subjectId: 'subj_03',
    goal: 'AI 학습도구의 장점과 위험을 따져 보고, 우리 학교 학생이 지킬 수 있는 이용 원칙을 제안한다.',
    methods: [
      '학생과 선생님이 AI 도구를 실제로 어떻게 쓰는지 조사한다',
      '허용할 사용과 제한할 사용을 나누는 기준을 세운다',
      '원칙을 5가지 이내로 정리하고 이유를 함께 쓴다',
    ],
    published: true,
  },
  {
    catalogTaskId: 'catalog_002',
    title: '산성 토양을 중화하는 방법과 환경에 미치는 영향',
    subjectId: 'subj_02',
    goal: '산성 토양을 중화하는 방법을 비교하고, 각 방법이 주변 환경에 주는 영향을 평가한다.',
    methods: [
      '토양 시료의 pH를 측정한다',
      '중화 물질과 양을 바꿔 가며 처리 조건을 설계한다',
      'pH 변화, 식물 생장, 주변 수질에 미치는 영향을 비교한다',
    ],
    published: true,
  },
  {
    catalogTaskId: 'catalog_003',
    title: '신재생에너지 활용에 적합한 학교 시설 설계',
    subjectId: 'subj_02',
    goal: '학교 건물의 조건을 조사해 신재생에너지 설비를 둘 수 있는 위치와 기대 효과를 제안한다.',
    methods: ['학교 건물의 방향·그늘·전력 사용량을 조사한다', '설비 후보별 장단점을 표로 비교한다', '설치 위치와 기대 효과를 정리한다'],
    published: true,
  },
  {
    catalogTaskId: 'catalog_004',
    title: '우리 동네 기온 자료로 열섬 현상 분석하기',
    subjectId: 'subj_02',
    goal: '공개된 기온 자료로 도심과 외곽의 기온 차이를 비교해 열섬 현상의 원인을 설명한다.',
    methods: ['기상 관측 자료에서 두 지점을 고른다', '계절·시간대별 기온 차이를 그래프로 그린다', '토지 이용과 연결해 원인을 설명한다'],
    published: true,
  },
  {
    catalogTaskId: 'catalog_005',
    title: '같은 사건, 다른 기사: 보도 관점 비교하기',
    subjectId: 'subj_01',
    goal: '같은 사건을 다룬 기사들의 제목·근거·표현을 비교해 보도 관점의 차이를 설명한다.',
    methods: ['같은 날 보도된 기사 3개를 고른다', '제목·인용·사진 선택을 비교표로 정리한다', '관점의 차이가 독자에게 주는 영향을 쓴다'],
    published: true,
  },
  {
    catalogTaskId: 'catalog_006',
    title: '학교 급식 잔반 줄이기 캠페인 설계',
    subjectId: 'subj_03',
    goal: '잔반이 생기는 이유를 조사하고 실천 가능한 캠페인을 설계한다.',
    methods: ['일주일 동안 잔반 양을 관찰한다', '학생 설문으로 이유를 조사한다', '캠페인 활동과 효과 확인 방법을 정한다'],
    published: true,
  },
  {
    catalogTaskId: 'catalog_007',
    title: '교내 식물 분포 지도 만들기',
    subjectId: 'subj_04',
    goal: '교내 식물의 종류와 위치를 조사해 지도로 만들고 분포의 특징을 설명한다.',
    methods: ['구역을 나눠 식물을 관찰·기록한다', '도감과 앱으로 종을 확인한다', '햇빛·물 조건과 분포를 연결한다'],
    published: true,
  },
  {
    catalogTaskId: 'catalog_008',
    title: '통계로 보는 우리 지역 사회 현상 분석',
    subjectId: 'subj_03',
    goal: '공공 통계로 우리 지역의 인구·교통 변화를 분석하고 생활과의 관계를 설명한다.',
    methods: ['공공데이터에서 지역 통계를 찾는다', '5년 변화를 그래프로 정리한다', '변화가 생활에 주는 영향을 쓴다'],
    published: true,
  },
  {
    catalogTaskId: 'catalog_009',
    title: '비공개로 바뀐 예시 탐구',
    subjectId: 'subj_02',
    goal: '관리자가 비공개로 돌린 콘텐츠예요. 학생 목록에 나오지 않아야 해요.',
    methods: [],
    published: false,
  },
]

/** §18 학생 개인 Task. catalogTaskId는 출발한 공개 콘텐츠 참조일 뿐 Task Identity가 아니다. */
export const fixtureEnrichmentTasks: EnrichmentTask[] = [
  {
    taskId: 'task_001',
    title: '우리 학교에 적합한 AI 학습도구 이용 원칙 만들기',
    subjectId: 'subj_03',
    goal: 'AI 학습도구의 장점과 위험을 따져 보고, 우리 학교 학생이 지킬 수 있는 이용 원칙을 제안한다.',
    relatedAssessmentId: 'assessment_001',
    catalogTaskId: 'catalog_001',
    status: 'IN_PROGRESS',
    deadlineDate: null,
    sourceReference: null,
    createdAt: '2026-10-02T19:10:00+09:00',
    updatedAt: '2026-10-02T19:10:00+09:00',
  },
  {
    // 원본 콘텐츠가 비공개로 바뀐 뒤에도 학생 Task는 그대로 남는다 (§18).
    taskId: 'task_002',
    title: '지시약 색 변화로 중화점 찾기',
    subjectId: 'subj_02',
    goal: '여러 지시약의 색 변화 구간을 비교해 중화점을 찾는 방법을 정리한다.',
    relatedAssessmentId: null,
    catalogTaskId: 'catalog_009',
    status: 'COMPLETED',
    deadlineDate: null,
    sourceReference: null,
    createdAt: '2026-09-20T16:30:00+09:00',
    updatedAt: '2026-10-05T18:00:00+09:00',
  },
]

/**
 * Stage 2까지 쓰던 §17 공개 시연 카드 5개. 2026-10-28 모의고사 60선(mockExamResearchFixture)으로 추천 목록을 바꾸며
 * 목록에서는 내렸다. 이 소재를 출발 자료로 시작한 탐구가 있을 수 있어 상세 조회(ID)는 계속 된다 (참조 보존).
 */
const noExamSource = { academicYear: null, examMonth: null, grade: null, questionNumber: null, sourceUrl: null }

export const retiredMockExamMaterials: MockExamMaterial[] = [
  {
    materialId: 'material_001',
    subjectId: 'mock_eng',
    source: noExamSource,
    idea: {
      topicTitle: '통근객과 장거리 여행객의 이동 특성을 고려한 철도역 동선 설계 방안',
      coreMaterial: '이용 목적이 다른 두 집단의 동선이 겹치면 혼잡과 충돌이 생긴다는 소재예요.',
      relatedFields: ['도시공학', '교통공학', '건축·환경설계'],
      topicReason:
        '이용자 유형에 따라 필요한 공간이 다르다는 점에서 출발해, 가까운 역의 동선을 관찰하고 개선안을 제안하는 탐구로 넓힐 수 있어요.',
      goal: '우리 동네 역의 이용자 동선을 관찰하고, 이용자 유형에 맞는 공간 분리 개선안을 제안한다.',
      methods: [
        { label: '현장 관찰', text: '가까운 역을 출퇴근 시간과 주말에 방문해 이동 경로와 혼잡 구간을 약도로 기록해요.' },
        { label: '사례 비교', text: '다른 대형 역의 동선 설계를 자료로 찾아 분리 방식의 차이를 비교해요.' },
        { label: '문헌 조사', text: '보행자 동선 설계에 관한 자료를 찾아 사용자 중심 설계 원칙을 정리해요.' },
      ],
      extensionQuestions: [
        '안내 표지의 위치를 바꾸면 혼잡이 줄어들까?',
        '교통약자의 동선은 어떻게 따로 고려해야 할까?',
      ],
    },
  },
  {
    materialId: 'material_002',
    subjectId: 'mock_math',
    source: noExamSource,
    idea: {
      topicTitle: '지수함수를 활용한 세균 증식 패턴 분석',
      coreMaterial: '일정한 비율로 늘어나는 현상은 지수함수로 표현할 수 있다는 소재예요.',
      relatedFields: ['생명과학', '수학'],
      topicReason: '실험 자료를 그래프로 그려 보고 지수 모델이 맞는 구간과 맞지 않는 구간을 비교해 볼 수 있어요.',
      goal: '증식 자료를 지수함수로 모델링하고, 모델이 맞지 않는 구간의 원인을 설명한다.',
      methods: [
        { label: '자료 수집', text: '공개된 증식 실험 자료나 교과서 자료를 표로 정리해요.' },
        { label: '모델링', text: '로그 그래프로 바꿔 직선에 가까운 구간을 찾아요.' },
      ],
      extensionQuestions: ['증식이 멈추는 이유를 수식으로 어떻게 나타낼 수 있을까?'],
    },
  },
  {
    materialId: 'material_003',
    subjectId: 'mock_kor',
    source: noExamSource,
    idea: {
      topicTitle: '서로 다른 매체의 사회문제 보도 방식 비교',
      coreMaterial: '같은 사실도 매체에 따라 강조점과 표현이 달라진다는 소재예요.',
      relatedFields: ['국어', '사회'],
      topicReason: '실제 기사와 영상 뉴스를 함께 비교하면 매체 특성이 전달 방식에 주는 영향을 설명할 수 있어요.',
      goal: '같은 사회문제를 다룬 신문·영상·SNS 게시물을 비교해 매체별 표현 방식의 차이를 분석한다.',
      methods: [
        { label: '자료 수집', text: '같은 주제를 다룬 매체 3종의 자료를 모아요.' },
        { label: '비교 분석', text: '제목·근거·이미지 사용을 비교표로 정리해요.' },
      ],
      extensionQuestions: ['어떤 표현이 독자의 판단에 가장 큰 영향을 줄까?'],
    },
  },
  {
    materialId: 'material_004',
    subjectId: 'mock_sci',
    source: noExamSource,
    idea: {
      topicTitle: '건물 단열 방식에 따른 에너지 효율과 친환경 기술 적용 가능성',
      coreMaterial: '열의 이동을 줄이면 같은 에너지로 더 오래 온도를 유지할 수 있다는 소재예요.',
      relatedFields: ['통합과학', '환경'],
      topicReason: '간단한 상자 모형으로 단열재별 온도 변화를 측정해 볼 수 있어요.',
      goal: '단열재 종류에 따른 온도 유지 시간을 비교하고 학교 건물에 적용할 방안을 제안한다.',
      methods: [{ label: '실험', text: '같은 크기의 상자에 단열재를 바꿔 넣고 30분 동안 온도를 기록해요.' }],
      extensionQuestions: ['비용까지 고려하면 어떤 단열재가 가장 알맞을까?'],
    },
  },
  {
    materialId: 'material_005',
    subjectId: 'mock_soc',
    source: noExamSource,
    idea: {
      topicTitle: '인구 구조 변화 자료로 본 지역 소멸 위기와 대응 정책',
      coreMaterial: '출생과 이동의 변화가 지역의 미래를 바꾼다는 소재예요.',
      relatedFields: ['사회', '통계'],
      topicReason: '공공 통계로 우리 지역의 인구 변화를 직접 그래프로 그려 볼 수 있어요.',
      goal: '지역 인구 통계를 분석해 인구 구조 변화의 특징과 대응 정책을 제안한다.',
      methods: [{ label: '통계 분석', text: '공공데이터에서 10년간 연령별 인구를 찾아 그래프로 정리해요.' }],
      extensionQuestions: ['다른 지역의 정책 중 우리 지역에 맞는 것은 무엇일까?'],
    },
  },
]

export const fixturePersonalMockExamMaterials: PersonalMockExamMaterial[] = []
