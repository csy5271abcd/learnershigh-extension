// 학생 케어 시안 A–D(docs/design/ops-redesign/plan-v5.md). 기존 /student-care와 /student-care/ops는 그대로 둔다.
import type { StudentCareVariant } from '../../../app/studentCarePaths.ts'
import { VariantA } from './a/VariantA.tsx'
import { VariantB } from './b/VariantB.tsx'
import { VariantC } from './c/VariantC.tsx'
import { VariantD } from './d/VariantD.tsx'
import '../student-care.css'
import './variants.css'
import { TipLayer } from './shared/charts.tsx'

export function StudentCareVariantPage({ variant }: { variant: StudentCareVariant }) {
  return <TipLayer>{variant === 'a' ? <VariantA /> : variant === 'b' ? <VariantB /> : variant === 'c' ? <VariantC /> : <VariantD />}</TipLayer>
}
