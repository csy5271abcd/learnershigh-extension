"""실험 기능 꺼짐(기본) 격리 검증: 계정 B 원본 HWP·HWPX 업로드 415, 실험 필드 unknown_field, PDF 정상. 합성 자료만.
usage: python -I flag-off-check.py <B run 폴더> <v21.1 pdf> <v21.1 json> <schema>
"""
import hashlib
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
import uuid

run_dir, pdf_path, pdf_json_path, schema = sys.argv[1:5]
BASE = 'http://localhost:18080'
OP = {'X-Assessment-Admin-Id': 'adm_plan_operator'}
results = []


def check(name, ok, detail=None):
    results.append(ok)
    print(('PASS ' if ok else 'FAIL ') + name + (f' :: {json.dumps(detail, ensure_ascii=False)[:200]}' if detail is not None else ''))


def call(method, path, headers, body=None, ctype=None):
    h = dict(headers)
    if ctype:
        h['Content-Type'] = ctype
    req = urllib.request.Request(BASE + path, data=body, method=method, headers=h)
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return r.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raw = e.read()
        return e.code, json.loads(raw) if raw else None


def upload(path, grade):
    data = open(path, 'rb').read()
    bd = '----off' + uuid.uuid4().hex
    fields = {'schoolId': 'school_001', 'academicYear': '2026', 'grade': str(grade), 'semester': '1'}
    body = b''.join(f'--{bd}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in fields.items())
    body += f'--{bd}\r\nContent-Disposition: form-data; name="file"; filename="{os.path.basename(path)}"\r\nContent-Type: application/octet-stream\r\n\r\n'.encode()
    body += data + f'\r\n--{bd}--\r\n'.encode()
    return call('POST', '/api/admin/assessment/evaluation-plans', OP, body, 'multipart/form-data; boundary=' + bd)


def rows(table):
    p = subprocess.run(['docker', 'exec', 'learnershigh-mysql', 'mysql', '-ulearnershigh', '-plearnershigh', '-N', '-B', schema, '-e',
                        f'SELECT COUNT(*) FROM {table}'], capture_output=True, text=True)
    return int(p.stdout.strip())


hwp = os.path.join(run_dir, 'synthetic', 'synthetic-plan.hwp')
hwpx = os.path.join(run_dir, 'synthetic', 'synthetic-plan.hwpx')
before = rows('assessment_plan_revision')
for name, path in (('HWP', hwp), ('HWPX', hwpx)):
    s, r = upload(path, 3)
    check(f'실험 꺼짐: 계정 B 원본 {name} 업로드 → 415 UNSUPPORTED_FILE_TYPE (세부 사유 없음 = 기존과 같음)', s == 415 and r['code'] == 'UNSUPPORTED_FILE_TYPE' and not (r.get('details') or {}).get('fields'), {'status': s, 'details': r.get('details')})
check('실험 꺼짐: 업로드 거절 뒤 Revision 저장 없음', rows('assessment_plan_revision') == before, None)

s, r = upload(pdf_path, 3)
check('실험 꺼짐: PDF 등록 201', s == 201, s)
base = f"/api/admin/assessment/evaluation-plans/{r['planId']}/revisions/{r['documentRevisionId']}/analysis-imports"
hwp_payload = open(os.path.join(run_dir, 'synthetic-results', 'SYNHWP.experimental-import.json'), 'rb').read()
runs = rows('assessment_plan_analysis_run')
s, r2 = call('POST', base, OP, hwp_payload, 'application/json')
fields = [f"{f['field']}:{f['reason']}" for f in (r2 or {}).get('details', {}).get('fields', [])]
check('실험 꺼짐: 계정 B HWP Payload → PDF Revision 400 (source.format·documentLocator unknown_field)', s == 400 and 'source.format:unknown_field' in fields and any(f.endswith('documentLocator:unknown_field') for f in fields) and rows('assessment_plan_analysis_run') == runs, fields[:4])
pdf_payload = open(pdf_json_path, 'rb').read()
s, r3 = call('POST', base, OP, pdf_payload, 'application/json')
check('실험 꺼짐: 기존 PDF Payload 201 · UNREVIEWED', s == 201 and r3['reviewStatus'] == 'UNREVIEWED', s)
s, r4 = call('POST', base, OP, pdf_payload, 'application/json')
check('실험 꺼짐: 같은 PDF Payload 재전송 200 · 같은 analysisId', s == 200 and r4['analysisId'] == r3['analysisId'], s)
p = subprocess.run(['docker', 'exec', 'learnershigh-mysql', 'mysql', '-ulearnershigh', '-plearnershigh', '-N', '-B', '-r', '--default-character-set=utf8mb4', schema, '-e',
                    f"SELECT result_json, payload_sha256 FROM assessment_plan_analysis_run WHERE id='{r3['analysisId']}'"], capture_output=True, text=True, encoding='utf-8')
stored, payload_sha = p.stdout.strip().split('\t')
check('실험 꺼짐: PDF 저장 JSON = 보낸 subjects (완전 일치, documentLocator·format 없음)', json.loads(stored) == json.loads(pdf_payload)['subjects'] and 'documentLocator' not in stored, None)
s, r5 = call('GET', base.replace('/analysis-imports', '/analysis'), OP)
check('실험 꺼짐: PDF 조회 응답 subjects = 보낸 subjects (응답 Shape 유지)', s == 200 and r5['subjects'] == json.loads(pdf_payload)['subjects'], s)
print('PAYLOAD_SHA', payload_sha)
print(json.dumps({'pass': sum(results), 'fail': len(results) - sum(results)}))
