// Arithmetic counterexamples for design research. Synthetic examples, not DB records or a production detector.
import assert from 'node:assert/strict'
import {writeFileSync} from 'node:fs'
import {quantile} from '../../frontend/admin/src/features/student-care/model/branchDistribution.ts'
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length
const outside=a=>{const q1=quantile(a,.25),q3=quantile(a,.75),iqr=q3-q1;return a.filter(v=>v<q1-1.5*iqr||v>q3+1.5*iqr).length}
const rate=(a,b)=>(a-b)/b*100
const cases=[]
const add=(id,values,meaning)=>cases.push({id,...values,meaning})
const routine=[...Array(30).fill(180),...Array(30).fill(600)]
assert.equal(mean(routine),390)
add('normal-heterogeneity',{students:60,rawMeanMinutes:390,personalChangePercent:0},'3시간형과10시간형이 평소를 유지한다. 6시간30분 평균을 개인 정상 기준으로 쓰지 않는다.')
assert.equal(rate(360,600),-40)
add('hidden-by-raw-value',{usualMinutes:600,currentMinutes:360,changePercent:-40},'집단 평균 부근의6시간도 본인10시간 대비40%감소일 수 있다.')
const diluted=[...Array(57).fill(0),100,100,100]
assert.equal(mean(diluted),5);assert.equal(outside(diluted),3)
add('mean-dilution',{students:60,meanShiftMinutes:5,changedStudents:3,eachShiftMinutes:100},'평균+5분만으로 세 학생의+100분을 표현하지 못한다.')
const wholeShift=Array(60).fill(100)
assert.equal(mean(wholeShift),100);assert.equal(outside(wholeShift),0)
add('whole-group-shift',{meanShiftMinutes:100,crossSectionalIqrOutliers:0},'전체가 같은 방향으로 변하면 동시점 집단IQR만으로는 아무도 잡히지 않는다.')
assert.equal(mean([100,-100]),0)
add('signed-cancellation',{lateMinutes:100,earlyMinutes:-100,meanMinutes:0},'빠른 입실과 늦은 입실이 상쇄돼도 지연 학생은 남는다.')
assert.equal(mean([595,600,600,605]),600);assert.equal(mean([540,580,620,660]),600)
add('different-personal-variability',{stableHistoryMinutes:[595,600,600,605],variableHistoryMinutes:[540,580,620,660],sameActualMinutes:630,sameMeanMinutes:600,sameShiftMinutes:30},'두 학생의 평균과+30분 편차는 같아도 과거 변동 폭은 다르다. 평균 보정만으로 개인별 이례성을 확정하지 않는다. 같은요일4개 관측은 정밀한 정상범위를 추정할 충분한 근거라고 주장하지 않는다.')
assert.equal(rate(5,10),-50);assert.equal(rate(300,600),-50)
add('same-rate-different-impact',{short:{changePercent:-50,lossMinutes:5},long:{changePercent:-50,lossMinutes:300}},'같은 감소율이어도 절대 변화가 다르다. 비율만으로 심각도를 정렬하지 않는다.')
assert.equal(mean([300,0]),150)
add('attendance-versus-duration',{priorMinutesPerVisit:300,currentMinutesPerVisit:300,currentMinutesPerScheduledDay:150},'입실일 학습량은 유지됐고 결석으로 일평균만 줄었다. 학습량 감소 원인과 출결을 구분한다.')
assert.equal(rate([40,40,40,40,500].reduce((s,v)=>s+v,0),500),32)
add('weekly-offset',{dailyMinutes:[40,40,40,40,500],usualDailyMinutes:100,weekChangePercent:32,reducedDays:4},'주간+32%여도 네 날은60%감소했다. 반복과합계를 함께 확인한다.')
const averageRate=mean([20/10,100/200])*100,pooledRate=(20+100)/(10+200)*100
assert.equal(averageRate,125);assert.ok(Math.abs(pooledRate-57.14285714285714)<1e-9)
add('ratio-weighting',{meanStudentProgressPercent:averageRate,pooledProgressPercent:pooledRate},'개인진행률 평균과 계획분 합계로 가중한 진행률은 다른 질문에 답한다.')
add('zero-denominator',{plannedMinutes:0,actualMinutes:120,progressPercent:null},'계획0분에서는 진행률을0%나무한대로 만들지 않는다.')
assert.equal(60/100*100,60);assert.equal(60/200*100,30)
add('composition-dependency',{subjectMinutesBefore:60,subjectMinutesAfter:60,shareBeforePercent:60,shareAfterPercent:30},'과목시간은 그대로여도 다른과목증가로 비중은30%p낮아진다. 과목학습감소를 단정하지 않는다.')
assert.equal(3/20*100,15);assert.equal(3/60*100,5)
add('missing-denominator',{totalStudents:60,scheduledStudents:60,confirmedScheduledStudents:20,unknownScheduledStudents:40,absentStudents:3,confirmedSampleAbsencePercent:15,wholeScheduledGroupAbsencePercent:null,observedAbsenceLowerBoundPercent:5},'예정이며 출결 확인된20명의 표본 결석률은15%다. 예정이나 출결 미확인40명이 남아 전체 예정 집단의 결석률은 확정할 수 없다. 관측 결석3/60=5%를 전체의 완전한 결석률처럼 표시하면 안 된다.')
writeFileSync(new URL('../../docs/design/student-care-metric-cases-2026-10-28.json',import.meta.url),JSON.stringify({synthetic:true,purpose:'design counterexamples, not real observations',cases},null,2)+'\n')
console.log(`Verified ${cases.length} synthetic metric counterexamples; wrote research evidence JSON.`)
