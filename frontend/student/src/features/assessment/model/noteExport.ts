// A28-51 '노트 내보내기'(PDF): 서버(§20-1)가 저장된 최신 노트로 텍스트 PDF 를 만든다. 화면은 표시용 과목·평가 정보만 보낸다.
// - 값이 없는 평가 정보도 빼지 않고 null 로 보낸다(PDF 에 '미정'으로 표시).
// - 저장 안 된 편집이 있으면 화면이 먼저 저장을 안내한다(PDF 는 저장된 버전 기준).

export interface NoteExportRequest {
  subjectName: string
  meta: [string, string | null][]
}

export function noteExportRequest(subjectName: string, meta: [string, string | null | undefined][]): NoteExportRequest {
  return { subjectName, meta: meta.map(([label, value]) => [label, value == null || value === '' ? null : value]) }
}

/** 서버가 정한 파일 이름(Content-Disposition filename*) — 없거나 읽지 못하면 화면이 만든 이름 */
export function pdfFileName(contentDisposition: string | null, title: string, exportedAt: Date): string {
  const encoded = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (encoded) {
    try {
      const name = decodeURIComponent(encoded.trim())
      if (name.toLowerCase().endsWith('.pdf')) return name
    } catch {
      // 잘못된 인코딩이면 아래 이름을 쓴다
    }
  }
  return exportFileName(title, exportedAt)
}

/** `제목_탐구노트_yyyy-MM-dd.pdf` — 파일 이름에 쓸 수 없는 글자를 빼고 한글은 그대로 */
export function exportFileName(title: string, exportedAt: Date): string {
  const safe = title.replace(/[\\/:*?"<>|\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80).trim() || '수행평가'
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${safe}_탐구노트_${exportedAt.getFullYear()}-${pad(exportedAt.getMonth() + 1)}-${pad(exportedAt.getDate())}.pdf`
}
