// A27-UX 부록 E: E2E 전용 가상 학교알리미 (127.0.0.1). 실제 학교알리미에 접속하지 않는다.
// Backend SchoolInfoClient 가 읽는 페이지 모양(학교 검색 → 상세 → 학년도 지정 평가계획 항목 → 내려받기)만 흉내 낸다.
// 기본은 '연결 실패(503)' — 다른 E2E 가 평가계획서 탭에 들어가도 아무 문서도 등록되지 않고, 확인 실패 학년도는 다음 확인 때 다시 받는다.
// 시험이 PUT /__fixture 로 학교 이름·학년도별 파일을 넣으면 그때부터 그 자료를 돌려준다(학년도마다 다른 문서).
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const port = Number(process.argv[2] ?? 18769)
const SCHOOL_UUID = '0b9c5a4e-1111-4222-8333-944455556666'
let fixture = null // { schoolName, years: { [year]: { echo, files: [{ name, base64 }] } } }
// 부록 F: 여러 학교(동명 학교) — { schools: [{ id, name, address, years }] }. 모두 가상 값(실제 학교·주소 아님)
const log = []
// 부록 J REPLAY: PUT /__fixture { replay: { manifest: '<저장소 밖 manifest 경로>', group: 'gajwa' | 'hanbit' } }.
// manifest 의 실제 학교알리미 상세·항목 HTML 과 실측 원본을 그대로 돌려준다(SHA 를 매번 확인, 다르면 404). 표본에 없는 첨부는 404.
// 실측 자료는 저장소에 두지 않는다 — 이 파일은 경로만 받는다.
let replay = null
const sha256 = (b) => createHash('sha256').update(b).digest('hex')
const replayHandle = (res, path, q) => {
  // 부록 K FIXTURE: nameOverride(상세 학교 이름 치환)·solo(같은 이름 후보 빼고 그 학교 하나만 검색)를 Fixture 에서 덮어쓸 수 있다
  const base = replay.groups[replay.group]
  const group = { ...base, ...(replay.nameOverride !== undefined ? { nameOverride: replay.nameOverride } : {}), ids: replay.solo ? base.ids.slice(0, 1) : base.ids }
  const shl = q.SHL_IDF_CD ?? ''
  if (path === '/Main.do') return html(res, 200, '<html>main</html>')
  if (path === '/ei/ss/Pneiss_f01_l0.do') {
    log.push(`search SEARCH_MODE=${q.SEARCH_MODE ?? ''}`)
    return html(res, 200, `전체(${group.ids.length}) <a href="javascript:goDetailSearch('3')">고등학교(${group.ids.length})</a>`
      + group.ids.map((id) => `<a onclick="searchSchul('${id}')">학교</a>`).join(''))
  }
  if (path === '/ei/ss/Pneiss_b01_s0.do') {
    log.push(`detail ${shl}`)
    const file = group.ids.includes(shl) ? replay.details[shl] : null
    if (!file) return html(res, 404, 'none')
    let page = readFileSync(file, 'utf8')
    if (group.nameOverride) page = page.replace(/HG_NM\s*:\s*"[^"]+"/g, `HG_NM : "${group.nameOverride}"`)
    return html(res, 200, page)
  }
  if (path.startsWith('/ei/pp/')) {
    const chasu = q.JG_CHASU ?? '3'
    log.push(`item ${shl} ${q.JG_YEAR} ${chasu}`)
    const file = group.ids.includes(shl) ? replay.items[`${shl}|${q.JG_YEAR}|${chasu}`] : null
    return file ? html(res, 200, readFileSync(file, 'utf8')) : html(res, 404, 'none')
  }
  if (path === '/servlets/EiFileDownLoad.do') {
    const key = `${shl}|${q.JG_YEAR}|${q.JG_CHASU}|${q.FILE_SEQ}`
    const f = group.ids.includes(shl) ? replay.files[key] : null
    const bytes = f ? readFileSync(f.path) : null
    if (!bytes || sha256(bytes) !== f.sha256) {
      log.push(`download ${key} 404`)
      return html(res, 404, '<html>파일을 찾을 수 없습니다</html>')
    }
    log.push(`download ${key} 200`)
    res.writeHead(200, { 'Content-Type': 'application/octet-stream', ...(f.disposition ? { 'Content-Disposition': f.disposition } : {}) })
    return res.end(bytes)
  }
  return html(res, 404, 'not found')
}
// 부록 H (LIVE-derived): fixture.realSearch = 검색 첫 화면은 2곳 + '고등학교(N) 더보기', SEARCH_MODE=3 이면 전체.
// fixture.realAddress = 실측 주소 표기(<span class="mt">주소 :</span>값</span>).
// years[y].chasu = { '1': { month: 4, files }, '3': { month: 9, files } } — 실측 '자료기준일'(select_trans_dt)·JG_CHASU 구조.
const chasuData = (data, chasu) => (data?.chasu ? data.chasu[chasu] : data)
const latestChasu = (data) => (data?.chasu ? String(Math.max(...Object.keys(data.chasu).map(Number))) : null)

const html = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=UTF-8' })
  res.end(body)
}

const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
  })

const params = (raw) => {
  const out = {}
  for (const part of (raw ?? '').split('&')) {
    const eq = part.indexOf('=')
    if (eq > 0) {
      try {
        out[decodeURIComponent(part.slice(0, eq).replace(/\+/g, ' '))] = decodeURIComponent(part.slice(eq + 1).replace(/\+/g, ' '))
      } catch {
        // EUC-KR 검색어는 해석하지 않는다(검색은 학교 이름과 무관하게 fixture 학교 하나를 돌려준다)
      }
    }
  }
  return out
}

const schoolOf = (id) => fixture.schools?.find((s) => s.id === id) ?? { name: fixture.schoolName, address: fixture.address ?? null, years: fixture.years }

createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`)
  const body = await readBody(req)
  const q = { ...params(url.search.slice(1)), ...(req.method === 'POST' ? params(body.toString('latin1')) : {}) }
  if (url.pathname === '/health') return html(res, 200, 'ok')
  if (url.pathname === '/__fixture') {
    if (req.method === 'PUT') fixture = JSON.parse(body.toString('utf8'))
    if (req.method === 'DELETE') fixture = null
    replay = fixture?.replay ? { ...JSON.parse(readFileSync(fixture.replay.manifest, 'utf8')), group: fixture.replay.group, nameOverride: fixture.replay.nameOverride, solo: fixture.replay.solo === true } : null
    log.length = 0
    return html(res, 204, '')
  }
  if (url.pathname === '/__log') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify(log))
  }
  log.push(`${url.pathname}${q.JG_YEAR ? ` JG_YEAR=${q.JG_YEAR}` : ''}`)
  if (!fixture) return html(res, 503, 'unavailable')
  if (replay) return replayHandle(res, url.pathname, q)
  switch (url.pathname) {
    case '/Main.do':
      return html(res, 200, '<html>main</html>')
    case '/ei/ss/Pneiss_f01_l0.do': {
      const ids = fixture.schools ? fixture.schools.map((s) => s.id) : [SCHOOL_UUID]
      if (fixture.realSearch) {
        log.push(`search SEARCH_MODE=${q.SEARCH_MODE ?? ''}`)
        const shown = q.SEARCH_MODE === '3' ? ids : ids.slice(0, 2)
        return html(res, 200, `전체(${ids.length}) <a href="javascript:goDetailSearch('3')">고등학교(${ids.length})</a>`
          + shown.map((id) => `<a onclick="searchSchul('${id}')">학교</a>`).join(''))
      }
      return html(res, 200, ids.map((id) => `<a onclick="searchSchul('${id}')">학교</a>`).join(''))
    }
    case '/ei/ss/Pneiss_b01_s0.do': {
      const school = schoolOf(q.SHL_IDF_CD)
      const address = !school.address ? '' : fixture.realAddress ? `<span class="md"><span class="mt">주소 :</span>${school.address}</span>`
        : `<table><tr><th scope="row">주소</th><td>${school.address}</td></tr></table>`
      return html(res, 200, `<script>var i = { HG_NM : "${school.name}", JG_YEAR : "2026" };</script>${address}`
        + `<a onclick="loadGongSi('/ei/pp/Pneipp_b06_s0p.do', '06', '1', '교과별(학년별) 평가계획에 관한 사항', 'A', 'B', 'C', 'D')">평가계획</a>`)
    }
    case '/ei/pp/Pneipp_b06_s0p.do': {
      const year = q.JG_YEAR
      const yearData = schoolOf(q.SHL_IDF_CD).years?.[year]
      const chasu = yearData?.chasu ? (q.JG_CHASU ?? latestChasu(yearData)) : null
      const data = chasuData(yearData, chasu)
      let options = ''
      if (yearData?.chasu) {
        options = '<select name="select_trans_dt" id="select_trans_dt">' + Object.keys(yearData.chasu).sort().reverse()
          .map((c) => `<option value="${year}${c}"${c === chasu ? ' selected' : ''} >(${c}차) ${year}년 ${String(yearData.chasu[c].month).padStart(2, '0')}월</option>`).join('') + '</select>'
      }
      let page = `<html>${options}<script>function getEiFile06(seq){}</script><ul>`
      ;(data?.files ?? []).forEach((f, i) => {
        page += `<li><a href="#" onclick="getEiFile06('${i + 1}');">${f.name}</a></li>`
      })
      page += '</ul><form id="eiFileDownForm" method="post">'
      if (data?.files?.length) {
        const echo = data.echo ?? yearData?.echo
        if (echo) page += `<input type="hidden" name="JG_YEAR" value="${echo}"/>`
        page += `<input type="hidden" name="PAGE_YEAR" value="${year}"/>`
        if (chasu) page += `<input type="hidden" name="JG_CHASU" value="${chasu}"/>`
        page += `<input type="hidden" name="SHL_IDF_CD" value="${q.SHL_IDF_CD ?? ''}"/>`
      }
      return html(res, 200, `${page}</form></html>`)
    }
    case '/servlets/EiFileDownLoad.do': {
      const file = chasuData(schoolOf(q.SHL_IDF_CD).years?.[q.PAGE_YEAR], q.JG_CHASU)?.files?.[Number(q.FILE_SEQ) - 1]
      if (!file) return html(res, 404, 'none')
      res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}` })
      return res.end(Buffer.from(file.base64, 'base64'))
    }
    default:
      return html(res, 404, 'not found')
  }
}).listen(port, '127.0.0.1', () => console.log(`stub schoolinfo on ${port}`))
