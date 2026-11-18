"""수도권 고등학교(지도 API) 중 아직 안 받은 곳에서 일반고·자율고만 골라 N곳. 유형은 NEIS schoolInfo(키 없이) HS_SC_NM.
사용: python list_new.py OUT.json N DL_DIR [DL_DIR ...]"""
import http.cookiejar, json, os, random, sys, time, urllib.parse, urllib.request
out, N, dls = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
random.seed(int(__import__("os").environ.get("SEED", "20261114")))
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
H = {"User-Agent": "Mozilla/5.0", "Referer": "https://www.schoolinfo.go.kr/ei/ss/pneiss_a04_s0.do", "X-Requested-With": "XMLHttpRequest"}
op.open(urllib.request.Request("https://www.schoolinfo.go.kr/Main.do", headers=H)).read()
centers = [(37.5665, 126.978), (37.45, 126.70), (37.74, 127.05), (37.26, 127.03), (37.00, 127.10),
           (37.30, 126.80), (37.65, 126.75), (37.30, 127.45), (37.85, 127.40), (37.95, 126.90)]
allc = {}
for lat, lng in centers:
    body = urllib.parse.urlencode([("LAT", lat), ("LNG", lng), ("DIST", "30000"), ("HSKNDSCCODE", ""), ("FONDSCCODE", ""), ("SCHULCRSESCCODE", "04")]).encode()
    for s in json.loads(op.open(urllib.request.Request("https://www.schoolinfo.go.kr/ei/ss/pneiss_a04_s0/getSchoolMakerList.do", data=body, headers=H)).read().decode("utf-8")):
        allc[s["SHL_IDF_CD"]] = s
    time.sleep(1)
have = set()
for d in dls:
    if os.path.isdir(d): have |= set(os.listdir(d))
SKIP = ("공업", "상업", "정보산업", "디자인", "과학고", "외국어고", "예술고", "체육고", "마이스터", "국제고", "미디어", "관광", "조리", "국악", "전자", "기계", "생활과학", "경영", "인터넷", "애니메이션", "영상", "항공", "자동차", "방송", "보건", "세무", "회계", "산업", "농생명", "IT", "게임", "뷰티", "로봇", "소프트웨어", "금융", "비즈니스", "글로벌", "하이텍", "테크")
metro = [s for s in allc.values() if s.get("LCTN_NM") in ("서울", "경기", "인천") and s["SHL_NM"].endswith("고등학교")
         and "방송통신" not in s["SHL_NM"] and s["SHL_NM"] not in have and not any(k in s["SHL_NM"] for k in SKIP)]
random.shuffle(metro)
pick = []
for s in metro:
    if len(pick) >= N: break
    q = urllib.parse.urlencode({"Type": "json", "pIndex": 1, "pSize": 5, "SCHUL_NM": s["SHL_NM"]})
    try:
        j = json.loads(urllib.request.urlopen("https://open.neis.go.kr/hub/schoolInfo?" + q, timeout=20).read().decode("utf-8"))
        rows = j["schoolInfo"][1]["row"]
    except Exception:
        continue
    addr = s.get("ADRESS", "")
    row = next((r for r in rows if r.get("ORG_RDNMA", "")[:6] == addr[:6]), rows[0] if len(rows) == 1 else None)
    if row and row.get("HS_SC_NM") in ("일반고", "자율고"):
        pick.append({"id": s["SHL_IDF_CD"], "name": s["SHL_NM"], "region": s["LCTN_NM"], "hs_type": row["HS_SC_NM"]})
        print(len(pick), s["SHL_NM"], row["HS_SC_NM"], flush=True)
    time.sleep(0.5)
json.dump(pick, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
