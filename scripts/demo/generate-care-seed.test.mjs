import test from 'node:test';
import assert from 'node:assert/strict';
import { createDataset, createSql } from './generate-care-seed.mjs';

const data = createDataset();
const total = subjects => Object.values(subjects ?? {}).reduce((sum, minutes) => sum + minutes, 0);

test('100 distinct neutral identities have 35 persisted dates and branch sizes 60/30/10', () => {
  assert.equal(new Set(data.students.map(student => student.id)).size, 100);
  assert.equal(new Set(data.students.map(student => student.name)).size, 100);
  assert.deepEqual(data.branches.map(branch => data.students.filter(student => student.branchId === branch.id).length), [60, 30, 10]);
  assert.equal(data.days.length, 3500);
  for (const student of data.students) {
    const days = data.days.filter(day => day.studentId === student.id);
    assert.equal(days.length, 35);
    assert.equal(new Set(days.map(day => day.date)).size, 35);
    assert.equal(days[0].date, '2026-09-23');
    assert.equal(days.at(-1).date, '2026-10-27');
    assert.ok(!student.name.includes(student.scenario));
  }
});

test('recorded zero differs from missing source and no plan is invented on off days', () => {
  const missing = data.days.filter(day => !day.recordAvailable);
  assert.equal(missing.length, 24);
  for (const day of missing) {
    assert.equal(day.study, null);
    assert.equal(day.planned, null);
    assert.equal(day.scheduled, null);
  }
  const offDays = data.days.filter(day => day.scheduled === false);
  assert.ok(offDays.length > 0);
  for (const day of offDays) {
    assert.equal(day.checkedIn, false);
    assert.equal(day.planSubmitted, false);
    assert.deepEqual(day.study, {});
    assert.deepEqual(day.planned, {});
    assert.equal(day.recordAvailable, true);
  }
});

test('attended study and plans fit the remaining local day and source fields agree', () => {
  for (const day of data.days) {
    if (day.checkedIn) {
      assert.equal(day.recordAvailable, true);
      const [hour, minute] = day.start.split(':').map(Number);
      const remaining = 1440 - hour * 60 - minute;
      assert.ok(total(day.study) <= remaining && total(day.planned) <= remaining, day.studentId + day.date);
      assert.ok(total(day.study) > 0);
    } else {
      assert.equal(day.start, null);
      assert.equal(total(day.study), 0);
    }
    if (!day.planSubmitted) assert.equal(total(day.planned), 0);
  }
});

test('45 routine students have six actual attended days, one off day and no missing recent records', () => {
  const healthy = data.students.filter(student => student.scenario.startsWith('healthy_'));
  assert.equal(healthy.length, 45);
  for (const student of healthy) {
    const recent = data.days.filter(day => day.studentId === student.id && day.date >= '2026-10-21');
    assert.equal(recent.filter(day => day.checkedIn).length, 6);
    assert.equal(recent.filter(day => !day.planSubmitted).length, 1);
    assert.ok(recent.every(day => day.recordAvailable));
    assert.ok(recent.filter(day => day.checkedIn).every(day => total(day.study) / total(day.planned) >= 0.8));
    const baseline = data.days.filter(day => day.studentId === student.id && day.date < '2026-10-21');
    assert.ok(total(Object.fromEntries(recent.map(day => [day.date, total(day.study)]))) /
      (baseline.reduce((sum, day) => sum + total(day.study), 0) / 4) > 0.9);
  }
});

test('SQL is deterministic, additive and limited to demo namespace', () => {
  const sql = createSql(data);
  assert.equal(sql, createSql(createDataset()));
  assert.ok(!/\b(DROP|DELETE|TRUNCATE|ALTER)\b/i.test(sql));
  const tables = [...sql.matchAll(/(?:CREATE TABLE IF NOT EXISTS|INSERT INTO) (\w+)/g)].map(match => match[1]);
  assert.ok(tables.every(table => ['demo_care_branch', 'demo_care_student', 'demo_care_day'].includes(table)));
  assert.ok(sql.includes('ON DUPLICATE KEY UPDATE'));
});

test('persistent lateness is a change from each student baseline and temporary/recovery trends return', () => {
  const averageStart = days => {
    const attended = days.filter(day => day.checkedIn);
    return attended.reduce((sum, day) => {
      const [hour, minute] = day.start.split(':').map(Number);
      return sum + hour * 60 + minute;
    }, 0) / attended.length;
  };
  for (const student of data.students.filter(student => student.scenario === 'persistent_late')) {
    const all = data.days.filter(day => day.studentId === student.id);
    const delta = averageStart(all.slice(28)) - averageStart(all.slice(0, 28));
    assert.ok(delta >= 90 && delta <= 110, `${student.id}: ${delta}`);
    for (const recent of all.slice(28).filter(day => day.checkedIn)) {
      const weekday = new Date(recent.date).getUTCDay();
      const baselineSameWeekday = all.slice(0, 28).filter(day => new Date(day.date).getUTCDay() === weekday);
      const weekdayDelta = averageStart([recent]) - averageStart(baselineSameWeekday);
      assert.ok(weekdayDelta >= 75 && weekdayDelta <= 125);
    }
  }
  for (const student of data.students.filter(student => student.scenario === 'recovery')) {
    const all = data.days.filter(day => day.studentId === student.id);
    const recentWeekly = all.slice(28).reduce((sum, day) => sum + total(day.study), 0);
    const declinedWeekly = all.slice(14, 28).reduce((sum, day) => sum + total(day.study), 0) / 2;
    assert.ok(recentWeekly > declinedWeekly * 1.8);
  }
});
