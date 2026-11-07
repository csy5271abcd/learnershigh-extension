// 이번 시험은 기본 stdin 모드로 실행했다. --replay는 같은 성공 경로를 재현한다.
import { start } from '../../../../scripts/research/care-task-harness.mjs';
import { createInterface } from 'node:readline';
const t = await start('http://localhost:5174/student-care/ops', 'docs/design/ops-redesign/task-runs/ops-log.json');
const capture = async (name) => { console.log(await t.read()); await t.shot(`docs/design/ops-redesign/task-runs/ops-shots/${name}.png`); };
const student = async (name) => { await t.fill('input[aria-label="학생 검색"]',name); await t.clickText(name); };
const replay = [
  "await t.question('Q1'); await capture('q1');",
  "await t.question('Q2'); await capture('q2'); await t.scroll(570); console.log(await t.read());",
  "await t.question('Q3'); for(let i=0;i<4;i++){await t.scroll(550); console.log(await t.read());}",
  "await t.question('Q4'); await t.scroll(-10000); await t.scroll(1100); await capture('q4');",
  "await t.question('Q5'); await t.scroll(-10000); await student('김하준'); await capture('q5');",
  "await t.question('Q6'); await student('김지우'); await capture('q6');",
  "await t.question('Q7'); console.log(await t.read());",
  "await t.question('Q8'); await student('김예준'); console.log(await t.read());",
  "await t.question('Q11'); await student('박예준'); console.log(await t.read());",
  "await t.question('Q12'); await t.fill('input[aria-label=\"학생 검색\"]',''); await capture('q12-top');",
  "await t.question('Q13'); await t.clickText('학습관별'); await capture('q13');",
  "await t.question('Q3'); await t.scroll(430); await capture('q3-all'); await t.clickText('해당 일수'); await t.scroll(440); await capture('q3-inner');",
  "await t.question('Q4'); await t.click('text=입실 시각'); console.log(await t.read());",
  "await t.question('Q14'); await t.scroll(-10000); await t.clickText('학생별'); await student('김시윤'); console.log(await t.read());",
  "await t.question('Q15'); await t.fill('input[aria-label=\"학생 검색\"]',''); await t.scroll(650); console.log(await t.read()); for(let i=0;i<10;i++){await t.scroll(650); await capture('q15-list-'+i);}",
  "await t.question('Q3'); await t.scroll(-10000); for(const name of ['강하준','서도현','윤서윤','장수빈','최예준','한하린','신지우','임시윤','조하린','오유진','장도현']){await student(name); console.log(await t.read());}",
  "await t.question('Q15'); for(const name of ['최하준','강서윤','이예준','조수빈']){await student(name); await capture('q15-'+name);}",
  "await t.question('Q9'); await student('이서준'); await t.scroll(550); await t.clickText('상담 기록'); await t.scroll(560); await capture('q9-fields');",
  "await t.fill('input[placeholder=\"이름\"]','과업 시험관'); await t.click('label:has-text(\"면담\")'); await t.fill('textarea','과업 시험 기록: 면담 후 계속 관리, 1주 뒤 확인.'); await t.click('label:has-text(\"계속 관리\")'); await capture('q9-next');",
  "await t.click('label:has-text(\"1주 후\")'); await t.clickText('저장'); console.log(await t.read()); await t.scroll(-10000); await t.clickText('관리 이력'); await capture('q9-history');",
  "await t.question('Q10'); await t.select('select',{label:'수지점'}); await t.click('button:has(svg)'); await capture('q10-initial');",
  "await t.fill('input[type=\"number\"]','2'); await t.clickText('저장'); await t.click('button:has(svg)'); await capture('q10-after-save');",
  "await t.fill('input[type=\"number\"]','1'); await t.clickText('저장'); await t.click('button:has(svg)'); await capture('q10-restored'); await t.clickText('취소'); console.log(await t.end());"
];
console.log('HARNESS_READY');
const commands = process.argv.includes('--replay') ? replay : createInterface({input:process.stdin});
for await (const line of commands) {
  try { console.log(await eval('(async()=>{'+line+'})()')); }
  catch(e) { console.log(e.message); }
}
