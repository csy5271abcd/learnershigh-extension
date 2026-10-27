// 수행평가 꿀팁 6종 (student §8 ST-05, api-contract.md §15, Mockup SA-TIPS-01~06).
// §15는 "정적 콘텐츠라면 서버 Endpoint가 필요 없다"고 정해 두었다. 그래서 API Adapter 없이 코드의 정적 콘텐츠로 둔다.
// 서버 제공으로 바뀌면 §15 응답(tipId·title·body·relatedActions)으로 바꾸면 된다. 아이콘·예시는 §15에 없는 표시용 내용이다 (MM-44).
// 안내 콘텐츠이며 학교의 공식 채점 기준·세특 내용을 보장하지 않는다. 열람 여부는 저장하지 않고 필수 단계로 쓰지 않는다.

/**
 * 관련 기능 (§15 `relatedActions`). 계약 예시는 `NOTE`·`TOPIC_SUGGESTION`뿐이라 나머지 값은 후보다 (MM-44).
 * 실제로 어디로 가는지는 화면이 정한다 (상세 안에서는 노트·주제명 추천 Modal, 꿀팁 화면에서는 각 메뉴).
 */
export type TipAction = 'TOPIC_SUGGESTION' | 'NOTE' | 'RESOURCES' | 'ENRICHMENT' | 'MOCK_EXAM'

export type TipExample =
  | { kind: 'rows'; rows: { label: string; value: string }[] }
  | { kind: 'questions'; questions: string[] }

export interface TipContent {
  tipId: string
  /** "TIP 01" 표시 번호 */
  number: string
  emoji: string
  title: string
  body: string
  example: TipExample | null
  relatedActions: TipAction[]
}

export const tipActionLabels: Record<TipAction, string> = {
  TOPIC_SUGGESTION: '주제명 추천받기',
  NOTE: '탐구 노트 열기',
  RESOURCES: '참고자료 찾아보기',
  ENRICHMENT: '심화 탐구 살펴보기',
  MOCK_EXAM: '모의고사 지문으로 탐구하기',
}

export const tips: TipContent[] = [
  {
    tipId: 'TIP01',
    number: 'TIP 01',
    emoji: '📚',
    title: '수행평가 주제는 교과 내용과 연결하세요',
    body: '이 과목에서 어떤 개념을 배웠는지, 그 개념을 어디에 써 볼 수 있는지부터 생각해 보세요. 교과 개념에서 출발해 현실의 질문으로 넓히면 탐구의 방향이 분명해져요.',
    example: {
      kind: 'rows',
      rows: [
        { label: '과목', value: '수학' },
        { label: '교과 개념', value: '지수함수' },
        { label: '탐구 방향', value: '지수함수 모델을 활용한 세균 증식 패턴 분석' },
      ],
    },
    relatedActions: ['TOPIC_SUGGESTION', 'NOTE'],
  },
  {
    tipId: 'TIP02',
    number: 'TIP 02',
    emoji: '🎯',
    title: '진로를 억지로 연결하지 않아도 괜찮아요',
    body: '모든 수행평가 주제에 희망 진로를 넣을 필요는 없어요. 교과 개념을 깊이 이해하고 탐구하는 것만으로도 의미 있는 활동이에요. 관심사나 진로가 교과 내용과 자연스럽게 이어질 때만 골라서 반영해 보세요.',
    example: null,
    relatedActions: ['TOPIC_SUGGESTION'],
  },
  {
    tipId: 'TIP03',
    number: 'TIP 03',
    emoji: '🔍',
    title: '탐구 주제를 구체적으로 설정하세요',
    body: '너무 넓은 주제보다 조사할 대상과 분석 방법이 드러나는 주제가 좋아요. 제목만 읽어도 어떤 개념으로 어떤 현상을 다루는지 알 수 있게 만들어 보세요.',
    example: {
      kind: 'rows',
      rows: [
        { label: '개선 전', value: '세균에 대해 탐구하기' },
        { label: '개선 후', value: '지수함수 모델을 활용한 세균 증식 패턴 분석' },
      ],
    },
    relatedActions: ['TOPIC_SUGGESTION'],
  },
  {
    tipId: 'TIP04',
    number: 'TIP 04',
    emoji: '📝',
    title: '탐구한 과정을 기록하세요',
    body: '최종 보고서만 남기지 말고, 조사하고 생각한 과정을 탐구 노트에 적어 두세요. 아래 질문에 답하듯 쓰면 돼요.',
    example: {
      kind: 'questions',
      questions: [
        '어떤 이유로 주제를 선택했나요?',
        '어떤 자료를 조사했나요?',
        '교과 개념을 어떻게 적용했나요?',
        '어떤 어려움이 있었고, 어떻게 해결했나요?',
        '무엇을 새롭게 배웠나요?',
      ],
    },
    relatedActions: ['NOTE'],
  },
  {
    tipId: 'TIP05',
    number: 'TIP 05',
    emoji: '🔗',
    title: '참고자료의 출처를 남기세요',
    body: '뉴스 기사, 유튜브 영상, 논문, 통계를 썼다면 제목·발행처·날짜·원본 주소를 함께 기록하세요. 노트의 참고자료 블록으로 바로 추가할 수 있어요.',
    example: null,
    relatedActions: ['RESOURCES'],
  },
  {
    tipId: 'TIP06',
    number: 'TIP 06',
    emoji: '💡',
    title: '탐구가 끝난 후에는 확장 가능성을 생각해보세요',
    body: '수행평가를 마친 뒤 새로 생긴 질문이나 관심 분야가 있다면 자율 심화 탐구로 이어 갈 수 있어요. 기존 수행평가와는 별도의 기록으로 남아요.',
    example: null,
    relatedActions: ['ENRICHMENT', 'MOCK_EXAM'],
  },
]

export function findTip(tipId: string | null | undefined): TipContent | undefined {
  return tips.find((tip) => tip.tipId === tipId)
}
