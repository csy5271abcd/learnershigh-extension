# 113곳 학교별 5단계. 입력: corpus TSV(최종 코드), 판정 표(accC/judged.md, holdout/judged30.md, 옛 23개는 수정 전 코드라 제외)
# 단계 기준 (자동 검사 통과율 = 통과 과목 / 과목):
#  1 잘 됨      통과율 ≥ 95% 그리고 채점기준 연결 ≥ 50%
#  2 양호       통과율 ≥ 85%
#  3 살짝 부족  통과율 70–85%
#  4 부족       통과율 40–70%
#  5 많이 부족  통과율 < 40%, 또는 과목 0, 또는 읽기 오류
import csv,re,sys,os,collections
P=os.path.dirname(os.path.abspath(__file__))
tsv=sys.argv[1]; out=sys.argv[2]
rows=list(csv.DictReader(open(tsv,encoding='utf-8'),delimiter='\t'))
judged=collections.defaultdict(lambda:[0,0])   # 학교 → [다섯 모두 맞음, 판정 수] (자동 검사 통과 과목만)
def short(n): return re.sub(r'고등학교$|고$','',n)
for path,okcol in [(P+'/accC/judged.md','ok'),(P+'/holdout/judged30.md',None)]:
    for l in open(path,encoding='utf-8'):
        c=[x.strip() for x in l.split('|')]
        if len(c)<10 or not c[1].isdigit(): continue
        if okcol:   # | # | 층 | 학교 | 과목 | A..E |
            if c[2]!='ok': continue
            school,marks=c[3],c[5:10]
        else:       # | # | file | subject | A..E |
            school,marks=re.sub(r'^\d+_|\.\w+$','',c[2]),c[4:9]
        if '?' in marks: continue
        judged[short(school)][1]+=1; judged[short(school)][0]+=all(m=='O' for m in marks)
def tier(r):
    s,ok,it,rb,err=int(r['subjects']),int(r['ok']),int(r['items']),int(r['rubric']),int(r['errors'])
    if s==0 or err: return 5
    p=ok/s
    if p>=0.95 and it and rb/it>=0.5: return 1
    return 2 if p>=0.85 else 3 if p>=0.70 else 4 if p>=0.40 else 5
names={1:'잘 됨',2:'양호',3:'살짝 부족',4:'부족',5:'많이 부족'}
by=collections.defaultdict(list)
for r in rows: by[tier(r)].append(r)
L=['# 학교별 추출 상태 (113곳, 5단계)','',
'기준: 자동 검사 통과율(통과 과목 ÷ 과목). 1단계는 채점기준 연결 50% 이상도 요구. 과목 0개·읽기 오류는 5단계.',
'원문 대조 열은 규칙을 고칠 때 본 표본(대조한 통과 과목 중 다섯 필드 모두 맞음)이며, 합격 판정 수치가 아님.','',
'| 단계 | 학교 수 | 과목 | 통과 |','|---|---|---|---|']
for t in range(1,6):
    g=by[t]; L.append(f"| {t} {names[t]} | {len(g)} | {sum(int(r['subjects']) for r in g)} | {sum(int(r['ok']) for r in g)} |")
for t in range(1,6):
    L+=['',f'## {t}단계 {names[t]} ({len(by[t])}곳)','','| 학교 | 과목 | 통과율 | 채점기준 연결 | 원문 대조 |','|---|---|---|---|---|']
    for r in sorted(by[t],key=lambda r:-(int(r['ok'])/max(1,int(r['subjects'])))):
        s,ok,it,rb=int(r['subjects']),int(r['ok']),int(r['items']),int(r['rubric'])
        j=judged.get(short(r['school'])); js=f'{j[0]}/{j[1]}' if j else '-'
        err=' (읽기 오류)' if int(r['errors']) else ''
        L.append(f"| {r['school']}{err} | {s} | {ok/s*100:.0f}% | {(rb/it*100 if it else 0):.0f}% | {js} |" if s else f"| {r['school']}{err} | 0 | - | - | {js} |")
open(out,'w',encoding='utf-8').write('\n'.join(L)+'\n')
print({names[t]:len(by[t]) for t in range(1,6)})
