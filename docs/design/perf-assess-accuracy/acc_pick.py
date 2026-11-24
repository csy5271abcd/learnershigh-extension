import os,glob,random,shutil,re
names={os.path.basename(p)[:-12] for p in glob.glob('all_r16/*.result.json')}
src={}
for d in ['blind20','fresh20','fresh20b','new20','new30','new30b','val20','val20b','val20c','val_r8']:
    for sd in glob.glob(d+'/*/'):
        n=os.path.basename(os.path.normpath(sd))
        if n in names and n not in src: src[n]=sd
print(len(names),len(src))
random.seed(20261119)
pick=random.sample(sorted(src),20)
out='acc/files'; os.makedirs(out,exist_ok=True)
for i,n in enumerate(pick):
    fs=[f for f in glob.glob(os.path.join(src[n],'**','*'),recursive=True) if re.search(r'\.(pdf|hwpx?)$',f,re.I) and not re.search(r'규정|대조',os.path.basename(f))]
    if not fs: print('none',n); continue
    f=sorted(fs)[0]; ext=f.rsplit('.',1)[1].lower()
    shutil.copy(f,f'{out}/{i:02d}_{n}.{ext}')
    print(i,n,os.path.basename(f)[:60])
