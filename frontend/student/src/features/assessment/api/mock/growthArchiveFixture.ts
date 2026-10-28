import type { ArchiveFavoriteRequest, GrowthRecord } from '../types.ts'

// 성장 기록·보관함 Canonical Fixture (Stage 1, 시연 데이터). 관련 활동은 기존 수행평가·심화 탐구·결과물 ID를 그대로 쓴다.
// 성장 기록 문장은 학생이 직접 쓴 것으로 가정한 시연 문장이며 공식 학교생활기록부 문장이 아니다.

export const fixtureGrowthRecords: GrowthRecord[] = [
  {
    recordId: 'growth_001',
    title: '매체 자료의 신뢰성 평가하기',
    subjectId: 'subj_01',
    activityStartDate: '2026-09-08',
    role: '기사 3개를 골라 작성자, 발행일, 인용 자료를 표로 비교했다.',
    motivation: '같은 사건인데 기사마다 말이 달라서 이유가 궁금했다.',
    process: '기사를 고르고 비교 기준을 정한 뒤 표로 정리했다.',
    contribution: null,
    difficulty: '같은 통계를 기사마다 다르게 해석하고 있었다.',
    solution: '같은 통계를 다르게 해석한 기사를 찾아 원자료를 확인했다.',
    outcome: '비교 결과를 바탕으로 신뢰도 판단 기준을 정리했다.',
    reflection: '제목만 보고 판단하면 기사 관점에 끌려가기 쉽다는 걸 알게 됐다.',
    followUp: '보도 관점 비교를 심화 탐구로 이어가 보고 싶다.',
    relatedSourceType: 'SCHOOL_ASSESSMENT',
    relatedSourceId: 'assessment_005',
    artifactIds: [],
    createdAt: '2026-09-20T21:10:00+09:00',
    updatedAt: '2026-09-20T21:10:00+09:00',
  },
  {
    recordId: 'growth_002',
    title: '물질의 규칙성 탐구 보고서',
    subjectId: 'subj_12',
    activityStartDate: '2026-05-02',
    role: '주기율표에서 같은 족 원소의 성질을 자료로 비교했다.',
    motivation: null,
    process: '교과서와 자료 사이트에서 원소별 성질을 모아 표로 정리했다.',
    contribution: null,
    difficulty: '자료마다 단위가 달라 비교가 어려웠다.',
    solution: '단위를 하나로 맞춘 뒤 다시 표를 만들었다.',
    outcome: '족별 규칙성을 그래프로 발표했다.',
    reflection: '자료를 비교하려면 기준부터 맞춰야 한다는 걸 배웠다.',
    followUp: null,
    relatedSourceType: 'SCHOOL_ASSESSMENT',
    relatedSourceId: 'assessment_103',
    artifactIds: [],
    createdAt: '2026-05-20T20:00:00+09:00',
    updatedAt: '2026-05-20T20:00:00+09:00',
  },
  {
    recordId: 'growth_003',
    title: '지시약 색 변화로 중화점 찾기',
    subjectId: 'subj_02',
    activityStartDate: '2026-09-20',
    role: '지시약 3종을 바꿔 가며 색 변화 구간을 기록했다.',
    motivation: '수행평가에서 중화점을 정확히 찾지 못해 더 알아보고 싶었다.',
    process: null,
    contribution: null,
    difficulty: '색 변화가 빨라 정확한 순간을 놓쳤다.',
    solution: '한 방울씩 넣고 사진을 찍어 다시 확인했다.',
    outcome: null,
    reflection: '측정 방법을 바꾸면 같은 실험도 결과가 정확해질 수 있다.',
    followUp: null,
    relatedSourceType: 'ENRICHMENT_TASK',
    relatedSourceId: 'task_002',
    artifactIds: [],
    createdAt: '2026-10-05T19:00:00+09:00',
    updatedAt: '2026-10-05T19:00:00+09:00',
  },
]

/**
 * §30 즐겨찾기 상태. 계약 예시 유형(SCHOOL_ASSESSMENT)만 Fixture로 둔다 (MM-40).
 * 심화 탐구·라이브러리 즐겨찾기(P-22 Mock 전용)는 학생이 별표를 누를 때만 생긴다.
 */
export const fixtureFavorites: ArchiveFavoriteRequest[] = [
  { sourceType: 'SCHOOL_ASSESSMENT', sourceId: 'assessment_001', favorite: true },
  { sourceType: 'SCHOOL_ASSESSMENT', sourceId: 'assessment_002', favorite: true },
]

/** 즐겨찾기한 라이브러리 콘텐츠의 정렬 기준 시각이 없을 때 쓰는 고정 값 (Mock 전용) */
export const fixtureFavoriteBaseTime = '2026-10-01T09:00:00+09:00'
