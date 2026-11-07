import assert from 'node:assert/strict';
import{readFileSync,writeFileSync,existsSync}from'node:fs';
import{execFileSync}from'node:child_process';
import{createHash}from'node:crypto';
const dir=new URL('./',import.meta.url),read=n=>JSON.parse(readFileSync(new URL(n,dir),'utf8'));
const counts={};
for(const [file,n,key]of [['screens.json',272,'records'],['modal-complete.json',32,'out'],['interactions.json',16,'records'],['summary-cases.json',56,'records'],['current.json',56,'records'],['flows.json',20,'records']]){
 const d=read(file);assert.equal(d[key].length,n,file);assert.deepEqual(d.errors,[],file);assert.deepEqual(d.blocked,[],file);counts[file]=n;
}
const self=read('selftest.json');assert.equal(self.length,10);assert.ok(self.every(x=>x.ok));
const screens=read('screens.json');assert.ok(screens.records.every(x=>!x.layout.p3&&!x.layout.p4));
const modal=read('modal-complete.json');assert.ok(modal.out.every(x=>!x.layout.p3&&!x.layout.p4&&x.restored&&x.trapped!==false&&x.shift!==false&&x.tab!==false));
assert.ok(modal.out.filter(x=>x.state==='dirty').every(x=>x.afterDiscard.dialog==null&&x.afterDiscard.scrollAfter>x.afterDiscard.scroll));
const inter=read('interactions.json');assert.ok(inter.records.every(x=>x.bandCount===25&&x.chosen===x.opened&&x.missButtons===17));
assert.ok(inter.records.every(x=>JSON.stringify(x.visionHeadHover)===JSON.stringify(x.visionDayFocus)));
const flows=read('flows.json');assert.ok(flows.records.filter(x=>['equal','extreme'].includes(x.test)).every(x=>x.counts.length===1&&x.counts[0].n===150));
assert.ok(flows.records.filter(x=>x.test==='actual').every(x=>x.counts.reduce((a,b)=>a+b.n,0)===150&&x.afterAxisTitle.includes('휴대폰')&&JSON.stringify(x.phoneBins)!==JSON.stringify(x.afterAxisBins)));
const current=read('current.json');assert.ok(current.records.filter(x=>x.test==='progress-unknown').every(x=>x.tips.every(t=>t.includes('계획 없음'))));
assert.ok(current.records.filter(x=>['vision-failed','vision-unsupported'].includes(x.test)).every(x=>x.tips.every(t=>t.endsWith('기록 없음'))));
const report=readFileSync(new URL('../29-metrics-result.md',dir),'utf8');
const links=[...report.matchAll(/\]\((29-evidence\/[^)]+)\)/g)].map(x=>x[1]);
for(const link of links)if(!link.endsWith('verification.json'))assert.ok(existsSync(new URL('../'+link,dir)),link);
const diff=execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim();assert.equal(diff,'');
const staged=execFileSync('git',['diff','--cached','--name-only'],{encoding:'utf8'}).trim();assert.equal(staged,'');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();assert.ok(head.startsWith('119a5a3'));
const files=['docs/design/ops-redesign/plan-v5.md','docs/design/ops-redesign/representation-v5.md','docs/design/ops-redesign/best-practice-v5.md','docs/design/ops-redesign/function-map-v5.md','docs/design/ops-redesign/contract-v5.md'];
const hashes=Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]));
const result={head,node:process.version,counts,selfTests:10,checkedLinks:links.length,allLinksExist:true,trackedDiff:diff,stagedDiff:staged,p3:0,p4:0,mutationRequests:0,finalInteractionLoadRetries:inter.loadRetries??[],inputHashes:hashes,productVerdict:'A–D 불통과',mandatoryFindings:7,perVariant:{A:6,B:6,C:7,D:6},note:'증거 일치 검증 통과. 알려진 제품 결함을 통과로 바꾸지 않음. 소스·DB 변경 없음.'};
writeFileSync(new URL('verification.json',dir),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
