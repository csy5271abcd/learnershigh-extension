import type {CareApi} from './httpStudentCareApi.ts'
import type {CareBoard, StudentRef} from '../model/types.ts'
import type {WeeklyReview} from '../model/weeklyReviewTypes.ts'
import {weeklyReview} from '../model/weeklyReview.ts'
import {fromServerReview} from '../model/serverWeeklyReview.ts'
export interface CareRosterRow {student:StudentRef;review:WeeklyReview;priority:number;recheckDate:string|null}
export async function loadCareRoster(api:CareApi,branchId:string):Promise<{board:CareBoard;rows:CareRosterRow[]}> {
 const priority=(board:CareBoard,studentId:string)=>{
  const active=board.inAdjustment.find(s=>s.studentId===studentId)
  return {priority:active?.recheckDue?0:board.needsCheck.some(s=>s.studentId===studentId)?1:active?2:board.deferred.some(s=>s.studentId===studentId)?3:4,recheckDate:active?.recheckDate??null}
 }
 if(api.metrics){
  const [board,metrics]=await Promise.all([api.board(branchId),api.metrics(branchId)])
  return {board,rows:metrics.students.map(({student,review})=>({student,review:fromServerReview(review,metrics.asOf,board.needsCheck.find(s=>s.studentId===student.studentId)?.signals??board.inAdjustment.find(s=>s.studentId===student.studentId)?.signals??[],board.deferred.some(s=>s.studentId===student.studentId)),...priority(board,student.studentId)}))}
 }
 const board=await api.board(branchId)
 const rows=await Promise.all(board.students.map(async student=>{const detail=await api.detail(branchId,student.studentId);return {student,review:weeklyReview(detail),...priority(board,student.studentId)}}))
 return {board,rows}
}
