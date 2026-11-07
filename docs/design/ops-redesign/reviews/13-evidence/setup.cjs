const fs=require('fs');const o=__dirname;
let s=fs.readFileSync('docs/design/ops-redesign/reviews/12-evidence/samples.cjs','utf8');
s=s.replace("await p.locator('[data-care-roster-row=\"demo_s055\"]').click();await p.waitForTimeout(150);", "if(await p.locator('[data-care-roster-row=\"demo_s055\"]').count()) await p.locator('[data-care-roster-row=\"demo_s055\"]').click();await p.waitForTimeout(150);");
fs.writeFileSync(o+'/samples.cjs',s);
for(const n of ['check-samples.cjs','edges.cjs'])fs.copyFileSync('docs/design/ops-redesign/reviews/12-evidence/'+n,o+'/'+n);
let c=fs.readFileSync('scripts/research/care-task-score.mjs','utf8').replace("new URL('../../docs/design/ops-redesign/task-runs/', import.meta.url)","new URL('../../task-runs/', import.meta.url)").replace('new URL(`${screen}-score.json`, dir)','new URL(`${screen}-score-replayed.json`, import.meta.url)');
fs.writeFileSync(o+'/score-replay.mjs',c);
