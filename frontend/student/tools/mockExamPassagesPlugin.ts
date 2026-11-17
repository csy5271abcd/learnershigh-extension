import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

// 심화 탐구 모의고사 60선 원문 지문 공급 (A26, 2026-11-17). Student·Admin 개발 서버가 같이 쓴다.
// 원문 지문은 재배포 권한이 확인되지 않아 Git에 없다(P-24, API-OD-A11). 전에는 저장소 안 Git 제외 파일
// (api/mock/mockExamPassages.local.json)만 빌드 시점에 읽어서, 다른 폴더(통합 Worktree·새 Clone)에서는 원문이 비었다.
// 이제 ASSESSMENT_MOCK_EXAM_PASSAGES_FILE(절대 경로, 환경 변수 또는 .env.local)로 파일을 지정할 수 있다. 없으면 저장소 안 파일.
// - 원문은 PDF가 아니라 텍스트다(materialId → 지문 원문). PDF 경로·Viewer를 쓰지 않는다.
// - 형식 검사: 객체, 키는 EN-nn/KO-nn, 값은 문자열(최대 20,000자). 어긋나면 원문을 싣지 않고(빈 값) 경고만 남긴다.
// - 개발 서버(serve) 전용: 빌드 결과물에는 원문을 넣지 않는다(배포 권한 미확인).
export const MOCK_EXAM_PASSAGES_MODULE = 'virtual:lh-mock-exam-passages'
const resolvedId = '\0' + MOCK_EXAM_PASSAGES_MODULE
const repoLocalFile = resolve(dirname(fileURLToPath(import.meta.url)), '../src/features/assessment/api/mock/mockExamPassages.local.json')
const ID = /^(EN|KO)-\d{2}$/

type Source = 'CONFIGURED_FILE' | 'REPO_LOCAL_FILE' | 'NONE'

export function readMockExamPassages(configured: string | undefined): { source: Source; passages: Record<string, string>; problem: string | null } {
  const path = configured?.trim()
  const file = path && isAbsolute(path) ? resolve(path) : repoLocalFile
  const source: Source = path && isAbsolute(path) ? 'CONFIGURED_FILE' : 'REPO_LOCAL_FILE'
  if (path && !isAbsolute(path)) return { source: 'NONE', passages: {}, problem: 'ASSESSMENT_MOCK_EXAM_PASSAGES_FILE는 절대 경로여야 해요' }
  if (!existsSync(file) || !statSync(file).isFile()) return { source: 'NONE', passages: {}, problem: source === 'CONFIGURED_FILE' ? '지정한 원문 파일이 없어요' : null }
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('객체가 아님')
    const passages: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!ID.test(key) || typeof value !== 'string' || value.length > 20_000) throw new Error(`형식이 다른 항목 ${key.slice(0, 16)}`)
      passages[key] = value
    }
    return { source, passages, problem: null }
  } catch (error) {
    return { source: 'NONE', passages: {}, problem: `원문 파일 형식 오류(${error instanceof Error ? error.message : 'unknown'})` }
  }
}

export function mockExamPassagesPlugin(options: { file?: string } = {}): Plugin {
  let serve = false
  return {
    name: 'learnershigh-mock-exam-passages',
    configResolved(config) {
      serve = config.command === 'serve'
    },
    resolveId(id) {
      return id === MOCK_EXAM_PASSAGES_MODULE ? resolvedId : undefined
    },
    load(id) {
      if (id !== resolvedId) return undefined
      if (!serve) return 'export const passagesSource = "NONE"; export default {}'
      const { source, passages, problem } = readMockExamPassages(options.file)
      const count = Object.keys(passages).length
      console.info(`[mock-exam-passages] 모의고사 원문 지문: ${count}개 (${source === 'CONFIGURED_FILE' ? '설정 파일' : source === 'REPO_LOCAL_FILE' ? '저장소 로컬 파일' : '없음'})${problem ? ` — ${problem}` : ''}`)
      return `export const passagesSource = ${JSON.stringify(count > 0 ? source : 'NONE')}; export default ${JSON.stringify(passages)}`
    },
  }
}
