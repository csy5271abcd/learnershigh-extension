// A28-41: 서버에서 받은 파일(Blob)을 새 탭에서 열거나 내려받는다. 공개 URL 을 만들지 않고 이 브라우저 안의 임시 주소만 쓴다.
export function openBlob(blob: Blob) {
  const href = URL.createObjectURL(blob)
  window.open(href, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(href), 60_000)
}

export function saveBlob(blob: Blob, fileName: string) {
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = fileName
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(href), 10_000)
}
