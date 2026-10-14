import type { AdminTask, AdminTaskEvidence, CaseMaterial, EvidenceStageTag, MentorCaseDetail } from '../fixtures/types.ts'

/*
 * 자료 역할 표시 (화면 표시용 파생 값 · Entity를 합치지 않는다)
 * - Evidence(과정 자료) · Version(제출본) · FinalArtifact(최종 결과물)는 서로 다른 Entity 그대로다.
 * - 역할 이름은 이미 있는 Canonical 값에서만 만든다. 파일 이름으로 역할을 추측하지 않는다.
 *   Evidence stageTag → Student 과정 자료 묶음 이름(processCategories: 계획서 · 조사 자료 · 초안 · 최종본 · 발표 자료) 그대로
 *   Version number → 초안 V1 / 수정본 V2 · V3, FinalArtifact → 최종 제출본, 안내문(guideFile) → 안내문,
 *   학생이 정리한 참고 자료(references) → 참고 자료
 * - "참고 자료"와 "조사 자료"는 Evidence stageTag만으로 나눌 수 없다. research Evidence는 모두 "조사 자료"로 두고 참고 자료로 바꾸지 않는다. (Gap)
 */

export const evidenceRoleLabel: Record<EvidenceStageTag, string> = { plan: '계획서', research: '조사 자료', draft: '초안', final: '최종본', presentation: '발표 자료' }
/** 관련 단계 (Student 과정 자료 Tag 이름) */
export const evidenceStageName: Record<EvidenceStageTag, string> = { plan: '계획', research: '조사', draft: '초안', final: '최종', presentation: '발표' }
/** Task 진행 순서 (계획 → 조사 → 초안 → 최종 → 발표) */
const evidenceOrder: EvidenceStageTag[] = ['plan', 'research', 'draft', 'final', 'presentation']

export const GUIDE_ROLE = '안내문'
export const REFERENCE_ROLE = '참고 자료'
export const FINAL_ARTIFACT_ROLE = '최종 제출본'

export const versionRole = (number: number) => (number === 1 ? '초안 V1' : `수정본 V${number}`)

/** 진행 순서 → 같은 단계 안에서는 등록 시각 순 */
export function sortEvidenceByProcess(items: readonly AdminTaskEvidence[]): AdminTaskEvidence[] {
  return [...items].sort((a, b) => evidenceOrder.indexOf(a.stageTag) - evidenceOrder.indexOf(b.stageTag) || a.createdAt.localeCompare(b.createdAt) || a.evidenceId.localeCompare(b.evidenceId))
}

export const hasFinalArtifact = (task: AdminTask) => task.finalArtifact !== null

// ---------- Mentor Activity Case 자료 ----------

/**
 * Case 자료 역할: CaseMaterial.role + 단계 · 자료 제목(Case 공개 값)으로만 만든다.
 * draft / revision 제목에 Version 표기(V1 · V2)가 있을 때만 Version을 붙인다. final은 단계가 발표면 "최종 발표 자료".
 */
export function caseMaterialRole(material: CaseMaterial, detail: MentorCaseDetail): string {
  const stage = detail.stages.find((item) => item.stageId === material.stageId)
  const version = /V(\d)/.exec(material.title)?.[1]
  switch (material.role) {
    case 'evidence':
      return '조사 자료'
    case 'draft':
      return version ? `초안 V${version}` : '초안'
    case 'revision':
      return version ? `수정본 V${version}` : '수정본'
    case 'feedback':
      return '피드백 자료'
    case 'final':
      return stage && /발표/.test(stage.title) ? '최종 발표 자료' : '최종본'
  }
}

/** "3단계 · 자료 조사" (Case 단계 순서 그대로) */
export function caseMaterialStep(material: CaseMaterial, detail: MentorCaseDetail): string {
  const index = detail.stages.findIndex((item) => item.stageId === material.stageId)
  return index < 0 ? material.stageId : `${index + 1}단계 · ${detail.stages[index].title}`
}
