import ui from '../components/AdminUi.module.css'
import { StudentCarePage } from '../features/student-care/StudentCarePage.tsx'
import { CareDesignContext } from '../features/student-care/model/CareDesignContext.ts'
import '../features/student-care/components/baseline/baseline.css'
import '../features/student-care/components/weekly/weekly.css'
import styles from './StudentCareRoute.module.css'

/** 학습관리 › 학생 케어. 비교 시안(1~3)을 정리하고 최종안만 남겼다. */
export function StudentCareRoute() {
  return <div className={`${ui.page} ${styles.compact}`}><div className={styles.surface}>
    <CareDesignContext.Provider value={5}>
      <div className="sc-baseline sc-week" data-care-design={5}>
        <StudentCarePage design={5}/>
      </div>
    </CareDesignContext.Provider>
  </div></div>
}
