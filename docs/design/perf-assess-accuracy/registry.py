# 모든 학교 사용 이력 목록 (school-registry.md). 사용: python registry.py <corpus.tsv> <out.md> [fresh_dir] [fresh_tsv]
import os,re,sys,csv,json,random,collections
OLD=r'C:\Users\green\AppData\Local\Temp\claude\87a4b88acfef0dd6\2cc004d8-3334-4738-b4dd-dfed6881ccd5\scratchpad'
P=os.path.dirname(os.path.abspath(__file__))
# 사용: python registry.py <out.md> <corpus1.tsv> [corpus2.tsv ...]
out=sys.argv[1]; tsvs=sys.argv[2:]
strip=lambda f:re.sub(r'^\d+_','',os.path.splitext(f)[0])
reg=collections.OrderedDict()
def add(n,tag):
    reg.setdefault(n,{'tags':[]})['tags'].append(tag)
corpus=set()
for d in ['blind20','fresh20','fresh20b','new20','new30','new30b','val20','val20b','val20c','val_r8']:
    corpus|={x for x in os.listdir(os.path.join(OLD,d)) if x.endswith('학교')}
for n in sorted(set(os.listdir(OLD+r'\exclude_names'))-corpus): add(n,'개발 제외목록(원문 없음)')
for n in sorted(corpus): add(n,'113곳 코퍼스')
for f in os.listdir(OLD+r'\acc\files'):
    if not f.startswith('_'): add(strip(f),'1차 표본(11-19, 규칙 수정에 사용)')
for f in os.listdir(P+r'\accC\files'):
    if not f.startswith('_') and re.search(r'\.(pdf|hwpx?)$',f): add(strip(f),'C 표본(규칙 수정에 사용)')
h30={strip(p['file']) for p in json.load(open(P+r'\holdout\picks30.json',encoding='utf-8'))}
for f in os.listdir(P+r'\holdout\files'):
    if f.startswith('_') or not re.search(r'\.(pdf|hwpx?)$',f): continue
    n=strip(f); add(n,'검증 30(11-20, 판정 후 규칙 수정에 사용)' if n in h30 else '미사용(검증 대기)')
# 신규 묶음 (폴더, 표시). 판정에 한 번 쓰면 다음 회차부터 규칙 수정용
BATCHES=[('D:/univ/capstone/perf-assess-corpus/fresh-1120','신규 1차(11-20 판정 76.7%, 이후 규칙 수정에 사용)'),
         ('D:/univ/capstone/perf-assess-corpus/fresh-1121','신규 2차(11-20 판정 76.7%, 이후 규칙 수정에 사용)'),
         ('D:/univ/capstone/perf-assess-corpus/fresh-1122','신규 3차(11-21 판정 80.0%, 이후 규칙 수정에 사용)'),
         ('D:/univ/capstone/perf-assess-corpus/fresh-1123','신규 4차(11-21 판정 83.3%, 최종 판정)')]
# 신규 5차(fresh-1124): 판정 묶음 judge-school-1124의 10곳은 판정 후 규칙 수정에 사용, 나머지 4곳은 미사용
F5='D:/univ/capstone/perf-assess-corpus/fresh-1124'
F5_JUDGED={'강일고등학교','경인고등학교','계원예술고등학교','대원고등학교','수일고등학교','신서고등학교','인천하늘고등학교','인천해송고등학교','장수고등학교','청원고등학교'}
if os.path.isdir(F5):
    for n in os.listdir(F5):
        if os.path.isdir(os.path.join(F5,n)):
            add(n,'신규 5차(11-23 판정, 단순 추출기, 이후 규칙 수정에 사용)' if n in F5_JUDGED else '미사용(신규 5차 남은 학교, 검증 대기)')
for d,tag in BATCHES:
    if os.path.isdir(d):
        for n in os.listdir(d):
            if os.path.isdir(os.path.join(d,n)): add(n,tag)
stats={}
for t in tsvs:
    for r in csv.DictReader(open(t,encoding='utf-8'),delimiter='\t'): stats[r['school']]=r
def tier(r):
    s,ok,it,rb,err=int(r['subjects']),int(r['ok']),int(r['items']),int(r['rubric']),int(r['errors'])
    if s==0 or err: return 5
    p=ok/s
    if p>=0.95 and it and rb/it>=0.5: return 1
    return 2 if p>=0.85 else 3 if p>=0.70 else 4 if p>=0.40 else 5
JUDGED=[(P+'/accC/judged.md','C'),(P+'/holdout/judged30.md','H'),
        ('D:/univ/capstone/perf-assess-corpus/judge-fresh-1120/judged.md','F1'),
        ('D:/univ/capstone/perf-assess-corpus/judge-fresh-1121/judged.md','F2'),
        ('D:/univ/capstone/perf-assess-corpus/judge-fresh-1122/judged.md','F3'),
        ('D:/univ/capstone/perf-assess-corpus/judge-fresh-1123/judged.md','F4')]
jd=collections.defaultdict(list)
for path,tag in JUDGED:
    if not os.path.exists(path): continue
    for l in open(path,encoding='utf-8'):
        c=[x.strip() for x in l.split('|')]
        if len(c)<10 or not c[1].isdigit(): continue
        if tag=='C':
            if c[2]!='ok': continue
            school,m=c[3],c[5:10]
        else:
            school,m=re.match(r'\d+_([^\s(._]+)',c[2]).group(1),c[4:9]
        if not school.endswith('학교'):   # 판정 표의 줄임 이름(광명고, 은광여고) → 등록 이름
            school=re.sub(r'여고$','여자고등학교',school) if school.endswith('여고') else re.sub(r'고$','고등학교',school)
        if school not in reg:
            school=next((n for n in reg if n.startswith(school.replace('고등학교',''))), school)
        jd[school].append('O' if all(x=='O' for x in m) else ('?' if '?' in m and 'X' not in m else 'X'))
TN={1:'1 잘 됨',2:'2 양호',3:'3 살짝 부족',4:'4 부족',5:'5 많이 부족'}
L=['# 학교 목록 (사용 이력 · 추출 단계)','',
'- 단계 기준(자동 검사 통과율 = 통과 과목 ÷ 과목): 1 잘 됨 ≥95%(채점기준 연결 ≥50%) · 2 양호 ≥85% · 3 살짝 부족 70–85% · 4 부족 40–70% · 5 많이 부족 <40%·과목 0·읽기 오류.',
'- 단계는 자동 검사 기준이라 정답률이 아니다. 정답률은 원문 대조 판정(judged*.md)으로만 말한다.',
'- 최종 합격 판정은 "신규" 학교로만 한다. 규칙 수정에 쓴 학교는 다시 판정 표본에 넣지 않는다.','',
'| 학교 | 사용 이력 | 과목 | 통과율 | 채점기준 연결 | 단계 | 원문 대조(통과 과목, 다섯 모두 맞음) |','|---|---|---|---|---|---|---|']
def jstr(n):
    j=jd.get(n); return f"{j.count('O')}/{len(j)}" if j else '-'
cnt=collections.Counter(); tc=collections.Counter()
for n,v in sorted(reg.items()):
    r=stats.get(n)
    if r and int(r['subjects']):
        s,ok,it,rb=int(r['subjects']),int(r['ok']),int(r['items']),int(r['rubric']); t=tier(r)
        L.append(f"| {n} | {' / '.join(v['tags'])} | {s} | {ok/s*100:.0f}% | {(rb/it*100 if it else 0):.0f}% | {TN[t]} | {jstr(n)} |"); tc[TN[t]]+=1
    else:
        t=TN[5] if r else '-'; L.append(f"| {n} | {' / '.join(v['tags'])} | {r['subjects'] if r else '-'} | - | - | {t} | {jstr(n)} |"); tc[t]+=1
    cnt[v['tags'][-1]]+=1
L[5:5]=['## 요약','']+[f'- {k}: {c}곳' for k,c in cnt.items()]+['']+[f'- 단계 {k}: {c}곳' for k,c in sorted(tc.items())]+['']
open(out,'w',encoding='utf-8').write('\n'.join(L)+'\n')
print(dict(cnt)); print(dict(tc))
