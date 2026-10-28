import {test} from 'node:test'
import assert from 'node:assert/strict'
import {tooltipPlacement} from './tooltipPlacement.ts'
test('mobile bubble uses blank space and keeps observed dots and the date axis clear',()=>{
 const points=[{x:63,y:110},{x:92,y:80},{x:121,y:77},{x:150,y:180},{x:179,y:180},{x:208,y:180},{x:237,y:180}]
 const baseline=points.map(p=>({...p,y:100}))
 const box=tooltipPlacement({width:270,boxWidth:168,boxHeight:65,left:48,bottom:180,anchor:points[3],series:[points,baseline]})
 assert.ok(box.left>=54&&box.left+168<=270)
 assert.ok(box.top+65<200)
 for(const p of [...points,...baseline])assert.ok(!(p.x>=box.left-7&&p.x<=box.left+168+7&&p.y>=box.top-7&&p.y<=box.top+65+7))
})
