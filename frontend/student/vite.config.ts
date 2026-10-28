import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const configDir = dirname(fileURLToPath(import.meta.url))

interface ExamManifestEntry {
  documentId: string
  relativePath: string
  sizeBytes: number
  sha256: string
}

/**
 * 대학별 기출 PDF 개발 서버 전용 경로 (Assessment 대학별 자료, P-25 PROPOSED).
 * - `npm run dev`에서만 동작한다 (apply: 'serve'). Build 결과물에는 PDF·이 경로가 들어가지 않는다.
 * - Manifest(universityExamManifest.json)에 등록된 문서 ID만 받는다. 임의 파일 경로를 받지 않는다.
 * - 원본(references/previous-exam-questions)은 읽기만 하고, 크기·SHA-256이 Manifest와 다르면 내보내지 않는다(409).
 * 실제 서비스 제공은 서버 계약·권한·이용 허락 확인 뒤 별도로 정한다.
 */
function universityExamPdfDevServer(): Plugin {
  const manifestPath = resolve(configDir, 'src/features/assessment/api/mock/universityExamManifest.json')
  const sourceRoot = resolve(configDir, '../../references/previous-exam-questions')
  const idPattern = /^[a-z0-9-]{1,64}$/
  const hashCache = new Map<string, { mtimeMs: number; size: number; sha256: string }>()

  const loadEntries = () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { documents: ExamManifestEntry[] }
    return new Map(manifest.documents.map((entry) => [entry.documentId, entry]))
  }

  const resolveEntryPath = (entry: ExamManifestEntry) => {
    const filePath = resolve(sourceRoot, entry.relativePath)
    return filePath.startsWith(sourceRoot + sep) && filePath.toLowerCase().endsWith('.pdf') ? filePath : null
  }

  /** AVAILABLE / MISSING / CHANGED. 같은 파일(수정 시각·크기)이면 해시를 다시 계산하지 않는다. */
  const fileState = async (entry: ExamManifestEntry): Promise<{ state: 'AVAILABLE' | 'MISSING' | 'CHANGED'; filePath: string | null }> => {
    const filePath = resolveEntryPath(entry)
    if (!filePath) return { state: 'MISSING', filePath: null }
    let stat
    try {
      stat = statSync(filePath)
    } catch {
      return { state: 'MISSING', filePath: null }
    }
    if (!stat.isFile()) return { state: 'MISSING', filePath: null }
    if (stat.size !== entry.sizeBytes) return { state: 'CHANGED', filePath }
    const cached = hashCache.get(filePath)
    let sha256 = cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size ? cached.sha256 : undefined
    if (!sha256) {
      sha256 = createHash('sha256').update(await readFile(filePath)).digest('hex')
      hashCache.set(filePath, { mtimeMs: stat.mtimeMs, size: stat.size, sha256 })
    }
    return { state: sha256 === entry.sha256 ? 'AVAILABLE' : 'CHANGED', filePath }
  }

  return {
    name: 'learnershigh-university-exam-pdf-dev-server',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__dev/university-exams', (request, response, next) => {
        void (async () => {
          const sendJson = (status: number, body: unknown) => {
            response.statusCode = status
            response.setHeader('Content-Type', 'application/json; charset=utf-8')
            response.setHeader('Cache-Control', 'no-store')
            response.end(JSON.stringify(body))
          }
          if (request.method !== 'GET' && request.method !== 'HEAD') {
            response.setHeader('Allow', 'GET, HEAD')
            sendJson(405, { code: 'METHOD_NOT_ALLOWED' })
            return
          }
          const path = (request.url ?? '').split('?')[0]
          const entries = loadEntries()
          if (path === '/status') {
            const documents = []
            for (const entry of entries.values()) documents.push({ documentId: entry.documentId, state: (await fileState(entry)).state })
            sendJson(200, { documents })
            return
          }
          const match = /^\/files\/([^/]+)\.pdf$/.exec(path)
          let documentId = ''
          try {
            documentId = match ? decodeURIComponent(match[1]) : ''
          } catch {
            documentId = ''
          }
          const entry = idPattern.test(documentId) ? entries.get(documentId) : undefined
          if (!entry) {
            sendJson(404, { code: 'UNIVERSITY_RESOURCE_NOT_FOUND' })
            return
          }
          const { state, filePath } = await fileState(entry)
          if (state === 'MISSING' || !filePath) {
            sendJson(404, { code: 'FILE_NOT_FOUND' })
            return
          }
          if (state === 'CHANGED') {
            sendJson(409, { code: 'FILE_CHANGED' })
            return
          }
          response.statusCode = 200
          response.setHeader('Content-Type', 'application/pdf')
          response.setHeader('Content-Length', String(entry.sizeBytes))
          response.setHeader('Cache-Control', 'no-store')
          response.setHeader('X-Content-Type-Options', 'nosniff')
          response.setHeader('Content-Disposition', 'inline')
          if (request.method === 'HEAD') {
            response.end()
            return
          }
          response.end(await readFile(filePath))
        })().catch(next)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), universityExamPdfDevServer()],
  // 세 Surface를 동시에 실행할 수 있도록 Surface마다 고정 Port를 쓴다.
  server: {
    port: 5173,
    strictPort: true,
  },
})
