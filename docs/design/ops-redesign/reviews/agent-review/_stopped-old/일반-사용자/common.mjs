import { chromium } from 'file:///D:/univ/capstone/learnershigh-extension/e2e/node_modules/playwright-core/index.mjs'
export async function open(v, { w = 1600, h = 1000, scheme = 'light' } = {}) {
  const b = await chromium.launch({ executablePath: 'C:/Users/green/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' })
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme })
  const p = await ctx.newPage()
  p.on('pageerror', e => console.log('PAGEERR', e.message))
  await p.goto('http://localhost:5174/student-care/' + v, { waitUntil: 'networkidle' })
  await p.addStyleTag({ content: 'header[class*=header]{position:static!important}.z-overlay{position:static!important}.z-dialog{max-height:none!important;overflow:visible!important}' })
  await p.waitForTimeout(800)
  return { b, p }
}
export async function shot(p, sel, path) {
  const el = typeof sel === 'string' ? p.locator(sel).first() : sel
  try { await el.screenshot({ path, animations: 'disabled' }); return true } catch (e) { console.log('SHOTFAIL', path, e.message.slice(0, 100)); return false }
}
