import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const dir=new URL('./',import.meta.url),read=n=>JSON.parse(readFileSync(new URL(n,dir),'utf8'));
const screens=read('screens.json'),focus=read('focused.json'),summary=read('summary-cases.json'),interactions=read('interactions.json'),modal=read('modal-complete.json'),self=read('selftest.json'),widths=read('current-widths.json');
for(const [data,n,key]of [[screens,272,'records'],[focus,36,'records'],[summary,56,'records'],[interactions,16,'records'],[modal,32,'out']]){
 assert.equal(data[key].length,n);assert.deepEqual(data.errors,[]);assert.deepEqual(data.blocked,[]);
}
assert.equal(self.length,10);assert.ok(self.every(x=>x.ok));assert.equal(widths.records.length,12);
assert.ok(screens.records.every(x=>!x.layout.p3&&!x.layout.p4));
assert.ok(modal.out.every(x=>!x.layout.p3&&!x.layout.p4&&x.restored&&x.trapped!==false&&x.shift!==false&&x.tab!==false));
assert.ok(interactions.records.every(x=>x.bandCount===30&&x.chosen===x.opened&&x.missButtons===17&&x.headTab===null));
const focused=(test)=>focus.records.find(x=>x.test===test&&x.width===1280&&x.theme==='light').charts[0];
assert.equal(focused('day-A-card').points,809);assert.equal(focused('day-A-card').width,910);
assert.equal(focused('week-equal').points,98);assert.equal(focused('rails-week').paths,23);
assert.equal(focused('rails-day').triangleHorizontalPairs,296);
assert.ok(focused('day-wide').maxY-focused('day-wide').minY>29);
const sc=t=>summary.records.find(x=>x.test===t&&x.width===1280&&x.theme==='light');
assert.ok(sc('student-noactual').text.includes('계획 없음'));assert.ok(sc('student-partial').text.includes('−86%'));
assert.ok(sc('plan-zero').plots[0].bars.length===0);assert.ok(sc('plan-none').text.includes('0명'));
assert.ok(sc('student-gap').trends.every(t=>t.points.length===2));
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();assert.equal(head,'a8c662ff5d30dec4a128381aedc69b0ed3ce8c0e');
const diff=execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim();
const staged=execFileSync('git',['diff','--cached','--name-only'],{encoding:'utf8'}).trim();assert.equal(diff,'');assert.equal(staged,'');
const report=readFileSync(new URL('../28-metrics-result.md',dir),'utf8');
const links=[...report.matchAll(/\]\((28-evidence\/[^)]+)\)/g)].map(m=>m[1]);
for(const link of links)if(!link.endsWith('verification.json'))assert.ok(existsSync(new URL('../'+link,dir)),link);
const result={head,counts:{screens:272,focused:36,currentWidths:12,summaryCases:56,interactions:16,modal:32,selfTest:10},pageErrors:0,mutationRequests:0,p3:0,p4:0,allReportEvidenceLinksExist:true,checkedLinks:links.length,trackedDiff:diff,stagedDiff:staged,productVerdict:'A–D 불통과',mandatoryFindings:6,checks:'증거와 보고서 일치 검사 통과. 제품의 알려진 실패는 그대로 보존.'};
writeFileSync(new URL('verification.json',dir),JSON.stringify(result,null,2));assert.ok(existsSync(new URL('verification.json',dir)));console.log(JSON.stringify(result,null,2));
