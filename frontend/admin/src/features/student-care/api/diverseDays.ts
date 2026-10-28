import { previewCareDays, PREVIEW_AS_OF } from './previewData.ts'
import type { WeekDay } from '../model/weeklyReviewTypes.ts'

/** 5~7 공통 검토 자료. 원본/2~4 시나리오와 분리한다. */
export function diverseDays(studentId:string, asOf=PREVIEW_AS_OF):WeekDay[]{
 const index=Number(studentId.slice(-3)), n=(index-1)%10
 const minutes:(number|null)[][]=[
  [200,0,0,0,0,0,0],[35,580,0,145,700,80,0],[90,45,0,110,60,30,0],
  [330,45,210,60,490,110,0],[250,310,180,360,190,420,0],[90,420,0,600,70,280,0],
  [10,80,0,150,40,100,0],[null,null,0,25,null,370,95],[540,480,120,650,520,610,0],
  [160,380,0,210,300,90,0]]
 const starts=[500,1130,1245,600,1390,1015,720]
 return previewCareDays(studentId,asOf).map((day,i)=>{
  const slot=i%7
  if(i<28){
   if(n===7)return {...day,minutes:null,start:null,planned:null,actual:null,attendance:'unknown',submission:'unknown',scheduled:null}
   const value=slot===6?0:Math.round((125+n*24)*[1.2,.8,.45,1.6,1.1,1.5,0][slot]*(.8+Math.floor(i/7)*.12))
   return {...day,minutes:value,actual:value,start:value?Math.min(1435-value,900+n*35+(slot%3)*25):null,planned:value?Math.round(value/0.9):null,scheduled:slot!==6,attendance:value?'present':'excluded',submission:'submitted'}
  }
  const value=minutes[n][slot],present=value!==null&&value>0,missing=(n===1&&slot<4)||(n===0&&slot>1)||(n===3&&slot===3)||(n===6&&slot===1)
  const scheduled=slot!==6&&!(n===1&&slot===2)
  const plan=present&&!missing?Math.round([360,210,480,150,300,540,180][(slot+n)%7]):null
  const start=present?Math.min(1435-value!,starts[(slot+n)%7]+n*3):null
  return {...day,minutes:value,actual:value,start,planned:plan,scheduled:value===null||n===7?null:scheduled,
   attendance:value===null?'unknown':present?'present':n===7?'unknown':!scheduled?'excluded':'absent',
   submission:value===null?'unknown':missing?'missing':'submitted'}
 })
}
