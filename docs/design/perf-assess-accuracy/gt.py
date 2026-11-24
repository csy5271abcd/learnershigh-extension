import json,re,sys,zipfile
import pymupdf
picks=json.load(open('picks.json',encoding='utf-8'))
def norm(s): return re.sub(r'\s+','',s or '')
def cell(c): return (norm(c)[:28]) if c else ''
for k,(f,kind,s) in enumerate(picks):
    parts=s.split(' | ')
    subj=parts[0][2:]; items=[x.strip() for x in parts[3].split(';') if x.strip()]
    names=[re.sub(r'\s+\S*%.*$','',x) for x in items]
    key=norm(names[0])[:6] if names else norm(subj)
    print(f'=== [{k}] {f} :: {s[:600]}')
    if f.endswith('.pdf'):
        doc=pymupdf.open('files/'+f); shown=0
        for pno in range(doc.page_count):
            t=norm(doc[pno].get_text())
            if key and key in t and ('%' in t or '비율' in t):
                for tb in doc[pno].find_tables().tables:
                    rows=tb.extract()
                    flat=norm(' '.join(' '.join(c or '' for c in r) for r in rows))
                    if key in flat:
                        print(f'  p{pno+1}:')
                        for r in rows[:12]: print('   ', ' | '.join(cell(c) for c in r))
                        shown+=1
                        if shown>=2: break
            if shown>=2: break
        if not shown: print('  (no table match)')
    else:
        z=zipfile.ZipFile('files/'+f); xml=''.join(z.read(n).decode('utf-8','ignore') for n in z.namelist() if n.startswith('Contents/section'))
        for tbl in re.findall(r'<hp:tbl.*?</hp:tbl>',xml,re.S):
            txt=norm(re.sub(r'<[^>]+>',' ',tbl))
            if key in txt and '%' in txt:
                for tr in re.findall(r'<hp:tr>.*?</hp:tr>',tbl,re.S)[:12]:
                    cells=[cell(re.sub(r'<[^>]+>',' ',tc)) for tc in re.findall(r'<hp:tc.*?</hp:tc>',tr,re.S)]
                    print('   ',' | '.join(cells))
                break
