import {test} from 'node:test'
import assert from 'node:assert/strict'
import {fromServerReview} from './serverWeeklyReview.ts'
import {weeklyReview} from './weeklyReview.ts'
import {httpStudentCareApi} from '../api/httpStudentCareApi.ts'
import {loadCareRoster} from '../api/loadCareRoster.ts'
const summary={calendarDays:7,recordedDays:7,attendanceDays:1,scheduledAbsenceDays:0,submissionDays:1,submissionRecordedDays:7,studyMinutes:777,minutesPerAttendance:777,averageStartMinutes:600,startSamples:1,plannedMinutes:500,actualMinutes:777,executionRate:155.4,comparablePlanDays:1}
const student={studentId:'stu_002',studentName:'HTTP 학생',className:null,branchId:'br_real'}
const review={from:'2026-10-18',to:'2026-10-24',baselineFrom:'2026-09-20',baselineTo:'2026-10-17',days:Array.from({length:7},(_,i)=>({date:`2026-10-${18+i}`,attendance:i===0?'PRESENT':i===1?'ABSENT':i===2?'UNSCHEDULED':'UNKNOWN',submission:i===0?'SUBMITTED':'UNKNOWN',scheduled:i===0||i===1?true:null,minutes:i===0?777:null,startMinutes:i===0?600:null,plannedMinutes:i===0?500:null,actualMinutes:i===0?777:null})),current:summary,baseline:{...summary,calendarDays:28,recordedDays:28,studyMinutes:4000,attendanceDays:16},weekdayBaseline:[{date:'2026-10-18',minutes:250,startMinutes:590,samples:4,startSamples:2}],subjects:[{name:'서버과목',plannedMinutes:500,actualMinutes:777,plannedShare:100,actualShare:100}]}
const detail={asOf:review.to,student,review,signals:[],deferred:null,dailyStudy:[],usualDailyMinutes:999,activeCase:null}
test('server review wins over FE fixtures and retains nulls, summaries and samples',()=>{
 const result=weeklyReview({...detail,serverReview:review})
 assert.equal(result.metrics.find(m=>m.type==='STUDY_DROP').current,777)
 assert.equal(result.metrics.find(m=>m.type==='STUDY_DROP').before,1000)
 assert.equal(result.metrics.find(m=>m.type==='EXECUTION_GAP').current,155.4)
 assert.equal(result.days[1].minutes,null)
 assert.equal(result.days[2].attendance,'excluded')
 assert.equal(result.baselineDays.length,0)
 assert.equal(result.weekdayBaseline[0].samples,4)
 assert.equal(result.weekdayBaseline[0].startSamples,2)
 assert.equal(result.metrics.find(m=>m.type==='SUBJECT_SHARE').view.subjects[0].name,'서버과목')
 assert.equal(fromServerReview({...review,baseline:{...review.baseline,recordedDays:27}},review.to).metrics.find(m=>m.type==='STUDY_DROP').before,null)
 assert.equal(fromServerReview({...review,current:{...summary,studyMinutes:null}},review.to).recent.minutes,null)
})
test('HTTP paths, direct JSON and write methods follow contract; roster uses bulk metrics',async()=>{
 const calls=[]; const original=globalThis.fetch
 globalThis.fetch=async(path,init)=>{calls.push({path,init});return Response.json(path.includes('/branches')?{items:[{branchId:'br_real',name:'실제점',studentCount:1}]}:path.includes('/metrics')?{asOf:review.to,branch:{branchId:'br_real',name:'실제점'},students:[{student,review}],dailyAverages:[]}:path.includes('/board')?{asOf:review.to,branch:{branchId:'br_real',name:'실제점'},students:[student],needsCheck:[],inAdjustment:[],deferred:[]}:path.includes('/students/')?detail:{caseId:'saved'})}
 try{
  assert.equal((await httpStudentCareApi.branches())[0].branchId,'br_real')
  const actual=await httpStudentCareApi.detail('br real','stu/2');assert.equal(weeklyReview(actual).recent.minutes,777)
  assert.equal(calls.at(-1).path,'/api/admin/student-care/students/stu%2F2?branchId=br%20real')
  const input={branchId:'br_real',studentId:student.studentId,channel:'CALL',memo:'보존',reason:'EXPECTED_CHANGE'}
  await httpStudentCareApi.openCase(input);assert.equal(calls.at(-1).init.method,'POST');assert.deepEqual(JSON.parse(calls.at(-1).init.body),input)
  await httpStudentCareApi.decide('br_real','case/1',{decision:'CLOSE'});assert.equal(calls.at(-1).path,'/api/admin/student-care/cases/case%2F1/decisions?branchId=br_real')
  await httpStudentCareApi.addNote('br_real','case1','CALL','기록');assert.deepEqual(JSON.parse(calls.at(-1).init.body),{channel:'CALL',content:'기록'})
  await httpStudentCareApi.updateSettings('br_real',{absenceDays:1});assert.equal(calls.at(-1).init.method,'PUT')
  calls.length=0;const roster=await loadCareRoster(httpStudentCareApi,'br_real');assert.equal(roster.rows[0].review.recent.minutes,777);assert.equal(calls.length,2);assert.ok(calls.every(c=>!c.path.includes('/students/')))
 }finally{globalThis.fetch=original}
})
test('404 and 503 remain errors and never become preview data',async()=>{
 const original=globalThis.fetch
 try{for(const status of [404,503]){globalThis.fetch=async()=>Response.json({code:'SOURCE_FAILURE',message:'원본 오류'},{status});await assert.rejects(httpStudentCareApi.board('bad'),e=>e.status===status&&e.code==='SOURCE_FAILURE')}}finally{globalThis.fetch=original}
})
