// 학부모 리포트 + 상담 첨부. 위쪽 얇은 띠에서 관리자가 상담 건을 고르고 문장을 고치면, 리포트의 선생님 코멘트 자리에 바로 붙어 보인다.
// 기존 학생 케어 상담 이력 API(careApi.history)만 읽는다. 저장소는 새로 만들지 않는다(첨부 선택은 화면 상태).
import { useState } from 'react'
import { careApi, type CareRow } from '../../shared/useCareData.ts'
import { loadFailure, useRemote } from '../../../model/useRemote.ts'
import type { SupEvent } from '../../supervisor/supervisorClient.ts'
import { ParentReport } from './ParentReport.tsx'

const CH: Record<string, string> = { MEETING: '면담', CALL: '통화', MESSAGE: '메시지', OTHER: '상담' }
const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`

export function ReportWithAttach({ s, ev, asOf, version = 0 }: { s: CareRow; ev: SupEvent[]; asOf: string; version?: number }) {
  const hist = useRemote(`pr/${s.student.studentId}/history`, () => careApi.history(s.student.branchId, s.student.studentId), version)
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const [text, setText] = useState<Record<string, string>>({})
  const cases = (hist.data?.cases ?? []).map((c) => {
    const note = hist.data!.items.find((it) => it.caseId === c.caseId && it.noteChannel)
    const why = c.baseline.map((b) => b.label).join(', ')
    const parts = [`${note ? `${md(note.occurredOn)} ` : ''}${why ? `최근 생활에서 ${why} 변화가 보여 ` : ''}${note ? `${CH[note.noteChannel!] ?? '상담'}로 이야기를 나눴습니다.` : '살펴보고 있습니다.'}`]
    if (note) parts.push(note.content.replace(/^상담 · [^—]+— /, '').replace(/검토용 테스트 상담: ?/, '').replace(/\.?$/, '.'))
    if (c.recheckDate) parts.push(`${md(c.recheckDate)}에 다시 확인하겠습니다.`)
    return { id: c.caseId, title: why || '관리 건', sub: `${md(c.openedOn)} 시작${note ? ` · ${CH[note.noteChannel!] ?? '상담'}` : ''}${c.recheckDate ? ` · 다음 확인 ${md(c.recheckDate)}` : ''}`, draft: parts.join(' ') }
  })
  const attached = cases.filter((c) => picked[c.id]).map((c) => ({ id: c.id, text: text[c.id] ?? c.draft }))
  return <div className="pra">
    <section className="pra-bar" aria-label="상담 첨부">
      <b>상담 첨부</b>
      {loadFailure(hist) ? <span className="pra-muted">상담 이력을 불러오지 못했습니다</span>
        : !hist.data ? <span className="pra-muted">불러오는 중</span>
        : !cases.length ? <span className="pra-muted">이 학생은 상담 기록이 없습니다. 리포트만 보냅니다.</span>
        : <div className="pra-cases">{cases.map((c) => <div key={c.id} className={picked[c.id] ? 'pra-case on' : 'pra-case'}>
          <label><input type="checkbox" checked={!!picked[c.id]} onChange={(e) => setPicked({ ...picked, [c.id]: e.target.checked })} /><span><b>{c.title}</b><small>{c.sub}</small></span></label>
          {picked[c.id] && <textarea value={text[c.id] ?? c.draft} onChange={(e) => setText({ ...text, [c.id]: e.target.value })} aria-label="학부모에게 보낼 문장" rows={2} />}
        </div>)}</div>}
      <span className="pra-muted">고른 상담만 데일리 레포트의 선생님 코멘트에 붙습니다</span>
    </section>
    <ParentReport s={s} ev={ev} asOf={asOf} attached={attached} />
  </div>
}



