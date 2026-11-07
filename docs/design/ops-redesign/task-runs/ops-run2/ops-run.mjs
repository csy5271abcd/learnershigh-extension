import { start } from '../../../../scripts/research/care-task-harness.mjs';
import { appendFileSync } from 'node:fs';
import readline from 'node:readline';
const t = await start('http://localhost:5174/student-care/ops', 'docs/design/ops-redesign/task-runs/ops-log-2.json');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
for await (const line of rl) {
  appendFileSync(new URL(import.meta.url), '\n// Executed: ' + line + '\n');
  try { console.log(await eval(`(async () => { ${line} })()`)); }
  catch (e) { console.log(String(e)); }
}

// Executed: await t.question('Q3'); await t.clickText('학습관별'); await t.scroll(500); await t.clickText('조하린'); console.log(await t.read());

// Executed: await t.scroll(-20000); await t.clickText('학습관별'); await t.scroll(500); await t.clickText('14시간 21분 / 17시간 56분'); await t.scroll(400); console.log(await t.read());

// Executed: await t.question('Q4'); await t.clickText('입실 시각'); console.log(await t.read()); await t.scroll(400); console.log(await t.read());

// Executed: await t.click('button:has-text("입실 시각")'); console.log(await t.read());

// Executed: await t.question('Q3'); await t.scroll(-20000); await t.clickText('학생별'); for(const n of ['강하준','서도현','윤서윤','장수빈','최예준','한하린','신지우','임시윤','조하린','오유진','장도현']){await t.fill('input[aria-label="학생 검색"]',n); await t.clickText(n); console.log(await t.read());}

// Executed: await t.question('Q15'); for(const n of ['강서윤','이예준','조수빈','최하준']){await t.fill('input[aria-label="학생 검색"]',n); await t.clickText(n); console.log(await t.read()); await t.shot('docs/design/ops-redesign/task-runs/ops-shots/q15-'+n+'.png');} await t.question('Q11'); await t.fill('input[aria-label="학생 검색"]','박예준'); await t.clickText('박예준'); await t.scroll(700); console.log(await t.read());

// Executed: await t.clickText('상담 기록'); await t.scroll(600); console.log(await t.read()); await t.shot('docs/design/ops-redesign/task-runs/ops-shots/q11-bottom.png');

// Executed: await t.question('Q9'); await t.scroll(-20000); await t.clickText('학생별'); await t.fill('input[aria-label="학생 검색"]','이서준'); await t.clickText('이서준'); await t.clickText('상담 기록'); await t.scroll(650); console.log(await t.read()); await t.shot('docs/design/ops-redesign/task-runs/ops-shots/q9-form.png');

// Executed: await t.fill('input[aria-label="기록자"]','과업 시험관'); await t.clickText('면담'); await t.fill('textarea[aria-label="상담 내용"]','과업 시험: 면담 결과 계속 관리, 다음 확인은 1주 뒤.'); await t.clickText('계속 관리'); await t.scroll(450); console.log(await t.read()); await t.shot('docs/design/ops-redesign/task-runs/ops-shots/q9-ready.png');

// Executed: await t.fill('input[placeholder="이름"]','과업 시험관'); await t.clickText('면담'); await t.fill('textarea','과업 시험: 면담 결과 계속 관리, 다음 확인은 1주 뒤.'); await t.clickText('계속 관리'); await t.scroll(450); console.log(await t.read()); await t.shot('docs/design/ops-redesign/task-runs/ops-shots/q9-ready.png');

// Executed: console.log(await t.read()); await t.shot('docs/design/ops-redesign/task-runs/ops-shots/q9-current.png');

// Executed: await t.click('label:has-text("면담") input'); await t.fill('textarea','과업 시험: 면담 결과 계속 관리, 다음 확인은 1주 뒤.'); await t.click('label:has-text("계속 관리") input'); await t.scroll(500); console.log(await t.read()); await t.shot('docs/design/ops-redesign/task-runs/ops-shots/q9-ready.png');

// Executed: await t.click('label:has-text("1주 후") input'); await t.clickText('저장'); await t.clickText('관리 이력'); console.log(await t.read()); await t.shot('docs/design/ops-redesign/task-runs/ops-shots/q9-history.png');

// Executed: await t.question('Q10'); await t.select('select[aria-label="학습관"]',{label:'수지점'}); await t.click('button:has(svg)'); console.log(await t.read()); await t.shot('docs/design/ops-redesign/task-runs/ops-shots/q10-settings.png');

// Executed: console.log(await t.read()); await t.shot('docs/design/ops-redesign/task-runs/ops-shots/q10-current.png');

// Executed: await t.select('select',{label:'수지점'}); await t.click('button[aria-label="관리 기준 설정"]'); console.log(await t.read()); await t.shot('docs/design/ops-redesign/task-runs/ops-shots/q10-settings.png');

// Executed: await t.fill('input[type="number"] >> nth=0','2'); await t.clickText('저장'); await t.click('button[aria-label="관리 기준 설정"]'); console.log(await t.read()); await t.shot('docs/design/ops-redesign/task-runs/ops-shots/q10-after.png'); await t.fill('input[type="number"] >> nth=0','1'); await t.clickText('저장'); await t.click('button[aria-label="관리 기준 설정"]'); console.log(await t.read()); await t.shot('docs/design/ops-redesign/task-runs/ops-shots/q10-restored.png'); await t.clickText('취소'); console.log(await t.end());
