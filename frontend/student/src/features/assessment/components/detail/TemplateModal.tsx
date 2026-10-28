import { useId, useMemo, useRef, useState } from 'react'
import { noteTemplateCategories, noteTemplates, type NoteTemplate, type NoteTemplateCategory } from '../../model/noteTemplates.ts'
import { SearchIcon } from '../AssessmentIcons.tsx'
import { Modal } from '../Modal.tsx'
import formStyles from '../AddSchoolAssessmentModal.module.css'
import styles from './detail.module.css'
import { NoteBlocksView } from './NoteSection.tsx'

export type TemplateApplyMode = 'APPEND' | 'NEW_NOTE'

interface TemplateModalProps {
  /** 지금 편집기 본문에 내용이 있는지 */
  hasContent: boolean
  /** 저장 안 된 변경이 있으면 "새 노트로 시작"(본문 바꾸기)을 막는다 */
  hasUnsavedChanges: boolean
  onClose: () => void
  onApply: (template: NoteTemplate, mode: TemplateApplyMode) => void
}

// 템플릿 선택 (Mockup SN-TEMPLATE-01, assessment-inquiry.md §6, api-contract.md §19).
// 적용 방식은 Spec·계약대로 "새 노트로 시작" / "기존 본문 뒤에 추가" 두 가지다 (Mockup의 "맨 위에 추가"는 Spec에 없어 제외).
// 소제목·이모지가 실제 편집기 본문 블록으로 들어간다. 내용이 있으면 끝에 추가가 기본이고, 본문을 바꾸는 "새 노트로 시작"은
// 저장된 상태에서 확인을 받은 뒤에만 한다 (이전 저장본은 수정 이력에 남는다. 복원은 정책 미정).
export function TemplateModal({ hasContent, hasUnsavedChanges, onClose, onApply }: TemplateModalProps) {
  const searchRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<NoteTemplateCategory | '전체'>('전체')
  const [selectedId, setSelectedId] = useState(noteTemplates[0].templateId)
  const [mode, setMode] = useState<TemplateApplyMode>(hasContent ? 'APPEND' : 'NEW_NOTE')
  const [confirmReplace, setConfirmReplace] = useState(false)
  const replaceBlocked = hasContent && mode === 'NEW_NOTE' && hasUnsavedChanges

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
            {confirmReplace ? (
              <>
                <span className={styles.disabledReason} role="alert">
                  지금 본문이 이 템플릿으로 바뀌어요. 저장된 이전 내용은 수정 이력에 남아요.
                </span>
                <button type="button" className={formStyles.dangerButton} onClick={() => onApply(selected, 'NEW_NOTE')}>
                  바꾸기
                </button>
              </>
            ) : (
              <button
                type="button"
                className={formStyles.primaryButton}
                disabled={replaceBlocked}
                aria-describedby={replaceBlocked ? `${listId}-reason` : undefined}
                onClick={() => {
                  if (hasContent && mode === 'NEW_NOTE') setConfirmReplace(true)
                  else onApply(selected, hasContent ? mode : 'NEW_NOTE')
                }}
              >
                템플릿 사용하기
              </button>
            )}
            {replaceBlocked && (
              <span id={`${listId}-reason`} className={styles.disabledReason}>
                저장되지 않은 변경이 있어요. 저장된 뒤에 새 노트로 시작할 수 있어요
              </span>
            )}
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
            {/* 안내 문구(흐린 글씨)는 빈 칸 자리 표시라 학생 내용으로 저장되지 않아요. */}
            <NoteBlocksView blocks={selected.blocks} showPlaceholders />
          </div>
          {hasContent && (
            <fieldset className={styles.applyModes}>
              <legend className={styles.previewLabel}>지금 노트에 내용이 있어요. 어떻게 넣을까요?</legend>
              <label className={styles.applyMode} data-checked={mode === 'APPEND'}>
                <input type="radio" name="apply-mode" checked={mode === 'APPEND'} onChange={() => { setMode('APPEND'); setConfirmReplace(false) }} />
                <span>
                  <strong>현재 노트 끝에 추가</strong>
                  <span>기존 내용은 그대로 두고 아래에 양식을 붙여요</span>
                </span>
              </label>
              <label className={styles.applyMode} data-checked={mode === 'NEW_NOTE'}>
                <input type="radio" name="apply-mode" checked={mode === 'NEW_NOTE'} onChange={() => setMode('NEW_NOTE')} />
                <span>
                  <strong>새 노트로 시작</strong>
                  <span>본문을 이 템플릿으로 바꿔요. 저장된 지금 내용은 수정 이력에 남아요 (복원은 준비 중)</span>
                </span>
              </label>
            </fieldset>
          )}
        </div>
      </div>
    </Modal>
  )
}
