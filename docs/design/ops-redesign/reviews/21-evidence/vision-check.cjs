const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../../..');
const ts = require(path.join(root, 'frontend/node_modules/typescript'));
const file = 'frontend/admin/src/features/student-care/variants/shared/visionExample.ts';
const source = fs.readFileSync(path.join(root, file), 'utf8');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, {exports:exportsObject});
function day(id, unsupported) {
  return {studentId:id,date:'2026-10-27',source:'example',photosReceived:10,analyzedPhotos:10,failedPhotos:0,failures:{},unsupportedAxes:unsupported?['reading_or_writing']:[],axes:Object.fromEntries(exportsObject.VISION_AXES.map(a=>[a,a==='reading_or_writing'?{yes:unsupported?0:1,no:unsupported?0:9,unknown:unsupported?10:0}:{yes:0,no:10,unknown:0}]))};
}
const a=day('a',false), b=day('b',true);
const result={
  sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),
  description:'Independent valid counts: supported student 1/10; unsupported student 0 yes + 10 unknown.',
  literalPlanPooled:{yes:1,analyzed:20,ratio:1/20},
  actualBranch:exportsObject.branchVisionDay([{studentId:'a',day:a},{studentId:'b',day:b}]).reading_or_writing,
  sumAcrossSameCounts:exportsObject.sumVision([a,b]),
  noLearningRecord:exportsObject.visionDay('present-but-no-study','2026-10-27',null,1080),
};
fs.writeFileSync(path.join(__dirname,'vision-check.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({plan:result.literalPlanPooled,branch:result.actualBranch.photoShare,studentSum:result.sumAcrossSameCounts.axes.reading_or_writing.yes/result.sumAcrossSameCounts.analyzed,noStudyPhotos:result.noLearningRecord.photosReceived}));
