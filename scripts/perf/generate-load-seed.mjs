import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createDataset, createSql } from '../demo/generate-care-seed.mjs';

// Load-test source only. Clones the 100-student demo cohorts into larger branches so that
// the same scenario mix (healthy / drop / late / missing records ...) repeats at each size.
export const LOAD_BRANCHES = [
  { id: 'load_100', name: '부하 100명', count: 100 },
  { id: 'load_300', name: '부하 300명', count: 300 },
  { id: 'load_1000', name: '부하 1000명', count: 1000 },
];

export function createLoadDataset() {
  const base = createDataset();
  const daysByStudent = Map.groupBy(base.days, day => day.studentId);
  const students = [];
  const days = [];
  for (const branch of LOAD_BRANCHES) {
    for (let i = 0; i < branch.count; i++) {
      const source = base.students[i % base.students.length];
      const id = `${branch.id}_s${String(i + 1).padStart(4, '0')}`;
      students.push({ ...source, id, branchId: branch.id });
      for (const day of daysByStudent.get(source.id)) days.push({ ...day, studentId: id });
    }
  }
  return { asOf: base.asOf, branches: LOAD_BRANCHES, students, days };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const data = createLoadDataset();
  const output = process.argv[2] || fileURLToPath(new URL('./care-load.generated.sql', import.meta.url));
  writeFileSync(output, createSql(data), 'utf8');
  process.stdout.write(`Wrote ${data.students.length} students, ${data.days.length} days to ${output}\n`);
}
