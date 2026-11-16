"""v21.1 합성 PDF + 분석기 원본 JSON × 실제 서버(18080)·로컬 MySQL E2E Schema 검증. 합성 자료만 사용.
usage: python e2e_v211.py <pdf> <analysis-import.json> <schema> <out_log.json>
"""
import copy, hashlib, json, subprocess, sys, urllib.request, urllib.error, uuid

BASE = 'http://localhost:18080'
pdf_path, import_path, SCHEMA, log_path = sys.argv[1:5]
OP = {'X-Assessment-Admin-Id': 'adm_plan_operator'}
GANGNAM = {'X-Assessment-Admin-Id': 'adm_gangnam'}
BUNDANG = {'X-Assessment-Admin-Id': 'adm_bundang'}
ST1 = {'X-Assessment-Student-Id': 'stu_001'}
ST2 = {'X-Assessment-Student-Id': 'stu_002'}
SLOT = {'schoolId': 'school_001', 'academicYear': '2026', 'grade': '1', 'semester': '1'}
SUBJECT_ID = 'subj_14'  # 시험용 매핑 가정: 가상과학탐구 → 과학탐구실험1
results = []


def check(step, name, ok, detail=None):
    results.append({'step': step, 'check': name, 'pass': bool(ok), 'detail': detail})
    print(('PASS ' if ok else 'FAIL ') + f'[{step}] {name}' + (f' :: {json.dumps(detail, ensure_ascii=False)[:220]}' if detail is not None else ''))


def call(method, path, headers, body=None, ctype=None):
    h = dict(headers)
    if ctype:
        h['Content-Type'] = ctype
    req = urllib.request.Request(BASE + path, data=body, method=method, headers=h)
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, (json.loads(raw) if raw else None)
        except ValueError:
            return e.code, None


def jb(o):
    return json.dumps(o, ensure_ascii=False).encode('utf-8')


def sql(q):
    p = subprocess.run(['docker', 'exec', 'learnershigh-mysql', 'mysql', '-ulearnershigh', '-plearnershigh', '-N', '-B', '-r',
                        '--default-character-set=utf8mb4', SCHEMA, '-e', q], capture_output=True, text=True, encoding='utf-8')
    if p.returncode != 0:
        raise RuntimeError(p.stderr)
    return [line.split('\t') for line in p.stdout.strip().splitlines() if line]


TABLES = ['assessment_evaluation_plan', 'assessment_plan_revision', 'assessment_plan_analysis_run', 'assessment_plan_review',
          'assessment_plan_confirmed_value', 'assessment_school_assessment']


def counts():
    return {t: int(sql(f'SELECT COUNT(*) FROM {t}')[0][0]) for t in TABLES}


def multipart(fields, data):
    bd = '----v211' + uuid.uuid4().hex
    out = b''.join(f'--{bd}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode() for k, v in fields.items())
    out += f'--{bd}\r\nContent-Disposition: form-data; name="file"; filename="synthetic-e2e.pdf"\r\nContent-Type: application/pdf\r\n\r\n'.encode()
    return out + data + f'\r\n--{bd}--\r\n'.encode(), 'multipart/form-data; boundary=' + bd


pdf = open(pdf_path, 'rb').read()
raw = open(import_path, 'rb').read()      # 분석기 JSON 원본 바이트를 그대로 전송
payload = json.loads(raw)
sha = hashlib.sha256(pdf).hexdigest()
check('0', 'PDF 실제 SHA-256 = 보고값', sha == 'ab52297581ef154dbd0abe00a0cffcceec01513248bb60416fd2f5909173b404', sha)
check('0', 'payload.source = PDF SHA-256·쪽 수 2', payload['source'] == {'sha256': sha, 'pageCount': 2}, payload['source'])
check('0', 'E2E Schema 비어 있음', all(v == 0 for v in counts().values()), counts())

# 1~2 등록
body, ct = multipart(SLOT, pdf)
s, r = call('POST', '/api/admin/assessment/evaluation-plans', OP, body, ct)
check('1', 'PDF 등록 201, UNREVIEWED, fileRef null', s == 201 and r['reviewStatus'] == 'UNREVIEWED' and r['fileRef'] is None, s)
pid, rid = r['planId'], r['documentRevisionId']
row = sql(f"SELECT sha256, page_count, IFNULL(file_ref,'NULL') FROM assessment_plan_revision WHERE id='{rid}'")[0]
check('6', 'DB sha256·page_count = PDF', row == [sha, '2', 'NULL'], row)
base = f'/api/admin/assessment/evaluation-plans/{pid}/revisions/{rid}'

# 3~5 수신·재전송
s, r = call('POST', base + '/analysis-imports', OP, raw, 'application/json; charset=utf-8')
check('4', '원본 JSON 최초 수신 201', s == 201, s if s == 201 else r)
aid = r['analysisId']
check('4', 'REVIEW_REQUIRED·UNREVIEWED·서버 경고 없음', r['analysisStatus'] == 'REVIEW_REQUIRED' and r['reviewStatus'] == 'UNREVIEWED' and r['warnings'] == [],
      {'analysisStatus': r['analysisStatus'], 'reviewStatus': r['reviewStatus'], 'warnings': r['warnings']})
s, r2 = call('POST', base + '/analysis-imports', OP, raw, 'application/json; charset=utf-8')
check('5', '응답 analysisId = DB에 저장된 그 Run', sql(f"SELECT COUNT(*) FROM assessment_plan_analysis_run WHERE id='{aid}' AND revision_id='{rid}'") == [['1']], aid)
check('5', '동일 요청 재전송 200, 같은 analysisId, Run 1건', s == 200 and r2['analysisId'] == aid and counts()['assessment_plan_analysis_run'] == 1, s)

# 7 DB 후보 = Adapter 출력
db = sql(f"SELECT result_json, status, origin, analyzer_version FROM assessment_plan_analysis_run WHERE id='{aid}'")[0]
check('7', 'DB result_json = Adapter subjects (완전 일치)', json.loads(db[0]) == payload['subjects'], None)
check('7', 'DB Run status·origin·version', db[1:] == ['REVIEW_REQUIRED', 'EXTERNAL_IMPORT', 'v21.1/backend-adapter-0.2'], db[1:])

# 8~9 관리자 조회
s, r = call('GET', base + '/analysis', OP)
check('8', '분석 조회 200, subjects = payload', s == 200 and r['subjects'] == payload['subjects'], s)
sub = r['subjects'][0]
items = sub['performanceEvaluation']['items']
check('8', '과목 1·지필 1·수행 2', len(r['subjects']) == 1 and len(sub['writtenEvaluation']['exams']) == 1 and len(items) == 2,
      {'subject': sub['subjectName'], 'exams': [e['itemKey'] for e in sub['writtenEvaluation']['exams']], 'items': [i['itemKey'] for i in items]})
check('8', '수행 활동·제출물·조건·채점기준', bool(items[0]['content']) and items[0]['submissions'] == ['탐구 보고서'] and len(items[0]['conditions']) == 2
      and len(items[0]['rubric']) == 2 and len(items[1]['conditions']) == 1 and len(items[1]['rubric']) == 1,
      {'P01': [bool(items[0]['content']), items[0]['submissions'], len(items[0]['conditions']), len(items[0]['rubric'])],
       'P02': [bool(items[1]['content']), items[1]['submissions'], len(items[1]['conditions']), len(items[1]['rubric'])]})
pages = sorted({src['pdfPageNumber'] for it in items for src in it['sources']} | {src['pdfPageNumber'] for it in items for rb in it['rubric'] for src in rb['sources']})
check('8', '원문 Locator(PDF 물리 쪽 1~2)', pages and set(pages) <= {1, 2}, pages)
check('9', 'reviewStatus=UNREVIEWED, confirmedFields 없음, Review 0건', r['reviewStatus'] == 'UNREVIEWED' and r['confirmedFields'] == [] and counts()['assessment_plan_review'] == 0, None)

# 10 학생 비노출
q = '&'.join(f'{k}={v}' for k, v in SLOT.items())
s, r = call('GET', '/api/student/assessment/evaluation-plans?' + q, ST1)
t = json.dumps(r, ensure_ascii=False)
check('10', '학생 목록 200·후보 미노출', s == 200 and sub['subjectName'] not in t and 'extractedText' not in t and '탐구 보고서' not in t, s)
s, r = call('GET', f'/api/student/assessment/evaluation-plans/{pid}', ST1)
check('10', '학생 상세 200·UNREVIEWED·후보 미노출', s == 200 and r['reviewStatus'] == 'UNREVIEWED' and 'subjects' not in r, sorted(r.keys()))
ref = lambda key: {'title': '참조 시험', 'subjectId': SUBJECT_ID, 'academicYear': 2026, 'semester': 1,
                   'evaluationItemRef': {'documentRevisionId': rid, 'subjectId': SUBJECT_ID, 'itemKey': key}}
b4 = counts()
s, r = call('POST', '/api/student/assessment/school-assessments', ST1, jb(ref('P01')), 'application/json')
check('10', '미확정 Revision 참조 400 not_confirmed, 저장 없음', s == 400 and 'not_confirmed' in json.dumps(r) and counts() == b4, r)

# 권한·오류 (저장 없음)
for name, hdr, exp in (('인증 없음', {}, 401), ('운영 권한 없는 관리자', GANGNAM, 404), ('학생 Header', ST1, 401)):
    b4 = counts()
    s, r = call('POST', base + '/analysis-imports', hdr, raw, 'application/json')
    check('E', f'수신 거절: {name} → {exp}, 저장 없음', s == exp and counts() == b4, s)
for name, mut in (('SHA 불일치', lambda p: p['source'].update(sha256=hashlib.sha256(b'x').hexdigest())),
                  ('쪽 수 불일치', lambda p: p['source'].update(pageCount=3)),
                  ('confidence 필드', lambda p: p['subjects'][0]['performanceEvaluation']['items'][0].update(confidence=0.9)),
                  ('status=CONFIRMED', lambda p: p.update(status='CONFIRMED'))):
    p = copy.deepcopy(payload); mut(p); b4 = counts()
    s, r = call('POST', base + '/analysis-imports', OP, jb(p), 'application/json')
    check('E', f'수신 거절: {name} → 400, 저장 없음', s == 400 and counts() == b4,
          [f"{f['field']}:{f['reason']}" for f in (r or {}).get('details', {}).get('fields', [])])

# 합성 데이터 기반 검토 API 시험 → itemKey 검증(G-7 A안) → 학생/관리자 상태 일치
review = {'analysisId': aid, 'decision': 'CONFIRM', 'reviewedSubjects': [{'subjectId': SUBJECT_ID, 'confirmedFields': [
    {'fieldPath': 'performanceEvaluation.weightPercent', 'value': payload['subjects'][0]['performanceEvaluation']['weightPercent'], 'pdfPageNumber': 1}]}]}
s, r = call('PUT', base + '/review', OP, jb(review), 'application/json')
check('R', '[합성 시험] 검토 확정 200 CONFIRMED, 후보 Run 불변', s == 200 and r['reviewStatus'] == 'CONFIRMED'
      and sql(f"SELECT status FROM assessment_plan_analysis_run WHERE id='{aid}'") == [['REVIEW_REQUIRED']], s)
b4 = counts()
s, r = call('POST', '/api/student/assessment/school-assessments', ST1, jb(ref('P99')), 'application/json')
check('K', '없는 itemKey P99 → 400 evaluationItemRef.itemKey:unknown, 저장 없음',
      s == 400 and r['details']['fields'] == [{'field': 'evaluationItemRef.itemKey', 'reason': 'unknown'}] and counts() == b4, r.get('details'))
b4 = counts()
s, r = call('POST', '/api/student/assessment/school-assessments', ST1, jb(ref('W01')), 'application/json')
check('K', '지필 itemKey W01 → 400 evaluationItemRef.itemKey:not_allowed, 저장 없음 (§12)',
      s == 400 and r['details']['fields'] == [{'field': 'evaluationItemRef.itemKey', 'reason': 'not_allowed'}] and counts() == b4, r.get('details'))
s, r = call('POST', '/api/student/assessment/school-assessments', ST1, jb(ref('P01')), 'application/json')
check('K', '있는 itemKey P01 → 201', s == 201, s)
asid = r['assessmentId']
s, r = call('PATCH', f'/api/student/assessment/school-assessments/{asid}/status', ST1, jb({'status': 'IN_PROGRESS'}), 'application/json')
s, r = call('GET', '/api/admin/assessment/students/stu_001/school-assessments?academicYear=2026&semester=1', GANGNAM)
mine = [i for i in r['items'] if i['assessmentId'] == asid]
check('K', '관리자(강남): 같은 ID·IN_PROGRESS·같은 참조', len(mine) == 1 and mine[0]['status'] == 'IN_PROGRESS' and mine[0]['evaluationItemRef']['itemKey'] == 'P01', mine)
s, r = call('GET', '/api/admin/assessment/students/stu_001/school-assessments?academicYear=2026&semester=1', BUNDANG)
check('K', '분당 관리자 404', s == 404, s)
s, r = call('GET', f'/api/student/assessment/school-assessments/{asid}', ST2)
check('K', '다른 학생 404', s == 404, s)

summary = {'pass': sum(x['pass'] for x in results), 'fail': sum(not x['pass'] for x in results), 'sha256': sha, 'planId': pid,
           'revisionId': rid, 'analysisId': aid, 'assessmentId': asid, 'counts': counts()}
print(json.dumps(summary, ensure_ascii=False, indent=1))
json.dump({'summary': summary, 'results': results}, open(log_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
