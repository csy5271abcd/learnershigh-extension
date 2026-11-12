import { open, OUT } from './lib.mjs'
import fs from 'fs'
for (const v of ['x', 'y', 'z2']) {
  const { browser, page, errs } = await open({ path: '/student-care/' + v })
  await page.screenshot({ path: `${OUT}/explore-${v}.png` })
  fs.writeFileSync(`${OUT}/explore-${v}.txt`, await page.innerText('body'))
  console.log(v, 'errs', errs.slice(0, 5))
  await browser.close()
}
