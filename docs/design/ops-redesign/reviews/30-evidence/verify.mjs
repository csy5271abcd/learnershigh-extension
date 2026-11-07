import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),read=n=>JSON.parse(readFileSync(new URL(n,dir),'utf8'));
const counts={};
for(const[file,n,key]of [['screens.json',272,'records'],['modal-complete.json',32,'out'],['interactions.json',16,'records'],['current.json',56,'records'],['summary-cases.json',56,'records'],['flows.json',20,'records'],['axes.json',8,'records'],['mixed.json',4,'records'],['tail-flow.json',16,'records'],['supplement.json',20,'records'],['rounding.json',4,'records']]){
 const d=read(file);assert.equal(d[key].length,n,file);assert.deepEqual(d.errors,[],file);assert.deepEqual(d.blocked,[],file);counts[file]=n;
}
const self=read('selftest.json');assert.equal(self.length,10);assert.ok(self.every(x=>x.ok));
const screens=read('screens.json').records;assert.ok(screens.every(x=>!x.layout.p3&&!x.layout.p4));
for(const width of [1600,1280])for(const theme of ['light','dark'])for(const state of ['roster','detail','branch']){
 const orig=screens.find(x=>x.v==='original'&&x.width===width&&x.theme===theme&&x.state===state);
 for(const v of ['a','b','c','d'])assert.ok(screens.find(x=>x.v===v&&x.width===width&&x.theme===theme&&x.state===state).text<orig.text);
}
const mod=read('modal-complete.json').out;assert.ok(mod.every(x=>!x.layout.p3&&!x.layout.p4&&x.restored&&x.trapped!==false&&x.shift!==false&&x.tab!==false));assert.ok(mod.filter(x=>x.state==='dirty').every(x=>x.afterDiscard.dialog==null&&x.afterDiscard.scrollAfter>x.afterDiscard.scroll));
const inter=read('interactions.json').records;assert.ok(inter.every(x=>x.bandCount===25&&x.chosen===x.opened&&x.missButtons===17));assert.ok(inter.every(x=>JSON.stringify(x.visionHeadHover)===JSON.stringify(x.visionDayFocus)));
const flows=read('flows.json').records;assert.ok(flows.filter(x=>['equal','extreme'].includes(x.test)).every(x=>x.counts.length===1&&x.counts[0].n===150));assert.ok(flows.filter(x=>x.test==='actual').every(x=>x.afterAxisTitle.includes('고개 숙임')));
for(const r of read('axes.json').records){if(r.test==='axes'){assert.equal(r.cases.length,4);for(const a of r.cases)assert.ok(a.title.startsWith('학생별 최근 7일 '+a.axis+' 관찰 비율'));}else assert.deepEqual(r.bins.map(x=>Number.parseInt(x)),[30,30,0,30,30,30]);}
assert.ok(read('mixed.json').records.every(x=>x.aria.includes('제출 대상 없음')&&x.tip.includes('대상 아님 75명')&&x.tip.includes('기록 없음 75명')));
const tail=read('tail-flow.json').records;assert.ok(tail.every(x=>x.rail.includes('1명')&&x.resultRows===150&&x.role===null&&x.tab===null));
const overlaps=tail.filter(x=>x.v==='a').map(x=>{assert.equal(x.comparison.length,3);const r=x.comparison.map(a=>a.rect);assert.ok(r.every(a=>Math.abs(a.x-r[0].x)<.01&&Math.abs(a.y-r[0].y)<.01));return{width:x.width,theme:x.theme,rect:r[0]};});
for(const r of read('supplement.json').records.filter(x=>x.test==='one-tail')){const lines=r.lines;assert.equal(lines.length,3);assert.equal(lines[0].points.split(' ').length,7);assert.equal(lines[1].points.split(' ').length,6);const xs=lines[1].points.split(' ').map(x=>Number(x.split(',')[0]));assert.ok(xs[3]-xs[2]>(xs[1]-xs[0])*1.9);}
const round=read('rounding.json').records;assert.ok(round.every(x=>Math.round(x.mean)===1020&&x.label.includes('16:00')&&x.visibleTip.includes('16:00')&&x.hoverTip===x.visibleTip));
const partial=read('current.json').records.filter(x=>x.test==='partial');assert.ok(partial.every(x=>x.trendpoints.some(y=>y.label.includes('출결 확인 1일')&&y.class==='v5-trend-partial')&&x.trendpoints.some(y=>y.label.includes('제출 확인 1일')&&y.class==='v5-trend-partial')));
const progress=read('current.json').records.filter(x=>x.test==='progress-unknown');assert.ok(progress.every(x=>x.tips.every(y=>y.includes('계획 기록 없음'))));
const report=readFileSync(new URL('../30-metrics-result.md',dir),'utf8');const links=[...report.matchAll(/\]\((30-evidence\/[^)]+)\)/g)].map(x=>x[1]);for(const l of links)if(!l.endsWith('verification.json'))assert.ok(existsSync(new URL('../'+l,dir)),l);
const diff=execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim();assert.equal(diff,'');assert.equal(execFileSync('git',['diff','--cached','--name-only'],{encoding:'utf8'}).trim(),'');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();assert.ok(head.startsWith('c27516a'));
const files=['docs/design/ops-redesign/plan-v5.md','docs/design/ops-redesign/representation-v5.md','docs/design/ops-redesign/best-practice-v5.md','docs/design/ops-redesign/function-map-v5.md','docs/design/ops-redesign/contract-v5.md'];
const inputHashes=Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]));
const out={head,node:process.version,counts,selfTests:10,checkedLinks:links.length,allLinksExist:true,trackedDiff:diff,p3:0,p4:0,mutationRequests:0,inputHashes,comparisonNameOverlaps:overlaps,findings:{T01:'▲1명 클릭 → 150명',T02:'대상 아님75+미상75 → 제출 대상 없음',T03:'평균1019.571분 → 16:00',T04:'A 비교 이름 세 개 동일 좌표·결측 연결'},productVerdict:'A–D 불통과',mandatoryFindings:4,perVariant:{A:4,B:3,C:3,D:3},note:'증거 일치 검증이며 제품 통과가 아님. DB/소스 변경 없음.'};writeFileSync(new URL('verification.json',dir),JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
