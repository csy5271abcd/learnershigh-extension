import { open, shot } from './common.mjs'
const { b, p } = await open('x')
let clicks = 0
await p.fill('.x-search', '권유진'); 
await p.locator('.x-list tbody tr').first().click(); clicks++
await p.waitForTimeout(500)
await shot(p, '.x-list', 'x/권유진-list.png')
await shot(p, '.x-panel', 'x/권유진-공부.png')
for (const t of ['입실 시각','계획','사진 관찰','상담 기록']) {
  await p.locator('.x-tabs button', { hasText: t }).click(); clicks++; await p.waitForTimeout(400)
  await shot(p, '.x-panel', `x/권유진-${t}.png`)
  console.log('==', t, (await p.locator('.x-tab-body').innerText()).slice(0, 800))
}
await b.close()
