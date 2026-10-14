import type { CaseBody, CaseStageBody, RecordGrade } from '../../../api/types.ts'
import { SelectField, TextAreaField, TextField } from '../../../components/FormFields.tsx'
import ui from '../../../components/ui.module.css'
import { newLocalId } from '../model/contentForm.ts'
import { recordGrades } from '../../../content-body/labels.ts'
import styles from './editor.module.css'
import { PrivacyChecklist } from './PrivacyChecklist.tsx'

interface CaseEditorProps {
  value: CaseBody
  onChange: (next: CaseBody) => void
}

const newStage = (): CaseStageBody => ({ stageId: newLocalId('stage'), title: '', description: '' })

// Case: 활동 단계 / Evidence Summary / 결과 / Reflection. 단계는 실제 활동 순서대로 자유롭게 적는다.
export function CaseEditor({ value, onChange }: CaseEditorProps) {
  const updateStage = (stageId: string, patch: Partial<CaseStageBody>) =>
    onChange({ ...value, stages: value.stages.map((stage) => (stage.stageId === stageId ? { ...stage, ...patch } : stage)) })

  const moveStage = (index: number, offset: -1 | 1) => {
    const stages = [...value.stages]
    const [stage] = stages.splice(index, 1)
    stages.splice(index + offset, 0, stage)
    onChange({ ...value, stages })
  }

  return (
    <div className={ui.form}>
      <PrivacyChecklist />
      <div className={ui.row}>
        <SelectField
          label="활동 당시 학년"
          value={value.grade}
          onChange={(event) => onChange({ ...value, grade: Number(event.target.value) as RecordGrade })}
        >
          {recordGrades.map((grade) => (
            <option key={grade.id} value={grade.id}>
              {grade.label}
            </option>
          ))}
        </SelectField>
        <TextField label="과목 / 영역" value={value.subject} onChange={(event) => onChange({ ...value, subject: event.target.value })} />
        <TextField
          label="활동 유형"
          optional
          placeholder="예: 탐구 포스터"
          value={value.activityType}
          onChange={(event) => onChange({ ...value, activityType: event.target.value })}
        />
      </div>
      <TextAreaField
        label="활동 요약"
        rows={3}
        value={value.summary}
        onChange={(event) => onChange({ ...value, summary: event.target.value })}
      />
      <fieldset className={styles.editorGroup}>
        <legend className="visually-hidden">활동 단계</legend>
        <div className={styles.editorGroupHeader} aria-hidden="true">
          <span>활동 단계</span>
        </div>
        {value.stages.map((stage, index) => (
          <div key={stage.stageId} className={`${ui.form} ${styles.itemDivider}`}>
            <div className={styles.stageItem}>
              <TextField
                compact
                label={`${index + 1}단계 이름`}
                value={stage.title}
                onChange={(event) => updateStage(stage.stageId, { title: event.target.value })}
              />
              <div className={ui.actions}>
                <button
                  type="button"
                  className={`${ui.button} ${ui.ghost}`}
                  disabled={index === 0}
                  onClick={() => moveStage(index, -1)}
                  aria-label={`${index + 1}단계 위로`}
                >
                  위로
                </button>
                <button
                  type="button"
                  className={`${ui.button} ${ui.ghost}`}
                  disabled={index === value.stages.length - 1}
                  onClick={() => moveStage(index, 1)}
                  aria-label={`${index + 1}단계 아래로`}
                >
                  아래로
                </button>
                <button
                  type="button"
                  className={`${ui.button} ${ui.ghost}`}
                  onClick={() => onChange({ ...value, stages: value.stages.filter((item) => item.stageId !== stage.stageId) })}
                  aria-label={`${index + 1}단계 삭제`}
                >
                  삭제
                </button>
              </div>
            </div>
            <TextAreaField
              compact
              optional
              label={`${index + 1}단계 설명`}
              rows={2}
              value={stage.description}
              onChange={(event) => updateStage(stage.stageId, { description: event.target.value })}
            />
          </div>
        ))}
        <div className={ui.actions}>
          <button
            type="button"
            className={`${ui.button} ${ui.neutral} ${ui.small}`}
            onClick={() => onChange({ ...value, stages: [...value.stages, newStage()] })}
          >
            단계 추가
          </button>
        </div>
      </fieldset>
      <TextAreaField
        label="Evidence 요약"
        optional
        rows={3}
        value={value.evidenceSummary}
        onChange={(event) => onChange({ ...value, evidenceSummary: event.target.value })}
        help="어떤 자료를 근거로 썼는지 요약해 주세요. 원본 파일은 공개하지 않아요."
      />
      <TextAreaField
        label="결과"
        optional
        rows={2}
        value={value.result}
        onChange={(event) => onChange({ ...value, result: event.target.value })}
      />
      <TextAreaField
        label="Reflection"
        optional
        rows={3}
        value={value.reflection}
        onChange={(event) => onChange({ ...value, reflection: event.target.value })}
      />
      <TextAreaField
        label="후속 활동"
        optional
        rows={2}
        value={value.followUp}
        onChange={(event) => onChange({ ...value, followUp: event.target.value })}
      />
    </div>
  )
}
