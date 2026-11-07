import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve, dirname } from 'node:path'
import assert from 'node:assert/strict'
const base = 'docs/design/ops-redesign/reviews/24-evidence/'
const raw = JSON.parse(readFileSync(base+'inspection.json','utf8'))
assert.equal(raw.self.length,8); assert(raw.self.every(x=>x.ok))
assert.equal(raw.results.length,46); assert(raw.results.every(x=>x.probe.p3===0 && x.probe.p4===0))
const modal=raw.results.filter(x=>x.probe.active)
assert.equal(modal.length,10); assert(modal.every(x=>x.probe.backgroundLocked && x.probe.scrollAreas===1 && x.probe.nested===0))
assert(raw.results.every(x=>x.geometry.documentWidth===x.width))
const changed=Object.entries(raw.hashes).filter(([f,h])=>createHash('sha256').update(readFileSync(f)).digest('hex')!==h).map(([f])=>f)
assert.deepEqual(changed,[])
const report='docs/design/ops-redesign/reviews/24-layout-result.md', body=readFileSync(report,'utf8')
const links=[...body.matchAll(/\]\(([^)]+)\)/g)].map(x=>x[1]).filter(x=>!/^https?:/.test(x))
const broken=links.filter(x=>!existsSync(resolve(dirname(report),x)))
assert.deepEqual(broken,[])
const result={selfTests:8,measurements:46,modalMeasurements:modal.length,generalMeasurements:46-modal.length,unchangedInputs:Object.keys(raw.hashes).length,changedInputs:changed,reportLinks:links.length,brokenLinks:broken,evidencePNGs:readdirSync(base).filter(f=>f.endsWith('.png')).length}
writeFileSync(base+'verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2))
