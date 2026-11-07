const fs=require('fs');
const O=__dirname;
let t=fs.readFileSync('docs/design/ops-redesign/reviews/13-evidence/targeted.cjs','utf8');
t=t.replace(/src\.match\(\/const probe = \(\[\\s\\S\]\*\?\)\\n\\nconst browser\/\)/, "src.match(/const probe = ([\\s\\S]*?)\\n\\n\\/\\/ 검사기 자체 시험/)");
// Keep the prior independent geometry test, update only probe extraction boundary.
t=t.replace("src.match(/const probe = ([\\s\\S]*?)\\n\\nconst browser/)","src.match(/const probe = ([\\s\\S]*?)\\n\\n\\/\\/ 검사기 자체 시험/)");
fs.writeFileSync(O+'/targeted.cjs',t);
let s=fs.readFileSync('scripts/research/care-overlap-check.mjs','utf8');
s=s.replace("new URL('../../e2e/package.json', import.meta.url)","new URL('../../../../../e2e/package.json', import.meta.url)");
s=s.replace("new URL('../../docs/design/ops-redesign/overlap-check.json', import.meta.url)","new URL('./overlap-check.json', import.meta.url)");
s=s.replace("  const errs = [];", "  await p.context().route('**/*',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():r.fulfill({status:503,json:{message:'review write blocked'}}));\n  const errs = [];");
fs.writeFileSync(O+'/overlap-replay.mjs',s);
