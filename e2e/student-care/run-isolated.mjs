// Student Care Playwright 격리 실행기 (A27-UX 부록 L, 2026-11-20). 기존 playwright.config.ts·실행 방법은 바꾸지 않는다.
// 사용자 서비스(8080·5173·5174·33307)를 쓰지 않고, 이 실행기가 만든 것만 쓰고 지운다:
//   일회용 MySQL(127.0.0.1:33350, tmpfs, --rm, 라벨 lh.owner=student-care-e2e) → 시험 Backend(18095, care-demo,e2e, 시험 Endpoint ON)
//   → 합성 시드 210명(scripts/demo/generate-care-seed.mjs 를 시험 폴더에 새로 생성) → 관리자 미리보기(18096, Backend 18095 로 Proxy)
//   → playwright.config.ts 를 E2E_BASE_URL·E2E_API_URL 로 이 환경에 연결해 실행 → 정리.
// 실행: cd e2e && node student-care/run-isolated.mjs [<playwright 인자>...]
// 안전: 시작 전 사용할 포트가 비어 있는지, 연결 문자열이 사용자 DB(33307)·사용자 Backend(8080)가 아닌지 확인하고 아니면 멈춘다(fail-closed).
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { createConnection } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const ports = { db: 33350, backend: 18095, admin: 18096 }
const USER_PORTS = [8080, 5173, 5174, 33307]
const name = `lh-e2e-student-care-${Date.now()}`
const database = 'lh_e2e_care'
const password = `care-${randomBytes(6).toString('hex')}`
const windows = process.platform === 'win32'
const children = []
const log = (m) => console.log(`[student-care-isolated] ${m}`)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const portBusy = (port) =>
  new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port })
    socket.once('connect', () => { socket.destroy(); resolve(true) })
    socket.once('error', () => resolve(false))
  })

async function waitHttp(url, headers, limitMs) {
  const started = Date.now()
  while (Date.now() - started < limitMs) {
    try {
      const r = await fetch(url, { headers })
      if (r.status < 500) return r.status
    } catch {
      // 아직 준비 전
    }
    await sleep(2000)
  }
  throw new Error(`준비되지 않음: ${url}`)
}

function kill(child) {
  if (!child || child.exitCode !== null) return
  if (windows) spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else child.kill('SIGTERM')
}

let status = 1
const work = mkdtempSync(join(tmpdir(), 'lh-student-care-e2e-'))
try {
  for (const p of Object.values(ports)) {
    if (await portBusy(p)) throw new Error(`시험 포트 ${p} 가 이미 쓰이고 있어요 — 다른 프로세스를 건드리지 않고 멈춥니다.`)
  }
  if (Object.values(ports).some((p) => USER_PORTS.includes(p))) throw new Error('시험 포트가 사용자 포트와 겹칩니다.')
  const dbUrl = `jdbc:mysql://127.0.0.1:${ports.db}/${database}?serverTimezone=Asia/Seoul&characterEncoding=UTF-8&allowPublicKeyRetrieval=true&useSSL=false`
  if (/:33307\b|lh_local_run/.test(dbUrl)) throw new Error('사용자 DB 연결 문자열입니다 — 멈춥니다.')
  log(`DB ${dbUrl.replace(/\?.*/, '')} · user lhe2e · password ****`)
  log(`Backend http://127.0.0.1:${ports.backend} (profiles care-demo,e2e) · Admin preview http://localhost:${ports.admin}`)

  execFileSync('docker', ['run', '-d', '--rm', '--name', name, '--label', 'lh.owner=student-care-e2e', '-p', `127.0.0.1:${ports.db}:3306`,
    '--tmpfs', '/var/lib/mysql', '-e', `MYSQL_ROOT_PASSWORD=${password}`, '-e', `MYSQL_DATABASE=${database}`, '-e', 'MYSQL_USER=lhe2e',
    '-e', `MYSQL_PASSWORD=${password}`, 'mysql:8.4'], { stdio: 'ignore' })
  let ready = false
  for (let i = 0; i < 60 && !ready; i++) {
    ready = spawnSync('docker', ['exec', name, 'mysqladmin', 'ping', '-ulhe2e', `-p${password}`, '--silent'], { stdio: 'ignore' }).status === 0
    if (!ready) await sleep(2000)
  }
  if (!ready) throw new Error('일회용 MySQL 이 준비되지 않았어요.')
  await sleep(4000)

  const backendEnv = {
    ...process.env,
    DB_URL: dbUrl, DB_USERNAME: 'lhe2e', DB_PASSWORD: password, SERVER_PORT: String(ports.backend),
    SPRING_PROFILES_ACTIVE: 'care-demo,e2e',
    APP_FIXED_DATE: '2026-11-12', LEARNERSHIGH_MOCK_ANCHOR_DATE: '2026-11-11', LEARNERSHIGH_MOCK_DATABASE_EXAMPLES: 'true',
    LEARNERSHIGH_TEST_ENDPOINTS_ENABLED: 'true',
    ASSESSMENT_PREVIEW_CONVERTER: 'none', ASSESSMENT_PREVIEW_CONVERTER_AUTO_PROVISION: 'false',
    // 학교알리미는 닫힌 루프백 주소로만(이 시험은 학교알리미를 쓰지 않는다 — 외부 접속 0)
    ASSESSMENT_SCHOOLINFO_BASE_URL: 'http://127.0.0.1:9', ASSESSMENT_SCHOOLINFO_ALLOW_LOOPBACK: 'true',
    ASSESSMENT_STORAGE_ROOT: join(work, 'storage'),
  }
  delete backendEnv.NoDefaultCurrentDirectoryInExePath
  const backend = spawn(windows ? 'gradlew.bat' : './gradlew', ['bootRun', '--no-daemon', '--console=plain'],
    { cwd: join(root, 'backend'), env: backendEnv, shell: windows, stdio: ['ignore', 'ignore', 'ignore'] })
  children.push(backend)
  await waitHttp(`http://127.0.0.1:${ports.backend}/api/admin/assessment/schools`, { 'X-Assessment-Admin-Id': 'adm_plan_operator' }, 300_000)
  log('Backend 준비됨')

  const seed = join(work, 'care-demo.generated.sql')
  execFileSync(process.execPath, [join(root, 'scripts', 'demo', 'generate-care-seed.mjs'), seed], { stdio: 'inherit' })
  execFileSync('docker', ['cp', seed, `${name}:/tmp/care-demo.sql`], { stdio: 'ignore' })
  execFileSync('docker', ['exec', name, 'sh', '-c', `mysql -ulhe2e -p"$MYSQL_PASSWORD" --default-character-set=utf8mb4 ${database} < /tmp/care-demo.sql`], { stdio: 'inherit' })
  log('합성 시드 적용됨(일회용 DB)')

  const adminEnv = { ...process.env, VITE_API_TARGET: `http://127.0.0.1:${ports.backend}`, VITE_CARE_API_TARGET: `http://127.0.0.1:${ports.backend}` }
  delete adminEnv.NoDefaultCurrentDirectoryInExePath
  execFileSync('npm', ['run', 'build', '--workspace=@learnershigh/admin'], { cwd: join(root, 'frontend'), env: adminEnv, shell: windows, stdio: 'ignore' })
  const admin = spawn('npx', ['vite', 'preview', '--port', String(ports.admin), '--strictPort'],
    { cwd: join(root, 'frontend', 'admin'), env: adminEnv, shell: windows, stdio: ['ignore', 'ignore', 'ignore'] })
  children.push(admin)
  await waitHttp(`http://localhost:${ports.admin}/`, {}, 120_000)
  log('관리자 미리보기 준비됨')

  const result = spawnSync('npx', ['playwright', 'test', '-c', 'playwright.config.ts', '--workers=1', ...process.argv.slice(2)], {
    cwd: join(root, 'e2e'), stdio: 'inherit', shell: windows,
    env: { ...process.env, E2E_BASE_URL: `http://localhost:${ports.admin}`, E2E_API_URL: `http://127.0.0.1:${ports.backend}` },
  })
  status = result.status ?? 1
} catch (failure) {
  console.error(`[student-care-isolated] ${String(failure)}`)
} finally {
  children.reverse().forEach(kill)
  spawnSync('docker', ['rm', '-f', name], { stdio: 'ignore' })
  rmSync(work, { recursive: true, force: true })
  log(`정리 완료 · 종료 코드 ${status}`)
}
process.exit(status)
