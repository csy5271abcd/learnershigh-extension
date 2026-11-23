"""AI 분석기(v21) 결과 × Backend 실제 HTTP/DB 통합 검증 (합성 PDF만 사용).
usage: python e2e_http.py <pdf> <backend-import.json> <out_log.json>
- PDF 바이트와 payload는 수정하지 않고 그대로 보낸다. 오류 시나리오만 payload 사본을 의도적으로 변형한다.
- DB 확인은 docker exec로 로컬 E2E 전용 Schema(lh_assessment_e2e)만 읽는다.
"""
import copy, hashlib, json, subprocess, sys, urllib.request, urllib.error, uuid

BASE = 'http://localhost:18080'
SCHEMA = 'lh_assessment_e2e'
OP = {'X-Assessment-Admin-Id': 'adm_plan_operator'}      # school_001 평가계획서 운영(Mock)
GANGNAM = {'X-Assessment-Admin-Id': 'adm_gangnam'}       # br_gangnam 학생 열람, 평가계획서 운영 권한 없음
BUNDANG = {'X-Assessment-Admin-Id': 'adm_bundang'}
ST1 = {'X-Assessment-Student-Id': 'stu_001'}             # br_gangnam
ST2 = {'X-Assessment-Student-Id': 'stu_002'}
SLOT = {'schoolId': 'school_001', 'academicYear': '2026', 'grade': '1', 'semester': '1'}  # PDF 제목: 2026학년도 1학년 1학기
SUBJECT_ID = 'subj_12'  # 합성 시험용 매핑 가정: 분석 과목명 '과학' → Mock 과목 '통합과학1' (실제 매핑은 사람 검토 결정)

pdf_path, import_path, log_path = sys.argv[1:4]
results = []


def check(step, name, ok, detail=None):
    results.append({'step': step, 'check': name, 'pass': bool(ok), 'detail': detail})
    print(('PASS ' if ok else 'FAIL ') + f'[{step}] {name}' + (f' :: {detail}' if detail is not None else ''))


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
            return e.code, raw.decode('utf-8', 'replace')[:200]


def jbody(o):
    return json.dumps(o, ensure_ascii=False).encode('utf-8')


def sql(q):
    p = subprocess.run(['docker', 'exec', 'learnershigh-mysql', 'mysql', '-ulearnershigh', '-plearnershigh', '-N', '-B', '-r',
                        '--default-character-set=utf8mb4', SCHEMA, '-e', q], capture_output=True, text=True, encoding='utf-8')
    if p.returncode != 0:
        raise RuntimeError(p.stderr)
    return [line.split('\t') for line in p.stdout.strip().splitlines() if line]


def counts():
    tables = ['assessment_evaluation_plan', 'assessment_plan_revision', 'assessment_plan_analysis_run', 'assessment_plan_review',
              'assessment_plan_confirmed_value', 'assessment_school_assessment']
    return {t: int(sql(f'SELECT COUNT(*) FROM {t}')[0][0]) for t in tables}


def multipart(fields, data, filename='synthetic-plan.pdf'):
    bd = '----e2e' + uuid.uuid4().hex
    out = b''.join(f'--{bd}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode('utf-8') for k, v in fields.items())
    out += (f'--{bd}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\nContent-Type: application/pdf\r\n\r\n').encode()
    out += data + f'\r\n--{bd}--\r\n'.encode()
    return out, 'multipart/form-data; boundary=' + bd


pdf = open(pdf_path, 'rb').read()
pdf_sha = hashlib.sha256(pdf).hexdigest()
envelope = json.load(open(import_path, encoding='utf-8'))
payload = envelope['payload']
check('0', 'Adapter 결과 importable·로컬 검증 위반 0', envelope['importable'] and not envelope['localValidation']['violations'],
      {'blockers': envelope['blockers'], 'violations': envelope['localValidation']['violations']})
check('0', 'payload.source.sha256 = 등록할 PDF 실제 SHA-256', payload['source']['sha256'] == pdf_sha, pdf_sha)
start = counts()
check('0', 'E2E Schema가 비어 있음', all(v == 0 for v in start.values()), start)

# ── A. PDF 등록 ──
body, ct = multipart(SLOT, pdf)
s, r = call('POST', '/api/admin/assessment/evaluation-plans', OP, body, ct)
check('A', 'PDF 등록 201', s == 201, s)
pid, rid = r['planId'], r['documentRevisionId']
check('A', 'planId·documentRevisionId 반환', bool(pid) and bool(rid), {'planId': pid, 'documentRevisionId': rid})
check('A', 'reviewStatus=UNREVIEWED, analysisStatus=NOT_REQUESTED, fileRef=null',
      r['reviewStatus'] == 'UNREVIEWED' and r['analysisStatus'] == 'NOT_REQUESTED' and r['fileRef'] is None, r)
row = sql(f"SELECT sha256, page_count, IFNULL(file_ref,'NULL'), review_status, size_bytes FROM assessment_plan_revision WHERE id='{rid}'")[0]
check('A', 'DB sha256 = PDF 실제 SHA-256', row[0] == pdf_sha, row[0])
check('A', 'DB page_count = 2 = payload.source.pageCount', row[1] == '2' and payload['source']['pageCount'] == 2, row[1])
check('A', 'DB file_ref NULL (원본 바이트 미보관)', row[2] == 'NULL', row[2])
check('A', 'DB size_bytes = 파일 크기', row[4] == str(len(pdf)), row[4])
cols = [c[0] for c in sql(f"SELECT column_name FROM information_schema.columns WHERE table_schema='{SCHEMA}' AND data_type IN ('blob','longblob','mediumblob')")]
check('A', 'Schema에 BLOB Column 없음 (바이트 저장 경로 없음)', cols == [], cols)

base = f'/api/admin/assessment/evaluation-plans/{pid}/revisions/{rid}'

# ── B. 분석 후보 수신 ──
before = counts()
s, r = call('POST', base + '/analysis-imports', OP, jbody(payload), 'application/json')
check('B', '최초 수신 201', s == 201, s if s == 201 else r)
aid = r['analysisId']
check('B', 'analysisStatus=REVIEW_REQUIRED, reviewStatus=UNREVIEWED', r['analysisStatus'] == 'REVIEW_REQUIRED' and r['reviewStatus'] == 'UNREVIEWED',
      {'analysisStatus': r['analysisStatus'], 'reviewStatus': r['reviewStatus']})
s2, r2 = call('POST', base + '/analysis-imports', OP, jbody(payload), 'application/json')
check('B', '같은 Request 재전송 200, 같은 analysisId', s2 == 200 and r2['analysisId'] == aid, {'status': s2, 'analysisId': r2.get('analysisId')})
after = counts()
check('B', 'AnalysisRun 1건만 생성, Review 0건', after['assessment_plan_analysis_run'] - before['assessment_plan_analysis_run'] == 1
      and after['assessment_plan_review'] == 0 and after['assessment_plan_confirmed_value'] == 0, after)
run = sql(f"SELECT status, origin, analyzer_name, analyzer_version, received_by, CHAR_LENGTH(result_json) FROM assessment_plan_analysis_run WHERE id='{aid}'")[0]
check('B', 'DB Run: REVIEW_REQUIRED·EXTERNAL_IMPORT·분석기 이름/버전', run[0] == 'REVIEW_REQUIRED' and run[1] == 'EXTERNAL_IMPORT'
      and run[2] == 'curriculum-analysis' and run[3] == 'v21/backend-adapter-0.1', run)
stored = json.loads(sql(f"SELECT result_json FROM assessment_plan_analysis_run WHERE id='{aid}'")[0][0])
check('B', 'DB result_json의 과목 = payload 과목(값 보정 없음)', stored == payload['subjects'],
      type(stored).__name__)
rs = sql(f"SELECT review_status FROM assessment_plan_revision WHERE id='{rid}'")[0][0]
check('B', 'DB Revision review_status 그대로 UNREVIEWED', rs == 'UNREVIEWED', rs)

# ── C. 관리자 후보 조회 ──
s, r = call('GET', base + '/analysis', OP)
check('C', '분석 조회 200', s == 200, s)
cand = r.get('candidate') or r
text = json.dumps(r, ensure_ascii=False)
subj = (cand.get('subjects') or [None])[0] if isinstance(cand, dict) else None
check('C', '응답에 분석 후보 과목·평가 반환', subj is not None and subj.get('subjectName') == '과학', list(r.keys()))
items = subj['performanceEvaluation']['items'] if subj else []
p01 = next((i for i in items if i['itemKey'] == 'P01'), {})
check('C', 'P01 활동·제출물·조건·채점기준 반환', bool(p01.get('content')) and p01.get('submissions') == ['탐구 보고서']
      and len(p01.get('conditions', [])) == 2 and len(p01.get('rubric', [])) == 2, {k: p01.get(k) is not None for k in ('content', 'submissions', 'conditions', 'rubric')})
p02 = next((i for i in items if i['itemKey'] == 'P02'), {})
check('C', 'P02 상세 없음 → content null·빈 배열 그대로 (임의 생성 없음)', p02.get('content') is None and p02.get('rubric') == [] and p02.get('submissions') == [], p02.get('content'))
check('C', '원문 근거(pdfPageNumber·extractedText) 반환', '"pdfPageNumber": 2' in text and '하천 수질 측정' in text, None)
check('C', '검토 상태 UNREVIEWED, 확정값 없음', r.get('reviewStatus') == 'UNREVIEWED' and not r.get('confirmedFields'),
      {'reviewStatus': r.get('reviewStatus'), 'confirmedFields': r.get('confirmedFields')})
check('C', '응답 최상위 키', True, sorted(r.keys()))

# ── D. 학생 공개 상태 ──
q = '&'.join(f'{k}={v}' for k, v in SLOT.items())
s, r = call('GET', '/api/student/assessment/evaluation-plans?' + q, ST1)
check('D', '학생 평가계획서 목록 200', s == 200, s)
mine = [i for i in r['items'] if i['planId'] == pid]
check('D', '학생 목록에 문서 표시, reviewStatus=UNREVIEWED', len(mine) == 1 and mine[0]['reviewStatus'] == 'UNREVIEWED', mine)
stxt = json.dumps(r, ensure_ascii=False)
check('D', '학생 응답에 AI 후보(평가명·근거 원문) 미노출', '탐구 보고서' not in stxt and 'extractedText' not in stxt and 'analysis' not in stxt.lower(), sorted(mine[0].keys()) if mine else None)
s, r = call('GET', f'/api/student/assessment/evaluation-plans/{pid}', ST1)
check('D', '학생 평가계획서 상세 GET 200, 후보 미노출', s == 200 and '탐구 보고서' not in json.dumps(r, ensure_ascii=False), {'status': s, 'keys': sorted(r.keys()) if isinstance(r, dict) else r})
s, r = call('GET', '/api/student/assessment/evaluation-plans?schoolId=school_001&academicYear=2026&grade=2&semester=1', ST1)
check('D', '다른 학년 슬롯 조회 403', s == 403, {'status': s, 'code': (r or {}).get('code') if isinstance(r, dict) else r})
s, r = call('GET', '/api/student/assessment/evaluation-plans?schoolId=school_999&academicYear=2026&grade=1&semester=1', ST1)
check('D', '다른 학교 조회 403', s == 403, s)
ref_req = {'title': '탐구 보고서', 'subjectId': SUBJECT_ID, 'academicYear': 2026, 'semester': 1,
           'evaluationItemRef': {'documentRevisionId': rid, 'subjectId': SUBJECT_ID, 'itemKey': 'P01'}}
before = counts()
s, r = call('POST', '/api/student/assessment/school-assessments', ST1, jbody(ref_req), 'application/json')
check('D', '미확정 Revision 참조 등록 400 not_confirmed', s == 400 and 'not_confirmed' in json.dumps(r), r)
check('D', '거절 후 학생 수행평가 저장 0건', counts()['assessment_school_assessment'] == before['assessment_school_assessment'], None)

# ── P0-4. 오류·보안 (수신 거절 시 부분 저장 없음) ──
def bad(name, mutate, expect=400, headers=OP, path=None):
    p = copy.deepcopy(payload)
    raw = mutate(p)
    data = raw if isinstance(raw, bytes) else jbody(p)
    b4 = counts()
    s, r = call('POST', path or (base + '/analysis-imports'), headers, data, 'application/json')
    reasons = [f"{f.get('field')}:{f.get('reason')}" for f in ((r or {}).get('details') or {}).get('fields', [])] if isinstance(r, dict) else r
    check('E', f'{name} → {expect}', s == expect, {'status': s, 'code': (r or {}).get('code') if isinstance(r, dict) else None, 'reasons': reasons})
    check('E', f'{name} → DB 변경 없음', counts() == b4, None)


def m_sha(p): p['source']['sha256'] = hashlib.sha256(b'other').hexdigest()
def m_pages(p): p['source']['pageCount'] = 3
def m_page_out(p): p['subjects'][0]['performanceEvaluation']['items'][0]['sources'][0]['pdfPageNumber'] = 3
def m_no_evidence(p): p['subjects'][0]['performanceEvaluation']['items'][1]['sources'] = []
def m_dup_key(p): p['subjects'][0]['performanceEvaluation']['items'][1]['itemKey'] = 'P01'
def m_unknown(p): p['subjects'][0]['performanceEvaluation']['items'][0]['specialRules'] = []
def m_conf(p): p['subjects'][0]['performanceEvaluation']['items'][0]['confidence'] = 0.93
def m_status(p): p['status'] = 'CONFIRMED'
def m_review(p): p['reviewStatus'] = 'CONFIRMED'


bad('SHA-256 불일치', m_sha)
bad('쪽 수 불일치', m_pages)
bad('근거 쪽 범위 밖(3쪽)', m_page_out)
bad('근거 없는 수치(P02 sources 비움)', m_no_evidence)
bad('itemKey 중복', m_dup_key)
bad('알 수 없는 필드(specialRules)', m_unknown)
bad('내부 분석 필드(confidence)', m_conf)
bad('status=CONFIRMED 자동 승인', m_status)
bad('최상위 reviewStatus=CONFIRMED', m_review)
bad('운영 권한 없는 관리자(adm_gangnam) 수신', lambda p: None, expect=403, headers=GANGNAM)
bad('인증 없음 수신', lambda p: None, expect=401, headers={})
bad('학생 Header로 수신', lambda p: None, expect=401, headers=ST1)
s, r = call('GET', base + '/analysis', BUNDANG)
check('E', '운영 권한 없는 관리자 분석 조회 거절', s in (403, 404), s)

# ── E. 관리자 검토 API (합성 데이터 기반 API 시험 — 실제 사람 검토 아님) ──
review = {'analysisId': aid, 'decision': 'CONFIRM', 'reviewedSubjects': [{'subjectId': SUBJECT_ID, 'confirmedFields': [
    {'fieldPath': 'performanceEvaluation.weightPercent', 'value': 50, 'pdfPageNumber': 1},
    {'fieldPath': 'performanceEvaluation.items[0].label', 'value': '탐구 보고서', 'pdfPageNumber': 1},
    {'fieldPath': 'performanceEvaluation.items[0].weightPercent', 'value': 25, 'pdfPageNumber': 1},
    {'fieldPath': 'performanceEvaluation.items[0].submissions', 'value': ['탐구 보고서'], 'pdfPageNumber': 2}]}]}
s, r = call('PUT', base + '/review', GANGNAM, jbody(review), 'application/json')
check('F', '운영 권한 없는 관리자 검토 거절', s in (403, 404) and counts()['assessment_plan_review'] == 0, s)
s, r = call('PUT', base + '/review', OP, jbody(review), 'application/json')
check('F', '[합성 시험] 검토 확정 200, CONFIRMED', s == 200 and r.get('reviewStatus') == 'CONFIRMED', {'status': s, 'reviewStatus': (r or {}).get('reviewStatus')})
check('F', '확정값 4건 응답', len(r.get('confirmedFields') or []) == 4, r.get('confirmedFields'))
rev = sql(f"SELECT reviewed_by, decision, analysis_id FROM assessment_plan_review WHERE revision_id='{rid}'")
check('F', 'DB Review 1건, 검토자 = 호출한 Mock 관리자 ID', len(rev) == 1 and rev[0][0] == 'adm_plan_operator' and rev[0][2] == aid, rev)
check('F', 'AI 후보 Run 불변(여전히 REVIEW_REQUIRED, 1건)', sql(f"SELECT status FROM assessment_plan_analysis_run WHERE revision_id='{rid}'") == [['REVIEW_REQUIRED']], None)

# ── F. 학생 평가 항목 참조 ──
s, r = call('POST', '/api/student/assessment/school-assessments', ST1, jbody(ref_req), 'application/json')
check('G', '확정 후 참조 등록 201', s == 201, s if s == 201 else r)
asid = r['assessmentId']
row = sql(f"SELECT student_id, subject_id, status, eval_document_revision_id, eval_subject_id, eval_item_key FROM assessment_school_assessment WHERE id='{asid}'")[0]
check('G', 'DB 저장: stu_001·참조 3값', row == ['stu_001', SUBJECT_ID, 'BEFORE_START', rid, SUBJECT_ID, 'P01'], row)
s, r = call('GET', f'/api/student/assessment/school-assessments/{asid}', ST1)
check('G', '학생 재조회 200, evaluationItemRef 유지', s == 200 and r['evaluationItemRef'] == ref_req['evaluationItemRef'], r.get('evaluationItemRef'))
s, r = call('GET', f'/api/admin/assessment/students/stu_001/school-assessments?academicYear=2026&semester=1', GANGNAM)
mine = [i for i in r.get('items', []) if i['assessmentId'] == asid]
check('G', '관리자(강남) 조회: 같은 Assessment ID·상태', s == 200 and len(mine) == 1 and mine[0]['status'] == 'BEFORE_START', mine)
s, r = call('PATCH', f'/api/student/assessment/school-assessments/{asid}/status', ST1, jbody({'status': 'IN_PROGRESS'}), 'application/json')
check('G', '학생 상태 변경 IN_PROGRESS 200', s == 200 and r['status'] == 'IN_PROGRESS', s)
s, r = call('GET', f'/api/admin/assessment/students/stu_001/school-assessments?academicYear=2026&semester=1', GANGNAM)
mine = [i for i in r.get('items', []) if i['assessmentId'] == asid]
check('G', '관리자 재조회: IN_PROGRESS 일치', len(mine) == 1 and mine[0]['status'] == 'IN_PROGRESS', mine)
s, r = call('GET', f'/api/admin/assessment/students/stu_001/school-assessments?academicYear=2026&semester=1', BUNDANG)
check('G', '다른 지점 관리자(분당) 404', s == 404, s)
s, r = call('GET', f'/api/student/assessment/school-assessments/{asid}', ST2)
check('G', '다른 학생(stu_002) 조회 404', s == 404 and (r or {}).get('code') == 'ASSESSMENT_NOT_FOUND', s)
s, r = call('PATCH', f'/api/student/assessment/school-assessments/{asid}/status', ST1, jbody({'status': 'BEFORE_START'}), 'application/json')
check('G', '역전이 409', s == 409 and r.get('code') == 'INVALID_STATE_TRANSITION', s)

# 관찰: 확정 Revision의 존재하지 않는 itemKey 참조 (현재 Backend는 itemKey를 해석하지 않음)
obs = copy.deepcopy(ref_req)
obs['evaluationItemRef']['itemKey'] = 'P99'
s, r = call('POST', '/api/student/assessment/school-assessments', ST1, jbody(obs), 'application/json')
check('OBS', '분석에 없는 itemKey(P99) 참조 등록 결과(관찰)', True, {'status': s})

# ── FAILED 결과 수신 (같은 PDF를 Revision 2로 등록) ──
body, ct = multipart({}, pdf)
s, r = call('POST', f'/api/admin/assessment/evaluation-plans/{pid}/revisions', OP, body, ct)
rid2 = r['documentRevisionId']
check('H', '개정본 등록 201, Revision 1 보존', s == 201 and len(sql(f"SELECT id FROM assessment_plan_revision WHERE plan_id='{pid}'")) == 2, s)
failed = {'analyzer': payload['analyzer'], 'source': payload['source'], 'status': 'FAILED', 'subjects': [], 'warnings': [],
          'failureReason': '평가 목록 미추출(NO_ASSESSMENTS_EXTRACTED)'}
s, r = call('POST', f'/api/admin/assessment/evaluation-plans/{pid}/revisions/{rid2}/analysis-imports', OP, jbody(failed), 'application/json')
check('H', 'FAILED 결과 수신 201, analysisStatus=FAILED, UNREVIEWED', s == 201 and r['analysisStatus'] == 'FAILED' and r['reviewStatus'] == 'UNREVIEWED', s)
s, r = call('PUT', f'/api/admin/assessment/evaluation-plans/{pid}/revisions/{rid2}/review', OP,
            jbody({**review, 'analysisId': r['analysisId']}), 'application/json')
check('H', 'FAILED 분석으로 확정 시도 거절', s in (400, 409) and counts()['assessment_plan_review'] == 1, {'status': s, 'code': (r or {}).get('code')})
s, r = call('GET', f'/api/student/assessment/school-assessments/{asid}', ST1)
check('H', '개정본 추가 후 학생 참조 불변(Revision 1)', r['evaluationItemRef']['documentRevisionId'] == rid, r['evaluationItemRef'])

final = counts()
summary = {'pass': sum(r['pass'] for r in results), 'fail': sum(not r['pass'] for r in results), 'pdfSha256': pdf_sha, 'planId': pid,
           'revisionId': rid, 'analysisId': aid, 'assessmentId': asid, 'finalCounts': final}
print(json.dumps(summary, ensure_ascii=False, indent=1))
json.dump({'summary': summary, 'results': results}, open(log_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
