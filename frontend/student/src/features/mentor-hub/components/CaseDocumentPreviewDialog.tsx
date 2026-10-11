import { useEffect, useId, useRef } from 'react'
import { caseMaterialName } from '../model/caseMaterials.ts'
import type { CaseDocumentPage, CaseMaterial, CaseMaterialPreview } from '../model/types.ts'
import styles from './CaseDocumentPreviewDialog.module.css'
import { CaseMaterialDownloadLink } from './CaseMaterialDownloadLink.tsx'

interface CaseDocumentPreviewDialogProps {
  /** preview가 있는 자료만 연다. (빈 Dialog를 열지 않는다) */
  material: CaseMaterial & { preview: CaseMaterialPreview }
  /** 자료 종류 · 단계 (예: 초안 · 4단계 초안 V1 제출) */
  contextLabel: string
  onClose: () => void
}

// Activity Case 자료 미리보기 (ActivityCase-09 Mockup). 과정 자료 / 결과물이 같은 Dialog를 쓴다.
// - 미리보기는 Fixture의 preview를 형식에 맞게(Slide / 문서 Page / 표) HTML / CSS로 그린 것이고, 다운로드는 별도의 원본 파일(original)이다.
// - 다운로드는 Dialog를 닫지 않는다. 원본이 없으면 다운로드 대신 준비 중 상태를 보여준다.
// - Native <dialog>의 showModal()로 배경 조작 차단 / ESC / Focus 가두기를 처리하고, 닫히면 연 버튼으로 Focus를 돌려준다.
export function CaseDocumentPreviewDialog({ material, contextLabel, onClose }: CaseDocumentPreviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const roleId = useId()
  const fileName = caseMaterialName(material)

  useEffect(() => {
    const dialog = dialogRef.current
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const root = document.documentElement
    const previousOverflow = root.style.overflow
    dialog?.showModal()
    root.style.overflow = 'hidden'
    return () => {
      if (dialog?.open) dialog.close()
      root.style.overflow = previousOverflow
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={roleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <div className={styles.surface}>
        <header className={styles.header}>
          <span className={styles.typeBadge}>{material.format}</span>
          <div className={styles.fileText}>
            <h2 id={titleId} className={styles.fileName}>
              {fileName}
            </h2>
            <p id={roleId} className={styles.fileRole}>
              {contextLabel}
            </p>
          </div>
          <div className={styles.actions}>
            {material.original ? (
              <CaseMaterialDownloadLink material={{ ...material, original: material.original }} className={styles.downloadButton} />
            ) : (
              <span className={styles.downloadUnavailable}>다운로드 준비 중</span>
            )}
            <button type="button" className={styles.close} aria-label="미리보기 닫기" onClick={onClose}>
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
                <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </header>

        <div className={styles.canvas}>
          <PreviewBody preview={material.preview} fileName={fileName} />
        </div>
      </div>
    </dialog>
  )
}

function PreviewBody({ preview, fileName }: { preview: CaseMaterialPreview; fileName: string }) {
  if (preview.kind === 'table') {
    return (
      <section className={styles.sheet} aria-label={`${fileName} 미리보기`}>
        <h3 className={styles.sheetTitle}>{preview.title}</h3>
        {preview.description && <p className={styles.sheetDescription}>{preview.description}</p>}
        {/* 표가 넓으면 이 영역 안에서만 가로 Scroll 된다. */}
        <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={`${preview.title} 표`}>
          <table className={styles.table}>
            <thead>
              <tr>
                {preview.columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => (
                <tr key={row.join('|')}>
                  {row.map((cell, index) => (
                    <td key={preview.columns[index]}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {preview.footnote && <p className={styles.footnote}>{preview.footnote}</p>}
      </section>
    )
  }

  return (
    <ol className={styles.pages} aria-label={`${fileName} 미리보기`}>
      {preview.pages.map((page) => (
        <li key={page.pageNumber} className={styles.pageRow}>
          <span className={styles.pageNumber} aria-hidden="true">
            {page.pageNumber}
          </span>
          {preview.kind === 'slides' ? <SlidePage page={page} /> : <DocumentPage page={page} />}
        </li>
      ))}
    </ol>
  )
}

// PPTX: 16:9 Slide (ActivityCase-09)
function SlidePage({ page }: { page: CaseDocumentPage }) {
  return (
    <section className={styles.slide} aria-label={`${page.pageNumber}쪽`}>
      {page.lead || page.body ? (
        <div className={styles.cover}>
          <h3 className={styles.coverTitle}>{page.title}</h3>
          <p className={styles.coverBody}>
            {page.lead && <span className={styles.lead}>{page.lead}</span>} {page.body}
          </p>
        </div>
      ) : (
        <div className={styles.content}>
          <h3 className={styles.contentTitle}>{page.title}</h3>
          {page.bullets && (
            <ul className={styles.bullets}>
              {page.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

// PDF / HWP: 흰 문서 Page
function DocumentPage({ page }: { page: CaseDocumentPage }) {
  return (
    <section className={styles.documentPage} aria-label={`${page.pageNumber}쪽`}>
      {/* 글자 / 여백은 Page 폭(cqi)에 맞춘다. (Container 자신이 아니라 안쪽 요소가 cqi를 쓴다) */}
      <div className={styles.documentContent}>
        <h3 className={styles.documentTitle}>{page.title}</h3>
        {page.paragraphs?.map((paragraph) => (
          <p key={paragraph} className={styles.documentParagraph}>
            {paragraph}
          </p>
        ))}
        {page.bullets && (
          <ul className={styles.bullets}>
            {page.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        )}
        {page.footnote && <p className={styles.footnote}>{page.footnote}</p>}
      </div>
    </section>
  )
}
