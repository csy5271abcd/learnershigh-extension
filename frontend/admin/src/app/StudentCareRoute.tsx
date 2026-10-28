import ui from '../components/AdminUi.module.css'
import { StudentCarePage } from '../features/student-care/StudentCarePage.tsx'
import { StudentCarePage as OriginalStudentCarePage } from '../features/student-care-v1/StudentCarePage.tsx'
import { CareDesignContext } from '../features/student-care/model/CareDesignContext.ts'
import '../features/student-care/components/baseline/baseline.css'
import '../features/student-care/components/weekly/weekly.css'
import styles from './StudentCareRoute.module.css'

import type { StudentCareVersion } from './studentCarePaths.ts'

/** 1은 원본, 2~4는 같은 예시 데이터를 사용한 독립 시안이다. */
export function StudentCareRoute({ version = 2 }: { version?: StudentCareVersion }) {
  const design = version===2?3:version===3?4:version===1?2:5
  return <div className={`${ui.page}${version !== 1 ? ` ${styles.compact}` : ''}`}><div className={styles.surface}>
    {version === 1 ? <OriginalStudentCarePage /> : (
      <CareDesignContext.Provider value={design}>
        <div className="sc-baseline sc-week" data-care-design={design}>
          <StudentCarePage key={version} design={design} displayVersion={version}/>
        </div>
      </CareDesignContext.Provider>
    )}
  </div></div>
}
