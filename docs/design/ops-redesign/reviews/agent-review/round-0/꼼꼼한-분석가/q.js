const m=require("./metrics.json");const nm=process.argv[2];const s=m.students.find(x=>x.student.studentName===nm);const r=s.review;
const hm=v=>v==null?"-":Math.floor(v/60)+":"+String(Math.round(v%60)).padStart(2,"0");
console.log(nm,"cur",JSON.stringify(r.current));console.log("base",JSON.stringify(r.baseline));
r.days.forEach((d,i)=>{const w=r.weekdayBaseline[i];console.log(d.date,d.attendance,d.submission,"min",d.minutes,hm(d.minutes),"start",hm(d.startMinutes),"plan",d.plannedMinutes,"act",d.actualMinutes,"| wkBase",w&&w.minutes,hm(w&&w.minutes),"st",hm(w&&w.startMinutes),"n",w&&w.samples)});
console.log("subjects",JSON.stringify(r.subjects));
console.log("keys",Object.keys(s));
