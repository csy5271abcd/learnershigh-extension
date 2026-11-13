"""D-1 초안 CHECK 진리표 시험 (격리 Schema 전용, 합성 행).

usage: python d1_truth_table.py <repo root> <새 schema 이름>
- 새 Schema를 만들고 기존 Migration 4개 → D-1 초안을 mysql CLI로 적용한다(Flyway 이력 없음, SQL 동작 시험용).
- 이미 있는 Schema 이름이면 중단한다(기존 Schema를 덮어쓰지 않음).
"""
import json
import pathlib
import subprocess
import sys

repo, schema = pathlib.Path(sys.argv[1]), sys.argv[2]
MYSQL = ['docker', 'exec', '-i', 'learnershigh-mysql', 'mysql', '-uroot', '-proot', '--default-character-set=utf8mb4']


def run(sql, db=schema):
    p = subprocess.run(MYSQL + ([db] if db else []), input=sql.encode('utf-8'), capture_output=True)
    err = p.stderr.decode('utf-8', 'replace').replace('mysql: [Warning] Using a password on the command line interface can be insecure.', '').strip()
    return p.returncode, err, p.stdout.decode('utf-8', 'replace')


code, _, out = run(f"SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='{schema}'", None)
if out.split()[-1] != '0':
    sys.exit(f'schema {schema} already exists — refusing to touch it')
assert run(f'CREATE DATABASE {schema} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci', None)[0] == 0
for f in sorted((repo / 'database' / 'migrations').glob('V*.sql')):
    c, e, _ = run(f.read_text(encoding='utf-8'))
    assert c == 0, (f.name, e)
c, e, _ = run((repo / 'docs/specs/suyeon/assessment-multiformat-review-gate-202611/sql/D1-draft.sql').read_text(encoding='utf-8'))
print('D-1 apply on empty schema:', 'OK' if c == 0 else e)
assert c == 0

H = 'a' * 64
run(f"""
INSERT INTO assessment_evaluation_plan VALUES ('p1','school_001',2026,1,1,2,'adm','2026-11-10 00:00:00',0);
INSERT INTO assessment_plan_revision (id,plan_id,revision_number,file_name,content_type,size_bytes,sha256,page_count,review_status,uploaded_by,uploaded_at)
 VALUES ('r_pdf','p1',1,'a.pdf','application/pdf',1,'{H}',3,'UNREVIEWED','adm','2026-11-10 00:00:00'),
        ('r_hwp','p1',2,'a.hwp','application/x-hwp',1,'{H}',NULL,'UNREVIEWED','adm','2026-11-10 00:00:00');
INSERT INTO assessment_plan_analysis_run VALUES ('run1','r_hwp','REVIEW_REQUIRED','EXTERNAL_IMPORT','t','v','{H}','[]','[]','adm','2026-11-10 00:00:00');
INSERT INTO assessment_plan_review (id,revision_id,analysis_id,decision,reviewed_by,reviewed_at) VALUES ('rv1','r_hwp','run1','CONFIRM','adm','2026-11-10 00:00:00');
""")

LOC = json.dumps({'kind': 'HWP_TABLE_CELL', 'section': 0, 'path': 'p3.c0.r5c3', 'table': 1, 'row': 5, 'col': 3})
results = []
n = [0]


def cv(name, fmt, page, loc, idx, expect, value="'30'"):
    n[0] += 1
    f = 'NULL' if fmt is None else f"'{fmt}'"
    p = 'NULL' if page is None else str(page)
    l = 'NULL' if loc is None else "'" + loc.replace('\\', '\\\\').replace("'", "''") + "'"
    i = 'NULL' if idx is None else str(idx)
    c, e, _ = run(f"INSERT INTO assessment_plan_confirmed_value (id,review_id,revision_id,subject_id,field_path,value_json,pdf_page_number,evidence_format,evidence_locator_json,analysis_subject_index,position)"
                  f" VALUES ('cv{n[0]}','rv1','r_hwp','subj_14','performanceEvaluation.items[0].weightPercent',{value},{p},{f},{l},{i},{n[0]})")
    got = 'accept' if c == 0 else 'reject'
    results.append(got == expect)
    print(f"{'PASS' if got == expect else 'FAIL'} INSERT {name}: expect {expect}, got {got}{'' if c == 0 else ' — ' + e[:110]}")


def stmt(name, sql, expect):
    c, e, _ = run(sql)
    got = 'accept' if c == 0 else 'reject'
    results.append(got == expect)
    print(f"{'PASS' if got == expect else 'FAIL'} {name}: expect {expect}, got {got}{'' if c == 0 else ' — ' + e[:110]}")


# 지시서 진리표 + 추가 조합
cv('PDF | 쪽 있음 | Locator 없음', 'PDF', 2, None, None, 'accept')
cv('PDF | 쪽 없음 | Locator 없음 (원문에 없음, 기존 정책)', 'PDF', None, None, None, 'accept', 'NULL')
cv('PDF | 쪽 있음 | Locator 있음', 'PDF', 2, LOC, None, 'reject')
cv('PDF | 쪽 없음 | Locator 있음', 'PDF', None, LOC, None, 'reject')
cv('HWP | 쪽 없음 | Locator 있음', 'HWP', None, LOC, 0, 'accept')
cv('HWPX | 쪽 없음 | Locator 있음', 'HWPX', None, LOC.replace('HWP_', 'HWPX_'), 0, 'accept')
cv('HWP | 쪽 있음 | Locator 있음', 'HWP', 2, LOC, 0, 'reject')
cv('HWPX | 쪽 있음 | Locator 없음', 'HWPX', 2, None, 0, 'reject')
cv('HWPX | 쪽 없음 | Locator 없음', 'HWPX', None, None, 0, 'reject')
cv('HWP | Locator 있음 | 과목 번호 없음', 'HWP', None, LOC, None, 'reject')
cv('형식 NULL | 쪽 없음 | Locator 있음', None, None, LOC, 0, 'reject')
cv('형식 NULL | 쪽 있음 | Locator 있음', None, 2, LOC, 0, 'reject')
cv('형식 NULL | 쪽 있음 | Locator 없음', None, 2, None, None, 'reject')
cv('형식 DOCX(허용 안 됨)', 'DOCX', None, LOC, 0, 'reject')
cv('Locator JSON 문법 오류', 'HWP', None, '{"kind": ', 0, 'reject')
cv('Locator JSON 배열', 'HWP', None, '[1,2]', 0, 'reject')
cv('Locator JSON 문자열(이중 인코딩, 유효한 JSON string)', 'HWP', None, json.dumps(LOC), 0, 'reject')
cv('Locator JSON 중첩 객체', 'HWP', None, json.dumps({'kind': 'HWP_TABLE_CELL', 'x': {'y': 1}}), 0, 'reject')
cv('Locator JSON 키 13개', 'HWP', None, json.dumps({f'k{i}': i for i in range(13)}), 0, 'reject')
cv('Locator JSON 1,000 byte 초과', 'HWP', None, json.dumps({'kind': 'HWP_PARAGRAPH', 'path': 'p' * 1000}), 0, 'reject')
cv('Locator JSON 한글 값(유니코드)', 'HWP', None, json.dumps({'kind': 'HWP_PARAGRAPH', 'section': 0, 'path': 'p1', 'control': '표 제목'}, ensure_ascii=False), 1, 'accept')
cv('과목 번호 음수', 'HWP', None, LOC, -1, 'reject')
# 2차 보완: PDF 행에는 분석 과목 번호를 두지 않는다(계약안 not_allowed)
cv('PDF | 쪽 있음 | Locator 없음 | 분석 과목 번호 있음', 'PDF', 2, None, 0, 'reject')

# UPDATE로 우회
stmt('UPDATE PDF 행에 Locator 추가', "UPDATE assessment_plan_confirmed_value SET evidence_locator_json='" + LOC + "' WHERE id='cv1'", 'reject')
stmt('UPDATE HWP 행에 쪽 번호 추가', "UPDATE assessment_plan_confirmed_value SET pdf_page_number=3 WHERE id='cv5'", 'reject')
stmt('UPDATE HWP 행 Locator 지움', "UPDATE assessment_plan_confirmed_value SET evidence_locator_json=NULL WHERE id='cv5'", 'reject')
stmt('UPDATE PDF 행에 분석 과목 번호 추가', "UPDATE assessment_plan_confirmed_value SET analysis_subject_index=0 WHERE id='cv1'", 'reject')
stmt('UPDATE 형식 NULL', "UPDATE assessment_plan_confirmed_value SET evidence_format=NULL WHERE id='cv1'", 'reject')
stmt('UPDATE HWP 행을 PDF로 바꿈(Locator 남음)', "UPDATE assessment_plan_confirmed_value SET evidence_format='PDF' WHERE id='cv5'", 'reject')

# 재조회 동일성 (JSON 정규화: 키 순서는 MySQL이 정렬할 수 있으므로 값 비교)
_, _, out = run("SELECT CAST(evidence_locator_json AS CHAR), JSON_TYPE(evidence_locator_json) FROM assessment_plan_confirmed_value WHERE id='cv5'")
stored, jtype = out.strip().splitlines()[-1].split('\t')
results.append(json.loads(stored) == json.loads(LOC) and jtype == 'OBJECT')
print(f"{'PASS' if results[-1] else 'FAIL'} Locator 재조회 값 동일, JSON_TYPE=OBJECT :: {stored}")
_, _, out = run("SELECT CAST(evidence_locator_json AS CHAR) FROM assessment_plan_confirmed_value WHERE id='cv21'")
results.append(json.loads(out.strip().splitlines()[-1])['control'] == '표 제목')
print(f"{'PASS' if results[-1] else 'FAIL'} 한글 값 재조회 동일")

# sourceCheck 쌍
def rv(name, method, sha, expect):
    m = 'NULL' if method is None else f"'{method}'"
    s = 'NULL' if sha is None else f"'{sha}'"
    stmt(f'review {name}', f"INSERT INTO assessment_plan_review (id,revision_id,analysis_id,decision,reviewed_by,reviewed_at,source_check_method,source_check_sha256)"
                           f" VALUES ('rv_{len(results)}','r_hwp','run1','CONFIRM','adm','2026-11-10 00:00:00',{m},{s})", expect)


rv('둘 다 없음(기존 PDF 기록)', None, None, 'accept')
rv('method + 소문자 hex 64', 'LOCAL_FILE_EXTERNAL_VIEWER', 'b' * 64, 'accept')
rv('method만', 'LOCAL_FILE_EXTERNAL_VIEWER', None, 'reject')
rv('SHA만', None, 'b' * 64, 'reject')
rv('허용 안 된 method', 'AUTO_VERIFIED', 'b' * 64, 'reject')
rv('대문자 hex', 'LOCAL_FILE_EXTERNAL_VIEWER', 'B' * 64, 'reject')
rv('hex 아닌 문자', 'LOCAL_FILE_EXTERNAL_VIEWER', 'g' * 64, 'reject')
rv('63자', 'LOCAL_FILE_EXTERNAL_VIEWER', 'b' * 63, 'reject')
stmt('UPDATE review SHA만 지움', "UPDATE assessment_plan_review SET source_check_sha256=NULL WHERE source_check_method IS NOT NULL", 'reject')

# 다중 행 INSERT의 원자성: 한 행이 CHECK 위반이면 전체 거절
stmt('다중 행 INSERT 중 1행 위반 → 전체 거절', "INSERT INTO assessment_plan_confirmed_value (id,review_id,revision_id,subject_id,field_path,value_json,pdf_page_number,evidence_format,evidence_locator_json,analysis_subject_index,position) VALUES "
     f"('atom1','rv1','r_hwp','subj_14','x','1',NULL,'HWP','{LOC}',0,90),('atom2','rv1','r_hwp','subj_14','x','1',2,'HWP','{LOC}',0,91)", 'reject')
_, _, out = run("SELECT COUNT(*) FROM assessment_plan_confirmed_value WHERE id LIKE 'atom%'")
results.append(out.split()[-1] == '0')
print(f"{'PASS' if results[-1] else 'FAIL'} 부분 저장 없음 (atom 행 {out.split()[-1]}개)")

print(json.dumps({'pass': sum(results), 'fail': len(results) - sum(results)}))
