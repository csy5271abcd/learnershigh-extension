import {useState} from 'react'
export function useRecorderName(){
 const [name,setName]=useState(()=>sessionStorage.getItem('care-recorder-name')??'')
 return [name,(value:string)=>{setName(value);sessionStorage.setItem('care-recorder-name',value)}] as const
}
