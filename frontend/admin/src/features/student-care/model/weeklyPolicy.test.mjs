import {test} from 'node:test'
import assert from 'node:assert/strict'
import {previewCareDays,previewSignals,PREVIEW_DEFAULTS} from '../api/previewData.ts'

test('a single scheduled missed day flags for review; unknown or unscheduled dates do not',()=>{
 const records=previewCareDays('stu_009')
 const date=records.at(-2).date
 const missed=records.map(d=>d.date===date?{...d,scheduled:true,attendance:'absent',minutes:0,actual:0,start:null,planned:null}:d)
 const isFlagged=r=>previewSignals('stu_009',PREVIEW_DEFAULTS,r).signals.some(s=>s.type==='CONSECUTIVE_ABSENCE')
 assert.equal(isFlagged(missed),true)
 assert.equal(isFlagged(missed.map(d=>d.date===date?{...d,scheduled:null}:d)),false)
 assert.equal(isFlagged(missed.map(d=>d.date===date?{...d,scheduled:false}:d)),false)
 assert.equal(isFlagged(records),false)
})
test('changing branch absence threshold changes eligibility rather than changing records',()=>{
 const records=previewCareDays('stu_009')
 const missed=records.map((d,i)=>i===33?{...d,scheduled:true,attendance:'absent',minutes:0,actual:0,start:null,planned:null}:d)
 assert.equal(previewSignals('stu_009',{...PREVIEW_DEFAULTS,absenceDays:2},missed).signals.some(s=>s.type==='CONSECUTIVE_ABSENCE'),false)
 assert.equal(missed.at(-2).attendance,'absent')
})
