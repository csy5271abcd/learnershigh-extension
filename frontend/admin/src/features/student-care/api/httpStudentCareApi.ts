import {request} from './apiClient.ts'
import type {studentCareApi} from './studentCareApi.ts'
import type {Branch, StudentCareDetail} from '../model/types.ts'
import type {CareBranchMetricsResponse, ServerWeeklyReview} from '../model/serverWeeklyReview.ts'
export type CareApi = typeof studentCareApi & {metrics?:(branchId:string)=>Promise<CareBranchMetricsResponse>}
const base='/api/admin/student-care'
const branchQuery=(branchId:string)=>`?branchId=${encodeURIComponent(branchId)}`
const json=(method:string,body:unknown)=>({method,body:JSON.stringify(body)})
export const httpStudentCareApi:CareApi & {metrics:(branchId:string)=>Promise<CareBranchMetricsResponse>}={
 branches:async()=> (await request<{items:Branch[]}>(`${base}/branches`)).items,
 board:branchId=>request(`${base}/board${branchQuery(branchId)}`),
 metrics:branchId=>request(`${base}/metrics${branchQuery(branchId)}`),
 detail:async(branchId,studentId)=>{
  const {review,...detail}=await request<StudentCareDetail & {review:ServerWeeklyReview}>(`${base}/students/${encodeURIComponent(studentId)}${branchQuery(branchId)}`)
  return {...detail,serverReview:review}
 },
 history:(branchId,studentId)=>request(`${base}/students/${encodeURIComponent(studentId)}/history${branchQuery(branchId)}`),
 openCase:input=>request(`${base}/cases`,json('POST',input)),
 decide:(branchId,caseId,input)=>request(`${base}/cases/${encodeURIComponent(caseId)}/decisions${branchQuery(branchId)}`,json('POST',input)),
 addNote:(branchId,caseId,channel,content,actorName)=>request(`${base}/cases/${encodeURIComponent(caseId)}/notes${branchQuery(branchId)}`,json('POST',{channel,content,actorName})),
 settings:branchId=>request(`${base}/settings${branchQuery(branchId)}`),
 updateSettings:(branchId,values)=>request(`${base}/settings${branchQuery(branchId)}`,json('PUT',values)),
}
