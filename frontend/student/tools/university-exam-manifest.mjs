// 대학별 기출 PDF Manifest 점검·갱신 (Assessment 대학별 자료, P-25 PROPOSED). 개발 도구이며 앱 번들에 들어가지 않는다.
//
//   npm run exam-manifest            실제 폴더와 Manifest를 대조한다 (문제가 있으면 exit 1)
//   npm run exam-manifest -- --write 새 PDF를 "문항 정보 미확인" 문서로 추가하고, 바뀐 파일은 크기·해시·쪽 수를 갱신한다
//
// 원본 PDF(references/previous-exam-questions)는 읽기만 한다. 문항·구획 쪽은 이 도구가 만들지 않는다 —
// 사람이 원문을 확인해 Manifest의 questions에 적는다 (확인 안 된 문항·쪽을 자동으로 만들어 넣지 않는다).
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const studentDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = join(studentDir, 'src/features/assessment/api/mock/universityExamManifest.json')
const sourceRoot = resolve(studentDir, '../../references/previous-exam-questions')
const universities = { snu: { university: '서울대학교', universityName: '서울대학교' }, kaist: { university: 'KAIST', universityName: '한국과학기술원' } }
const write = process.argv.includes('--write')

function listPdfs(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return listPdfs(path)
    return entry.isFile() && entry.name.toLowerCase().endsWith('.pdf') ? [path] : []
  })
}

async function inspect(path) {
  const data = readFileSync(path)
  const sha256 = createHash('sha256').update(data).digest('hex')
  let pageCount = null
  let error = null
  try {
    const task = getDocument({ data: new Uint8Array(data), verbosity: 0, isEvalSupported: false, disableFontFace: true, useSystemFonts: false })
    const pdf = await task.promise
    pageCount = pdf.numPages
    await task.destroy()
  } catch (reason) {
    error = reason instanceof Error ? reason.message : String(reason)
  }
  return { sizeBytes: statSync(path).size, sha256, pageCount, error }
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const problems = []
const notes = []
const byPath = new Map(manifest.documents.map((document) => [document.relativePath.normalize('NFC'), document]))
const ids = new Set()
for (const document of manifest.documents) {
  if (ids.has(document.documentId)) problems.push(`중복 문서 ID: ${document.documentId}`)
  ids.add(document.documentId)
}

const files = listPdfs(sourceRoot).sort()
const seenHashes = new Map()
for (const path of files) {
  const relativePath = relative(sourceRoot, path).split(sep).join('/').normalize('NFC')
  const facts = await inspect(path)
  if (facts.error) problems.push(`열 수 없는 PDF(손상 의심): ${relativePath} — ${facts.error}`)
  if (seenHashes.has(facts.sha256)) problems.push(`내용이 같은 파일: ${relativePath} = ${seenHashes.get(facts.sha256)}`)
  seenHashes.set(facts.sha256, relativePath)
  const document = byPath.get(relativePath)
  if (!document) {
    const folder = relativePath.split('/')[0]
    const year = /(\d{4})학년도/.exec(relativePath)?.[1]
    if (!universities[folder] || !year || !facts.pageCount) {
      problems.push(`Manifest에 없음 (자동 추가 불가: 대학 폴더·학년도·쪽 수 확인 필요): ${relativePath}`)
      continue
    }
    if (!write) {
      problems.push(`Manifest에 없음: ${relativePath} (--write로 "문항 정보 미확인" 문서로 추가)`)
      continue
    }
    const fileName = relativePath.split('/').pop()
    manifest.documents.push({
      documentId: `${folder}-${year}-${facts.sha256.slice(0, 8)}`,
      ...universities[folder],
      academicYear: Number(year),
      category: 'OTHER',
      examType: '확인 전',
      title: fileName.replace(/\.pdf$/i, '').replace(/_/g, ' '),
      subjectAreas: [],
      relativePath,
      fileName,
      sizeBytes: facts.sizeBytes,
      sha256: facts.sha256,
      pageCount: facts.pageCount,
      indexStatus: 'NONE',
      questions: [],
    })
    notes.push(`추가함 (유형·과목·문항은 원문 확인 후 직접 적기): ${relativePath}`)
    continue
  }
  byPath.delete(relativePath)
  const changed = document.sizeBytes !== facts.sizeBytes || document.sha256 !== facts.sha256
  const pagesDiffer = facts.pageCount !== null && document.pageCount !== facts.pageCount
  if (changed || pagesDiffer) {
    if (!write) {
      problems.push(`파일이 Manifest와 다름: ${relativePath} (크기 ${document.sizeBytes}→${facts.sizeBytes}, 쪽 ${document.pageCount}→${facts.pageCount})`)
      continue
    }
    Object.assign(document, { sizeBytes: facts.sizeBytes, sha256: facts.sha256, pageCount: facts.pageCount ?? document.pageCount })
    if (document.questions.length > 0) {
      // 내용이 바뀌면 이전 문항 쪽을 믿을 수 없다. 다시 확인할 때까지 원문 열람만 둔다.
      document.questions = []
      document.indexStatus = 'NONE'
    }
    notes.push(`갱신함 (문항 인덱스는 다시 확인 필요): ${relativePath}`)
  }
}
for (const [relativePath, document] of byPath) problems.push(`파일 없음: ${relativePath} (${document.documentId})`)

const counts = Object.keys(universities).map((folder) => `${folder} ${files.filter((path) => relative(sourceRoot, path).split(sep)[0] === folder).length}개`)
console.log(`PDF ${files.length}개 (${counts.join(', ')}) · Manifest ${manifest.documents.length}개 · 문항 ${manifest.documents.reduce((sum, d) => sum + d.questions.length, 0)}개`)
for (const note of notes) console.log(`  · ${note}`)
if (write && notes.length > 0) {
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log('Manifest를 저장했어요.')
}
if (problems.length > 0) {
  for (const problem of problems) console.log(`  ✗ ${problem}`)
  process.exitCode = 1
} else {
  console.log('누락·중복·변경 없음 (쪽 수는 pdf.js로 다시 셈)')
}
