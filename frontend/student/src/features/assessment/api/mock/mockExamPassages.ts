import localPassages, { passagesSource } from 'virtual:lh-mock-exam-passages'
import type { MockExamMaterial } from '../types.ts'

// 모의고사 60선 원문 지문 (로컬 개발 전용, 2026-10-29 · A26 2026-11-17 공급 방식 변경).
// 원문은 PDF가 아닌 텍스트이며, 재배포 권한이 확인되지 않아 Git에 넣지 않는다 (P-24, API-OD-A11).
// 개발 서버 Plugin(tools/mockExamPassagesPlugin.ts)이 ASSESSMENT_MOCK_EXAM_PASSAGES_FILE 또는 저장소 안 Git 제외 파일
// (mockExamPassages.local.json, materialId → 원문)을 읽어 준다. 없으면 passage는 빈 문자열 그대로 — 원문을 만들어 채우지 않는다.

/** 원문 지문 공급 상태: 화면이 '원문 없음'의 이유(파일 미연결)를 안내할 때 쓴다 */
export const mockExamPassageSource: 'CONFIGURED_FILE' | 'REPO_LOCAL_FILE' | 'NONE' = passagesSource

export function withLocalMockExamPassages(materials: MockExamMaterial[]): MockExamMaterial[] {
  for (const material of materials) {
    const passage = localPassages[material.materialId]
    if (material.research && passage) material.research.passage = passage
  }
  return materials
}
