import {useId} from 'react'
export function RecorderField({name,onChange}:{name:string;onChange:(value:string)=>void}){
 const id=useId()
 return <div className="sc-field"><label className="sc-field__label" htmlFor={id}>기록자</label><input id={id} className="sc-input" maxLength={100} value={name} onChange={e=>onChange(e.target.value)} placeholder="이름" autoComplete="name"/></div>
}
