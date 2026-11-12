import { browser, page } from './lib.mjs';
const b=await browser();
const [path, W, scheme, sel, out, pre] = process.argv.slice(2);
const p=await page(b,+W,scheme,path);
if(pre) await p.evaluate(pre);
await p.waitForTimeout(500);
await p.locator(sel).first().screenshot({path:out});
await b.close();
