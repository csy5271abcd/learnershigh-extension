import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { CreateIcon, IconTile, TypeGlyph } from '../components/icons.tsx'
import { contentTypes } from '../model/contentMeta.ts'
import styles from './CreateLauncher.module.css'
import { createWithTypePath } from './paths.ts'

/**
 * Rail "작성" → 작은 Launcher Popover에서 유형을 고르고 Composer로 이동한다.
 * Keyboard: Enter / Space로 열고, 열리면 첫 유형으로 Focus, Esc로 닫고 "작성" 버튼으로 돌아간다.
 */
export function CreateLauncher({ itemClassName, activeClassName }: { itemClassName: string; activeClassName: string }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const popoverId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // 다른 화면으로 이동하면 닫는다.
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    panelRef.current?.querySelector('a')?.focus()
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }

  return (
    <div className={styles.wrap}>
      <button
        ref={buttonRef}
        type="button"
        className={`${itemClassName} ${open || pathname === '/create' ? activeClassName : ''}`}
        aria-expanded={open}
        aria-controls={popoverId}
        aria-current={pathname === '/create' ? 'page' : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <CreateIcon active={open || pathname === '/create'} />
        <span>작성</span>
      </button>
      {open && (
        <div
          ref={panelRef}
          id={popoverId}
          className={styles.popover}
          role="dialog"
          aria-label="새 콘텐츠 작성"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation()
              close()
            }
          }}
        >
          <p className={styles.title}>새 콘텐츠 작성</p>
          <ul className={styles.grid}>
            {contentTypes.map((type) => (
              <li key={type.id}>
                <Link to={createWithTypePath(type.id)} className={styles.option} onClick={() => setOpen(false)}>
                  <IconTile size={48}>
                    <TypeGlyph type={type.id} size={32} />
                  </IconTile>
                  <span className={styles.optionLabel}>{type.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className={styles.hint}>Record · Case는 개인정보 검수 후 공개돼요.</p>
        </div>
      )}
    </div>
  )
}
