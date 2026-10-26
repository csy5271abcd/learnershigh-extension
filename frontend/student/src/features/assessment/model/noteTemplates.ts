import type { NoteBlock } from '../api/types.ts'

// 탐구 노트 템플릿 10종 (assessment-inquiry.md §6-2). api-contract.md §19는 템플릿을 정적 Frontend 데이터로
// 제공하는 경우 GET Endpoint를 구현하지 않아도 된다고 정한다. templateId는 문서 추적용이며 DB PK가 아니다.
// 분류는 Mockup SN-TEMPLATE-01의 탭(기본·보고서·데이터·실험·발표·토론·글쓰기·활동) 표기를 따른다.

export type NoteTemplateCategory = '기본' | '보고서' | '데이터·실험' | '발표·토론' | '글쓰기' | '활동'

export interface NoteTemplate {
  templateId: string
  name: string
  category: NoteTemplateCategory
  blocks: NoteBlock[]
}

const define = (templateId: string, name: string, category: NoteTemplateCategory, headings: string[]): NoteTemplate => ({
  templateId,
  name,
  category,
  // §19 예시처럼 소제목(HEADING) 뒤에 빈 본문(PARAGRAPH)을 둔다.
  blocks: headings.flatMap((text, index) => [
    { blockId: `${templateId}-h${index + 1}`, type: 'HEADING', text },
    { blockId: `${templateId}-p${index + 1}`, type: 'PARAGRAPH', text: '' },
  ]),
})

export const noteTemplateCategories: NoteTemplateCategory[] = ['기본', '보고서', '데이터·실험', '발표·토론', '글쓰기', '활동']

export const noteTemplates: NoteTemplate[] = [
  define('TPL-01', '자유 탐구·수행평가 통합 노트', '기본', [
    '📌 수행평가 기본 정보',
    '📅 제출 전 확인하기',
    '🔍 탐구 내용 정리',
    '💭 탐구 과정에서 알게 된 점',
    '🌱 추가 탐구 방향',
    '⭐ 세특 연결 포인트',
    '🔗 참고자료',
  ]),
  define('TPL-02', '실험 보고서', '데이터·실험', [
    '🧪 실험 주제와 목적',
    '❓ 탐구 질문과 가설',
    '🔬 준비물·안전 수칙·실험 방법',
    '📊 측정값·표·그래프',
    '⚠️ 오차 원인과 개선',
    '💡 결과 해석·배운 점',
    '🔗 출처와 원본 데이터',
  ]),
  define('TPL-03', '주제 탐구 보고서', '보고서', [
    '🎯 탐구 주제·목표',
    '❓ 문제 제기·핵심 질문',
    '📚 배경 개념',
    '🔎 조사 방법과 출처',
    '🧩 자료 분석·논의',
    '✅ 결론과 한계',
    '🌱 후속 탐구',
  ]),
  define('TPL-04', '발표·PPT 준비', '발표·토론', [
    '🎤 발표 주제·청중',
    '🗂️ 발표 목표와 목차',
    '🖼️ 슬라이드별 핵심 내용',
    '📌 인용 이미지·통계 출처',
    '🗣️ 발표 대본',
    '⏱️ 시간·리허설 점검',
    '💭 예상 질문과 보완',
  ]),
  define('TPL-05', '독서·문학 비평', '글쓰기', [
    '📖 작품·저자·시대 배경',
    '🔍 핵심 구절과 맥락',
    '🧠 인물·주제·표현 분석',
    '⚖️ 나의 비평과 근거',
    '🔗 다른 작품·사회와 연결',
    '💬 토론 포인트',
    '📝 출처·생각의 변화',
  ]),
  define('TPL-06', '토론·논증', '발표·토론', [
    '🗣️ 논제·입장',
    '✅ 중심 주장',
    '📚 근거와 출처',
    '🔄 예상 반론',
    '🛠️ 재반박·보완',
    '🤝 토론 중 배운 점',
    '📝 최종 입장과 한계',
  ]),
  define('TPL-07', '통계·데이터 분석', '데이터·실험', [
    '📊 분석 주제·가설',
    '🗃️ 데이터 출처·수집 기준',
    '🧮 변수·전처리',
    '📈 시각화·요약 통계',
    '🔎 패턴·상관관계 해석',
    '⚠️ 편향·한계',
    '💡 결론·추가 분석',
  ]),
  define('TPL-08', '사회문제 해결 제안서', '보고서', [
    '🌍 문제 정의',
    '👥 이해관계자와 실제 영향',
    '📋 현황·공식 통계',
    '🧩 원인 분석',
    '💡 해결 방안과 실행 계획',
    '📏 평가 지표·기대 효과',
    '⚠️ 부작용·한계·참고자료',
  ]),
  define('TPL-09', '프로젝트·제작 활동', '활동', [
    '🛠️ 프로젝트 목표',
    '📐 설계·요구사항',
    '🧰 도구·자원',
    '🚀 제작 과정과 일정',
    '🧪 테스트 결과·버그',
    '🔧 개선·버전 이력',
    '🌱 배운 점과 다음 단계',
  ]),
  define('TPL-10', '모둠·협업 활동', '활동', [
    '👥 팀·역할 분담',
    '🎯 공동 목표와 일정',
    '🙋 나의 구체적인 기여',
    '🗣️ 의견 조율·소통 과정',
    '🧩 문제와 해결',
    '📁 공동 결과물·출처',
    '🌱 협업 성찰과 개선',
  ]),
]
