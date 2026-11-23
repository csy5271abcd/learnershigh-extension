"""D-1 초안을 '기존 데이터가 있는 Schema 사본'에 적용해 보존 여부를 확인한다.

usage: python d1_existing_copy.py <repo root> <원본 schema(읽기만)> <새 사본 schema> <backend base url>
원본 Schema는 mysqldump로 읽기만 한다. 사본은 새 이름이어야 한다(있으면 중단).
Backend는 사본 Schema로 실행 중이어야 한다(현재 코드). 적용 전후 GET 응답을 비교한다.
"""
import hashlib
import json
import pathlib
import subprocess
import sys
import urllib.request

repo, src, dst, base = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
EXEC = ['docker', 'exec', '-i', 'learnershigh-mysql']
WARN = 'mysql: [Warning] Using a password on the command line interface can be insecure.'
results = []


def sql(q, db=dst):
    p = subprocess.run(EXEC + ['mysql', '-uroot', '-proot', '-N', '-r', '--default-character-set=utf8mb4', db], input=q.encode(), capture_output=True)
    return p.returncode, p.stderr.decode('utf-8', 'replace').replace(WARN, '').strip(), p.stdout.decode('utf-8', 'replace')


def check(name, ok, detail=''):
    results.append(ok)
    print(f"{'PASS' if ok else 'FAIL'} {name}{' :: ' + str(detail)[:200] if detail != '' else ''}")


def snapshot():
    out = {}
    for table in ('assessment_plan_confirmed_value', 'assessment_plan_review', 'assessment_plan_revision', 'assessment_plan_analysis_run'):
        cols = {'assessment_plan_confirmed_value': 'id,review_id,revision_id,subject_id,field_path,value_json,pdf_page_number,position',
                'assessment_plan_review': 'id,revision_id,analysis_id,decision,reviewed_by,reviewed_at',
                'assessment_plan_revision': 'id,plan_id,revision_number,content_type,sha256,page_count,review_status',
                'assessment_plan_analysis_run': 'id,revision_id,status,payload_sha256,result_json'}[table]
        _, _, rows = sql(f'SELECT {cols} FROM {table} ORDER BY id')
        out[table] = (len(rows.splitlines()), hashlib.sha256(rows.encode()).hexdigest())
    _, _, idx = sql(f"SELECT table_name,index_name,column_name,seq_in_index FROM information_schema.statistics WHERE table_schema='{dst}' AND table_name LIKE 'assessment_plan%' ORDER BY 1,2,4")
    _, _, fk = sql(f"SELECT table_name,constraint_name,referenced_table_name FROM information_schema.referential_constraints WHERE constraint_schema='{dst}' ORDER BY 1,2")
    out['indexes'] = hashlib.sha256(idx.encode()).hexdigest()
    out['foreign_keys'] = (len(fk.splitlines()), hashlib.sha256(fk.encode()).hexdigest())
    return out


def get(path, header):
    req = urllib.request.Request(base + path, headers=header)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def api_snapshot(plans):
    admin = {'X-Assessment-Admin-Id': 'adm_plan_operator'}
    student = {'X-Assessment-Student-Id': 'stu_001'}
    out = {}
    for plan_id, revision_id in plans:
        out[f'admin {plan_id}'] = get(f'/api/admin/assessment/evaluation-plans/{plan_id}', admin)
        out[f'analysis {revision_id}'] = get(f'/api/admin/assessment/evaluation-plans/{plan_id}/revisions/{revision_id}/analysis', admin)
    out['student list'] = get('/api/student/assessment/evaluation-plans?schoolId=school_001&academicYear=2026&grade=1&semester=1', student)
    for plan_id, _ in plans:
        out[f'student {plan_id}'] = get(f'/api/student/assessment/evaluation-plans/{plan_id}', student)
    return out


_, _, exists = sql(f"SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='{dst}'", 'mysql')
if exists.strip() != '1':
    sys.exit(f'{dst} must be created first by copy step')

before = snapshot()
_, _, confirmed = sql('SELECT DISTINCT r.plan_id, r.id FROM assessment_plan_review v JOIN assessment_plan_revision r ON r.id=v.revision_id ORDER BY 1')
plans = [tuple(line.split('\t')) for line in confirmed.splitlines()]
print('confirmed PDF revisions in copy:', len(plans), '| rows:', {k: v[0] for k, v in before.items() if isinstance(v, tuple)})
api_before = api_snapshot(plans)

code, err, _ = sql((repo / 'docs/specs/suyeon/assessment-multiformat-review-gate-202611/sql/D1-draft.sql').read_text(encoding='utf-8'))
check('D-1 초안 적용(기존 데이터 사본)', code == 0, err)
after = snapshot()
for key in before:
    check(f'적용 전후 동일: {key}', before[key] == after[key], f'{before[key]} → {after[key]}' if before[key] != after[key] else before[key] if not isinstance(before[key], str) else '')
_, _, fmt = sql("SELECT evidence_format, COUNT(*), SUM(evidence_locator_json IS NULL), SUM(analysis_subject_index IS NULL) FROM assessment_plan_confirmed_value GROUP BY evidence_format")
check("기존 확정값은 모두 evidence_format='PDF', 새 Locator·과목 번호는 NULL", all(line.split('\t')[0] == 'PDF' and line.split('\t')[1] == line.split('\t')[2] == line.split('\t')[3] for line in fmt.splitlines()) and fmt.strip() != '', fmt.strip())
_, _, rc = sql('SELECT COUNT(*), SUM(source_check_method IS NULL AND source_check_sha256 IS NULL) FROM assessment_plan_review')
a, b = rc.split()
check('기존 Review 이력: 원문 확인 기록 Column 모두 NULL', a == b, rc.strip())
api_after = api_snapshot(plans)
for key in api_before:
    check(f'API 응답 동일: {key}', api_before[key] == api_after[key])

# 현재 코드(새 Column을 모르는 Entity)의 INSERT 모양 — evidence_format을 빼면 거절된다 = D-1과 Entity 변경은 함께 배포해야 한다
code, err, _ = sql("INSERT INTO assessment_plan_confirmed_value (id,review_id,revision_id,subject_id,field_path,value_json,pdf_page_number,position)"
                   " SELECT 'legacy_shape_probe', review_id, revision_id, subject_id, field_path, value_json, pdf_page_number, 999 FROM assessment_plan_confirmed_value LIMIT 1")
check('현재 Entity 모양의 INSERT(evidence_format 없음)는 거절 — 코드와 함께 배포 필요', code != 0, err)
print(json.dumps({'pass': sum(results), 'fail': len(results) - sum(results)}))
