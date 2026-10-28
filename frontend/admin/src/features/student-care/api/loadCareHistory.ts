import type { CareApi } from './httpStudentCareApi.ts'
import type { CareEvent, StudentRef } from '../model/types.ts'

/** 실제 지점 명부를 기준으로 병합한다. 일부 조회 실패도 빈 이력으로 숨기지 않는다. */
export async function loadCareHistory(api:CareApi,branchId:string):Promise<(CareEvent & {student:StudentRef})[]> {
 return (await loadCareHistoryPage(api,branchId)).rows
}

export async function loadCareHistoryPage(api:CareApi,branchId:string) {
 const board=await api.board(branchId)
 const histories=await Promise.all(board.students.map(student=>api.history(branchId,student.studentId)))
 const rows=histories.flatMap(history=>history.items.map(item=>({...item,student:history.student})))
  .sort((a,b)=>b.occurredOn.localeCompare(a.occurredOn)||b.createdAt.localeCompare(a.createdAt))
 return {students:board.students,rows}
}
