// 시연 결과물 품질 개선: 선택한 학생의 결과물에 한글 보고서 PDF(표 포함)·한글 라벨 그래프 PNG를 **새 버전**으로 추가한다.
// usage: node improve-artifacts.mjs <chrome.exe> <outJson> stu_demo_001 [stu_demo_004 ...]
// - 기존 ArtifactVersion을 덮어쓰지 않는다(§ 새 버전 업로드, expectedLatestVersionId로 순서 보장). 피드백 Snapshot은 요청 당시 버전 그대로.
// - 학생 Header는 그 학생 본인 결과물에만 쓴다. 같은 정식본 버전이 이미 있으면 건너뛴다(재실행 안전).
// - 모든 내용은 합성 시연 결과물이다(실제 학생 제출물·실측값 아님). 파일에도 그렇게 적는다.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'

const [chrome, outJson, ...sids] = process.argv.slice(2)
const SEED = 'C:/learnershigh-extension/docs/specs/suyeon/assessment-15schools-60students-seed-202611'
const roster = JSON.parse(readFileSync(`${SEED}/SYNTHETIC-STUDENTS.json`, 'utf8'))
const manifest = JSON.parse(readFileSync(`${SEED}/SEED-MANIFEST.json`, 'utf8'))
const API = 'http://localhost:18080'
const MARK = '한글 정식본'
const sha = (b) => createHash('sha256').update(b).digest('hex')
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

const browser = await chromium.launch({ executablePath: chrome })
const page = await (await browser.newContext({ locale: 'ko-KR' })).newPage()
const results = []

function reportHtml(s, a) {
  const rows = [['1차 조사', '자료 3건 비교', '근거 출처·시점 정리'], ['2차 분석', '핵심 개념 적용', '사례 2개 분석'], ['3차 정리', '결론·개선 방향', '발표 자료 초안']]
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><style>
  body{font-family:'Malgun Gothic','맑은 고딕',sans-serif;margin:48px;color:#1d1f23;font-size:13px;line-height:1.7}
  h1{font-size:22px;margin:0 0 6px} .meta{color:#555;margin-bottom:18px} h2{font-size:15px;border-left:4px solid #2563eb;padding-left:8px;margin-top:22px}
  table{border-collapse:collapse;width:100%;margin-top:8px} th,td{border:1px solid #c9ced6;padding:6px 8px;text-align:left} th{background:#eef2f8}
  .note{margin-top:28px;padding:10px;background:#fff6e0;color:#6b4a00;font-size:11.5px}</style>
  <h1>${esc(a.title.replace('[DEMO-15S-2026] ', ''))}</h1>
  <div class="meta">${esc(s.school.name)} ${s.grade}학년 · ${esc(s.displayName)} · 2026학년도 ${a.semester}학기 · 과목 ${esc(a.subjectName)}</div>
  <h2>1. 탐구 주제와 동기</h2><p>${esc(a.subjectName)} 수업에서 배운 개념을 실제 생활 사례에 적용해 보고 싶어 이 주제를 골랐다. 수업 중 생긴 질문을 출발점으로 삼아 자료를 찾고 근거를 정리했다.</p>
  <h2>2. 탐구 과정</h2><table><tr><th>단계</th><th>활동</th><th>산출</th></tr>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table>
  <h2>3. 결과</h2><p>조사한 자료를 비교한 결과, 같은 현상이라도 자료의 출처와 조사 시점에 따라 해석이 달라질 수 있음을 확인했다. 핵심 근거를 표로 정리하니 주장과 근거의 연결이 분명해졌다.</p>
  <h2>4. 어려웠던 점과 개선 방향</h2><p>근거 자료를 고르는 기준을 정하는 것이 어려웠다. 다음에는 자료 선정 기준을 먼저 세우고, 반대 관점의 근거도 함께 검토하겠다.</p>
  <h2>5. 배운 점</h2><p>결과만이 아니라 과정과 근거를 기록하는 것이 다음 탐구의 출발점이 된다는 것을 배웠다.</p>
  <div class="note">합성 시연 결과물입니다. 실제 학생 제출물·학교 평가 자료·실측값이 아닙니다. (LearnersHigh Assessment 개발 시연용)</div></html>`
}
function chartHtml(s, a) {
  const vals = [32, 45, 58, 71, 83]
  const labels = ['1회', '2회', '3회', '4회', '5회']
  const bars = vals.map((v, i) => `<rect x="${90 + i * 110}" y="${360 - v * 3}" width="60" height="${v * 3}" fill="#5c8cdc"/><text x="${120 + i * 110}" y="${352 - v * 3}" text-anchor="middle" font-size="14">${v}</text><text x="${120 + i * 110}" y="384" text-anchor="middle" font-size="14">${labels[i]}</text>`).join('')
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><body style="margin:0;font-family:'Malgun Gothic',sans-serif;background:#fff">
  <svg width="720" height="460" xmlns="http://www.w3.org/2000/svg"><text x="360" y="34" text-anchor="middle" font-size="20" font-weight="700">${esc(a.subjectName)} 탐구 결과 그래프</text>
  <text x="360" y="58" text-anchor="middle" font-size="13" fill="#666">${esc(s.school.name)} ${s.grade}학년 · 합성 예시값(실측 아님)</text>
  <line x1="70" y1="360" x2="680" y2="360" stroke="#333"/><line x1="70" y1="80" x2="70" y2="360" stroke="#333"/>${bars}
  <text x="20" y="220" font-size="13" transform="rotate(-90 20 220)">측정값(합성)</text><text x="375" y="420" text-anchor="middle" font-size="13">반복 횟수</text></svg></body></html>`
}

for (const sid of sids) {
  const s = roster.students.find((x) => x.studentId === sid)
  const rec = manifest.students[sid]
  const ST = { 'X-Assessment-Student-Id': sid }
  const a = Object.values(rec.assessments).find((x) => x.assessmentId === rec.note.assessmentId)
  for (const artifact of rec.artifacts ?? []) {
    const versions = (await (await fetch(`${API}/api/student/assessment/artifacts/${artifact.artifactId}/versions`, { headers: ST })).json()).items ?? []
    if (versions.some((v) => (v.changeNote ?? '').includes(MARK))) {
      results.push({ sid, artifactId: artifact.artifactId, skipped: 'already' })
      continue
    }
    const isGraph = artifact.title.includes('그래프')
    let bytes
    let name
    let type
    if (isGraph) {
      await page.setViewportSize({ width: 720, height: 460 })
      await page.setContent(chartHtml(s, a), { waitUntil: 'load' })
      bytes = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 720, height: 460 } })
      name = `${a.subjectName} 결과 그래프(한글).png`
      type = 'image/png'
    } else {
      await page.setContent(reportHtml(s, a), { waitUntil: 'load' })
      bytes = await page.pdf({ format: 'A4', printBackground: true })
      name = `${a.subjectName} 탐구 보고서(한글).pdf`
      type = 'application/pdf'
    }
    const latest = versions.reduce((best, v) => (!best || v.versionNumber > best.versionNumber ? v : best), null)
    const form = new FormData()
    form.append('file', new Blob([bytes], { type }), name)
    form.append('changeNote', `${MARK}: 한글 보고서·표/그래프 보완 (합성 시연 결과물)`)
    if (latest) form.append('expectedLatestVersionId', latest.versionId)
    const response = await fetch(`${API}/api/student/assessment/artifacts/${artifact.artifactId}/versions`, { method: 'POST', headers: ST, body: form })
    const body = await response.json().catch(() => null)
    const download = Buffer.from(await (await fetch(`${API}/api/student/assessment/artifacts/${artifact.artifactId}/versions/${body?.versionId}/file`, { headers: ST })).arrayBuffer())
    results.push({ sid, school: s.school.name, artifactId: artifact.artifactId, title: artifact.title, status: response.status, versionId: body?.versionId, versionNumber: body?.versionNumber, fileName: name, sizeBytes: bytes.length, sha256: sha(bytes), downloadMatches: sha(download) === sha(bytes), previousVersions: versions.length })
    console.log(sid, response.status, name, `${(bytes.length / 1024) | 0}KB`, 'v' + body?.versionNumber, 'sha-match', sha(download) === sha(bytes))
  }
}
await browser.close()
writeFileSync(outJson, JSON.stringify({ at: new Date().toISOString(), results }, null, 2) + '\n', 'utf8')
