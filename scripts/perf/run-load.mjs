import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

// Measures the student-care read APIs on a dedicated load server/DB.
// usage: node scripts/perf/run-load.mjs <label> [origin] [mysqlContainer]
const label = process.argv[2] || 'run';
const origin = process.argv[3] || 'http://127.0.0.1:8083';
const container = process.argv[4] || 'learnershigh-care-api-mysql';
const BRANCHES = ['load_100', 'load_300', 'load_1000'];
const WARMUP = 3;
const SAMPLES = 20;
const CONCURRENCY = [1, 5, 10];

// Server-wide SELECT counter. The load DB/server is otherwise idle, so the delta of one request
// approximates how many SQL queries that request issued.
const selects = () => Number(execFileSync('docker', ['exec', container, 'mysql', '-uroot', '-pcare_root_demo', '-N', '-e',
  "SHOW GLOBAL STATUS LIKE 'Com_select'"], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split(/\s+/)[1]);

async function timed(path) {
  const start = performance.now();
  const response = await fetch(origin + path);
  const body = await response.arrayBuffer();
  if (!response.ok) throw new Error(`${path} -> ${response.status}`);
  return { ms: performance.now() - start, bytes: body.byteLength };
}

const pct = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(p / 100 * sorted.length) - 1)];
};

async function measure(path) {
  for (let i = 0; i < WARMUP; i++) await timed(path);
  const before = selects();
  const first = await timed(path);
  const queries = selects() - before - 1; // minus the counter query itself
  const rows = [];
  for (const c of CONCURRENCY) {
    const times = [];
    const started = performance.now();
    for (let done = 0; done < SAMPLES; done += c) {
      const batch = await Promise.all(Array.from({ length: Math.min(c, SAMPLES - done) }, () => timed(path)));
      times.push(...batch.map(r => r.ms));
    }
    const seconds = (performance.now() - started) / 1000;
    rows.push({ concurrency: c, p50: pct(times, 50), p95: pct(times, 95), max: Math.max(...times), rps: times.length / seconds });
  }
  return { path, queries, bytes: first.bytes, rows };
}

const results = [];
for (const branch of BRANCHES) {
  for (const endpoint of ['board', 'metrics']) {
    const result = await measure(`/api/admin/student-care/${endpoint}?branchId=${branch}`);
    results.push({ branch, endpoint, ...result });
    const one = result.rows[0];
    console.log(`${branch.padEnd(9)} ${endpoint.padEnd(7)} queries=${String(result.queries).padStart(5)} `
      + `kb=${(result.bytes / 1024).toFixed(0).padStart(5)} p50=${one.p50.toFixed(0)}ms p95=${one.p95.toFixed(0)}ms `
      + result.rows.slice(1).map(r => `| c${r.concurrency} p95=${r.p95.toFixed(0)}ms ${r.rps.toFixed(1)}rps`).join(' '));
  }
}
mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
writeFileSync(new URL(`./results/${label}.json`, import.meta.url), JSON.stringify({ label, origin, at: new Date().toISOString(), results }, null, 2));
