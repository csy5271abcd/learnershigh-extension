import http from 'k6/http';
import { check, group } from 'k6';
import { Trend } from 'k6/metrics';

// Student-care read paths as the admin screen calls them.
// usage: k6 run -e BASE=http://host:8083 -e BRANCH=load_1000 -e SCENARIO=roster|history k6-student-care.js
const BASE = __ENV.BASE || 'http://127.0.0.1:8083';
const BRANCH = __ENV.BRANCH || 'load_1000';
const SCENARIO = __ENV.SCENARIO || 'roster';
const api = path => `${BASE}/api/admin/student-care${path}`;
const params = { headers: { 'Accept-Encoding': 'gzip' } };

const pageLoad = new Trend('page_load_ms', true);

export const options = SCENARIO === 'roster' && __ENV.VUS ? {
  // Fixed number of admins for one capacity point (-e VUS=20 -e DURATION=40s).
  vus: Number(__ENV.VUS), duration: __ENV.DURATION || '40s',
} : SCENARIO === 'roster' ? {
  // Roster tab: ramp admins opening the 학생별 tab at the same time.
  stages: [
    { duration: '30s', target: 5 }, { duration: '1m', target: 5 },
    { duration: '30s', target: 20 }, { duration: '1m', target: 20 },
    { duration: '30s', target: 50 }, { duration: '1m', target: 50 },
    { duration: '20s', target: 0 },
  ],
  thresholds: { http_req_failed: ['rate<0.01'] },
} : {
  // 관리 이력 tab (전체 학생): one board + one history request per student, as the screen does today.
  vus: Number(__ENV.VUS || 1), iterations: Number(__ENV.ITERATIONS || 3),
};

export default function () {
  const started = Date.now();
  if (SCENARIO === 'roster') {
    group('학생별 탭', () => {
      const responses = http.batch([
        ['GET', api(`/board?branchId=${BRANCH}`), null, params],
        ['GET', api(`/board?branchId=${BRANCH}`), null, params], // the page and the roster each load board today
        ['GET', api(`/metrics?branchId=${BRANCH}`), null, params],
      ]);
      check(responses, { 'all 200': rs => rs.every(r => r.status === 200) });
    });
  } else {
    group('관리 이력 탭', () => {
      const board = http.get(api(`/board?branchId=${BRANCH}`), params);
      const students = board.json('students');
      const batchSize = 6; // browsers open about six parallel connections per host
      for (let i = 0; i < students.length; i += batchSize) {
        const rs = http.batch(students.slice(i, i + batchSize).map(s =>
          ['GET', api(`/students/${s.studentId}/history?branchId=${BRANCH}`), null, params]));
        check(rs, { 'history 200': list => list.every(r => r.status === 200) });
      }
    });
  }
  pageLoad.add(Date.now() - started);
}
