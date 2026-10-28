import type { MockExamMaterial } from '../types.ts'

// 모의고사 60선 원문 지문 (로컬 개발 전용, 2026-10-29).
// 원문은 재배포 권한이 확인되지 않아 Git에 넣지 않는다 (P-24, API-OD-A11). 같은 폴더의 .gitignore가 *.local.json을 제외한다.
// mockExamPassages.local.json(materialId → 원문)이 있으면 붙이고, 없으면 passage는 빈 문자열 그대로 둔다 — 빌드는 파일 없이도 된다.
const localFiles = import.meta.glob<Record<string, string>>('./mockExamPassages.local.json', { eager: true, import: 'default' })
const localPassages: Record<string, string> = Object.values(localFiles)[0] ?? {}

export function withLocalMockExamPassages(materials: MockExamMaterial[]): MockExamMaterial[] {
  for (const material of materials) {
    const passage = localPassages[material.materialId]
    if (material.research && passage) material.research.passage = passage
  }
  return materials
}
