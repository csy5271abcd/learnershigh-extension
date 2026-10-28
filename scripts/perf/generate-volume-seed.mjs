import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createSql } from '../demo/generate-care-seed.mjs';
import { createLoadDataset, LOAD_BRANCHES } from './generate-load-seed.mjs';

// Grows the load DB to a realistic total size: extra branches (so every query runs against
// ~10,000 students) and one year of closed care history for every student (so care_case /
// care_event lookups run against tens of thousands of rows). Load DB only.
const FILLER_BRANCHES = Array.from({ length: 9 }, (_, i) => ({ id: `load_fill_${i + 1}`, name: `부하 기타 ${i + 1}`, count: 1000 }));
const CASES_PER_STUDENT = 2;
const SIGNALS = ['STUDY_DROP', 'EXECUTION_GAP', 'START_TIME_SHIFT', 'PLAN_MISSING'];

const day = offset => new Date(Date.UTC(2025, 10, 1 + offset)).toISOString().slice(0, 10);
const sql = value => value === null ? 'NULL' : typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
const tuples = (rows, cols) => rows.map(row => `(${cols.map(col => sql(row[col])).join(',')})`);

function insert(table, cols, rows, chunk = 1000) {
  const out = [];
  for (let i = 0; i < rows.length; i += chunk) {
    out.push(`INSERT IGNORE INTO ${table} (${cols.join(',')}) VALUES\n${tuples(rows.slice(i, i + chunk), cols).join(',\n')};`);
  }
  return out;
}

export function createVolume() {
  const base = createLoadDataset();
  // Reuse the load cohort clone for the filler branches.
  const fillerSource = base.students.filter(s => s.branchId === 'load_1000');
  const sourceDays = Map.groupBy(base.days, d => d.studentId);
  const students = [];
  const days = [];
  for (const branch of FILLER_BRANCHES) {
    fillerSource.forEach((source, i) => {
      const id = `${branch.id}_s${String(i + 1).padStart(4, '0')}`;
      students.push({ ...source, id, branchId: branch.id });
      for (const d of sourceDays.get(source.id)) days.push({ ...d, studentId: id });
    });
  }

  const cases = [];
  const events = [];
  const baselines = [];
  const allStudents = [...base.students, ...students];
  allStudents.forEach((student, s) => {
    for (let c = 0; c < CASES_PER_STUDENT; c++) {
      // Spread openings across 2025-11-01..2026-10-20; closed 7 days later. A few close inside the cooldown window.
      const opened = (s * 37 + c * 151) % 354;
      const openedOn = day(opened);
      const closedOn = day(opened + 7);
      const id = `care_vol_${s}_${c}`;
      const at = time => `${time} 03:00:00.000000`;
      cases.push({ id, branch_id: student.branchId, student_id: student.id, active_student_id: null, status: 'CLOSED',
        reason: 'ADJUSTMENT_NEEDED', close_type: 'AFTER_RECHECK', opened_on: openedOn, closed_on: closedOn,
        closed_at: at(closedOn), recheck_date: null, version: 4, created_at: at(openedOn), updated_at: at(closedOn),
        metric_formula_version: 3 });
      baselines.push({ case_id: id, position: 0, signal_type: SIGNALS[(s + c) % SIGNALS.length], summary: '부하 테스트 기준값',
        metric_value: 40, target_value: 60, subject: null });
      [['REASON_CONFIRMED', openedOn, '상담 · 면담 — 부하 테스트용 합성 기록', 'MEETING'],
        ['ADJUSTMENT_STARTED', openedOn, '계속 관리 · 다음 점검', null],
        ['RECHECKED', closedOn, '점검 · 좋아짐', null],
        ['CLOSED', closedOn, '관리 종료', null]].forEach(([type, on, content, channel], seq) => {
        events.push({ id: `evt_vol_${s}_${c}_${seq}`, case_id: id, student_id: student.id, sequence: seq + 1,
          event_type: type, occurred_on: on, content, note_channel: channel, created_at: at(on) });
      });
    }
  });
  return { students: allStudents.length, extra: { branches: FILLER_BRANCHES, students, days }, cases, events, baselines };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const v = createVolume();
  const extraSql = createSql({ branches: FILLER_BRANCHES, students: v.extra.students, days: v.extra.days })
    .replace(/INSERT INTO demo_care_branch \(branch_id,name,display_order\) VALUES\n([\s\S]*?)\nON/, (m, values) =>
      `INSERT INTO demo_care_branch (branch_id,name,display_order) VALUES\n${values.replace(/,(\d+)\)/g, (x, n) => `,${Number(n) + LOAD_BRANCHES.length})`)}\nON`);
  const historySql = ['SET NAMES utf8mb4;', 'START TRANSACTION;',
    ...insert('care_case', ['id', 'branch_id', 'student_id', 'active_student_id', 'status', 'reason', 'close_type', 'opened_on',
      'closed_on', 'closed_at', 'recheck_date', 'version', 'created_at', 'updated_at', 'metric_formula_version'], v.cases),
    ...insert('care_case_baseline', ['case_id', 'position', 'signal_type', 'summary', 'metric_value', 'target_value', 'subject'], v.baselines),
    ...insert('care_event', ['id', 'case_id', 'student_id', 'sequence', 'event_type', 'occurred_on', 'content', 'note_channel', 'created_at'], v.events),
    'COMMIT;'].join('\n\n') + '\n';
  writeFileSync(fileURLToPath(new URL('./care-volume-students.generated.sql', import.meta.url)), extraSql, 'utf8');
  writeFileSync(fileURLToPath(new URL('./care-volume-history.generated.sql', import.meta.url)), historySql, 'utf8');
  process.stdout.write(`students total ${v.students} (+${v.extra.students.length}), days +${v.extra.days.length}, cases ${v.cases.length}, events ${v.events.length}\n`);
}
