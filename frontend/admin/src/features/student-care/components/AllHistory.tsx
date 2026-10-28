import {Fragment,useId,useState} from 'react'
import {studentCareApi} from '../api/studentCareApi.ts'
import {loadCareHistoryPage} from '../api/loadCareHistory.ts'
import type {EventType,NoteChannel} from '../model/types.ts'
import {loadFailure,useRemote} from '../model/useRemote.ts'
import './AllHistory.css'

interface Props {
 api?:typeof studentCareApi
 branchId:string
 version:number
 onOpenStudent:(studentId:string)=>void
}
const eventLabel:Record<EventType,string>={NOTE:'상담',ADJUSTMENT_STARTED:'관리 시작',REASON_CONFIRMED:'상담',RECHECKED:'학습 변화 확인',CONTINUED:'계속 관리',REVISED:'기록 변경',CLOSED:'관리 종료'}
const channelLabel:Record<NoteChannel,string>={MEETING:'면담',CALL:'통화',MESSAGE:'메시지',OTHER:'기타'}
const dateText=(date:string)=>date.replaceAll('-','.')

export function AllHistory({api=studentCareApi,branchId,version,onOpenStudent}:Props){
 const id=useId(),[studentId,setStudentId]=useState(''),[query,setQuery]=useState(''),[expanded,setExpanded]=useState<string|null>(null)
 const remote=useRemote(`${branchId}/all-history`,()=>loadCareHistoryPage(api,branchId),version)
 if(loadFailure(remote))return <div className="sc-state" role="alert"><p>관리 이력을 불러오지 못했습니다.</p><button type="button" className="sc-button" onClick={remote.reload}>다시 시도</button></div>
 if(!remote.data)return <p className="sc-state" role="status">관리 이력 불러오는 중</p>
 const {students,rows}=remote.data,selected=students.find(s=>s.studentId===studentId)
 // Derive validity from the refreshed roster; never let a removed ID hide the remaining history.
 const activeStudentId=selected?.studentId??''
 const filtered=rows.filter(row=>(!activeStudentId||row.student.studentId===activeStudentId)&&`${row.student.studentName} ${row.student.className??''}`.includes(query.trim()))
 const select=(value:string)=>{setStudentId(value);setExpanded(null);setQuery('')}
 return <section className="sc-history" aria-label="관리 이력 목록">
  <header className="sc-history-tools"><div><label htmlFor={`${id}-student`}>학생</label><select id={`${id}-student`} aria-label="이력 학생 선택" value={activeStudentId} onChange={e=>select(e.target.value)}><option value="">전체 학생</option>{[...students].sort((a,b)=>a.studentName.localeCompare(b.studentName,'ko')).map(s=><option key={s.studentId} value={s.studentId}>{s.studentName}{s.className?` · ${s.className}`:''}</option>)}</select></div><input aria-label="이력 학생 검색" placeholder="이름 또는 반 검색" value={query} onChange={e=>{setQuery(e.target.value);setExpanded(null)}}/>{(activeStudentId||query)&&<button type="button" className="sc-button" onClick={()=>select('')}>전체 학생</button>}<span>{selected?.studentName??'전체'} · {filtered.length}건</span></header>
  {!filtered.length?<p className="sc-state">{query?'검색 결과가 없습니다.':activeStudentId?'이 학생의 관리 이력이 없습니다.':'관리 이력이 없습니다.'}</p>:<table className="sc-all sc-history-table"><thead><tr><th scope="col">날짜</th><th scope="col">학생</th><th scope="col">기록</th></tr></thead><tbody>{filtered.map((row,index)=>{
   const open=expanded===row.eventId,panelId=`${id}-record-${index}`
   const preview=row.content.replace(/^상담 · (면담|통화|문자|메시지|기타) — /,'')
   return <Fragment key={row.eventId}><tr data-expanded={open}>
    <td className="sc-all__date"><time dateTime={row.occurredOn}>{dateText(row.occurredOn)}</time></td>
    <td><button type="button" className="sc-all__student" aria-label={`${row.student.studentName} 이력만 보기`} onClick={()=>select(row.student.studentId)}>{row.student.studentName}</button><span className="sc-all__class">{row.student.className}</span></td>
    <td><button type="button" className="sc-history-expand" aria-expanded={open} aria-controls={panelId} aria-label={`${row.student.studentName} ${dateText(row.occurredOn)} 기록 내용 ${open?'접기':'펼치기'}`} onClick={()=>setExpanded(open?null:row.eventId)}><span className="sc-history-kind">{eventLabel[row.type]}</span><span className="sc-history-preview">{preview}</span><span aria-hidden="true">{open?'⌃':'⌄'}</span></button></td>
   </tr>{open&&<tr className="sc-history-detail-row"><td colSpan={3}><section id={panelId} className="sc-history-detail" aria-label="기록 원문"><header><strong>{row.student.studentName} · {eventLabel[row.type]}</strong>{row.noteChannel&&<span>{channelLabel[row.noteChannel]}</span>}<button type="button" onClick={()=>setExpanded(null)}>접기</button></header><p className="sc-history-original">{row.content}</p><button type="button" className="sc-button" onClick={()=>onOpenStudent(row.student.studentId)}>현재 학생 지표</button></section></td></tr>}</Fragment>
  })}</tbody></table>}
 </section>
}
