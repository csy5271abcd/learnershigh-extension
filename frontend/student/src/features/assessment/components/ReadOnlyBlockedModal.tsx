import { Modal } from './Modal.tsx'
import styles from './AddSchoolAssessmentModal.module.css'

// 관리자 "학생 화면 보기"(읽기 전용, P-28)에서 등록·업로드·추가 Modal 대신 보여주는 안내.
// 진입 버튼이 남아 있어도 입력 폼을 열지 않는다. 쓰기 API는 viewMode Guard가 따로 막는다.
export function ReadOnlyBlockedModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="읽기 전용 보기예요"
      description="관리자는 학생의 Assessment 기록을 열람만 할 수 있어요."
      compact
      onRequestClose={onClose}
      footer={
        <button type="button" className={styles.ghostButton} onClick={onClose}>
          닫기
        </button>
      }
    >
      <p data-testid="readonly-blocked">이 보기에서는 학생 기록을 바꾸는 동작을 실행하지 않아요.</p>
    </Modal>
  )
}

