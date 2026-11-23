// 대표 학생 탐구 노트 보강(새 Revision) + 보고서 PDF·그래프 PNG 새 버전 (모두 합성 시연 자료).
// usage: node enrich-demo-students.mjs <chrome.exe> <outJson>
// - 기존 노트 PUT(expectedRevisionId)으로 새 Revision만 만든다. 이전 Revision·피드백 Snapshot은 그대로.
// - 결과물은 기존 Artifact에 새 버전으로 올린다(덮어쓰기 없음). 이미 보강했으면(표식) 건너뛴다(재실행 안전).
// - 학생 Header는 그 학생 본인에게만. 이름·학교·학년은 SYNTHETIC-STUDENTS.json(단일 원천)에서 읽는다.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'

const [chrome, outJson] = process.argv.slice(2)
const SEED = 'C:/learnershigh-extension/docs/specs/suyeon/assessment-15schools-60students-seed-202611'
const roster = JSON.parse(readFileSync(`${SEED}/SYNTHETIC-STUDENTS.json`, 'utf8'))
const manifest = JSON.parse(readFileSync(`${SEED}/SEED-MANIFEST.json`, 'utf8'))
const API = 'http://localhost:18080'
const MARK = '시연 보강본'
const sha = (b) => createHash('sha256').update(b).digest('hex')
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const call = async (method, path, headers, body) => {
  const init = { method, headers: { ...headers } }
  if (body instanceof FormData) init.body = body
  else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  const r = await fetch(API + path, init)
  const data = (r.headers.get('content-type') ?? '').includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer())
  if (r.status >= 400) throw new Error(`${method} ${path} → ${r.status} ${JSON.stringify(data).slice(0, 300)}`)
  return data
}

// 학생별 주제·내용(합성). chart: 그래프 값(합성)
const PLANS = {
  stu_demo_001: {
    topic: '개항 전후 조선의 통상 정책 변화와 그 영향',
    motive: '한국사2 수업에서 강화도 조약을 배우며, 같은 시기 조선이 왜 통상을 거부하다가 개항으로 돌아섰는지 궁금해졌다.',
    goal: '1860~1880년대 통상 정책의 흐름을 정리하고, 정책 변화가 백성의 생활과 국제 관계에 준 영향을 근거를 들어 설명한다.',
    sources: '교과서 Ⅱ단원, 국사편찬위원회 우리역사넷 연표, 학교 도서관 「한국 근대사 강의」 3장(합성 예시 목록)',
    process: '① 사건 연표 작성(1866 병인양요 ~ 1882 조미 수호 통상 조약) ② 사건별 정책 성격(거부·개방) 분류 ③ 조약 조항 중 관세·치외법권 비교 ④ 모둠 토론으로 해석 차이 정리',
    analysis: '연표 12개 사건 중 통상 거부 성격 5건, 개방 성격 7건으로 1876년을 기점으로 정책 방향이 바뀌었다. 강화도 조약은 관세 규정이 없고 치외법권을 허용해 불평등 조약의 성격이 뚜렷했고, 이후 조약에서 관세 조항이 일부 보완되었다.',
    result: '개항은 외부 압력과 내부 정책 논쟁이 함께 작용한 결과이며, 초기 조약의 불평등 조항이 이후 경제적 손실로 이어졌다는 결론을 얻었다.',
    learned: '같은 사건도 어떤 사료를 근거로 보느냐에 따라 해석이 달라질 수 있어, 출처와 시기를 함께 적는 습관이 중요하다는 것을 배웠다.',
    improve: '당시 상인·농민의 기록을 더 찾아 정책이 실제 생활에 준 변화를 보완하고 싶다.',
    table: [['연도', '사건', '정책 성격'], ['1866', '병인양요', '통상 거부'], ['1871', '신미양요', '통상 거부'], ['1876', '강화도 조약', '개방(불평등)'], ['1882', '조미 수호 통상 조약', '개방(관세 일부 인정)']],
    chart: { title: '시기별 정책 성격 사건 수(합성 정리)', xLabel: '시기', yLabel: '사건 수(건)', labels: ['1860년대', '1870년대 전반', '1870년대 후반', '1880년대 초'], series: [['통상 거부', [3, 2, 0, 0], '#c05a3c'], ['개방', [0, 1, 3, 3], '#3c6fc0']] },
  },
  stu_demo_026: {
    topic: '우리 반 학생들의 평일 수면 시간 분포 분석',
    motive: '확률과 통계에서 도수분포표와 평균·표준편차를 배우고, 친구들이 실제로 얼마나 자는지 자료로 확인해 보고 싶었다.',
    goal: '학급 30명의 평일 수면 시간(합성 설문 자료)으로 분포를 그리고, 평균·표준편차로 특징을 설명한 뒤 권장 수면 시간과 비교한다.',
    sources: '교과서 Ⅲ단원 통계, 통계청 국가통계포털(KOSIS) 청소년 생활시간 조사 항목 설명, 수업 활동지(합성 예시 목록)',
    process: '① 설문 문항 설계(익명, 1주 평균) ② 30개 응답을 30분 단위 계급으로 도수분포표 작성 ③ 평균·분산·표준편차 계산 ④ 히스토그램 작성 ⑤ 권장 수면 시간(8시간 이상)과 비교',
    analysis: '평균 6.4시간, 표준편차 약 0.8시간으로 대부분이 5.5~7.5시간 구간에 모였다. 8시간 이상 자는 학생은 2명(약 6.7%)뿐이었고, 6~6.5시간 계급의 도수가 9명으로 가장 많았다.',
    result: '우리 반의 평일 수면 시간은 권장 기준보다 약 1.6시간 짧으며, 분포가 한쪽으로 크게 치우치지 않고 평균 근처에 모여 있다.',
    learned: '평균만 보면 놓치는 정보가 있어, 분포 모양과 표준편차를 함께 보아야 자료를 제대로 해석할 수 있다는 것을 배웠다.',
    improve: '주말 수면 시간도 함께 조사해 평일과 차이를 비교하고, 표본을 학년 전체로 늘려 결과의 신뢰도를 높이고 싶다.',
    table: [['수면 시간(시간)', '도수(명)', '상대도수'], ['5.0~5.5', '2', '0.07'], ['5.5~6.0', '6', '0.20'], ['6.0~6.5', '9', '0.30'], ['6.5~7.0', '7', '0.23'], ['7.0~7.5', '4', '0.13'], ['8.0 이상', '2', '0.07']],
    chart: { title: '평일 수면 시간 도수분포(합성 설문 30명)', xLabel: '수면 시간(시간)', yLabel: '학생 수(명)', labels: ['5.0~5.5', '5.5~6.0', '6.0~6.5', '6.5~7.0', '7.0~7.5', '8.0~'], series: [['학생 수', [2, 6, 9, 7, 4, 2], '#3c6fc0']] },
  },
  stu_demo_041: {
    topic: '미세플라스틱 농도에 따른 물벼룩 생존율 변화',
    motive: '통합과학2 생태계 단원에서 미세플라스틱 문제를 듣고, 작은 수생 생물에게 어떤 영향을 주는지 직접 확인하고 싶었다.',
    goal: '미세플라스틱 농도를 0~40mg/L로 달리했을 때 72시간 뒤 물벼룩 생존율이 어떻게 달라지는지 비교하고(합성 실험 자료), 변인 통제 방법을 정리한다.',
    sources: '교과서 생태계와 환경 단원, 국립환경과학원 미세플라스틱 설명 자료, 과학실 실험 안전 수칙(합성 예시 목록)',
    process: '① 가설 설정(농도가 높을수록 생존율 감소) ② 농도 5단계 × 각 20마리 배치 ③ 수온 20℃·빛 조건 통제 ④ 24·48·72시간 생존 개체 수 기록 ⑤ 생존율 그래프 작성',
    analysis: '72시간 생존율은 0mg/L 95%, 10mg/L 88%, 20mg/L 76%, 30mg/L 61%, 40mg/L 48%로 농도가 높아질수록 꾸준히 감소했다. 20mg/L 이상에서 감소 폭이 커졌다.',
    result: '가설대로 미세플라스틱 농도와 생존율 사이에 음의 관계가 나타났다(합성 자료). 다만 개체 수가 적어 반복 실험이 필요하다.',
    learned: '통제 변인을 정확히 지키지 않으면 결과를 믿기 어렵다는 것과, 결과를 표와 그래프로 함께 정리하면 경향을 설명하기 쉽다는 것을 배웠다.',
    improve: '같은 조건으로 3회 반복하고, 입자 크기를 달리한 실험도 추가해 원인을 더 구체적으로 확인하고 싶다.',
    table: [['농도(mg/L)', '24시간', '48시간', '72시간 생존율(%)'], ['0', '20', '19', '95'], ['10', '20', '18', '88'], ['20', '19', '17', '76'], ['30', '18', '15', '61'], ['40', '17', '12', '48']],
    chart: { title: '미세플라스틱 농도별 72시간 생존율(합성 실험)', xLabel: '농도(mg/L)', yLabel: '생존율(%)', labels: ['0', '10', '20', '30', '40'], series: [['생존율', [95, 88, 76, 61, 48], '#2f8f6b']] },
  },
}

function chartSvg(c, width = 720, height = 440) {
  const max = Math.max(...c.series.flatMap((s) => s[1])) * 1.15
  const left = 80, right = width - 30, top = 70, bottom = height - 70
  const groupW = (right - left) / c.labels.length
  const barW = Math.min(46, (groupW - 16) / c.series.length)
  let bars = ''
  c.labels.forEach((label, i) => {
    c.series.forEach(([, values, color], k) => {
      const v = values[i]
      const h = ((bottom - top) * v) / max
      const x = left + i * groupW + (groupW - barW * c.series.length) / 2 + k * barW
      bars += `<rect x="${x}" y="${bottom - h}" width="${barW - 4}" height="${h}" fill="${color}"/><text x="${x + (barW - 4) / 2}" y="${bottom - h - 6}" text-anchor="middle" font-size="12">${v}</text>`
    })
    bars += `<text x="${left + i * groupW + groupW / 2}" y="${bottom + 20}" text-anchor="middle" font-size="12">${esc(label)}</text>`
  })
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => { const y = bottom - (bottom - top) * t; return `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#e3e7ee"/><text x="${left - 8}" y="${y + 4}" text-anchor="end" font-size="11">${Math.round(max * t)}</text>` }).join('')
  const legend = c.series.length > 1 ? c.series.map(([n, , color], k) => `<rect x="${right - 160}" y="${top - 40 + k * 18}" width="12" height="12" fill="${color}"/><text x="${right - 142}" y="${top - 30 + k * 18}" font-size="12">${esc(n)}</text>`).join('') : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" font-family="Malgun Gothic, sans-serif"><rect width="100%" height="100%" fill="#fff"/>
  <text x="${width / 2}" y="30" text-anchor="middle" font-size="18" font-weight="700">${esc(c.title)}</text>${ticks}
  <line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="#333"/><line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" stroke="#333"/>${bars}${legend}
  <text x="${(left + right) / 2}" y="${height - 20}" text-anchor="middle" font-size="13">${esc(c.xLabel)}</text>
  <text x="22" y="${(top + bottom) / 2}" text-anchor="middle" font-size="13" transform="rotate(-90 22 ${(top + bottom) / 2})">${esc(c.yLabel)}</text>
  <text x="${width - 10}" y="${height - 6}" text-anchor="end" font-size="10" fill="#888">합성 시연 자료 · 실측값 아님</text></svg>`
}

function reportHtml(s, a, p) {
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><style>
  body{font-family:'Malgun Gothic','맑은 고딕',sans-serif;margin:44px;color:#1d1f23;font-size:12.5px;line-height:1.75}
  h1{font-size:21px;margin:0 0 4px} .sub{font-size:14px;color:#2563eb;margin-bottom:6px} .meta{color:#555;margin-bottom:14px}
  h2{font-size:14.5px;border-left:4px solid #2563eb;padding-left:8px;margin:18px 0 6px}
  table{border-collapse:collapse;width:100%;margin:6px 0} th,td{border:1px solid #c9ced6;padding:5px 8px;text-align:left} th{background:#eef2f8}
  .fig{text-align:center;margin:8px 0} .note{margin-top:20px;padding:9px;background:#fff6e0;color:#6b4a00;font-size:11px}</style>
  <div class="sub">${esc(a.subjectName)} · 수행평가 「${esc(a.title.replace('[DEMO-15S-2026] ', ''))}」</div>
  <h1>${esc(p.topic)}</h1>
  <div class="meta">${esc(s.school.name)} ${s.grade}학년 · ${esc(s.displayName)} · 2026학년도 ${a.semester}학기</div>
  <h2>1. 탐구 동기</h2><p>${esc(p.motive)}</p>
  <h2>2. 탐구 목표</h2><p>${esc(p.goal)}</p>
  <h2>3. 자료 조사</h2><p>${esc(p.sources)}</p>
  <h2>4. 탐구 과정</h2><p>${esc(p.process)}</p>
  <h2>5. 자료 정리</h2><table>${p.table.map((r, i) => `<tr>${r.map((c) => (i === 0 ? `<th>${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('')}</table>
  <div class="fig">${chartSvg(p.chart, 620, 360)}</div>
  <h2>6. 분석</h2><p>${esc(p.analysis)}</p>
  <h2>7. 결과</h2><p>${esc(p.result)}</p>
  <h2>8. 배운 점</h2><p>${esc(p.learned)}</p>
  <h2>9. 개선 방향</h2><p>${esc(p.improve)}</p>
  <div class="note">합성 시연 결과물입니다. 학생 이름은 가명이며 실제 학생 제출물·학교 평가 자료·실측값이 아닙니다. (LearnersHigh Assessment 개발 시연용)</div></html>`
}

const blocks = (p) => {
  const out = []
  let n = 0
  const h = (t) => out.push({ blockId: `enr-h${++n}`, type: 'HEADING', text: t, attrs: { level: 2 } })
  const para = (t) => out.push({ blockId: `enr-p${++n}`, type: 'PARAGRAPH', text: t })
  h('탐구 주제'); para(p.topic)
  h('탐구 동기'); para(p.motive)
  h('탐구 목표'); para(p.goal)
  h('자료 조사'); para(p.sources)
  h('탐구 과정'); para(p.process)
  h('자료 정리'); for (const row of p.table.slice(1)) para(`${p.table[0][0]} ${row[0]}: ${row.slice(1).map((v, i) => `${p.table[0][i + 1]} ${v}`).join(', ')}`)
  h('분석'); para(p.analysis)
  h('결과'); para(p.result)
  h('배운 점'); para(p.learned)
  h('개선 방향'); para(p.improve)
  para(`(${MARK} · 합성 시연 자료)`)
  return out
}

const browser = await chromium.launch({ executablePath: chrome })
const page = await (await browser.newContext({ locale: 'ko-KR' })).newPage()
const results = []
for (const [sid, p] of Object.entries(PLANS)) {
  const s = roster.students.find((x) => x.studentId === sid)
  const rec = manifest.students[sid]
  const ST = { 'X-Assessment-Student-Id': sid }
  const a = Object.values(rec.assessments).find((x) => x.assessmentId === rec.note.assessmentId)
  const live = await call('GET', `/api/student/assessment/school-assessments/${a.assessmentId}`, ST)
  a.title = live.title
  const r = { sid, name: s.displayName, school: s.school.name, grade: s.grade, assessment: live.title, topic: p.topic }
  // 1) 노트 새 Revision
  const note = (await call('GET', `/api/student/assessment/notes?sourceType=SCHOOL_ASSESSMENT&sourceId=${a.assessmentId}`, ST)).items.find((n) => n.noteId === rec.note.noteId)
  const before = (await call('GET', `/api/student/assessment/notes/${note.noteId}/revisions`, ST)).items
  if (JSON.stringify(note.blocks).includes(MARK)) r.note = { noteId: note.noteId, skipped: true, revision: note.revisionNumber }
  else {
    const saved = await call('PUT', `/api/student/assessment/notes/${note.noteId}`, ST, { expectedRevisionId: note.revisionId, title: `${p.topic} 탐구 노트`, blocks: blocks(p) })
    const after = (await call('GET', `/api/student/assessment/notes/${note.noteId}/revisions`, ST)).items
    const first = await call('GET', `/api/student/assessment/notes/${note.noteId}/revisions/${before.sort((x, y) => x.revisionNumber - y.revisionNumber)[0].revisionId}`, ST)
    r.note = { noteId: note.noteId, from: note.revisionNumber, to: saved.revisionNumber, revisions: `${before.length}→${after.length}`, v1Unchanged: !JSON.stringify(first).includes(MARK) }
  }
  if (rec.feedback) {
    const fb = await call('GET', `/api/student/assessment/feedback-requests/${rec.feedback.requestId}`, ST)
    r.feedbackSnapshotRevision = fb.snapshot?.noteRevisionId
  }
  // 2) 결과물 새 버전
  r.files = []
  for (const artifact of (await call('GET', `/api/student/assessment/artifacts?sourceType=SCHOOL_ASSESSMENT&sourceId=${a.assessmentId}`, ST)).items) {
    const versions = (await call('GET', `/api/student/assessment/artifacts/${artifact.artifactId}/versions`, ST)).items
    if (versions.some((v) => (v.changeNote ?? '').includes(MARK))) { r.files.push({ artifact: artifact.title, skipped: true }); continue }
    const isGraph = artifact.title.includes('그래프')
    let bytes, name, type
    if (isGraph) {
      await page.setViewportSize({ width: 720, height: 440 })
      await page.setContent(`<!doctype html><html><body style="margin:0">${chartSvg(p.chart)}</body></html>`, { waitUntil: 'load' })
      bytes = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 720, height: 440 } })
      name = `${s.displayName}_${a.subjectName}_결과그래프.png`
      type = 'image/png'
    } else {
      await page.setContent(reportHtml(s, a, p), { waitUntil: 'load' })
      bytes = await page.pdf({ format: 'A4', printBackground: true })
      name = `${s.displayName}_${a.subjectName}_탐구보고서.pdf`
      type = 'application/pdf'
    }
    const latest = versions.reduce((best, v) => (!best || v.versionNumber > best.versionNumber ? v : best), null)
    const form = new FormData()
    form.append('file', new Blob([bytes], { type }), name)
    form.append('changeNote', `${MARK}: ${s.displayName} · 주제·표·그래프 보완 (합성 시연 결과물)`)
    form.append('expectedLatestVersionId', latest.versionId)
    const created = await call('POST', `/api/student/assessment/artifacts/${artifact.artifactId}/versions`, ST, form)
    const download = await call('GET', `/api/student/assessment/artifacts/${artifact.artifactId}/versions/${created.versionId}/file`, ST)
    r.files.push({ artifact: artifact.title, artifactId: artifact.artifactId, versionId: created.versionId, version: `v${created.versionNumber}`, fileName: name, sizeBytes: bytes.length, sha256: sha(bytes), downloadMatches: sha(download) === sha(bytes), previousVersions: versions.length })
  }
  results.push(r)
  console.log(JSON.stringify(r).slice(0, 400))
}
await browser.close()
writeFileSync(outJson, JSON.stringify({ at: new Date().toISOString(), results }, null, 2) + '\n', 'utf8')
