/* 학부모 리포트 '생활' 탭 시안 공용 계산(원본 이식용: 화면 틀 없는 순수 JS, 전역 하나 LifeReport).
 * 원본(PHP + jQuery)에 옮길 때 이 파일을 console·util 쪽 assets/js에 복사하고 load()의 주소만 원본 API로 바꾼다.
 * 계산은 학생 케어 화면과 같은 기준을 쓴다: 평소 = 지난 4주 같은 요일, 비몰입 학습일 = 새벽 5시 기준.
 * 자료(로컬 시안): 학생 케어 API /api/admin/student-care, 이미지 인식 API /supervisor-api (관리 화면 개발 서버 대리) */
(function () {
  var CARE = '/api/admin/student-care'
  var DOW = ['일', '월', '화', '수', '목', '금', '토']
  var KIND = { PHONE_USAGE: '휴대폰 사용', LYING_DOWN: '엎드림', ABSENCE: '자리 비움' }
  var CHANNEL = { MEETING: '면담', CALL: '통화', MESSAGE: '메시지', OTHER: '상담' }

  function get(url) { return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json() }) }
  function md(date) { return Number(date.slice(5, 7)) + '/' + Number(date.slice(8, 10)) }
  function dow(date) { return DOW[new Date(date + 'T00:00:00Z').getUTCDay()] }
  function hm(min) { var m = Math.round(Math.abs(min)), h = Math.floor(m / 60), r = m % 60; return h ? (r ? h + '시간 ' + r + '분' : h + '시간') : r + '분' }
  function clock(min) { var m = Math.round(min), h = Math.floor(m / 60) % 24, r = m % 60; return (h < 12 ? '오전 ' : '오후 ') + (h % 12 === 0 ? 12 : h % 12) + ':' + (r < 10 ? '0' : '') + r }
  function mean(xs) { return xs.length ? xs.reduce(function (a, b) { return a + b }, 0) / xs.length : null }
  // 비몰입 한 건의 학습일(한국 시각, 새벽 5시 전은 전날)
  function eventDate(e) { var t = new Date(e.startedAt).getTime() + (9 * 60 - 5 * 60) * 60000; return new Date(t).toISOString().slice(0, 10) }

  /** 한 학생의 생활 자료. metrics 응답의 학생 한 명 + 상담 이력 + 비몰입 이벤트 */
  function build(student, history, events) {
    var r = student.review
    var days = r.days.map(function (d, i) {
      var base = r.weekdayBaseline[i] || {}
      return {
        date: d.date, md: md(d.date), dow: dow(d.date),
        state: d.attendance === 'PRESENT' ? 'present' : d.attendance === 'ABSENT' ? 'absent' : d.attendance === 'UNSCHEDULED' ? 'off' : 'unknown',
        submitted: d.submission === 'SUBMITTED', start: d.startMinutes, usualStart: base.startSamples ? base.startMinutes : null,
        minutes: d.attendance === 'PRESENT' ? d.minutes : null, usualMinutes: base.samples ? base.minutes : null,
      }
    })
    var present = days.filter(function (d) { return d.state === 'present' })
    var scheduled = days.filter(function (d) { return d.state === 'present' || d.state === 'absent' })
    var late = present.filter(function (d) { return d.start !== null && d.usualStart !== null }).map(function (d) { return d.start - d.usualStart })
    var weekMinutes = present.reduce(function (a, d) { return a + (d.minutes || 0) }, 0)
    // 주마다 기록이 하나라도 있는지(기록 없는 주는 0이 아니라 '기록 없음'). 첫 기록이 창 첫날보다 뒤면 새 학생
    var allDays = r.baselineDays.concat(r.days)
    var firstIdx = allDays.findIndex(function (d) { return d.attendance !== 'UNKNOWN' })
    var weekKnown = [0, 1, 2, 3, 4].map(function (w) { return allDays.slice(w * 7, w * 7 + 7).some(function (d) { return d.attendance !== 'UNKNOWN' }) })
    var baseWeeks = [0, 1, 2, 3].map(function (w) { return r.baselineDays.slice(w * 7, w * 7 + 7).reduce(function (a, d) { return a + (d.attendance === 'PRESENT' ? d.minutes || 0 : 0) }, 0) })
    var knownBase = baseWeeks.filter(function (_, w) { return weekKnown[w] })
    var usualWeek = knownBase.length === 4 ? mean(knownBase) : null
    // 비몰입: 최근 7일 종류별 건수와 지난 4주 한 주 평균
    var recent = {}, prior = {}, weekly = [0, 0, 0, 0, 0]
    var all = r.baselineDays.map(function (d) { return d.date }).concat(r.days.map(function (d) { return d.date }))
    Object.keys(KIND).forEach(function (k) { recent[k] = 0; prior[k] = 0 })
    ;(events || []).forEach(function (e) {
      var i = all.indexOf(eventDate(e)); if (i < 0 || !KIND[e.reason]) return
      weekly[Math.floor(i / 7)]++
      if (i >= 28) recent[e.reason]++; else prior[e.reason] += 1 / 4
    })
    var cases = (history && history.cases || []).map(function (c) {
      var notes = history.items.filter(function (it) { return it.caseId === c.caseId && it.noteChannel })
      var note = notes[0] || null
      return {
        id: c.caseId, openedOn: c.openedOn, recheckDate: c.recheckDate, status: c.status,
        signals: (c.baseline || []).map(function (b) { return { label: b.label, summary: b.summary } }),
        channel: note ? CHANNEL[note.noteChannel] || '상담' : null, noteDate: note ? note.occurredOn : null,
        note: note ? note.content.replace(/^상담 · [^—]+— /, '') : null,
      }
    })
    return {
      name: student.student.studentName, cls: student.student.className, from: r.from, to: r.to, days: days,
      attend: { present: present.length, scheduled: scheduled.length, absent: scheduled.length - present.length, planned: days.filter(function (d) { return d.submitted }).length },
      lateAvg: mean(late), lateDays: late.filter(function (v) { return v >= 60 }).length,
      startAvg: mean(present.filter(function (d) { return d.start !== null }).map(function (d) { return d.start })),
      known: { recent: weekKnown[4], base: weekKnown.slice(0, 4).every(Boolean), weeks: weekKnown },
      newbie: firstIdx > 0 ? { first: allDays[firstIdx].date, days: allDays.length - firstIdx } : firstIdx < 0 ? { first: null, days: 0 } : null,
      week: { minutes: weekMinutes, usual: usualWeek, weeks: baseWeeks.concat([weekMinutes]),weekStarts: [0, 7, 14, 21].map(function (k) { return r.baselineDays[k] ? r.baselineDays[k].date : null }).concat([r.days[0].date]) },
      focus: { recent: recent, prior: prior, weekly: weekly, total: Object.keys(recent).reduce(function (a, k) { return a + recent[k] }, 0), priorTotal: Object.keys(prior).reduce(function (a, k) { return a + prior[k] }, 0), hasData: (events || []).length > 0 },
      cases: cases,
    }
  }

  /** 상담 한 건을 학부모용 문단 초안으로. 관리자가 고친 뒤에만 나간다 */
  function caseText(c) {
    var why = c.signals.map(function (s) { return s.label }).join(', ')
    var parts = []
    parts.push((c.noteDate ? md(c.noteDate) + ' ' : '') + (why ? '최근 생활에서 ' + why + ' 변화가 보여 ' : '') + (c.channel ? c.channel + '로 이야기를 나눴습니다.' : '살펴보고 있습니다.'))
    if (c.note) parts.push(c.note.replace(/검토용 테스트 상담: ?/, '') + '.')
    if (c.recheckDate) parts.push(md(c.recheckDate) + '에 다시 확인하겠습니다.')
    return parts.join(' ').replace(/\.\./g, '.')
  }

  /** 지표마다 학부모용 한 문장 */
  function sentences(L) {
    var out = {}, came = L.attend.present > 0, isNew = !!L.newbie
    // 기록을 받지 못한 주(연동 누락·등록 전)는 '0'이나 '없었다'로 쓰지 않는다
    if (!L.known.recent) { out.attend = '이번 주 출결 기록을 받지 못했어요.'; out.start = '이번 주 입실 기록을 받지 못했어요.'; out.study = '이번 주 공부 기록을 받지 못했어요.'; out.focus = '이번 주 관찰 기록을 받지 못했어요.'; return out }
    out.attend = L.attend.scheduled ? '등원 예정일 ' + L.attend.scheduled + '일 중 ' + L.attend.present + '일 출석했어요' + (L.attend.absent ? ' (결석 ' + L.attend.absent + '일)' : '') + '.' : '이번 주 등원 예정일이 없었어요.'
    out.start = !came ? '이번 주 입실한 날이 없어요.' : L.lateAvg === null ? (isNew ? '다니기 시작한 지 얼마 안 되어 평소와 비교하지 않아요. 평균 ' + clock(L.startAvg) + '에 입실했어요.' : '평소와 비교할 입실 기록이 없어요.') : Math.abs(L.lateAvg) < 10 ? '평소와 비슷한 시각에 입실했어요.' : '평소보다 평균 ' + hm(L.lateAvg) + ' ' + (L.lateAvg > 0 ? '늦게' : '일찍') + ' 입실했어요.'
    if (!came) out.study = '이번 주 공부한 날이 없어요.'
    else if (L.week.usual) { var p = Math.round((L.week.minutes / L.week.usual) * 100); out.study = '이번 주 ' + hm(L.week.minutes) + ', 평소 한 주(' + hm(L.week.usual) + ')의 ' + p + '%예요.' }
    else out.study = '이번 주 ' + hm(L.week.minutes) + ' 공부했어요.' + (isNew ? ' 평소와의 비교는 4주 기록이 쌓이면 보여 드려요.' : '')
    if (!came) out.focus = '이번 주 공부한 날이 없어 관찰 기록이 없어요.'
    else if (!L.focus.hasData) out.focus = '공부 중 관찰 기록이 없어요.'
    else if (!L.known.base) { out.focus = '이번 주 공부 중 흐트러진 횟수는 ' + L.focus.total + '회예요. 지난 기록이 적어 비교하지 않아요.'; out.focusUp = [] }
    else {
      var up = Object.keys(KIND).filter(function (k) { return L.focus.recent[k] >= 2 && L.focus.recent[k] >= L.focus.prior[k] * 1.5 + 1 })
      out.focus = up.length ? '공부 중 ' + up.map(function (k) { return KIND[k] }).join('·') + ' 횟수가 지난 4주보다 늘었어요.' : L.focus.total ? '공부 중 흐트러진 횟수가 지난 4주와 비슷해요.' : '이번 주 공부 중 흐트러진 순간이 없었어요.'
      out.focusUp = up
    }
    return out
  }

  /** 지점 학생 목록과 학생 하나의 자료를 읽는다 */
  function load(branchId, studentId) {
    return get(CARE + '/metrics?branchId=' + encodeURIComponent(branchId)).then(function (m) {
      var s = m.students.find(function (x) { return x.student.studentId === studentId }) || m.students[0]
      var sid = 1000 + Number(s.student.studentId.replace(/\D/g, ''))
      return Promise.all([
        get(CARE + '/students/' + encodeURIComponent(s.student.studentId) + '/history?branchId=' + encodeURIComponent(branchId)).catch(function () { return null }),
        get('/supervisor-api/students/' + sid + '/events?limit=500').catch(function () { return [] }),
      ]).then(function (res) { return { list: m.students.map(function (x) { return x.student }), asOf: m.asOf, life: build(s, res[0], res[1]) } })
    })
  }

  /** 학생 화면 머리의 새 학생 표지 */
  function newbieText(L) { return L.newbie ? (L.newbie.first ? md(L.newbie.first) + ' 등록' : '아직 기록이 없어요') : '' }

  window.LifeReport = { load: load, build: build, caseText: caseText, sentences: sentences, newbieText: newbieText, hm: hm, clock: clock, md: md, KIND: KIND }
})()
