// Assessment E2E 실행기 (A7, 2026-11-15): 일회용 MySQL(tmpfs, 이 실행 전용 컨테이너)을 띄우고
// playwright.assessment.config.ts로 시험한 뒤 컨테이너를 지운다. 시연 DB·Docker Volume·Storage에는 접근하지 않는다.
// 필요: Docker, Node 22, JDK 21. 추가 인자는 Playwright에 그대로 넘긴다(예: --grep 3개년).
import { execFileSync, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'

const name = `lh-e2e-assessment-${Date.now()}`
const port = process.env.E2E_ASSESSMENT_DB_PORT ?? '33340'
const password = `e2e-${randomBytes(6).toString('hex')}`
const database = 'lh_e2e_assessment'
const docker = (...args) => execFileSync('docker', args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, MSYS_NO_PATHCONV: '1' } }).toString()

let status = 1
try {
  docker('run', '-d', '--rm', '--name', name, '--label', 'lh.owner=assessment-e2e', '-p', `127.0.0.1:${port}:3306`, '--tmpfs', '/var/lib/mysql',
    '-e', `MYSQL_ROOT_PASSWORD=${password}`, '-e', `MYSQL_DATABASE=${database}`, '-e', 'MYSQL_USER=lhe2e',
    '-e', `MYSQL_PASSWORD=${password}`, 'mysql:8.4')
  let ready = false
  for (let i = 0; i < 60 && !ready; i++) {
    ready = spawnSync('docker', ['exec', name, 'mysqladmin', 'ping', '-ulhe2e', `-p${password}`, '--silent'], { stdio: 'ignore' }).status === 0
    if (!ready) spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},2000)'])
  }
  if (!ready) throw new Error('일회용 MySQL이 준비되지 않았어요.')
  spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},4000)']) // 첫 기동 직후 재시작 대기
  // 부록 J: ASSESSMENT_PW_CONFIG 로 실측 재현 설정(playwright.assessment-live.config.ts)을 고를 수 있다. 기본은 그대로
  const result = spawnSync('npx', ['playwright', 'test', '-c', process.env.ASSESSMENT_PW_CONFIG ?? 'playwright.assessment.config.ts', ...process.argv.slice(2)], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      E2E_ASSESSMENT_DB_URL: `jdbc:mysql://127.0.0.1:${port}/${database}`,
      E2E_ASSESSMENT_DB_USER: 'lhe2e',
      E2E_ASSESSMENT_DB_PASSWORD: password,
      E2E_ASSESSMENT_DB_CONTAINER: name,
    },
  })
  status = result.status ?? 1
} catch (failure) {
  console.error(String(failure))
} finally {
  spawnSync('docker', ['rm', '-f', name], { stdio: 'ignore' })
}
process.exit(status)
