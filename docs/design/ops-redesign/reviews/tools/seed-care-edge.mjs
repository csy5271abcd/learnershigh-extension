// 화면 검토용 예외 학생 시드(합성 데이터, 로컬 데모 DB 전용). 기존 생성기(scripts/demo/generate-care-seed.mjs)와 그 테스트는 건드리지 않는다.
// 강남점(demo_large)에 demo_s301–demo_s310 열 명을 더한다(기존 ID는 demo_s001–210이라 겹치지 않게). 편의적인 '결석+미제출' 꼴만 있던 시드에 실제 운영에서 생기는 경우를 넣는다.
// node seed-care-edge.mjs > edge.sql  → mysql 로 적용
const AS_OF_INDEX = 34 // 2026-11-11(화면의 오늘 11-12의 어제)
const dateAt = (i) => new Date(Date.UTC(2026, 9, 8 + i)).toISOString().slice(0, 10)
const dow = (i) => new Date(`${dateAt(i)}T00:00:00Z`).getUTCDay()
const SUBJ = ['국어', '수학', '영어', '탐구']
const split = (total, shares = [25, 35, 23, 17]) => { if (!total) return {}; let a = 0; return Object.fromEntries(shares.map((s, k) => { const v = k === 3 ? total - a : Math.floor(total * s / 100); a += v; return [SUBJ[k], v] })) }
const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`
const wobble = (i, d, r) => ((i * 31 + d * 17 + i * d * 3) % r)

// 평범한 저녁 학생 하루(기준): 18시 30분 안팎 입실, 3시간 안팎 공부, 계획 제출, 수요일 쉼
function normal(i, d) {
  const scheduled = dow(d) !== 3
  const start = 18 * 60 + 25 + wobble(i, d, 20)
  const study = 170 + wobble(i, d, 30)
  return { scheduled, checkedIn: scheduled, start, study, planSubmitted: scheduled, planned: 185 + wobble(i, d, 20), shares: [25, 35, 23, 17], record: true }
}

const CASES = [
  // 사유가 전부 겹침: 최근 7일 연속 결석 2일 + 나머지 날 늦게 와서 짧게 공부, 계획은 크게 잡고 수학을 거의 안 함, 계획 제출도 빠짐
  { id: 301, name: '문가영', cls: '고3 A반', code: 'edge_all_reasons', day: (i, d, n) => {
    if (d < 28) return n
    if (d === 33 || d === 34) return { ...n, checkedIn: false, planSubmitted: false }
    return { ...n, start: n.start + 110, study: Math.round(n.study * 0.38), planned: Math.round(n.planned * 1.9), planSubmitted: d % 2 === 0, shares: [40, 4, 36, 20] }
  } },
  // 퇴실을 찍지 않아 하루 공부 시간이 23시간으로 잡힌 날이 하루 있음(기록 오류)
  { id: 302, name: '배준서', cls: '고2 B반', code: 'edge_missing_checkout', day: (i, d, n) => d === 32 ? { ...n, study: 1380 } : n },
  // 최근 7일 기록 자체가 없음(연동 누락: 결석이 아니라 데이터 없음)
  { id: 303, name: '성하윤', cls: '고3 A반', code: 'edge_week_no_record', day: (i, d, n) => d >= 28 ? { ...n, record: false, scheduled: null, checkedIn: false, planSubmitted: false } : n },
  // 신규 학생: 5일 전 등록(그 앞 날짜는 행이 없음)
  { id: 304, name: '노은우', cls: '고2 B반', code: 'edge_new_5days', from: 30, day: (i, d, n) => n },
  // 신규 학생: 오늘 처음 등원
  { id: 305, name: '차민재', cls: '고3 A반', code: 'edge_new_today', from: 34, day: (i, d, n) => n },
  // 5주 내내 한 번도 오지 않음(장기 결석)
  { id: 306, name: '구서아', cls: '고2 B반', code: 'edge_long_absence', day: (i, d, n) => ({ ...n, checkedIn: false, planSubmitted: false }) },
  // 하루 12시간 공부(정상이지만 극단값: 눈금이 이 학생 때문에 늘어나는지)
  { id: 307, name: '변지호', cls: '고3 A반', code: 'edge_extreme_long', day: (i, d, n) => n.scheduled ? { ...n, start: 8 * 60 + 10 + wobble(i, d, 15), study: 700 + wobble(i, d, 40), planned: 720 } : n },
  // 계획 기능을 쓰지 않음(제출 0회: 계획 대비 실제를 계산할 수 없음)
  { id: 308, name: '염태윤', cls: '고2 B반', code: 'edge_no_plan_ever', day: (i, d, n) => ({ ...n, planSubmitted: false }) },
  // 최근 7일 밤 11시 넘어 입실(자정 직전, 공부 시간이 짧게 잘림)
  { id: 309, name: '탁예린', cls: '고3 A반', code: 'edge_late_night', day: (i, d, n) => d >= 28 && n.scheduled ? { ...n, start: 23 * 60 + 5 + wobble(i, d, 20), study: 30 + wobble(i, d, 15) } : n },
  // 주 2일만 등원 예정(월·목), 나머지는 예정 없음
  { id: 310, name: '방시우', cls: '고2 B반', code: 'edge_part_time', day: (i, d, n) => { const s = dow(d) === 1 || dow(d) === 4; return { ...n, scheduled: s, checkedIn: s, planSubmitted: s } } },
]

const q = (v) => v === null ? 'NULL' : typeof v === 'boolean' ? String(Number(v)) : typeof v === 'number' ? String(v) : `'${String(v).replaceAll("'", "''")}'`
const out = ['-- 화면 검토용 예외 학생(합성, 로컬 데모 전용)', 'SET NAMES utf8mb4;', 'START TRANSACTION;']
const sid = (c) => `demo_s${c.id}`
out.push(`INSERT INTO demo_care_student (student_id,branch_id,name,class_name,scenario_code) VALUES\n${CASES.map((c) => `(${[sid(c), 'demo_large', c.name, c.cls, c.code].map(q).join(',')})`).join(',\n')}\nON DUPLICATE KEY UPDATE name=VALUES(name),class_name=VALUES(class_name),scenario_code=VALUES(scenario_code);`)
out.push(`DELETE FROM demo_care_day WHERE student_id IN (${CASES.map((c) => q(sid(c))).join(',')});`)
const rows = []
for (const c of CASES) for (let d = c.from ?? 0; d <= AS_OF_INDEX; d++) {
  const x = c.day(c.id, d, normal(c.id, d))
  const checked = x.checkedIn && x.record
  const study = checked ? Math.min(x.study, 1440) : 0
  rows.push(`(${[sid(c), dateAt(d), checked, checked ? hhmm(x.start) : null, x.record ? JSON.stringify(split(study, x.shares)) : null, x.planSubmitted && x.record, x.record ? JSON.stringify(x.planSubmitted ? split(x.planned) : {}) : null, x.record ? x.scheduled : null, x.record].map(q).join(',')})`)
}
out.push(`INSERT INTO demo_care_day (student_id,study_date,checked_in,first_check_in_time,study_minutes_by_subject,plan_submitted,planned_minutes_by_subject,scheduled,record_available) VALUES\n${rows.join(',\n')};`)
out.push('COMMIT;')
process.stdout.write(out.join('\n\n') + '\n')
