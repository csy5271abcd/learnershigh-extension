package com.learnershigh.extension.assessment.service.plan.extract;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** 표·본문·파일명에서 과목명 찾기. */
public final class SubjectRules {

    private SubjectRules() {
    }

    static final Pattern BAD_SUBJ = Pattern.compile("교과별|전과목|전\\s*과목|과목별|학년|평가|계획|공시|2026|교수|학습");
    static final List<Pattern> HEAD_PATTERNS = List.of(
            Pattern.compile("학기\\s*(?:\\d\\s*학년\\s*)?\\[?\\s*([^\\[\\]\\n]{2,30}?)\\s*\\]?\\s*(?:과|교과)?\\s*\\n?\\s*교수\\s*[·ㆍ‧･・\\s]*학습"),
            // '(통합사회)과 교수·학습', '(경제) 교수학습' — '(성교육)평가', '(교과연계 독서활동)총괄평가' 같은 수업 칸 꼬리표는 아니다
            Pattern.compile("\\(\\s*([^()\\n]{2,25}?)\\s*\\)\\s*(?:(?:과|교과)\\s*(?:교수|평가|수업)|교수|평가\\s*(?:세부|운영)?\\s*계획)"),
            Pattern.compile("학기\\s*(?:\\d\\s*학년\\s*)?\\[\\s*([^\\[\\]\\n]{2,25}?)\\s*\\]"),
            Pattern.compile("학기\\s*(?:\\d\\s*학년\\s*)?([가-힣A-Za-zⅠⅡⅢ0-9·ㆍ ]{2,20}?)\\s*(?:교과\\s*)?평가\\s*(?:운영\\s*)?계획"),
            // 쪽 머리에 과목명만 한 줄 두고 '1. 평가의 목적'으로 시작하는 서식
            Pattern.compile("(?:^|-\\s*\\d+\\s*-|\\n)\\s*([가-힣A-Za-zⅠⅡⅢ·ㆍ ]{2,20}?[ⅠⅡⅢ12]?)\\s*\\n?\\s*1\\s*\\.\\s*평가의\\s*목적"),
            // 표지 '세부 과목명 : 공통수학2  평가 대상 : …'
            Pattern.compile("세부\\s*과\\s*목\\s*명?\\s*[:：]\\s*([^:：\\n]{2,25}?)\\s*(?:\\n|평가\\s*대상|담당|지도|$)"));
    static final List<String> SUBJECTS = List.of(
            "공통국어", "화법과 언어", "화법과 작문", "독서와 작문", "언어와 매체", "주제 탐구 독서", "문학과 영상", "매체 의사소통", "문학", "독서", "작문", "화법", "국어",
            "공통수학", "기본수학", "대수", "미적분", "확률과 통계", "기하", "경제 수학", "인공지능 수학", "수학과제 탐구", "실용 수학", "수학",
            "공통영어", "기본영어", "영어 독해와 작문", "영어 회화", "영미 문학 읽기", "심화 영어", "실용 영어", "직무 영어", "영어",
            "한국사", "통합사회", "세계시민과 지리", "한국지리 탐구", "한국지리", "세계지리", "세계사", "동아시아 역사 기행", "동아시아사", "사회와 문화", "사회·문화", "사회문화",
            "현대사회와 윤리", "생활과 윤리", "윤리와 사상", "고전과 윤리", "윤리", "정치와 법", "정치", "법과 사회", "경제", "여행지리", "사회문제 탐구",
            "통합과학", "과학탐구실험", "물리학", "화학", "생명과학", "지구과학", "역학과 에너지", "전자기와 양자", "물질과 에너지", "화학 반응의 세계", "세포와 물질대사", "생물의 유전",
            "지구시스템과학", "행성우주과학", "융합과학 탐구", "과학의 역사와 문화", "과학사", "기후변화와 환경생태", "과학",
            "정보", "인공지능 기초", "데이터 과학", "기술·가정", "기술가정", "기술ㆍ가정", "공학 일반", "창의 공학 설계",
            "운동과 건강", "스포츠 생활", "스포츠 과학", "스포츠 문화", "체육", "음악 감상과 비평", "음악 연주와 창작", "음악", "미술 창작", "미술 감상과 비평", "미술",
            "도덕", "역사", "사회", "한문", "일본어", "중국어", "독일어", "프랑스어", "스페인어", "베트남어",
            "진로와 직업", "보건", "환경", "철학", "논리와 사고", "심리학", "교육학", "삶과 종교", "인간과 경제활동", "생태와 환경", "논술", "진로");
    static final Pattern SUBJ_RE;

    static {
        List<String> alts = new ArrayList<>();
        SUBJECTS.stream().sorted(Comparator.comparingInt(String::length).reversed())
                .forEach(s -> alts.add(Pattern.quote(s).replace(" ", "\\E\\s*\\Q")));
        SUBJ_RE = Pattern.compile("(" + String.join("|", alts) + ")\\s*([ⅠⅡⅢ123]|I{1,3})?");
    }

    static String norm(String s) {
        return s == null ? "" : s.replaceAll("\\s+", "");
    }

    static String clean(String s, int n) {
        return RatioRules.clean(s, n);
    }

    public static String tidy(String s) {
        if (s == null) {
            return null;
        }
        s = s.replaceAll("[\\u00A0\\u2007\\u202F\\u3000]", " ").strip();   // 줄바꿈 없는 공백·전각 공백
        s = s.replaceAll("^[_\\-–~·:]+\\s*|\\s*[_\\-–~:]+$", "");   // 파일명 '(1학년_통합사회2)'의 구분 기호
        s = s.replaceAll("^[<〈《「『]\\s*(.+?)\\s*[>〉》」』]$", "$1");
        StringBuilder half = new StringBuilder();   // 전각 숫자 ('공통국어２')
        s.chars().forEach(ch -> half.append(ch >= '０' && ch <= '９' ? (char) (ch - '０' + '0') : (char) ch));
        s = half.toString().replaceAll("^\\d{1,2}\\s+(?=[가-힣])", "");   // 단원 번호 ('1 도시의 미래 탐구')
        if (s.contains("_")) {
            String last = s.substring(s.lastIndexOf('_') + 1).strip();   // '국어과_공통국어2', '제2외국어과_일본문화'
            String head = s.substring(0, s.lastIndexOf('_')).strip();
            if (last.length() >= 2 && (SUBJ_RE.matcher(norm(last)).matches() || head.endsWith("과"))) {
                s = last;
            }
        }
        Matcher inner = Pattern.compile("^\\S+과\\s*\\(\\s*(.+?)\\s*\\)$").matcher(s);   // '일본어과(일본어 회화)'
        if (inner.matches()) {
            s = inner.group(1);
        }
        s = s.replaceAll("(?<=[가-힣])\\s+(?=([0-9]|Ⅰ|Ⅱ|Ⅲ)$)", "");   // '공통수학 2', '영어 Ⅱ'
        Matcher m = Pattern.compile("\\(\\s*(.+?)\\s*\\)\\s*(?:과목|교과)?").matcher(s);
        if (m.matches()) {
            s = m.group(1);
        }
        s = s.replaceAll("\\s*교과\\s*지도$", "").strip();   // '공통국어2 과목 교과지도'
        s = s.replaceAll("\\s*(과목|교과)$", "").strip();
        Matcher pub = Pattern.compile("^(.+?)\\s*[(（]\\s*[^()（）]{2,12}\\s*[)）]$").matcher(s);   // '지구시스템과학 (비상교육)'
        if (pub.matches() && SUBJ_RE.matcher(norm(pub.group(1))).matches()) {
            s = pub.group(1).strip();
        }
        s = s.replaceAll("^\\[\\s*(.+?)\\s*]$", "$1");
        if (s.chars().filter(c -> c == ')').count() > s.chars().filter(c -> c == '(').count()) {
            s = s.replaceAll("\\s*\\)$", "");
        }
        if (s.matches("(\\S )+\\S")) {
            s = s.replace(" ", "");
        }
        s = s.replaceAll("(?<=[가-힣])\\s*III$", "Ⅲ").replaceAll("(?<=[가-힣])\\s*II$", "Ⅱ").replaceAll("(?<=[가-힣])\\s*I$", "Ⅰ");
        Matcher unit = Pattern.compile("^(.+?)\\s*([3-9])$").matcher(s);
        if (unit.matches() && SUBJ_RE.matcher(unit.group(1)).matches()) {
            s = unit.group(1);
        }
        if (s.endsWith("과") && s.length() > 2 && SUBJ_RE.matcher(s.substring(0, s.length() - 1)).matches()) {
            s = s.substring(0, s.length() - 1);
        }
        {   // 띄어쓰기를 사전 표기로: '과학 탐구 실험2' → '과학탐구실험2', '확률과통계' → '확률과 통계'
            Matcher cm = SUBJ_RE.matcher(norm(s));
            if (cm.matches()) {
                String base = norm(cm.group(1));
                for (String k : SUBJECTS) {
                    if (norm(k).equals(base)) {
                        s = k + (cm.group(2) == null ? "" : cm.group(2));
                        break;
                    }
                }
            }
        }
        return s.isEmpty() ? null : s;
    }

    public static boolean bad(String s, String school) {
        if (s == null) {
            return true;
        }
        String n = norm(s);
        if (n.length() < 2 || !n.matches(".*[가-힣A-Za-z].*")) {
            return true;
        }
        if (Pattern.compile("학교|부설|방송고|전교|주차|차시|^과정$|담당|교사|학급|학번|시수|단위수|학점|채점|별$|^\\d+차|평가|항목").matcher(n).find()) {
            return true;
        }
        if (Pattern.compile("범교과|창의적체험|자율활동|동아리|봉사활동|진로활동|학교자율|교육과정|운영계획|안전교육").matcher(n).find()) {
            return true;   // 교과가 아닌 교육활동 이름
        }
        // 평가 방법 낱말 ('논술'은 실제 과목명이라 넣지 않는다)
        if (n.matches("관찰|대상|자기|동료|교사|면접|구술|발표|토론|토의|실험|실습|실기|보고서|포트폴리오|프로젝트|산출물|서술|서술형|논술형|기타|비고")) {
            return true;
        }
        if (n.matches("\\(?\\d+(시간|시수|주|분|회|명|쪽|점|순위|h|반|%)\\)?.*")) {
            return true;   // 수업 시간·횟수·배점 ('2시간', '5점', '1순위')
        }
        if (n.matches("\\[?\\d{1,2}[가-힣ⅠⅡⅢⅣ]{1,8}\\d?\\d{2}-\\d{2}.*")) {
            return true;   // 성취기준 코드 ('12지시03-06')
        }
        if (n.matches("연번|번호|기간|시기|수정|최종|공시|질의응답|월/?주|교과서|예(능|술)과?|이수단위|단위|직업반|선택반|수강반|소인수선택|공통|분할점수|초에")
                || n.contains("수업") || n.contains("◯") || n.contains("(인)") || n.contains("&") || n.contains(",") || n.contains("/")
                || n.contains("활동지") || n.contains("패들렛") || n.endsWith("하기") || n.contains("까지") || n.contains("작성")) {
            return true;   // 표 머리·파일명 꼬리·담당 교사 칸·활동 이름
        }
        if (n.matches("제2외국어|교양|전문교과|공통과목|선택과목|일반선택|진로선택|융합선택|기초교과|탐구교과|체육예술|생활교양|전문일반")) {
            return true;
        }
        if (Pattern.compile("수행|정기|지필|중간|기말|기능|영역|요소|방법|내용|기준|단원|성취|반영|비율|채점|결과|과제$|^가능$|^불가").matcher(n).find()) {
            return true;
        }
        return school != null && !school.isEmpty() && (school.startsWith(n) || n.startsWith(school.replaceAll("등학교$|학교$", "")));
    }

    static final Set<String> SUBJ_LABELS = Set.of("과목", "과목명", "교과목", "교과목명", "교과(목)", "교과(목)명", "과목명항목", "세부과목", "세부과목명");

    /** 머리 표 '과목 | 공통국어2' 또는 '과목 (아래) 공통국어2'. */
    private static final Pattern GRADE_VALUE = Pattern.compile("^([1-3])(?:\\s*[,·ㆍ~∼-]\\s*([1-3]))*\\s*(?:학년)?$");

    /**
     * 과목 머리 표의 '학년' 칸 값(예: 학년 | 1학년, 학년 | 1·2). 원문에 적힌 학년만 — 없으면 빈 목록.
     * 여러 학년 공통 문서에서 다른 학년 과목을 학생에게 확정하지 않게 쓰인다(계약 subjects[].grades).
     */
    public static List<Integer> gradesFromHeaderTable(List<List<String>> g) {
        for (int ri = 0; ri < Math.min(2, g.size()); ri++) {
            List<String> r = g.get(ri);
            for (int ci = 0; ci < r.size(); ci++) {
                if (!norm(r.get(ci)).equals("학년")) {
                    continue;
                }
                String right = ci + 1 < r.size() ? r.get(ci + 1) : "";
                String below = ri + 1 < g.size() && ci < g.get(ri + 1).size() ? g.get(ri + 1).get(ci) : "";
                for (String v : List.of(below, right)) {
                    String n = norm(v);
                    if (GRADE_VALUE.matcher(n).matches()) {
                        java.util.TreeSet<Integer> out = new java.util.TreeSet<>();
                        java.util.regex.Matcher range = Pattern.compile("([1-3])[~∼-]([1-3])").matcher(n);
                        while (range.find()) {
                            for (int k = Integer.parseInt(range.group(1)); k <= Integer.parseInt(range.group(2)); k++) {
                                out.add(k);
                            }
                        }
                        n.chars().filter(ch -> ch >= '1' && ch <= '3').forEach(ch -> out.add(ch - '0'));
                        return List.copyOf(out);
                    }
                }
            }
        }
        return List.of();
    }

    public static String fromHeaderTable(List<List<String>> g) {
        for (int ri = 0; ri < Math.min(2, g.size()); ri++) {
            List<String> r = g.get(ri);
            for (int ci = 0; ci < r.size(); ci++) {
                if (!SUBJ_LABELS.contains(r.get(ci).replaceAll("\\s", ""))) {
                    continue;
                }
                int rc = ci + 1;
                while (rc < r.size() && norm(r.get(rc)).equals(norm(r.get(ci)))) {
                    rc++;
                }
                String right = rc < r.size() ? r.get(rc) : "";
                String below = ri + 1 < g.size() && ci < g.get(ri + 1).size() ? g.get(ri + 1).get(ci) : "";
                for (String v : List.of(right, below)) {
                    if (!norm(v).isEmpty() && !norm(v).equals(norm(r.get(ci))) && RatioRules.labelOf(v) == null
                            && !Pattern.compile("평가|구분|학기|학년|학급|학점|시수|시간|단위|교사|담당").matcher(v).find()) {
                        return clean(v, 30);
                    }
                }
            }
        }
        return null;
    }

    /** 제목 줄 ('2026학년도 2학기 [과목] 교수학습 및 평가 계획') — 문서에서 가장 뒤(가장 가까운) 것. */
    public static String fromText(String t) {
        if (t == null) {
            return null;
        }
        int bestAt = -1;
        String best = null;
        for (Pattern p : HEAD_PATTERNS) {
            Matcher m = p.matcher(t);
            while (m.find()) {
                String v = m.group(1).strip();
                if (!v.isEmpty() && !BAD_SUBJ.matcher(v).find() && v.length() <= 25 && m.start() >= bestAt) {
                    bestAt = m.start();
                    best = v;
                }
            }
        }
        return best == null ? null : clean(best, 30);
    }

    /** 본문 끝 300자에서 과목 사전의 마지막 이름. */
    public static String fromVocab(String t) {
        if (t == null) {
            return null;
        }
        String tail = t.length() > 300 ? t.substring(t.length() - 300) : t;
        Matcher m = SUBJ_RE.matcher(tail);
        String last = null;
        while (m.find()) {
            // 낱말 안의 과목 이름은 아니다: '서·논술형'의 논술, '정보의 검색'의 정보, '순환경제'의 경제
            boolean before = m.start() > 0 && String.valueOf(tail.charAt(m.start() - 1)).matches("[가-힣·ㆍ‧･・]");
            boolean after = m.end() < tail.length() && String.valueOf(tail.charAt(m.end())).matches("[가-힣]");
            // 교과 묶음 이름(국어·사회·과학)과 '논술 비율'의 논술은 본문에 흔해 과목명 근거가 못 된다
            if (!before && !after && !group(m.group(0)) && !norm(m.group(0)).startsWith("논술")) {
                last = m.group(0);
            }
        }
        return last == null ? null : clean(last, 30);
    }

    public static String fromFileName(String file) {
        if (file == null) {
            return null;
        }
        String base = file.replaceAll(".*[\\\\/]", "").replaceAll("\\.(hwpx?|pdf)$", "");
        Pattern category = Pattern.compile("전문일반|전공실무|전문공통|기초|교양|^공통$|선택|\\d+반|학과$|과$");
        Matcher m = Pattern.compile("\\(\\s*([^()]{2,25}?)\\s*\\)\\s*과목").matcher(base);
        if (m.find() && !BAD_SUBJ.matcher(m.group(1)).find()) {
            return clean(m.group(1), 30);
        }
        m = Pattern.compile("\\[([^]]{2,25})]").matcher(base);
        while (m.find()) {
            if (!BAD_SUBJ.matcher(m.group(1)).find() && !category.matcher(m.group(1)).find()) {
                return clean(m.group(1), 30);
            }
        }
        m = Pattern.compile("-([^-]{2,20})$").matcher(base);
        if (m.find() && !BAD_SUBJ.matcher(m.group(1)).find()) {
            return clean(m.group(1), 30);
        }
        m = Pattern.compile("학기\\s*(?:\\d학년\\s*)?(\\S[^_]{1,20}?)\\s*(?:과\\s*)?(?:교수|평가\\s*(?:운영\\s*)?계획)").matcher(base);
        if (m.find() && !BAD_SUBJ.matcher(m.group(1)).find()) {
            return clean(m.group(1), 30);
        }
        m = Pattern.compile("\\(\\s*(?:\\d\\s*학년\\s*)?[_\\s]*(?:\\d\\s*학기\\s*)?[_\\s]*([^()]{2,20}?)\\s*\\)").matcher(base);
        while (m.find()) {
            String v = m.group(1);
            if (!BAD_SUBJ.matcher(v).find() && !Pattern.compile("^\\d|\\d{2,}|수정|최종|공시|게시|안$|합철|교과$").matcher(v).find()) {
                return clean(v, 30);
            }
        }
        // 파일 이름 자체가 과목명 ('1 공통국어2.hwp', '3학년2학기공연실습' 제외 — 사전에 있는 과목만)
        String bare = base.replaceAll("^[\\d_.\\s-]+", "").strip();
        if (SUBJ_RE.matcher(norm(bare)).matches()) {
            return clean(bare, 30);
        }
        return null;
    }

    /** 교과 묶음 이름 ('국어과 교수·학습 계획'의 국어) — 제목 줄에서 나오면 과목명이 아니다. */
    static final Pattern GROUP = Pattern.compile("(국어|국어한문|수학|영어|사회|역사|도덕|사회역사|일반사회|과학|과학정보|과학기술|예체능|예술|체육|체육예술|예술체육|음악미술|기술가정정보|기술가정|생활교양|교양|외국어|제2외국어|직업)과?");

    static boolean group(String s) {
        return s != null && GROUP.matcher(norm(s).replaceAll("[·ㆍ/]", "")).matches();
    }

    /** 표 첫 행·머리 표·본문 제목에서 이 표의 과목. 없으면 null. */
    public static String forTable(SourceTable t, String school) {
        String h = tidy(fromHeaderTable(t.cells()));
        if (h != null && !bad(h, school)) {
            return h;   // 머리 표 '과목' 칸은 교과 묶음 이름이어도 믿는다
        }
        if (!t.cells().isEmpty()) {
            h = tidy(fromText(String.join(" ", new java.util.LinkedHashSet<>(t.cells().get(0)))));
            if (h != null && !bad(h, school) && !group(h)) {
                return h;
            }
        }
        String tx = tidy(fromText(t.ctx()));
        return tx != null && !bad(tx, school) && !group(tx) ? tx : null;
    }
}
