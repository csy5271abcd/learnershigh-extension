import type { RecommendedSource, StudentResource } from '../types.ts'

// 자료함 Canonical Fixture (Stage 1, 시연 데이터). Shape은 api-contract.md §22 + types.ts 주석(MM-30·31)의 가정을 따른다.
// 학생 자료는 시연용이다. 원문 링크(sourceUrl)는 확인된 실제 주소가 없으므로 비워 둔다.
// fileRef는 파일 저장소가 정해지지 않아 시연용 참조 문자열이며 실제 파일이 없다.

export const fixtureResources: StudentResource[] = [
  {
    resourceId: 'resource_001',
    type: 'BOOK',
    title: '통합과학2 교과서 — 산과 염기의 중화 반응 단원',
    sourceName: '학교 배부 교과서',
    sourceUrl: null,
    author: '교과서 집필진',
    publishedDate: '2025-03',
    memo: '중화점 정의와 지시약 설명이 있는 쪽을 표시해 둠',
    tags: ['중화', '교과서'],
    fileRef: null,
    createdAt: '2026-10-08T19:20:00+09:00',
    updatedAt: '2026-10-08T19:20:00+09:00',
  },
  {
    resourceId: 'resource_002',
    type: 'IMAGE',
    title: '실험 사진_모둠3.jpg',
    sourceName: '직접 촬영',
    sourceUrl: null,
    author: null,
    publishedDate: '2026-10-14',
    memo: '지시약 색 변화 순간',
    tags: ['실험'],
    fileRef: 'file_demo_image_001',
    createdAt: '2026-10-14T18:40:00+09:00',
    updatedAt: '2026-10-14T18:40:00+09:00',
  },
  {
    resourceId: 'resource_003',
    type: 'VIDEO',
    title: '중화 적정 실험 시연 영상',
    sourceName: '수업 자료',
    sourceUrl: null,
    author: null,
    publishedDate: null,
    memo: null,
    tags: [],
    fileRef: null,
    createdAt: '2026-10-12T21:00:00+09:00',
    updatedAt: '2026-10-12T21:00:00+09:00',
  },
  {
    resourceId: 'resource_004',
    type: 'LINK',
    title: 'AI 디지털교과서 관련 기사 (스크랩)',
    sourceName: '직접 저장한 링크',
    sourceUrl: null,
    author: null,
    publishedDate: null,
    memo: '논설문 근거 후보. 작성자·발행일 확인 필요',
    tags: ['AI', '논설문'],
    fileRef: null,
    createdAt: '2026-10-10T20:15:00+09:00',
    updatedAt: '2026-10-10T20:15:00+09:00',
  },
  {
    resourceId: 'resource_005',
    type: 'PDF',
    title: '중화반응_실험보고서_초안.pdf',
    sourceName: '내가 만든 파일',
    sourceUrl: null,
    author: '본인',
    publishedDate: '2026-10-15',
    memo: null,
    tags: ['보고서'],
    fileRef: 'file_demo_pdf_001',
    createdAt: '2026-10-15T22:30:00+09:00',
    updatedAt: '2026-10-15T22:30:00+09:00',
  },
]

/**
 * §22 과목별 추천 자료원 (시연용). 계약 본문이 예로 든 "탐색 후보 출처"만 쓴다.
 * 시스템이 해당 서비스에 접속하거나 링크 유효성을 확인한 것이 아니므로 homepageUrl은 비워 둔다.
 */
export const fixtureRecommendedSources: Record<string, RecommendedSource[]> = {
  subj_01: [
    { sourceName: '뉴닉', category: '뉴스·시사', homepageUrl: null, description: '시사 이슈를 쉽게 풀어 쓴 뉴스레터', searchKeywords: ['매체 비평', '여론'] },
    { sourceName: '크랩', category: '유튜브·영상', homepageUrl: null, description: '사회 이슈를 다루는 영상 채널', searchKeywords: ['미디어 리터러시'] },
    { sourceName: '국립국어원', category: '도서·역사·문학', homepageUrl: null, description: '표준어·어문 규범 자료', searchKeywords: ['어문 규범'] },
    { sourceName: 'DBpia', category: '논문·학술', homepageUrl: null, description: '국내 학술 논문 검색 (일부 유료·로그인 필요)', searchKeywords: ['매체 언어'] },
    { sourceName: 'RISS', category: '논문·학술', homepageUrl: null, description: '학위논문·학술지 검색', searchKeywords: ['논설문 쓰기'] },
  ],
  subj_02: [
    { sourceName: 'ScienceON', category: '논문·학술', homepageUrl: null, description: '과학기술 논문·보고서 검색', searchKeywords: ['중화 반응', '토양 산성화'] },
    { sourceName: 'KCI', category: '논문·학술', homepageUrl: null, description: '국내 학술지 인용 색인', searchKeywords: ['산성비'] },
    { sourceName: 'KOSIS', category: '통계·공공데이터', homepageUrl: null, description: '국가 통계 포털', searchKeywords: ['대기 오염'] },
  ],
  subj_03: [
    { sourceName: 'KOSIS', category: '통계·공공데이터', homepageUrl: null, description: '국가 통계 포털', searchKeywords: ['지역 인구'] },
    { sourceName: '뉴닉', category: '뉴스·시사', homepageUrl: null, description: '시사 이슈를 쉽게 풀어 쓴 뉴스레터', searchKeywords: ['지역 불평등'] },
  ],
}
