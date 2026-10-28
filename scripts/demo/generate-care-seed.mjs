import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const AS_OF = '2026-10-27';
export const BRANCHES = [
  { id: 'demo_large', name: '강남점', count: 60 },
  { id: 'demo_medium', name: '분당점', count: 30 },
  { id: 'demo_small', name: '수지점', count: 10 },
];

const cohorts = [
  ['healthy_morning', 10], ['healthy_evening', 15], ['healthy_long', 10], ['healthy_weekend', 10],
  ['temporary_dip', 4], ['temporary_late', 4], ['persistent_drop', 3], ['persistent_late', 3], ['execution_gap', 3],
  ['subject_shift', 3], ['missed_plans', 10], ['scheduled_absence', 8], ['recovery', 9], ['missing_records', 8],
];
const lastNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'];
const firstNames = ['서준', '서윤', '도현', '지우', '하준', '하린', '유진', '예준', '수빈', '시윤'];
const subjects = ['국어', '수학', '영어', '탐구'];
const dateAt = index => new Date(Date.UTC(2026, 8, 23 + index)).toISOString().slice(0, 10);
const noise = (student, day, salt, range) => ((student * 83 + day * 37 + salt * 19 + student * day * 7) % range);
const split = (total, shares) => {
  if (total === 0) return {};
  let assigned = 0;
  return Object.fromEntries(shares.map((share, index) => {
    const value = index === 3 ? total - assigned : Math.floor(total * share / 100);
    assigned += value;
    return [subjects[index], value];
  }));
};

export function createDataset() {
  const scenarios = cohorts.flatMap(([code, count]) => Array(count).fill(code));
  const students = [];
  const days = [];
  for (let i = 1; i <= 100; i++) {
    // A coprime permutation distributes cohorts across centers instead of segregating by scenario.
    const scenario = scenarios[((i - 1) * 37) % 100];
    const student = {
      id: `demo_s${String(i).padStart(3, '0')}`,
      branchId: i <= 60 ? 'demo_large' : i <= 90 ? 'demo_medium' : 'demo_small',
      name: lastNames[Math.floor((i - 1) / 10)] + firstNames[(i - 1) % 10],
      className: i % 3 === 0 ? '고2 B반' : '고3 A반', scenario,
    };
    students.push(student);
    for (let d = 0; d < 35; d++) {
      const date = dateAt(d);
      const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
      const weekend = weekday === 0 || weekday === 6;
      // One regular off-day, always the same weekday for this student across all five weeks.
      const offWeekday = scenario === 'healthy_weekend' ? 1 : (i % 2 === 0 ? 0 : 3);
      const scheduled = weekday !== offWeekday;
      const morning = scenario === 'healthy_morning' || scenario === 'healthy_long';
      let start = morning ? 8 * 60 + 20 + (i % 5) * 13 : 18 * 60 + 10 + (i % 5) * 16;
      let base = morning ? 330 + (i % 5) * 35 : 145 + (i % 4) * 15;
      if (scenario === 'healthy_long') base = 460 + (i % 4) * 25;
      if (scenario === 'healthy_weekend') {
        start = weekend ? 10 * 60 + 20 : 19 * 60 + 10;
        base = weekend ? 360 + (i % 3) * 25 : 100 + (i % 3) * 15;
      } else if (weekend) {
        start -= morning ? 0 : 90;
        base = Math.round(base * 1.15);
      }
      start += noise(i, d, 1, 25) - 12;
      let study = Math.round(base * (0.92 + noise(i, d, 2, 17) / 100));
      let planned = Math.round(base * (1.02 + noise(i, d, 3, 11) / 100));
      let checkedIn = scheduled;
      let planSubmitted = scheduled;
      let recordAvailable = true;
      let sourceScheduled = scheduled;
      const math = 29 + i % 10;
      const plannedShares = [22 + i % 4, math, 23, 100 - (22 + i % 4) - math - 23];
      const actualShares = [...plannedShares];
      actualShares[0] += noise(i, d, 4, 7) - 3;
      actualShares[3] += plannedShares[0] - actualShares[0];
      if (scenario === 'temporary_dip' && d >= 28 && d <= 29) study = Math.round(study * 0.45);
      if (scenario === 'temporary_late' && d >= 28 && d <= 29) start += 90;
      if (scenario === 'persistent_drop' && d >= 28) study = Math.round(study * 0.44);
      if (scenario === 'persistent_late' && d >= 28) start += 100;
      if (scenario === 'execution_gap' && d >= 28) planned = Math.round(planned * 1.85);
      if (scenario === 'subject_shift' && d >= 28) {
        actualShares[1] = 5;
        actualShares[3] += math - 5;
      }
      if (scenario === 'missed_plans' && d >= 28 && d % 2 === 0) planSubmitted = false;
      if (scenario === 'scheduled_absence' && d >= 31 && scheduled) {
        checkedIn = false;
        planSubmitted = false;
      }
      // A past decline followed by a complete recent week of ordinary routines, with no invented care actions.
      if (scenario === 'recovery' && d >= 14 && d < 28) study = Math.round(study * 0.45);
      if (scenario === 'missing_records' && [29, 31, 34].includes(d)) {
        recordAvailable = false;
        sourceScheduled = null;
        checkedIn = false;
        planSubmitted = false;
      }
      if (!checkedIn) study = 0;
      // Plans/study fit within the same local calendar day including the late-start cases.
      const availableMinutes = 24 * 60 - start - 20;
      study = Math.min(study, availableMinutes);
      planned = planSubmitted ? Math.min(planned, availableMinutes) : 0;
      days.push({ studentId: student.id, date, checkedIn,
        start: checkedIn ? `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}:00` : null,
        study: recordAvailable ? split(study, actualShares) : null,
        planSubmitted, planned: recordAvailable ? split(planned, plannedShares) : null,
        scheduled: sourceScheduled, recordAvailable });
    }
  }
  return { asOf: AS_OF, branches: BRANCHES, students, days };
}

const sqlValue = value => value === null ? 'NULL' : typeof value === 'boolean' ? String(Number(value))
  : typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
const tuple = values => `(${values.map(sqlValue).join(',')})`;
export function createSql(data) {
  const statements = [
    '-- Synthetic local demo only. No Flyway migration or production source schema.',
    'SET NAMES utf8mb4;',
    `CREATE TABLE IF NOT EXISTS demo_care_branch (branch_id VARCHAR(40) PRIMARY KEY, name VARCHAR(100) NOT NULL, display_order INT NOT NULL) CHARACTER SET utf8mb4;`,
    `CREATE TABLE IF NOT EXISTS demo_care_student (student_id VARCHAR(40) PRIMARY KEY, branch_id VARCHAR(40) NOT NULL, name VARCHAR(100) NOT NULL, class_name VARCHAR(100) NOT NULL, scenario_code VARCHAR(40) NOT NULL, FOREIGN KEY (branch_id) REFERENCES demo_care_branch(branch_id)) CHARACTER SET utf8mb4;`,
    `CREATE TABLE IF NOT EXISTS demo_care_day (student_id VARCHAR(40) NOT NULL, study_date DATE NOT NULL, checked_in BOOLEAN NOT NULL, first_check_in_time TIME NULL, study_minutes_by_subject JSON NULL, plan_submitted BOOLEAN NOT NULL, planned_minutes_by_subject JSON NULL, scheduled BOOLEAN NULL, record_available BOOLEAN NOT NULL, PRIMARY KEY(student_id, study_date), FOREIGN KEY(student_id) REFERENCES demo_care_student(student_id)) CHARACTER SET utf8mb4;`,
    'START TRANSACTION;',
    `INSERT INTO demo_care_branch (branch_id,name,display_order) VALUES\n${data.branches.map((branch, i) => tuple([branch.id, branch.name, i])).join(',\n')}\nON DUPLICATE KEY UPDATE name=VALUES(name),display_order=VALUES(display_order);`,
    `INSERT INTO demo_care_student (student_id,branch_id,name,class_name,scenario_code) VALUES\n${data.students.map(s => tuple([s.id, s.branchId, s.name, s.className, s.scenario])).join(',\n')}\nON DUPLICATE KEY UPDATE branch_id=VALUES(branch_id),name=VALUES(name),class_name=VALUES(class_name),scenario_code=VALUES(scenario_code);`,
  ];
  for (let offset = 0; offset < data.days.length; offset += 250) {
    const values = data.days.slice(offset, offset + 250).map(day => tuple([day.studentId, day.date, day.checkedIn,
      day.start, day.study === null ? null : JSON.stringify(day.study), day.planSubmitted,
      day.planned === null ? null : JSON.stringify(day.planned), day.scheduled, day.recordAvailable]));
    statements.push(`INSERT INTO demo_care_day (student_id,study_date,checked_in,first_check_in_time,study_minutes_by_subject,plan_submitted,planned_minutes_by_subject,scheduled,record_available) VALUES\n${values.join(',\n')}\nON DUPLICATE KEY UPDATE checked_in=VALUES(checked_in),first_check_in_time=VALUES(first_check_in_time),study_minutes_by_subject=VALUES(study_minutes_by_subject),plan_submitted=VALUES(plan_submitted),planned_minutes_by_subject=VALUES(planned_minutes_by_subject),scheduled=VALUES(scheduled),record_available=VALUES(record_available);`);
  }
  statements.push('COMMIT;');
  return statements.join('\n\n') + '\n';
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const data = createDataset();
  const output = process.argv[2] || fileURLToPath(new URL('./care-demo.generated.sql', import.meta.url));
  writeFileSync(output, createSql(data), 'utf8');
  process.stdout.write(`Wrote ${data.students.length} students, ${data.days.length} days (${dateAt(0)}..${AS_OF}) to ${output}\n`);
}
