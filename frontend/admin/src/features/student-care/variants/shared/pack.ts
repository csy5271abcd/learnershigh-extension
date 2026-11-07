// 분포 점 배치(벌집 배치). 점끼리 겹치지 않게, 값 위치(y)는 지키고 옆(x)으로 먼저 비킨다.
// 옆자리가 모자라면 같은 값 근처에서 아주 조금 위·아래로 쌓는다(최대 maxDy). 그래도 자리가 없으면 그 점은 overflow로 돌려준다.
export interface Packed<T> { item: T; x: number; y: number; packed: boolean }

export function packColumn<T>(items: { item: T; y: number }[], cx: number, halfWidth: number, r: number, maxDy = r * 6): Packed<T>[] {
  const d = r * 2 + 0.6
  const placed: { x: number; y: number }[] = []
  const out: Packed<T>[] = []
  const free = (x: number, y: number) => placed.every((p) => (p.x - x) ** 2 + (p.y - y) ** 2 >= d * d)
  const xs: number[] = [0]
  for (let k = 1; k * d <= halfWidth; k++) xs.push(k * d, -k * d)
  for (const { item, y } of [...items].sort((a, b) => a.y - b.y)) {
    let done = false
    for (let dy = 0; dy <= maxDy && !done; dy += d * 0.87) {
      for (const sign of dy === 0 ? [1] : [1, -1]) {
        const yy = y + sign * dy
        const x = xs.find((o) => free(cx + o, yy))
        if (x !== undefined) { placed.push({ x: cx + x, y: yy }); out.push({ item, x: cx + x, y: yy, packed: true }); done = true; break }
      }
    }
    if (!done) out.push({ item, x: cx, y, packed: false })
  }
  return out
}

/** 겹침 없이 다 놓일 때까지 점 반지름을 줄이고(최소 minR), 그래도 모자라면 세로로 쌓는 폭을 넓힌다(최대 maxStack px) */
export function packFit<T>(items: { item: T; y: number }[], cx: number, halfWidth: number, r: number, minR = 2, maxStack = 40) {
  let rr = r, dy = r * 6, res = packColumn(items, cx, halfWidth, rr, dy)
  while (res.some((p) => !p.packed) && rr > minR) { rr = Math.max(minR, rr - 0.2); res = packColumn(items, cx, halfWidth, rr, dy) }
  while (res.some((p) => !p.packed) && dy < maxStack) { dy += 4; res = packColumn(items, cx, halfWidth, rr, dy) }
  return { points: res, r: rr }
}
