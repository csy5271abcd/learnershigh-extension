import { createContext, useContext } from 'react'
export type CareDesignNumber = 2 | 3 | 4 | 5 | 6 | 7
export const CareDesignContext = createContext<CareDesignNumber>(2)
export const useCareDesign = () => useContext(CareDesignContext)
export const CARE_DESIGN_LABELS: Record<CareDesignNumber, string> = {
  2: '날짜별 기록',
  3: '학습 현황',
  4: '학습관 전체 비교',
  5: '주간 명부',
  6: '지표 비교표',
  7: '날짜별 기록장',
}
