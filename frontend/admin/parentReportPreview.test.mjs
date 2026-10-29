import test from 'node:test'
import assert from 'node:assert/strict'
import {parentReportPreview} from './parentReportPreview.ts'

function requestTo(url,method='GET'){
 let handler
 const plugin=parentReportPreview(url)
 assert.equal(plugin.apply,'serve')
 plugin.configureServer({middlewares:{use(path,callback){assert.equal(path,'/__preview/parent-report');handler=callback}}})
 const result={}
 const response={writeHead(status,headers){Object.assign(result,{status,headers});return this},end(body){result.body=body}}
 handler({method},response)
 return result
}
test('redirects only to the configured local legacy report, without caching its token',()=>{
 const url='http://localhost:8080/util/daily_report.php?token=local-example'
 const result=requestTo(url)
 assert.equal(result.status,302);assert.equal(result.headers.Location,url)
 assert.equal(result.headers['Cache-Control'],'no-store')
 assert.equal(result.headers['Referrer-Policy'],'no-referrer')
})
test('unconfigured or non-local report targets fail instead of becoming an open redirect',()=>{
 for(const url of [undefined,'bad URL','https://example.com/util/daily_report.php?token=x','http://localhost:8080/console/?token=x','http://localhost:5174/util/daily_report.php?token=x','http://localhost:8080/util/daily_report.php','http://user:pass@localhost:8080/util/daily_report.php?token=x']){
  const result=requestTo(url);assert.equal(result.status,503);assert.equal(result.headers.Location,undefined)
 }
})
test('preview navigation cannot submit a write request',()=>{
 assert.equal(requestTo('http://localhost:8080/util/daily_report.php?token=x','POST').status,405)
})
