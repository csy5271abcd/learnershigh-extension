import { useId, useMemo, useRef, useState } from 'react'
import { noteTemplateCategories, noteTemplates, type NoteTemplateCategory } from '../../model/noteTemplates.ts'
import { SearchIcon } from '../AssessmentIcons.tsx'
import { Modal } from '../Modal.tsx'
import formStyles from '../AddSchoolAssessmentModal.module.css'
import styles from './detail.module.css'
import { NoteBlockView } from './NoteSection.tsx'

type ApplyMode = 'APPEND' | 'NEW_NOTE'

interface TemplateModalProps {
  hasNote: boolean
  onClose: () => void
}

// 템플릿 선택 (Mockup SN-TEMPLATE-01, assessment-inquiry.md §6, api-contract.md §19).
// 적용 방식은 Spec·계약대로 "새 노트로 시작" / "기존 본문 뒤에 추가" 두 가지다 (Mockup의 "맨 위에 추가"는 Spec에 없어 제외).
// 실제 적용은 노트 저장(Editor, OD-A05)이 필요해 아직 실행하지 않는다.
export function TemplateModal({ hasNote, onClose }: TemplateModalProps) {
  const searchRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<NoteTemplateCategory | '전체'>('전체')
  const [selectedId, setSelectedId] = useState(noteTemplates[0].templateId)
  const [mode, setMode] = useState<ApplyMode>(hasNote ? 'APPEND' : 'NEW_NOTE')

  const filtered = useMemo(
    () =>
      noteTemplates.filter(
        (template) =>
          (category === '전체' || template.category === category) &&
          (query.trim() === '' || template.name.includes(query.trim())),
      ),
    [category, query],
  )
  const selected = noteTemplates.find((template) => template.templateId === selectedId) ?? noteTemplates[0]

  return (
    <Modal
      title="템플릿 선택"
      wide
      onRequestClose={onClose}
      initialFocusRef={searchRef}
      footer={
        <div className={styles.templateFooter}>
          <p className={styles.modalNote}>템플릿은 작성을 돕는 양식이에요. 순서·제목·이모지 모두 자유롭게 바꿀 수 있어요.</p>
          <div className={styles.footerButtons}>
            <button type="button" className={formStyles.ghostButton} onClick={onClose}>
              취소
            </button>
            <button type="button" className={formStyles.primaryButton} disabled aria-describedby={`${listId}-reason`}>
              템플릿 사용하기
            </button>
            <span id={`${listId}-reason`} className={styles.disabledReason}>
              노트 편집기 연결 후 사용할 수 있어요
            </span>
          </div>
        </div>
      }
    >
      <div className={styles.templateLayout}>
        <div className={styles.templateSidebar}>
          <label className={styles.templateSearch}>
            <SearchIcon size={15} />
            <span className="lh-visually-hidden">템플릿 검색</span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder="템플릿 검색"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className={styles.templateTabs} role="group" aria-label="템플릿 분류">
            {(['전체', ...noteTemplateCategories] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={styles.templateTab}
                aria-pressed={category === value}
                onClick={() => setCategory(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <ul id={listId} className={styles.templateList} aria-label="템플릿 목록">
            {filtered.length === 0 && <li className={styles.popoverHint}>맞는 템플릿이 없어요.</li>}
            {filtered.map((template) => (
              <li key={template.templateId}>
                <button
                  type="button"
                  className={styles.templateItem}
                  aria-pressed={template.templateId === selected.templateId}
                  onClick={() => setSelectedId(template.templateId)}
                >
                  <span className={styles.templateNumber}>{template.templateId.slice(-2)}</span>
                  <span>
                    <span className={styles.templateName}>{template.name}</span>
                    <span className={styles.templateCategory}>{template.category}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.templatePreviewArea}>
          <p className={styles.previewLabel}>미리보기 · 적용하면 이 내용이 노트 본문에 들어가요</p>
          <div className={styles.templatePreview} tabIndex={0} aria-label={`${selected.name} 미리보기`}>
            <h3 className={styles.previewTitle}>{selected.name}</h3>
            {selected.blocks
              .filter((block) => block.type === 'HEADING')
              .map((block) => (
                <NoteBlockView key={block.blockId} block={block} />
              ))}
          </div>
          {hasNote && (
            <fieldset className={styles.applyModes}>
              <legend className={styles.previewLabel}>지금 노트에 내용이 있어요. 어떻게 넣을까요?</legend>
              <label className={styles.applyMode} data-checked={mode === 'APPEND'}>
                <input type="radio" name="apply-mode" checked={mode === 'APPEND'} onChange={() => setMode('APPEND')} />
                <span>
                  <strong>현재 노트 끝에 추가</strong>
                  <span>기존 내용은 그대로 두고 아래에 양식을 붙여요</span>
                </span>
              </label>
              <label className={styles.applyMode} data-checked={mode === 'NEW_NOTE'}>
                <input type="radio" name="apply-mode" checked={mode === 'NEW_NOTE'} onChange={() => setMode('NEW_NOTE')} />
                <span>
                  <strong>새 노트로 시작</strong>
                  <span>지금 노트는 그대로 두고 새 노트를 만들어요</span>
                </span>
              </label>
            </fieldset>
          )}
        </div>
      </div>
    </Modal>
  )
}
