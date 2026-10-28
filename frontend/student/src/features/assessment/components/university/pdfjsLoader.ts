import type * as PdfJs from 'pdfjs-dist'

// pdf.js(pdfjs-dist 5.4.296, Apache-2.0)는 대학별 자료 PDF 화면에서만 동적으로 불러온다 (첫 화면 번들에 넣지 않는다).
// 한글 CID 글꼴용 CMap·표준 글꼴·이미지 디코더(wasm)는 정적 자산으로 묶고, 필요한 파일만 그때 받는다.

const assetLoaders = {
  cmap: import.meta.glob('../../../../../../node_modules/pdfjs-dist/cmaps/*.bcmap', { query: '?url', import: 'default' }),
  font: import.meta.glob('../../../../../../node_modules/pdfjs-dist/standard_fonts/*.{pfb,ttf}', { query: '?url', import: 'default' }),
  wasm: import.meta.glob('../../../../../../node_modules/pdfjs-dist/wasm/*.{wasm,js}', { query: '?url', import: 'default' }),
} as Record<'cmap' | 'font' | 'wasm', Record<string, () => Promise<unknown>>>

async function fetchBundled(kind: keyof typeof assetLoaders, filename: string): Promise<Uint8Array> {
  const key = Object.keys(assetLoaders[kind]).find((path) => path.endsWith(`/${filename}`))
  if (!key) throw new Error(`pdf.js 자산 없음: ${filename}`)
  const url = (await assetLoaders[kind][key]()) as string
  const response = await fetch(url)
  if (!response.ok) throw new Error(`pdf.js 자산을 받지 못함: ${filename} (${response.status})`)
  return new Uint8Array(await response.arrayBuffer())
}

class BundledCMapReaderFactory {
  async fetch({ name }: { name: string }) {
    return { cMapData: await fetchBundled('cmap', `${name}.bcmap`), isCompressed: true }
  }
}

class BundledStandardFontDataFactory {
  async fetch({ filename }: { filename: string }) {
    return fetchBundled('font', filename)
  }
}

class BundledWasmFactory {
  async fetch({ filename }: { filename: string }) {
    return fetchBundled('wasm', filename)
  }
}

let loading: Promise<typeof PdfJs> | undefined

export function loadPdfJs(): Promise<typeof PdfJs> {
  loading ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default
    return pdfjs
  })
  // 한 번 실패하면 다음 시도에서 다시 받는다.
  loading.catch(() => {
    loading = undefined
  })
  return loading
}

/** 원문 PDF 열기. 주소는 개발 서버 허용 목록 경로만 넘어온다 (universityExamFileUrl). */
export async function openPdfDocument(url: string) {
  const pdfjs = await loadPdfJs()
  return pdfjs.getDocument({
    url,
    CMapReaderFactory: BundledCMapReaderFactory,
    StandardFontDataFactory: BundledStandardFontDataFactory,
    WasmFactory: BundledWasmFactory,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableRange: true,
    disableStream: true,
  })
}
