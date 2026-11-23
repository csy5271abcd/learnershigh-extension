import re,random,json
random.seed(11)
cur=None; subs={}
for line in open('files/_java_extract.txt',encoding='utf-8'):
    if line.startswith('FILE '): cur=line.split()[1]; subs[cur]=[]
    elif line.startswith('S ') and cur: subs[cur].append(line.rstrip('\n'))
picks=[]
for f,ss in subs.items():
    if f.endswith('.hwp'): continue
    ok=[s for s in ss if '| [] |' in s and '%;' in s]
    flag=[s for s in ss if '| [] |' not in s]
    for s in random.sample(ok,min(2,len(ok))): picks.append((f,'ok',s))
    print(f,'ok',len(ok),'flag',len(flag))
json.dump(picks,open('picks.json','w',encoding='utf-8'),ensure_ascii=False)
print(len(picks))
