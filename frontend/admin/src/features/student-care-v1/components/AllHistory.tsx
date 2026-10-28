import { studentCareApi } from '../api/studentCareApi.ts'
import { shortDate } from '../model/format.ts'
import type { CareEvent, StudentRef } from '../model/types.ts'
import { loadFailure, useRemote } from '../model/useRemote.ts'

/*
 * 전체 이력 (FE 시연용). 지점 전체 이력 API가 아직 없어, 지점 학생마다 개인 이력 API를 불러 합친다.
 * 학생 ID 목록도 API가 없어 백엔드 Mock 학생 목록과 같은 값을 둔다. 실제 API가 생기면 이 파일을 바꾼다.
 */
const MOCK_STUDENT_IDS: Record<string, string[]> = {
  br_gangnam: Array.from({ length: 10 }, (_, i) => `stu_${String(i + 1).padStart(3, '0')}`),
  br_bundang: ['stu_101', 'stu_102', 'stu_103'],
}

type Row = CareEvent & { student: StudentRef }

interface Props {
  branchId: string
  version: number
  onOpenStudent: (studentId: string) => void
}

async function loadAll(branchId: string): Promise<Row[]> {
  const results = await Promise.allSettled((MOCK_STUDENT_IDS[branchId] ?? []).map((id) => studentCareApi.history(branchId, id)))
  const ok = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
  if (ok.length === 0 && results.length > 0) throw new Error('history load failed')
  return ok
    .flatMap((history) => history.items.map((item) => ({ ...item, student: history.student })))
    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt))
}

export function AllHistory({ branchId, version, onOpenStudent }: Props) {
  const remote = useRemote(`${branchId}/all-history`, () => loadAll(branchId), version)
  const rows = remote.data

  if (loadFailure(remote)) {
    return (
      <div className="sc-state" role="alert">
        <p>불러오지 못했습니다</p>
        <button type="button" className="sc-button" onClick={remote.reload}>
          다시 시도
        </button>
      </div>
    )
  }
  if (!rows) return <p className="sc-state">불러오는 중</p>
  if (rows.length === 0) return <p className="sc-state">기록 없음</p>

  return (
    <table className="sc-all">
      <thead>
        <tr>
          <th scope="col">날짜</th>
          <th scope="col">학생</th>
          <th scope="col">내용</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.eventId}>
            <td className="sc-all__date">{shortDate(row.occurredOn)}</td>
            <td>
              <button type="button" className="sc-all__student" onClick={() => onOpenStudent(row.student.studentId)}>
                {row.student.studentName}
              </button>
              <span className="sc-all__class">{row.student.className}</span>
            </td>
            <td>{row.content}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
