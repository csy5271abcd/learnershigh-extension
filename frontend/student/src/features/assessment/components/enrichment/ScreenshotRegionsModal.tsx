import { useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  attachScreenshot,
  boxFromPoints,
  minRegionSize,
  newRegion,
  roundBox,
  screenshotAccept,
  screenshotFileProblem,
  setRegions,
  useMaterialScreenshot,
  type ScreenshotRegion,
} from '../../model/mockExamScreenshotStore.ts'
import { formatFileSize } from '../../model/noteEditorModel.ts'
import formStyles from '../AddSchoolAssessmentModal.module.css'
import { AlertIcon, InfoIcon, PlusIcon } from '../AssessmentIcons.tsx'
import { Modal } from '../Modal.tsx'
import styles from './screenshot.module.css'

interface ScreenshotRegionsModalProps {
  materialId: string
  materialLabel: string
  onClose: () => void
  /** 선택한 영역으로 심화 탐구 시작 (§18 sourceReference = 이 개인 지문) */
  onStartTask: (region: ScreenshotRegion, index: number) => void
}

const percent = (value: number) => `${(value * 100).toFixed(2)}%`

// 내 지문 스크린샷 미리보기 + 영역 표시 (2026-10-27 사용자 요청 B, Mockup 없음).
// 이미지 위를 끌어 영역을 만들고, 영역마다 메모·핵심 개념·탐구 질문을 적는다. 좌표는 이미지 크기에 대한 비율로 둔다.
// 키보드: "영역 추가"로 가운데에 만들고, 위치·크기(%)를 숫자로 고친다. 영역 상자는 버튼이라 Tab으로 고를 수 있다.
// 이 화면에서만 보관하며(서버·브라우저 저장소 저장 없음), 글자 인식(OCR)은 하지 않는다.
export function ScreenshotRegionsModal({ materialId, materialLabel, onClose, onStartTask }: ScreenshotRegionsModalProps) {
  const ids = { file: useId(), memo: useId(), concept: useId(), question: useId() }
  const screenshot = useMaterialScreenshot(materialId)
  const inputRef = useRef<HTMLInputElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [fileError, setFileError] = useState<string>()
  const [selectedId, setSelectedId] = useState<string>()
  const [drag, setDrag] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null)
  const regions = screenshot?.regions ?? []
  const selectedIndex = regions.findIndex((region) => region.regionId === selectedId)
  const selected = selectedIndex >= 0 ? regions[selectedIndex] : undefined

  const choose = (file: File | undefined) => {
    if (!file) return
    const problem = screenshotFileProblem(file)
    if (problem) {
      setFileError(problem)
      return
    }
    setFileError(undefined)
    setSelectedId(undefined)
    attachScreenshot(materialId, file)
  }

  const pointAt = (event: ReactPointerEvent) => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return null
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }
  }

  const update = (regionId: string, change: Partial<ScreenshotRegion>) =>
    setRegions(
      materialId,
      regions.map((region) => (region.regionId === regionId ? { ...region, ...change, ...('x' in change || 'y' in change || 'width' in change || 'height' in change ? roundBox({ ...region, ...change }) : {}) } : region)),
    )

  const addRegion = (box: { x: number; y: number; width: number; height: number }) => {
    const region = newRegion(box)
    setRegions(materialId, [...regions, region])
    setSelectedId(region.regionId)
  }

  const removeSelected = () => {
    if (!selected) return
    setRegions(materialId, regions.filter((region) => region.regionId !== selected.regionId))
    setSelectedId(undefined)
  }

  const draftBox = drag ? boxFromPoints(drag.start, drag.end) : null

  return (
    <Modal
      title="스크린샷 영역 표시"
      description={`${materialLabel} · 이 화면에서만 보관돼요`}
      wide
      onRequestClose={onClose}
      initialFocusRef={closeRef}
      footer={
        <button ref={closeRef} type="button" className={formStyles.primaryButton} onClick={onClose}>
          닫기
        </button>
      }
    >
      <div className={styles.layout}>
        <p className={styles.notice}>
          <InfoIcon size={14} />
          스크린샷과 영역 메모는 서버에 저장되지 않고 이 화면에서만 보여요. 새로고침하면 사라져요. 글자 인식(OCR)은 하지 않으니 필요한 내용은 직접 적어 주세요. 지문 원문을 다른 사람에게 공유하지 마세요.
        </p>

        <div className={styles.fileRow}>
          <input
            ref={inputRef}
            id={ids.file}
            type="file"
            accept={screenshotAccept}
            className="lh-visually-hidden"
            onChange={(event) => {
              choose(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          <button type="button" className={formStyles.ghostButton} onClick={() => inputRef.current?.click()}>
            {screenshot ? '다른 파일로 바꾸기' : '스크린샷·PDF 고르기'}
          </button>
          {screenshot && (
            <span className={styles.fileMeta}>
              {screenshot.file.name} · {formatFileSize(screenshot.file.size)}
              {screenshot.regions.length > 0 && ' · 바꾸면 지금 영역은 지워져요'}
            </span>
          )}
        </div>
        {fileError && (
          <p className={formStyles.formError} role="alert">
            <AlertIcon size={16} />
            {fileError}
          </p>
        )}

        {!screenshot ? (
          <p className={styles.empty}>PNG·JPG·WEBP 이미지나 PDF를 고르면 여기에서 미리보고 영역을 표시할 수 있어요.</p>
        ) : screenshot.kind === 'pdf' ? (
          <div className={styles.pdfArea}>
            <iframe src={screenshot.previewUrl} title={`${screenshot.file.name} 미리보기`} className={styles.pdfFrame} />
            <p className={styles.hint}>PDF는 미리보기만 돼요. PDF 렌더러를 설치하지 않아 영역 표시는 이미지에서만 할 수 있어요. 필요한 페이지를 캡처해 이미지로 올려 주세요.</p>
          </div>
        ) : (
          <div className={styles.workArea}>
            <div className={styles.stageWrap}>
              <div
                ref={stageRef}
                className={styles.stage}
                onPointerDown={(event) => {
                  if (event.button !== 0 || (event.target !== event.currentTarget && !(event.target instanceof HTMLImageElement))) return
                  const point = pointAt(event)
                  if (!point) return
                  event.currentTarget.setPointerCapture(event.pointerId)
                  setDrag({ start: point, end: point })
                }}
                onPointerMove={(event) => {
                  if (!drag) return
                  const point = pointAt(event)
                  if (point) setDrag({ ...drag, end: point })
                }}
                onPointerUp={() => {
                  if (!drag || !draftBox) return
                  setDrag(null)
                  if (draftBox.width >= minRegionSize && draftBox.height >= minRegionSize) addRegion(draftBox)
                }}
                onPointerCancel={() => setDrag(null)}
              >
                <img src={screenshot.previewUrl} alt={`${screenshot.file.name} 스크린샷`} draggable={false} className={styles.image} />
                {regions.map((region, index) => (
                  <button
                    key={region.regionId}
                    type="button"
                    className={styles.region}
                    aria-pressed={region.regionId === selectedId}
                    aria-label={`영역 ${index + 1}${region.concept ? ` · ${region.concept}` : ''} 선택`}
                    style={{ left: percent(region.x), top: percent(region.y), width: percent(region.width), height: percent(region.height) }}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => setSelectedId(region.regionId)}
                  >
                    <span className={styles.regionNumber}>{index + 1}</span>
                  </button>
                ))}
                {draftBox && (
                  <span
                    className={styles.draft}
                    aria-hidden="true"
                    style={{ left: percent(draftBox.x), top: percent(draftBox.y), width: percent(draftBox.width), height: percent(draftBox.height) }}
                  />
                )}
              </div>
              <p className={styles.hint}>이미지 위를 끌어서 영역을 만들어요. 영역 번호를 누르면 메모를 적을 수 있어요.</p>
            </div>

            <div className={styles.side}>
              <div className={styles.sideHead}>
                <h3 className={styles.sideTitle}>영역 {regions.length}개</h3>
                <button type="button" className={styles.smallButton} onClick={() => addRegion({ x: 0.35, y: 0.35, width: 0.3, height: 0.3 })}>
                  <PlusIcon size={13} />
                  영역 추가
                </button>
              </div>
              {regions.length > 0 && (
                <ol className={styles.regionList} aria-label="영역 목록">
                  {regions.map((region, index) => (
                    <li key={region.regionId}>
                      <button type="button" className={styles.regionItem} aria-pressed={region.regionId === selectedId} onClick={() => setSelectedId(region.regionId)}>
                        <span className={styles.regionBadge}>{index + 1}</span>
                        <span className={styles.regionItemText}>{region.concept || region.question || region.memo || '아직 적지 않았어요'}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
              {selected ? (
                <div className={styles.editor} aria-label={`영역 ${selectedIndex + 1} 편집`} role="group">
                  <fieldset className={styles.coords}>
                    <legend className={styles.legend}>위치·크기 (%)</legend>
                    {(['x', 'y', 'width', 'height'] as const).map((key) => (
                      <label key={key} className={styles.coord}>
                        <span>{{ x: '왼쪽', y: '위', width: '너비', height: '높이' }[key]}</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={Math.round(selected[key] * 1000) / 10}
                          onChange={(event) => {
                            const value = Number(event.target.value)
                            if (Number.isFinite(value)) update(selected.regionId, { [key]: Math.max(key === 'width' || key === 'height' ? minRegionSize : 0, value / 100) })
                          }}
                        />
                      </label>
                    ))}
                  </fieldset>
                  <label className={formStyles.label} htmlFor={ids.concept}>
                    핵심 개념
                  </label>
                  <input id={ids.concept} className={formStyles.input} value={selected.concept} maxLength={100} placeholder="예: 정보 비대칭" onChange={(event) => update(selected.regionId, { concept: event.target.value })} />
                  <label className={formStyles.label} htmlFor={ids.question}>
                    탐구 질문
                  </label>
                  <input id={ids.question} className={formStyles.input} value={selected.question} maxLength={200} placeholder="이 부분에서 더 알아보고 싶은 질문" onChange={(event) => update(selected.regionId, { question: event.target.value })} />
                  <label className={formStyles.label} htmlFor={ids.memo}>
                    메모
                  </label>
                  <textarea id={ids.memo} className={formStyles.textarea} rows={3} value={selected.memo} maxLength={1000} placeholder="내 말로 정리한 내용 (원문을 옮겨 적지 않아요)" onChange={(event) => update(selected.regionId, { memo: event.target.value })} />
                  <div className={styles.editorActions}>
                    <button type="button" className={formStyles.ghostButton} onClick={removeSelected}>
                      영역 삭제
                    </button>
                    <button type="button" className={formStyles.primaryButton} disabled={!selected.question.trim() && !selected.concept.trim()} onClick={() => onStartTask(selected, selectedIndex)}>
                      이 영역으로 탐구 시작
                    </button>
                  </div>
                  {!selected.question.trim() && !selected.concept.trim() && <p className={styles.hint}>핵심 개념이나 탐구 질문을 적으면 탐구를 시작할 수 있어요.</p>}
                </div>
              ) : (
                <p className={styles.hint}>영역을 고르면 메모·개념·질문을 적을 수 있어요.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
