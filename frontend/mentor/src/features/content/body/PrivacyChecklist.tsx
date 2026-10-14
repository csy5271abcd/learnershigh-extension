import { recordPrivacyItems } from '../model/labels.ts'
import styles from './body.module.css'

// Record / Case 작성 안내. 실제 PII Detection / Admin Review는 검수 단계에서 한다. (domain.md §29-1)
export function PrivacyChecklist() {
  return (
    <section className={styles.privacyBox} aria-labelledby="privacy-checklist-title">
      <p id="privacy-checklist-title">
        <strong>개인정보를 지운 뒤 적어 주세요.</strong> 검수 요청 후 개인정보 확인과 운영팀 검수를 마쳐야 공개돼요.
      </p>
      <ul className={styles.privacyList} aria-label="지워야 하는 정보">
        {recordPrivacyItems.map((item) => (
          <li key={item}>· {item}</li>
        ))}
      </ul>
    </section>
  )
}
