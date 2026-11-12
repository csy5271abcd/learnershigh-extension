/* 시안 공용: 왼쪽 관리자 '레포트 전송' 창(원본 레포트센터에서 '전송'을 누르면 뜨는 창 자리)과 오른쪽 학부모 화면을 묶는다.
 * 생활 탭(출결·입실 시각·공부 시간 변화·공부 중 흐트러진 횟수)은 늘 붙고, 상담 기록은 관리자가 고른 것만 붙는다(기본은 안 붙음).
 * 원본 이식: 원본 sendSelReportV2() 앞에서 이 창을 띄우고, 고른 문단을 선생님 코멘트(manager_comment) 아래에 덧붙여 저장한 뒤 원래 전송을 부른다.
 * 시안이라 '전송'은 실제로 보내지 않는다. */
(function () {
  var BRANCH = 'demo_large'
  var ORIGINAL = {
    day: ['오늘의 학습(계획·진행·완료)', '학습 시간(시작·종료)', '공부 시간·순공 시간', '순공 효율', '학습 만족도와 평가'],
    week: ['순공률·지난주 대비', '이번 주 공부 티어', '최근 5주 순공 시간 비교', '학습 계획 달성률', '자습 비율', '출석 도장', '주간 평균 학습 만족도'],
    month: ['순공률·지난달 대비', '가장 많이 공부한 날', '최근 5개월 순공 시간 비교', '학습 계획 달성률', '자습 비율', '월간 평균 학습 만족도'],
  }
  var TABS = [['day', '일간'], ['week', '주간'], ['month', '월간'], ['life', '생활']]
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }

  window.mountMock = function (render) {
    var adminEl = document.getElementById('admin'), screenEl = document.getElementById('screen')
    var params = new URLSearchParams(location.search)
    // 관리 화면 메뉴 안에 띄울 때(embed=1)는 시안 이름 줄을 감춘다
    if (params.get('embed')) { var t = document.querySelector('.page-title'); if (t) t.remove() }
    var state = { studentId: params.get('student') || 'demo_s309', picked: {}, text: {}, tab: 'life', step: 'edit', data: null }

    function attachedOf(cases) { return cases.filter(function (c) { return state.picked[c.id] }).map(function (c) { return { c: c, text: state.text[c.id] != null ? state.text[c.id] : LifeReport.caseText(c) } }) }

    function drawScreen() {
      var L = state.data.life, at = attachedOf(L.cases)
      var nb = LifeReport.newbieText(L)
      var body = state.tab === 'life' ? render(L, at)
        : '<div class="r-body"><section class="r-sec"><h4>원본 ' + (state.tab === 'day' ? '일간' : state.tab === 'week' ? '주간' : '월간') + ' 리포트</h4><div class="r-card"><p class="r-sent">이 탭은 원본 리포트 화면이 바뀌지 않고 그대로 나옵니다.</p><ul class="orig">' + ORIGINAL[state.tab].map(function (x) { return '<li>' + x + '</li>' }).join('') + '</ul></div></section></div>'
      screenEl.innerHTML = '<div class="r-top"><div class="who"><b>' + esc(L.name) + '</b><span>' + LifeReport.md(L.from) + '–' + LifeReport.md(L.to) + ' · ' + esc(L.cls || '') + '</span></div>' + (nb ? '<p class="r-new">새 학생 · ' + nb + '</p>' : '') + '</div>' +
        '<div class="r-tabs" role="tablist">' + TABS.map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (state.tab === t[0]) + '" class="' + (state.tab === t[0] ? 'on' : '') + (t[0] === 'life' ? ' new' : '') + '">' + t[1] + '</button>' }).join('') + '</div>' + body
      screenEl.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { state.tab = b.dataset.tab; drawScreen() } })
    }

    function drawAdmin() {
      var L = state.data.life, cases = L.cases, at = attachedOf(cases)
      var head = '<div class="admin-head"><h2>레포트 전송</h2><span>주간 레포트 · ' + LifeReport.md(L.from) + '–' + LifeReport.md(L.to) + '</span></div>'
      if (state.step === 'confirm' || state.step === 'done') {
        adminEl.innerHTML = head + '<div class="admin-body">' +
          (state.step === 'done' ? '<p class="done">' + esc(L.name) + ' 학부모에게 보낸 것으로 표시했습니다. 시안이라 실제로 보내지는 않았습니다.</p>' : '<h3>이대로 보낼까요?</h3>') +
          '<dl class="sum"><dt>받는 사람</dt><dd>' + esc(L.name) + ' 학부모(보호자 동의 완료 시)</dd><dt>보내는 것</dt><dd>주간 레포트 링크 · 생활 탭 포함</dd><dt>상담 기록</dt><dd>' + (at.length ? at.length + '건 · 선생님 코멘트 아래에 덧붙임' : '붙이지 않음') + '</dd></dl>' +
          (at.length ? at.map(function (a) { return '<blockquote>' + esc(a.text) + '</blockquote>' }).join('') : '') +
          '<div class="send">' + (state.step === 'done' ? '<button type="button" id="again">다른 학생 보내기</button>' : '<button type="button" class="ghost" id="back">고치기</button><button type="button" id="ok">보내기</button>') + '</div></div>'
        var b = adminEl.querySelector('#back'), ok = adminEl.querySelector('#ok'), again = adminEl.querySelector('#again')
        if (b) b.onclick = function () { state.step = 'edit'; drawAdmin() }
        if (ok) ok.onclick = function () { state.step = 'done'; drawAdmin() }
        if (again) again.onclick = function () { state.step = 'edit'; state.picked = {}; state.text = {}; drawAdmin(); drawScreen() }
        return
      }
      adminEl.innerHTML = head + '<div class="admin-body">' +
        '<label class="row">학생<select id="pick">' + state.data.list.map(function (s) { return '<option value="' + s.studentId + '"' + (s.studentId === state.studentId ? ' selected' : '') + '>' + esc(s.studentName + ' · ' + (s.className || '')) + '</option>' }).join('') + '</select></label>' +
        '<div><h3>늘 붙는 것 · 생활 탭</h3><div class="fixed" style="margin-top:6px"><span>출결</span><span>입실 시각</span><span>공부 시간 변화</span><span>공부 중 흐트러진 횟수</span></div></div>' +
        '<div><h3>골라 붙이는 것 · 상담 기록</h3><p class="hint">체크한 상담만 학부모 화면에 붙습니다. 문장을 고쳐서 보낼 수 있습니다.</p></div>' +
        (cases.length ? cases.map(function (c) {
          var on = !!state.picked[c.id], text = state.text[c.id] != null ? state.text[c.id] : LifeReport.caseText(c)
          return '<div class="case' + (on ? ' on' : '') + '"><label><input type="checkbox" data-case="' + c.id + '"' + (on ? ' checked' : '') + '><span><b>' + esc(c.signals.map(function (s) { return s.label }).join(' · ') || '관리 건') + '</b><small>' + LifeReport.md(c.openedOn) + ' 시작' + (c.channel ? ' · ' + c.channel : '') + (c.recheckDate ? ' · 다음 확인 ' + LifeReport.md(c.recheckDate) : '') + '</small></span></label>' +
            (on ? '<textarea data-text="' + c.id + '" aria-label="학부모에게 보낼 문장">' + esc(text) + '</textarea><button type="button" class="reset" data-reset="' + c.id + '">처음 문장으로</button>' : '') + '</div>'
        }).join('') : '<p class="empty">이 기간 상담 기록이 없습니다. 생활 탭만 붙습니다.</p>') +
        '<div class="send"><button type="button" class="ghost" id="cancel">고른 것 지우기</button><button type="button" id="send">전송</button></div>' +
      '</div>'
      adminEl.querySelector('#pick').onchange = function (e) { state.studentId = e.target.value; state.picked = {}; state.text = {}; params.set('student', state.studentId); history.replaceState(null, '', '?' + params.toString()); go() }
      adminEl.querySelectorAll('[data-case]').forEach(function (el) { el.onchange = function () { state.picked[el.dataset.case] = el.checked; state.tab = 'life'; drawAdmin(); drawScreen() } })
      adminEl.querySelectorAll('[data-text]').forEach(function (el) { el.oninput = function () { state.text[el.dataset.text] = el.value; drawScreen() } })
      adminEl.querySelectorAll('[data-reset]').forEach(function (el) { el.onclick = function () { delete state.text[el.dataset.reset]; drawAdmin(); drawScreen() } })
      adminEl.querySelector('#cancel').onclick = function () { state.picked = {}; state.text = {}; drawAdmin(); drawScreen() }
      adminEl.querySelector('#send').onclick = function () { state.step = 'confirm'; drawAdmin() }
    }

    function go() {
      adminEl.innerHTML = '<div class="admin-body"><p class="hint">불러오는 중</p></div>'
      LifeReport.load(BRANCH, state.studentId).then(function (data) { state.data = data; state.step = 'edit'; drawAdmin(); drawScreen() },
        function (e) { adminEl.innerHTML = '<div class="admin-body"><p class="empty">자료를 불러오지 못했습니다(' + esc(e.message) + ')</p></div>' })
    }
    go()
  }
})()
