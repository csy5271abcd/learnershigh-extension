import { readFileSync, writeFileSync } from 'node:fs'
const base = 'docs/design/ops-redesign/reviews/24-evidence/'
const raw = JSON.parse(readFileSync(base + 'inspection.json', 'utf8'))
const src = readFileSync('scripts/research/v5-wireframes.mjs', 'utf8')
const states = new Function(src.slice(src.indexOf('const DATES'),src.indexOf('const browser ='))+'\nreturn states')()
const coverage = {
  C: Object.fromEntries(['C-branch','C-branch-result','C-drawer'].map(k=>[k, {
    distributionBlocks:(states[k].match(/class="hist"/g)||[]).length,
    visionAxes:['자리에 있음','고개 숙임','휴대폰 사용','읽기·쓰기'].filter(x=>states[k].includes(x)),
    comparisonPanel:states[k].includes('비교 (최대 3명)'),
    comparisonColumn:states[k].includes('<th>비교</th>')
  }])),
  dimensions:raw.results.filter(r=>r.position==='start' && /student-open|student-modal|drawer|D-student/.test(r.key)).map(r=>({key:r.key,width:r.width,mainContentWidth:r.geometry.mainContentWidth,week:r.geometry.week?.width,dialog:r.geometry.dialog?.width})),
  branchFirstScreen:raw.results.filter(r=>r.position==='start' && /^[ABCD]-branch$/.test(r.key)).map(r=>({key:r.key,width:r.width,summaryBottom:Math.max(...(r.key==='B-branch'||r.key==='C-branch'?r.geometry.directCards:r.geometry.tiles).map(c=>c.bottom))})),
  resultNavigation:raw.results.filter(r=>r.position!=='start').map(r=>({key:r.key,width:r.width,position:r.position,controls:r.geometry.controls.filter(c=>c.y>=0 && c.bottom<=900 && c.x>=0 && c.right<=r.width).map(c=>c.text),rows:r.geometry.rows})),
}
writeFileSync(base+'coverage.json',JSON.stringify(coverage,null,2))
console.log(JSON.stringify(coverage,null,2))
