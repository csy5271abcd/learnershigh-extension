const { chromium } = require('../../../../../e2e/node_modules/@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
async function main() {
  const source = fs.readFileSync('scripts/research/care-screen-metrics.mjs','utf8');
  const from = source.indexOf('const probe = () => {') + 'const probe = '.length;
  const probe = source.slice(from, source.indexOf('\nconst browser =', from)).trim();
  const browser = await chromium.launch({channel:'chrome',args:['--no-proxy-server']});
  const page = await browser.newPage({viewport:{width:1600,height:900}});
  const modal = '<div role="dialog" style="position:fixed;inset:50px;overflow-y:auto;height:600px;background:white"><div style="height:1500px">학생 상세</div></div>';
  const cases = [
    {id:'locked-modal-in-main',html:`<body style="overflow:hidden"><main><div style="height:1800px">배경</div>${modal}</main></body>`,meaning:'배경 잠금 + 대화상자 1개 스크롤은 P3 허용 구조'},
    {id:'locked-modal-in-portal',html:`<body style="overflow:hidden"><main><div style="height:1800px">배경</div></main>${modal}</body>`,meaning:'동일 대화상자를 main 밖에 두어도 측정되어야 함'},
    {id:'clipped-value',html:'<main><div style="overflow:hidden;width:80px;white-space:nowrap">학습 시간 123시간 59분 평소 222시간 22분</div></main>',meaning:'값이 잘렸지만 가로 스크롤 가능 요소는 아님; P4 별도 잘림 검사 필요'}
  ];
  const results=[];
  for(const c of cases){await page.setContent(c.html); results.push({id:c.id,meaning:c.meaning,result:await page.evaluate(`(${probe})()`)});}
  fs.writeFileSync(path.join(__dirname,'probe-fixtures.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.map(x=>({id:x.id,scrollAreas:x.result.scrollAreas,hScrollAreas:x.result.hScrollAreas,overflow:x.result.overflow}))));
  await browser.close();
}
main().catch(e=>{console.error(e);process.exitCode=1;});
