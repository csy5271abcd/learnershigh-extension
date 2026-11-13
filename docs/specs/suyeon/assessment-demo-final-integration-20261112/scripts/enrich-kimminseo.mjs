// 운정고 김민서(stu_demo_001) 시연 최종 보강 (2026-11-12). 기존 API만 사용, 쓰기는 김민서 본인 Header로만.
// - 한국사2: 기존 노트 PUT(expectedRevisionId) → 새 Revision / 기존 보고서 Artifact에 새 PDF 버전 / 연표 PNG는 새 Artifact v1.
// - 과학탐구실험2(이미 COMPLETED): 노트 신규 작성(v1) / 보고서 PDF·그래프 PNG Artifact 신규.
// - 이전 Revision·Version·피드백 Snapshot은 건드리지 않는다. 표식(MARK)이 있으면 건너뛴다(재실행 안전).
// - 역사 사실은 일반 교과 수준의 확인된 사실만 쓴다. 학생 활동·실험 측정값은 합성 시연 자료로 명시한다.
// usage: node enrich-kimminseo.mjs <chrome.exe> <outDir>
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'file:///C:/learnershigh-extension/e2e/node_modules/playwright/index.mjs'

const [chrome, outDir] = process.argv.slice(2)
const API = 'http://localhost:18080'
const SID = 'stu_demo_001'
const ST = { 'X-Assessment-Student-Id': SID }
const MARK = '김민서 시연 최종본'
const KH = 'assessment_61465b8b-2776-4e9c-b314-4f502a0a84f1' // 한국사2 역사 인물·사건 탐구 보고서
const SX = 'assessment_74236811-da8f-4f83-9c9b-837b499e2a29' // 과학탐구실험2 설계 및 결과 보고서
const sha = (b) => createHash('sha256').update(b).digest('hex')
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const call = async (method, path, body) => {
  const init = { method, headers: { ...ST } }
  if (body instanceof FormData) init.body = body
  else if (body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body) }
  const r = await fetch(API + path, init)
  const data = (r.headers.get('content-type') ?? '').includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer())
  if (r.status >= 400) throw new Error(`${method} ${path} → ${r.status} ${JSON.stringify(data).slice(0, 300)}`)
  return data
}
const filesDir = join(outDir, 'files')
mkdirSync(filesDir, { recursive: true })

// ---------------- 한국사2 ----------------
const KOREAN_HISTORY = {
  title: '개항 전후 조선의 통상 정책 변화와 그 영향 탐구 노트',
  sections: [
    ['탐구 주제', '개항 전후(1863~1889) 조선의 통상 정책 변화와 그 영향\n핵심 질문: 조선은 왜 통상 수교 거부에서 개항으로 방향을 바꾸었고, 처음 맺은 조약들의 불평등한 조항은 이후 조선 사회에 어떤 영향을 주었을까?'],
    ['탐구 동기', '한국사2 수업에서 강화도 조약을 배우면서, 불과 5년 전 신미양요 때는 척화비까지 세우며 통상을 거부했던 조선이 어떻게 갑자기 개항하게 되었는지 궁금해졌다. 또 조약 내용 중 "관세 없음"이라는 표현을 보고, 이것이 실제로 백성의 생활에 어떤 영향을 주었는지 알아보고 싶었다.'],
    ['탐구 목표', '1) 흥선 대원군 시기 통상 수교 거부 정책의 배경을 이해한다.\n2) 1866년 병인양요부터 1883년 조일 통상 장정까지 사건의 전개 과정을 연표로 정리한다.\n3) 정책을 둘러싼 주요 주체(흥선 대원군, 고종과 개화 정책 추진 세력, 위정척사 유생, 외국 세력)의 입장을 비교한다.\n4) 강화도 조약·조미 수호 통상 조약·조일 통상 장정의 조항을 비교해 개항의 역사적 영향과 의의를 설명한다.'],
    ['자료 조사', '· 고등학교 한국사 교과서 근대 개항 단원\n· 국사편찬위원회 「우리역사넷」(contents.history.go.kr) 개항기 관련 서술\n· 한국학중앙연구원 「한국민족문화대백과사전」(encykorea.aks.ac.kr) \'강화도조약\', \'조미수호통상조약\', \'조일통상장정\', \'방곡령\' 항목\n자료마다 연도와 조항이 서로 맞는지 교차 확인했고, 확인하지 못한 내용은 노트에 쓰지 않았다.'],
    ['탐구 과정', '① 교과서와 우리역사넷으로 1863~1889년 주요 사건 연표를 만들었다.\n② 사건마다 "통상 거부"와 "개방·조약 체결" 중 어느 쪽 성격인지 표시했다.\n③ 백과사전 항목에서 세 조약의 핵심 조항(개항장, 영사 재판권, 관세, 최혜국 대우)을 뽑아 비교표를 만들었다.\n④ 1883년 조일 통상 장정의 방곡령 규정과 1889년 함경도 방곡령 사건을 연결해 조약 조항이 실제 생활에 준 영향을 찾아보았다.\n⑤ 모둠 토론에서 "개항은 강요된 것인가, 선택한 것인가"를 주제로 의견을 나누고 정리했다(학생 활동 기록).'],
    ['탐구 내용 ① 역사적 배경', '1863년 고종이 즉위하고 흥선 대원군이 정치를 맡으면서 서양 세력에 대한 경계가 강해졌다. 1866년 제너럴셔먼호 사건과 병인양요(프랑스), 1868년 오페르트 도굴 사건, 1871년 신미양요(미국)를 거치며 통상 수교 거부 정책이 굳어졌고, 신미양요 뒤에는 전국에 척화비를 세웠다.'],
    ['탐구 내용 ② 정책 전환', '1873년 흥선 대원군이 물러나고 고종이 직접 정치를 하면서 통상 개화론이 힘을 얻었다. 1875년 운요호 사건을 계기로 1876년 일본과 강화도 조약(조일 수호 조규)을 맺어 부산과 이후 원산(1880)·인천(1883)을 열었다. 1880년 김홍집이 가져온 「조선책략」을 계기로 미국과의 수교 논의가 일어났고, 이에 반발한 영남 만인소(1881) 같은 위정척사 운동도 일어났다. 1882년에는 청의 알선으로 조미 수호 통상 조약을 맺었다.'],
    ['탐구 내용 ③ 조약 비교', '강화도 조약: 해안 측량권과 영사 재판권(치외 법권)을 인정했고, 같은 해 맺은 조일 무역 규칙에서는 일본 상품에 관세를 매기지 않고 양곡 유출을 허용했다.\n조미 수호 통상 조약: 서양 국가와 맺은 첫 조약으로, 치외 법권과 최혜국 대우를 인정했지만 관세 조항을 두었다.\n조일 통상 장정(1883): 관세를 매기게 되었고, 식량 부족 때 곡물 수출을 막는 방곡령 규정을 넣었다. 하지만 1889년 함경도 방곡령이 일본의 항의로 철회되고 배상금까지 물게 되었다.'],
    ['분석 결과', '연표를 보면 1873년 고종의 친정을 전후로 정책 방향이 바뀌었고, 1876년 강화도 조약이 실제 전환점이었다. 다만 개항은 운요호 사건이라는 외부 압력과, 조선 내부의 통상 개화론이 함께 작용한 결과였다. 첫 조약에 관세 조항이 없고 영사 재판권을 인정한 점은 조선이 국제 조약의 의미를 충분히 알지 못한 상태에서 맺은 불평등 조약임을 보여 준다. 이후 조약에서 관세·방곡령 규정이 들어간 것은 조선이 불리한 조항을 고치려 한 노력으로 볼 수 있지만, 방곡령 사건처럼 실제로는 힘의 차이 때문에 제대로 지켜지지 못했다.'],
    ['배운 점', '같은 "개항"이라도 어느 쪽 자료를 보느냐에 따라 "강요된 개방"으로도, "근대화의 시작"으로도 해석된다는 것을 알게 되었다. 오늘날 나라 사이의 무역 협정에서도 관세와 분쟁 해결 방법이 중요하게 다뤄지는 이유를 역사 속 조약을 통해 이해할 수 있었다. 또 연도와 조항을 여러 자료로 확인하는 습관이 역사 탐구에서 꼭 필요하다는 것을 배웠다.'],
    ['후속 활동', '1) 개항장(부산·원산·인천)에서 실제로 어떤 상품이 거래되었는지 무역 자료를 더 찾아보고 싶다.\n2) 조청 상민 수륙 무역 장정(1882)까지 포함해 청·일 상인의 경쟁이 조선 상인에게 준 영향을 비교해 보고 싶다.\n3) 보고서의 연표 그림을 수업 발표 자료로 다듬을 계획이다.'],
  ],
}
const KH_TIMELINE = [
  ['1863', '고종 즉위, 흥선 대원군 집권', '배경'],
  ['1866', '제너럴셔먼호 사건 · 병인양요(프랑스)', '통상 거부'],
  ['1868', '오페르트 도굴 사건', '통상 거부'],
  ['1871', '신미양요(미국) · 척화비 건립', '통상 거부'],
  ['1873', '흥선 대원군 하야, 고종 친정', '전환'],
  ['1875', '운요호 사건', '전환'],
  ['1876', '강화도 조약(조일 수호 조규) · 조일 무역 규칙', '개항·조약'],
  ['1880', '원산 개항 · 김홍집 「조선책략」 유입', '개항·조약'],
  ['1881', '영남 만인소(위정척사 운동)', '반발'],
  ['1882', '조미 수호 통상 조약 · 임오군란', '개항·조약'],
  ['1883', '인천 개항 · 조일 통상 장정(관세·방곡령 규정)', '개항·조약'],
  ['1889', '함경도 방곡령 → 일본 항의로 철회·배상', '영향'],
]
const KH_TREATIES = [
  ['구분', '강화도 조약(1876)', '조미 수호 통상 조약(1882)', '조일 통상 장정(1883)'],
  ['상대국', '일본', '미국(청 알선)', '일본'],
  ['영사 재판권', '인정', '인정', '-'],
  ['관세', '규정 없음(무역 규칙에서 무관세)', '관세 조항 있음', '관세 부과'],
  ['최혜국 대우', '-', '처음으로 인정', '인정'],
  ['특징', '부산 외 2개 항구 개항, 해안 측량권', '서양과 맺은 첫 조약, 거중 조정', '방곡령 규정(1개월 전 통보)'],
]

// ---------------- 과학탐구실험2 ----------------
const SCI_SERIES = [
  ['단열재 없음', [60.0, 54.1, 49.2, 45.1, 41.7, 38.9, 36.6], '#9aa3ae'],
  ['신문지 3겹', [60.0, 56.0, 52.5, 49.5, 46.9, 44.6, 42.6], '#c08a3c'],
  ['에어캡 2겹', [60.0, 57.2, 54.7, 52.4, 50.4, 48.6, 46.9], '#3c6fc0'],
  ['스티로폼 상자', [60.0, 58.3, 56.7, 55.2, 53.8, 52.5, 51.3], '#2f8f6b'],
]
const SCI_TIMES = [0, 5, 10, 15, 20, 25, 30]
const SCIENCE = {
  title: '단열재 종류에 따른 보온 효과 비교 실험 노트',
  sections: [
    ['탐구 주제', '단열재 종류에 따른 보온 효과 비교 — 겨울철 도시락 보온 용기를 만든다면 어떤 재료가 가장 좋을까?'],
    ['탐구 동기', '추운 날 학원에 가져간 보온 도시락이 금방 식어서, 집에 있는 재료만으로도 열이 빠져나가는 것을 줄일 수 있는지 직접 실험해 보고 싶었다.'],
    ['가설과 변인', '가설: 공기를 많이 가두는 재료일수록 열이 덜 빠져나가 물이 천천히 식을 것이다.\n조작 변인: 단열재 종류(없음, 신문지 3겹, 에어캡 2겹, 스티로폼 상자)\n종속 변인: 30분 동안의 물 온도 변화\n통제 변인: 같은 종이컵, 처음 물 온도 60℃, 물 200mL, 뚜껑 덮음, 실내 온도 약 20℃, 디지털 온도계 같은 위치'],
    ['실험 과정', '① 종이컵 4개에 60℃ 물을 200mL씩 담고 뚜껑을 덮었다.\n② 각 컵을 단열재로 감싸거나 상자에 넣었다.\n③ 5분 간격으로 30분 동안 온도를 기록했다.\n④ 같은 실험을 3번 반복해 평균을 냈다(측정값은 합성 시연 자료).'],
    ['자료 정리', '30분 뒤 평균 온도: 단열재 없음 36.6℃, 신문지 42.6℃, 에어캡 46.9℃, 스티로폼 상자 51.3℃.\n30분 동안 내려간 온도: 23.4℃ / 17.4℃ / 13.1℃ / 8.7℃.'],
    ['분석', '모든 조건에서 처음에 빨리 식고 시간이 지날수록 천천히 식었다. 물과 주변의 온도 차이가 클수록 열이 빨리 이동하기 때문이다. 스티로폼과 에어캡처럼 작은 공기 주머니가 많은 재료는 열전도가 느린 공기를 가두고 대류를 막아 온도 하강이 작았다. 신문지는 단열 효과가 있었지만 공기층이 얇아 에어캡보다 덜했다.'],
    ['결론', '가설대로 공기를 많이 가두는 재료일수록 보온 효과가 컸다. 집에서 보온 용기를 만든다면 스티로폼 상자가 가장 좋고, 휴대성을 생각하면 에어캡으로 감싸는 방법이 현실적이다.'],
    ['배운 점과 개선', '변인을 하나만 바꾸고 나머지를 똑같이 맞춰야 결과를 비교할 수 있다는 점을 실감했다. 다음에는 단열재 두께를 같게 맞추고, 뚜껑 유무도 변인으로 넣어 열이 위쪽으로 얼마나 빠져나가는지 확인해 보고 싶다.'],
  ],
}

const blocksOf = (doc, prefix) => {
  const out = []
  let n = 0
  for (const [heading, text] of doc.sections) {
    out.push({ blockId: `${prefix}-h${++n}`, type: 'HEADING', text: heading, attrs: { level: 2 } })
    for (const para of text.split('\n')) out.push({ blockId: `${prefix}-p${++n}`, type: 'PARAGRAPH', text: para })
  }
  out.push({ blockId: `${prefix}-p${++n}`, type: 'PARAGRAPH', text: `(${MARK} · 학생 활동·측정값은 합성 시연 자료)` })
  return out
}

const table = (rows) => `<table>${rows.map((r, i) => `<tr>${r.map((c) => (i === 0 ? `<th>${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('')}</table>`
const css = `body{font-family:'Malgun Gothic','맑은 고딕',sans-serif;margin:0;color:#1d1f23;font-size:12.5px;line-height:1.75}
 .page{padding:46px 52px;page-break-after:always} .page:last-child{page-break-after:auto}
 .cover{height:960px;display:flex;flex-direction:column;justify-content:center;padding:0 70px}
 .cover .subj{font-size:16px;color:#2563eb;font-weight:700} .cover h1{font-size:30px;line-height:1.35;margin:14px 0 10px}
 .cover .q{font-size:14px;color:#444;margin-bottom:60px} .cover .who{font-size:16px;border-top:2px solid #1d1f23;padding-top:16px}
 h2{font-size:15px;border-left:4px solid #2563eb;padding-left:8px;margin:20px 0 6px} p{margin:4px 0}
 table{border-collapse:collapse;width:100%;margin:8px 0;font-size:11.5px} th,td{border:1px solid #c9ced6;padding:5px 7px;text-align:left;vertical-align:top} th{background:#eef2f8}
 img{width:100%;border:1px solid #dde2ea;margin:6px 0} .note{margin-top:18px;padding:9px;background:#fff6e0;color:#6b4a00;font-size:10.5px}`
const paras = (text) => text.split('\n').map((t) => `<p>${esc(t)}</p>`).join('')

function khReport(title, pngDataUri) {
  const s = Object.fromEntries(KOREAN_HISTORY.sections)
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><style>${css}</style>
  <div class="page cover"><div class="subj">한국사2 · 수행평가 「${esc(title)}」</div>
   <h1>개항 전후 조선의 통상 정책 변화와 그 영향</h1>
   <div class="q">조선은 왜 통상 거부에서 개항으로 돌아섰고, 첫 조약들의 불평등 조항은 무엇을 남겼을까?</div>
   <div class="who">운정고등학교 1학년 2반 1번 · 김민서<br>2026학년도 2학기 · 탐구 보고서</div></div>
  <div class="page"><h2>1. 탐구 주제와 동기</h2>${paras(s['탐구 동기'])}
   <h2>2. 탐구 질문 및 목표</h2>${paras(s['탐구 목표'])}
   <h2>3. 역사적 배경</h2>${paras(s['탐구 내용 ① 역사적 배경'])}
   <h2>4. 주요 사건과 연표</h2>${table([['연도', '사건', '성격'], ...KH_TIMELINE])}</div>
  <div class="page"><img src="${pngDataUri}" alt="개항 전후 대외 정책 흐름 연표">
   <h2>5. 정책 전환 과정</h2>${paras(s['탐구 내용 ② 정책 전환'])}
   <h2>6. 핵심 자료 조사 — 조약 비교</h2>${table(KH_TREATIES)}${paras(s['탐구 내용 ③ 조약 비교'])}</div>
  <div class="page"><h2>7. 비교·분석</h2>${paras(s['분석 결과'])}
   <h2>8. 탐구 과정 정리</h2>${paras(s['탐구 과정'])}
   <h2>9. 결론 및 느낀 점</h2>${paras(s['배운 점'])}${paras(s['후속 활동'])}
   <h2>10. 참고자료</h2>${paras(s['자료 조사'])}
   <div class="note">LearnersHigh Assessment 시연용 결과물입니다. 학생 이름은 가명이고 실제 학생 제출물이 아닙니다. 역사 사실은 교과서·우리역사넷·한국민족문화대백과사전 수준의 일반 사실로 정리했고, 모둠 토론 등 활동 기록은 합성 자료입니다.</div></div></html>`
}

const KH_PNG_LABELS = [
  ['고종 즉위', '흥선 대원군 집권'], ['제너럴셔먼호 사건', '병인양요(프랑스)'], ['오페르트', '도굴 사건'], ['신미양요(미국)', '척화비 건립'],
  ['흥선 대원군 하야', '고종 친정'], ['운요호 사건'], ['강화도 조약', '조일 무역 규칙'], ['원산 개항', '「조선책략」 유입'],
  ['영남 만인소', '(위정척사 운동)'], ['조미 수호 통상 조약', '임오군란'], ['인천 개항', '조일 통상 장정'], ['함경도 방곡령', '일본 항의로 철회·배상'],
]
function timelineSvg() {
  // 사건 간격은 연도 비례가 아니라 같은 간격(글자 겹침 방지). 연도는 각 점에 표기한다.
  const W = 1920, H = 1080, left = 150, right = 1770, y = 400
  const x = (i) => left + (i * (right - left)) / (KH_TIMELINE.length - 1)
  const color = { 배경: '#6b7280', '통상 거부': '#c0533c', 전환: '#b7791f', '개항·조약': '#2563eb', 반발: '#7c3aed', 영향: '#0f766e' }
  let marks = ''
  KH_TIMELINE.forEach(([year, , kind], i) => {
    const cx = x(i), up = i % 2 === 0, lines = KH_PNG_LABELS[i]
    const yearY = up ? y - 150 : y + 92
    marks += `<line x1="${cx}" y1="${y}" x2="${cx}" y2="${up ? y - 60 : y + 60}" stroke="${color[kind]}" stroke-width="3"/><circle cx="${cx}" cy="${y}" r="12" fill="${color[kind]}"/>
    <text x="${cx}" y="${yearY}" text-anchor="middle" font-size="28" font-weight="800" fill="${color[kind]}">${year}</text>
    ${lines.map((l, k) => `<text x="${cx}" y="${yearY + 32 + k * 26}" text-anchor="middle" font-size="19" fill="#1d1f23">${esc(l)}</text>`).join('')}`
  })
  const band = (from, to, fill) => `<rect x="${x(from) - 14}" y="${y - 9}" width="${x(to) - x(from) + 28}" height="18" rx="9" fill="${fill}"/>`
  const legend = Object.entries(color).map(([k, c], i) => `<circle cx="${560 + i * 150}" cy="${y + 282}" r="9" fill="${c}"/><text x="${574 + i * 150}" y="${y + 289}" font-size="19">${k}</text>`).join('')
  const rows = KH_TREATIES
  const colW = [220, 480, 480, 480], tx = 150, ty0 = 770, rh = 44
  let tbl = ''
  rows.forEach((r, i) => { let cx = tx; r.forEach((c, k) => { tbl += `<rect x="${cx}" y="${ty0 + i * rh}" width="${colW[k]}" height="${rh}" fill="${i === 0 ? '#eef2f8' : '#fff'}" stroke="#c9ced6"/><text x="${cx + 12}" y="${ty0 + i * rh + 29}" font-size="18" font-weight="${i === 0 || k === 0 ? 700 : 400}">${esc(c)}</text>`; cx += colW[k] }) })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Malgun Gothic, sans-serif"><rect width="100%" height="100%" fill="#fff"/>
  <text x="${W / 2}" y="70" text-anchor="middle" font-size="40" font-weight="800">개항 전후 조선의 대외 정책 흐름 (1863~1889)</text>
  <text x="${W / 2}" y="112" text-anchor="middle" font-size="22" fill="#555">한국사2 탐구 보고서 시각자료 · 운정고등학교 1학년 김민서</text>
  <line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#d6dbe3" stroke-width="16" stroke-linecap="round"/>
  ${band(0, 4, '#f3c7bd')}${band(6, 10, '#c7d7f7')}${marks}
  <text x="${x(2)}" y="${y + 225}" text-anchor="middle" font-size="22" font-weight="700" fill="#c0533c">통상 수교 거부 시기 (1863~1873)</text>
  <text x="${x(8)}" y="${y + 225}" text-anchor="middle" font-size="22" font-weight="700" fill="#2563eb">개항과 조약 체결 시기 (1876~1883)</text>${legend}
  <text x="${tx}" y="${ty0 - 18}" font-size="22" font-weight="700">주요 조약 비교</text>${tbl}
  <text x="${W - 40}" y="${H - 24}" text-anchor="end" font-size="16" fill="#888">자료: 고교 한국사 교과서 · 국사편찬위원회 우리역사넷 · 한국민족문화대백과사전 내용을 학생이 정리 · LearnersHigh 시연용(가명)</text></svg>`
}

function lineChartSvg(W = 1600, H = 900) {
  const left = 130, right = W - 330, top = 130, bottom = H - 120
  const yMin = 30, yMax = 62
  const px = (t) => left + (t / 30) * (right - left)
  const py = (v) => bottom - ((v - yMin) / (yMax - yMin)) * (bottom - top)
  let grid = ''
  for (let v = 30; v <= 60; v += 5) grid += `<line x1="${left}" y1="${py(v)}" x2="${right}" y2="${py(v)}" stroke="#e3e7ee"/><text x="${left - 14}" y="${py(v) + 7}" text-anchor="end" font-size="22">${v}</text>`
  for (const t of SCI_TIMES) grid += `<text x="${px(t)}" y="${bottom + 36}" text-anchor="middle" font-size="22">${t}</text>`
  const lines = SCI_SERIES.map(([name, vals, c], k) => `<polyline fill="none" stroke="${c}" stroke-width="5" points="${vals.map((v, i) => `${px(SCI_TIMES[i])},${py(v)}`).join(' ')}"/>${vals.map((v, i) => `<circle cx="${px(SCI_TIMES[i])}" cy="${py(v)}" r="7" fill="${c}"/>`).join('')}
    <text x="${px(30) + 16}" y="${py(vals[6]) + 8}" font-size="22" font-weight="700" fill="${c}">${vals[6]}℃</text>
    <rect x="${right + 90}" y="${top + 10 + k * 46}" width="26" height="26" fill="${c}"/><text x="${right + 126}" y="${top + 32 + k * 46}" font-size="22">${esc(name)}</text>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Malgun Gothic, sans-serif"><rect width="100%" height="100%" fill="#fff"/>
  <text x="${W / 2}" y="60" text-anchor="middle" font-size="36" font-weight="800">단열재 종류에 따른 물 온도 변화 (3회 평균)</text>
  <text x="${W / 2}" y="98" text-anchor="middle" font-size="20" fill="#555">처음 온도 60℃ · 물 200mL · 실내 약 20℃ · 과학탐구실험2 운정고 1학년 김민서</text>
  ${grid}<line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="#333" stroke-width="2"/><line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" stroke="#333" stroke-width="2"/>${lines}
  <text x="${(left + right) / 2}" y="${H - 50}" text-anchor="middle" font-size="24">경과 시간(분)</text>
  <text x="44" y="${(top + bottom) / 2}" text-anchor="middle" font-size="24" transform="rotate(-90 44 ${(top + bottom) / 2})">물 온도(℃)</text>
  <text x="${W - 30}" y="${H - 16}" text-anchor="end" font-size="16" fill="#888">합성 시연 측정값 · 실측 자료 아님 · LearnersHigh 시연용(가명)</text></svg>`
}

function sciReport(title, pngDataUri) {
  const s = Object.fromEntries(SCIENCE.sections)
  const rows = [['경과 시간(분)', ...SCI_SERIES.map((x) => x[0])], ...SCI_TIMES.map((t, i) => [String(t), ...SCI_SERIES.map((x) => `${x[1][i].toFixed(1)}℃`)])]
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><style>${css}</style>
  <div class="page cover"><div class="subj">과학탐구실험2 · 수행평가 「${esc(title)}」</div>
   <h1>단열재 종류에 따른 보온 효과 비교 실험</h1><div class="q">겨울철 보온 용기를 만든다면 어떤 재료가 가장 좋을까?</div>
   <div class="who">운정고등학교 1학년 2반 1번 · 김민서<br>2026학년도 2학기 · 실험 설계 및 결과 보고서</div></div>
  <div class="page"><h2>1. 탐구 동기</h2>${paras(s['탐구 동기'])}<h2>2. 가설과 변인 설계</h2>${paras(s['가설과 변인'])}
   <h2>3. 실험 과정</h2>${paras(s['실험 과정'])}<h2>4. 측정 결과</h2>${table(rows)}</div>
  <div class="page"><img src="${pngDataUri}" alt="단열재별 온도 변화 그래프"><h2>5. 분석</h2>${paras(s['분석'])}<h2>6. 결론</h2>${paras(s['결론'])}
   <h2>7. 배운 점과 개선 방향</h2>${paras(s['배운 점과 개선'])}
   <div class="note">LearnersHigh Assessment 시연용 결과물입니다. 학생 이름은 가명이며 측정값은 합성 시연 자료로 실제 실험 결과가 아닙니다.</div></div></html>`
}

// ---------------- 실행 ----------------
const browser = await chromium.launch({ executablePath: chrome })
const page = await (await browser.newContext({ locale: 'ko-KR' })).newPage()
const renderPng = async (svg, w, h) => { await page.setViewportSize({ width: w, height: h }); await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`, { waitUntil: 'load' }); return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: w, height: h } }) }
const renderPdf = async (html) => { await page.setContent(html, { waitUntil: 'load' }); return page.pdf({ format: 'A4', printBackground: true }) }

async function saveNote(assessmentId, doc, prefix) {
  const existing = (await call('GET', `/api/student/assessment/notes?sourceType=SCHOOL_ASSESSMENT&sourceId=${assessmentId}`)).items
  if (existing.length === 0) {
    const created = await call('POST', '/api/student/assessment/notes', { sourceType: 'SCHOOL_ASSESSMENT', sourceId: assessmentId, title: doc.title, blocks: blocksOf(doc, prefix) })
    return { noteId: created.noteId, created: true, revisionNumber: created.revisionNumber, revisionId: created.revisionId }
  }
  const note = existing[0]
  if (JSON.stringify(note.blocks).includes(MARK)) return { noteId: note.noteId, skipped: true, revisionNumber: note.revisionNumber, revisionId: note.revisionId }
  const before = (await call('GET', `/api/student/assessment/notes/${note.noteId}/revisions`)).items
  const saved = await call('PUT', `/api/student/assessment/notes/${note.noteId}`, { expectedRevisionId: note.revisionId, title: doc.title, blocks: blocksOf(doc, prefix) })
  const after = (await call('GET', `/api/student/assessment/notes/${note.noteId}/revisions`)).items
  return { noteId: note.noteId, from: note.revisionNumber, revisionNumber: saved.revisionNumber, revisionId: saved.revisionId, revisions: `${before.length}→${after.length}` }
}

async function uploadVersion(artifactId, bytes, name, type, changeNote) {
  const versions = (await call('GET', `/api/student/assessment/artifacts/${artifactId}/versions`)).items
  const done = versions.find((v) => (v.changeNote ?? '').includes(MARK))
  if (done) return { artifactId, skipped: true, versionId: done.versionId, version: `v${done.versionNumber}`, fileName: done.file.fileName, previousVersions: versions.length - 1 }
  const latest = versions.reduce((best, v) => (!best || v.versionNumber > best.versionNumber ? v : best), null)
  const form = new FormData()
  form.append('file', new Blob([bytes], { type }), name)
  form.append('changeNote', `${MARK}: ${changeNote}`)
  if (latest) form.append('expectedLatestVersionId', latest.versionId)
  const created = await call('POST', `/api/student/assessment/artifacts/${artifactId}/versions`, form)
  const download = await call('GET', `/api/student/assessment/artifacts/${artifactId}/versions/${created.versionId}/file`)
  writeFileSync(join(filesDir, name), bytes)
  return { artifactId, versionId: created.versionId, version: `v${created.versionNumber}`, fileName: name, sizeBytes: bytes.length, sha256: sha(bytes), downloadMatches: sha(download) === sha(bytes), previousVersions: versions.length }
}

async function ensureArtifact(assessmentId, title) {
  const list = (await call('GET', `/api/student/assessment/artifacts?sourceType=SCHOOL_ASSESSMENT&sourceId=${assessmentId}`)).items
  return list.find((a) => a.title === title) ?? (await call('POST', '/api/student/assessment/artifacts', { sourceType: 'SCHOOL_ASSESSMENT', sourceId: assessmentId, title }))
}

if (process.env.DRY === '1') {
  // 쓰기 없이 파일만 만들어 눈으로 확인
  const t = await renderPng(timelineSvg(), 1920, 1080)
  writeFileSync(join(filesDir, 'dry-timeline.png'), t)
  writeFileSync(join(filesDir, 'dry-kh.pdf'), await renderPdf(khReport('한국사2 역사 인물·사건 탐구 보고서', `data:image/png;base64,${t.toString('base64')}`)))
  const c = await renderPng(lineChartSvg(), 1600, 900)
  writeFileSync(join(filesDir, 'dry-chart.png'), c)
  writeFileSync(join(filesDir, 'dry-sx.pdf'), await renderPdf(sciReport('과학탐구실험2 설계 및 결과 보고서', `data:image/png;base64,${c.toString('base64')}`)))
  await browser.close()
  process.exit(0)
}
const out = { at: new Date().toISOString(), studentId: SID }
// 한국사2
const kh = await call('GET', `/api/student/assessment/school-assessments/${KH}`)
const khTitle = kh.title.replace('[DEMO-15S-2026] ', '')
out.koreanHistory = { assessmentId: KH, title: kh.title, status: kh.status, deadline: kh.deadlineDate }
out.koreanHistory.note = await saveNote(KH, KOREAN_HISTORY, 'kh')
const timelinePng = await renderPng(timelineSvg(), 1920, 1080)
const pngUri = `data:image/png;base64,${timelinePng.toString('base64')}`
const reportArtifact = (await call('GET', `/api/student/assessment/artifacts?sourceType=SCHOOL_ASSESSMENT&sourceId=${KH}`)).items.find((a) => a.artifactId === 'artifact_b090c0e8-ec37-4834-9659-c82437dbc9dc')
out.koreanHistory.pdf = await uploadVersion(reportArtifact.artifactId, await renderPdf(khReport(khTitle, pngUri)), '김민서_한국사2_탐구보고서.pdf', 'application/pdf', '표지·연표·조약 비교표·참고자료를 확인된 사실로 보강')
const timelineArtifact = await ensureArtifact(KH, '한국사2 개항기 대외 정책 연표 (시각자료)')
out.koreanHistory.png = await uploadVersion(timelineArtifact.artifactId, timelinePng, '김민서_한국사2_개항기_연표.png', 'image/png', '개항 전후 사건 연표와 조약 비교 시각자료')
// 과학탐구실험2
const sx = await call('GET', `/api/student/assessment/school-assessments/${SX}`)
const sxTitle = sx.title.replace('[DEMO-15S-2026] ', '')
out.science = { assessmentId: SX, title: sx.title, status: sx.status, deadline: sx.deadlineDate }
out.science.note = await saveNote(SX, SCIENCE, 'sx')
const chartPng = await renderPng(lineChartSvg(), 1600, 900)
const sxReport = await ensureArtifact(SX, '과학탐구실험2 보온 실험 결과 보고서')
out.science.pdf = await uploadVersion(sxReport.artifactId, await renderPdf(sciReport(sxTitle, `data:image/png;base64,${chartPng.toString('base64')}`)), '김민서_과학탐구실험2_보온실험_보고서.pdf', 'application/pdf', '실험 설계·측정표·그래프·결론 보고서')
const sxChart = await ensureArtifact(SX, '과학탐구실험2 온도 변화 그래프')
out.science.png = await uploadVersion(sxChart.artifactId, chartPng, '김민서_과학탐구실험2_온도변화_그래프.png', 'image/png', '단열재별 30분 온도 변화 그래프')
await browser.close()
writeFileSync(join(outDir, 'kimminseo-enrichment.json'), JSON.stringify(out, null, 2) + '\n', 'utf8')
console.log(JSON.stringify(out, null, 1))
