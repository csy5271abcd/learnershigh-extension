import type { CareSnapshot, CareSnapshotMetric, DailyCareRecord } from '../../model/careSnapshot.ts'

export interface CareVisualProps {
  snapshot: CareSnapshot
  onMetric: (metric: CareSnapshotMetric) => void
  onDay: (day: DailyCareRecord) => void
}
