// A27-UX 관리자 추가 수정: 범용 과목 검색 후보 카탈로그 (node --test)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { COURSE_CATALOG, courseCandidatesFor, matchesQuery, searchKey } from './courseCatalog.ts'

test('1학년은 1·2학기 합집합(접미사 1·2를 지우지 않음), 2·3학년은 통합 후보', () => {
  const g1 = courseCandidatesFor(1).map((item) => item.name)
  assert.equal(g1.length, 21)
  assert.ok(g1.includes('공통국어1') && g1.includes('공통국어2'))
  assert.ok(g1.includes('인간과 심리'))
  const g2 = courseCandidatesFor(2).map((item) => item.name)
  const g3 = courseCandidatesFor(3).map((item) => item.name)
  assert.deepEqual(g2, g3) // 2학년이 3학년 문서 과목을 들을 수 있어 같은 묶음
  assert.equal(g2.length, 70 + 18) // 평가계획서 목차 70 + 2022 개정 공식 선택과목 18
  for (const name of ['화법과 언어', '확률과 통계', '미적분Ⅰ', '물리학', '생명과학', '기하', '물리학Ⅱ', '독서와 작문']) assert.ok(g2.includes(name), name)
  assert.ok(!g2.includes('공통국어2'))
})

test('비슷한 이름을 같은 과목으로 합치지 않는다 (2022·2015 개정 공존)', () => {
  const names = COURSE_CATALOG.map((item) => item.name)
  assert.ok(names.includes('사회와 문화') && names.includes('사회·문화'))
  assert.ok(names.includes('스포츠 생활') && names.includes('스포츠 생활1'))
  assert.equal(new Set(COURSE_CATALOG.map((item) => `${item.band}|${item.name}`)).size, COURSE_CATALOG.length)
})

test('화면 표시 이름에는 학교명·출처 문구가 없다', () => {
  for (const item of COURSE_CATALOG) {
    assert.ok(!/고등학교|운정|출처|개설|\(공동\)/.test(item.name), item.name)
  }
})

test('검색 별칭: 띄어쓰기·로마 숫자·원문 표기', () => {
  assert.equal(searchKey('미적분 Ⅰ'), searchKey('미적분I'))
  assert.ok(matchesQuery('미적분1', ['미적분Ⅰ']))
  assert.ok(matchesQuery('영어ii', ['영어Ⅱ']))
  assert.ok(matchesQuery('생활과과학', ['생활과 과학', '생활과과학']))
  assert.ok(matchesQuery('', ['아무 과목']))
  assert.ok(!matchesQuery('물리학Ⅱ', ['물리학']))
})
