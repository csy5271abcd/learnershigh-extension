import { start } from '../../../../scripts/research/care-task-harness.mjs';
import { readFileSync } from 'node:fs';
const n = process.argv[2];
const actions = JSON.parse(readFileSync(`docs/design/ops-redesign/task-runs/original-actions-${n}.json`, 'utf8').replace(/^\uFEFF/, ''));
const t = await start('http://localhost:5174/student-care', `docs/design/ops-redesign/task-runs/original-log-${n}.json`);
try { for(const [method,...args] of actions) { const result=await t[method](...args); if(result!==undefined) console.log(JSON.stringify({method,result})); } } finally {console.log(JSON.stringify(await t.end()));}

