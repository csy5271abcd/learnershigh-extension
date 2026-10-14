import type { RecordArea, RecordBody, RecordGrade } from '../../../api/types.ts'
import { SelectField, TextAreaField, TextField } from '../../../components/FormFields.tsx'
import ui from '../../../components/ui.module.css'
import { recordAreas, recordGrades } from '../model/labels.ts'
import { PrivacyChecklist } from './PrivacyChecklist.tsx'

interface RecordEditorProps {
  value: RecordBody
  onChange: (next: RecordBody) => void
}

// Record: 개인정보를 지운 기록 문장. 원본 PDF 업로드 / 공개는 두지 않는다. (domain.md §33)
export function RecordEditor({ value, onChange }: RecordEditorProps) {
  return (
    <div className={ui.form}>
      <PrivacyChecklist />
      <div className={ui.row}>
        <SelectField
          label="학년"
          value={value.grade}
          onChange={(event) => onChange({ ...value, grade: Number(event.target.value) as RecordGrade })}
        >
          {recordGrades.map((grade) => (
            <option key={grade.id} value={grade.id}>
              {grade.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="학기"
          value={value.semester ?? ''}
          onChange={(event) =>
            onChange({ ...value, semester: event.target.value ? (Number(event.target.value) as 1 | 2) : null })
          }
        >
          <option value="">학기 구분 없음</option>
          <option value="1">1학기</option>
          <option value="2">2학기</option>
        </SelectField>
        <SelectField
          label="영역"
          value={value.area}
          onChange={(event) => onChange({ ...value, area: event.target.value as RecordArea })}
        >
          {recordAreas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.label}
            </option>
          ))}
        </SelectField>
      </div>
      <TextField
        label="과목 또는 활동 이름"
        value={value.subjectOrActivity}
        onChange={(event) => onChange({ ...value, subjectOrActivity: event.target.value })}
      />
      <TextAreaField
        label="기록 문장"
        rows={7}
        value={value.recordText}
        onChange={(event) => onChange({ ...value, recordText: event.target.value })}
        help="학생부 문장에서 개인정보를 지운 뒤 옮겨 주세요. 검수에서 다시 확인해요."
      />
      <TextField
        label="연결된 활동"
        optional
        value={value.linkedActivity}
        onChange={(event) => onChange({ ...value, linkedActivity: event.target.value })}
      />
      <TextAreaField
        label="멘토 메모"
        optional
        rows={3}
        value={value.mentorNote}
        onChange={(event) => onChange({ ...value, mentorNote: event.target.value })}
        help="이 기록이 어떤 활동에서 나왔는지 짧게 적어 주세요."
      />
    </div>
  )
}
