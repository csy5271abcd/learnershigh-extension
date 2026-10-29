/** Keep the current care version and preview mode when opening a student. */
export function studentCareStudentHref(branchId:string,studentId:string){
 const params=new URLSearchParams(window.location.search)
 params.set('branchId',branchId)
 params.set('studentId',studentId)
 return `${window.location.pathname}?${params}`
}
