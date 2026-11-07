// 과업 시험관 프롬프트 생성. 정답은 넣지 않고 학생 이름만 채운다.
// 사용: node scripts/research/care-task-prompt.mjs <original|ops>  → docs/design/ops-redesign/${runs}/<screen>-prompt.md
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const screen = process.argv[2]
const url = { original: 'http://localhost:5174/student-care', ops: 'http://localhost:5174/student-care/ops', 'original-v5': 'http://localhost:5174/student-care', a: 'http://localhost:5174/student-care/a', b: 'http://localhost:5174/student-care/b', c: 'http://localhost:5174/student-care/c', d: 'http://localhost:5174/student-care/d' }[screen]
const V5 = ['original-v5', 'a', 'b', 'c', 'd'].includes(screen)
const runs = V5 ? 'task-runs-v5' : 'task-runs'
const md = (d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`
if (!url) throw new Error('screen must be original, ops, original-v5, a, b, c or d')
const a = JSON.parse(readFileSync(new URL(`../../docs/design/ops-redesign/${V5 ? 'task-answers-v5.json' : 'task-answers.json'}`, import.meta.url), 'utf8'))
const test = readFileSync(new URL(`../../docs/design/ops-redesign/${V5 ? 'task-test-v5.md' : 'task-test.md'}`, import.meta.url), 'utf8')
const questions = test.slice(test.indexOf('## 문항'), test.indexOf('## 채점'))
  .replace('{Q5}', a.Q5.student).replace('{Q6}', a.Q6.student).replace('{Q8}', a.Q8.student)
  .replace('{Q9}', a.Q9.student).replace('{Q11}', a.Q11.student).replace('{Q14}', a.Q14.student)
  .replace('{Q16}', a.Q16?.student ?? '').replace('{Q16D}', a.Q16 ? md(a.Q16.date) : '').replace('{Q17D}', a.Q17 ? md(a.Q17.date) : '').replace('{Q18D}', a.Q18 ? md(a.Q18.date) : '').replace('{Q19}', a.Q19?.student ?? '')
  .replace(/학생 이름은 `task-answers-v5.json`의 해당 문항 `student` 값으로 채운다\./, '')
  .replace(/학생 이름은 `task-answers.json`의 해당 문항 `student` 값으로 채운다\./, '')
const out = `너는 학원 관리자용 웹 화면의 과업 시험관이다. 화면만 보고 아래 문항에 답한다.

## 규칙
- 화면 주소: ${url} (1600×900, 라이트 테마)
- 소스 코드, API(\`/api/...\`), 데이터 파일, \`docs/\` 폴더의 어떤 문서도 읽지 마라. 화면에서 보이는 것만으로 답한다.
- 화면 조작은 반드시 \`scripts/research/care-task-harness.mjs\`의 \`start(url, logFile)\`가 돌려주는 함수(\`question\`, \`click\`, \`clickText\`, \`fill\`, \`select\`, \`scroll\`, \`read\`, \`shot\`, \`end\`)로만 한다. Playwright를 직접 쓰지 마라. \`read()\`는 지금 화면에 보이는 글자와 입력값만 돌려준다.
- 문항을 시작할 때마다 \`question('Q1')\`처럼 번호를 알린다. 읽기 문항(Q1–Q8, Q11–Q15${V5 ? ', Q16–Q19' : ''})을 먼저 하고 쓰기 문항(Q9, Q10)을 마지막에 한다.
- 기록 파일: \`docs/design/ops-redesign/${runs}/${screen}-log.json\` (\`start\`의 두 번째 인자). 캡처는 \`docs/design/ops-redesign/${runs}/${screen}-shots/\`에.
- 시험 스크립트는 \`docs/design/ops-redesign/${runs}/${screen}-run.mjs\`로 저장하고 실행한다(여러 번 나눠 실행해도 되지만 각 실행의 로그 파일 이름을 \`${screen}-log-1.json\`처럼 구분).
- 모르면 추측하지 말고 "모름"이라고 쓴다.

${questions}

## 출력
\`docs/design/ops-redesign/${runs}/${screen}-answers.json\`에 답을 쓴다. 형식: Q1·Q7 숫자, Q2·Q3·Q4·Q11·Q15 문자열 배열(Q15는 \`"이름(요일)"\`), Q5 날짜 배열(\`"10/23"\`), Q6 \`{"date":"10/21","time":"21:03"}\`, Q8 \`"48시간 32분"\`, Q9 날짜 \`"11/04"\`, Q10 \`{"initial":숫자,"afterSave":숫자}\`, Q12 \`{"연속":[...],"흩어짐":[...]}\`, Q13 \`{"direction":"증가|감소|같음","percent":숫자}\`, Q14 \`{"executionRate":숫자,"subject":"과목","gapPoints":숫자}\`${V5 ? ', Q16 \`{"analyzed":숫자,"yes":숫자}\`, Q17 문자열 배열, Q18 \`{"median":숫자,"q1":숫자,"q3":숫자,"students":[...]}\`(%, 감소는 음수), Q19 \`{"absentDates":["10/23"],"weekMinutes":"8시간 8분","usualWeek":"17시간 53분","latestStartDiff":숫자(분, 평소 없으면 "평소 없음"),"executionRate":숫자}\`' : ''}. 그리고, 문항별로 어떻게 찾았는지 한 줄씩 \`${screen}-notes.md\`에 남겨라.
`
mkdirSync(new URL(`../../docs/design/ops-redesign/${runs}/`, import.meta.url), { recursive: true })
writeFileSync(new URL(`../../docs/design/ops-redesign/${runs}/${screen}-prompt.md`, import.meta.url), out)
console.log(`wrote ${runs}/${screen}-prompt.md`)
