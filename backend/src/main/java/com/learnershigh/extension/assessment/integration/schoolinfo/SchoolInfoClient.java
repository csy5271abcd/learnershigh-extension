package com.learnershigh.extension.assessment.integration.schoolinfo;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.CookieManager;
import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipException;
import java.util.zip.ZipInputStream;

/**
 * 학교알리미(schoolinfo.go.kr) 공시 '교과별 교수·학습 및 평가 계획' 첨부 파일 받기 (외부 경계).
 * 흐름: 학교 검색(EUC-KR POST) → 학교 상세(공시 항목 목록) → 평가계획 항목(<b>학년도 지정</b>) → 첨부 파일 목록 → 내려받기(zip 이면 풀기).
 * <p>
 * A27-UX 부록 E (api-contract §38-12):
 * <ul>
 *   <li>학년도 지정 조회 {@link #fetchYear}: 요청 학년도를 {@code JG_YEAR}·{@code JG_YEAR2}·{@code CHOSEN_JG_YEAR}로 보내고, 학교알리미가
 *       되돌려 준 공시연도({@code resolvedYear}, 내려받기 Form 의 {@code JG_YEAR})를 따로 알려 준다. 두 값이 같은지는 서비스가 판단한다.
 *       <b>이 파라미터 의미는 실제 학교알리미에서 실측하지 않았다</b> — 서비스는 설정({@code year-query-verified})이 켜지기 전까지 등록하지 않는다.</li>
 *   <li>주소: {@code https://www.schoolinfo.go.kr} 만(시험은 루프백 주소를 설정으로만). Redirect 는 같은 호스트로 3번까지.</li>
 *   <li>한 파일 30MB, ZIP 은 항목 50개·풀린 합계 100MB, ZIP 안 ZIP·경로 이동(../) 거부.</li>
 *   <li>일시 오류(연결·429·5xx)는 최대 3번 다시 시도(지수 대기). 같은 학교를 받는 동안 같은 세션(쿠키)을 쓴다.</li>
 * </ul>
 */
public class SchoolInfoClient {

    public static final String OFFICIAL_BASE = "https://www.schoolinfo.go.kr";
    /** 등록 문서 sourceUrl 의 기본 주소(부록 D 이전 호환). */
    public static final String BASE_URL = OFFICIAL_BASE;
    static final String UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
    static final Charset EUC_KR = Charset.forName("EUC-KR");
    private static final int RETRIES = 3;
    private static final int MAX_REDIRECTS = 3;
    public static final int MAX_FILE_BYTES = 30 * 1024 * 1024;
    /** 부록 H 실측: 상산고 2024 1학기 '전과목' ZIP 이 항목 63개(풀린 합계 7.4MB)였다 → 50 에서 100 으로. 합계 100MB 한도는 그대로. */
    static final int MAX_ZIP_ENTRIES = 100;
    static final long MAX_ZIP_TOTAL = 100L * 1024 * 1024;
    private static final Set<String> LOOPBACK = Set.of("127.0.0.1", "localhost");

    /** 받은 파일 하나. attachmentSeq = 학교알리미 첨부 순번(ZIP 안 파일은 "순번/이름"). */
    /** disclosureMonth = 이 파일이 실린 학교알리미 공시 차수의 공시월(4·9 등, 모르면 null). */
    public record PlanFile(String fileName, byte[] bytes, String attachmentSeq, Integer disclosureMonth) {
        public PlanFile(String fileName, byte[] bytes) {
            this(fileName, bytes, null, null);
        }

        public PlanFile(String fileName, byte[] bytes, String attachmentSeq) {
            this(fileName, bytes, attachmentSeq, null);
        }
    }

    /** 받지 못한 첨부(크기 초과·ZIP 문제 등). 원본 바이트가 없어 등록하지 않는다. */
    public record Problem(String fileName, String reason) {
    }

    /**
     * 학교 검색 결과: 학교알리미 학교 ID 목록(중복 제거, 화면 순서). error = DOWNLOAD_FAILED ·
     * SEARCH_TRUNCATED(부록 H: 고등학교 목록 건수만큼 학교 ID 를 다 읽지 못함 — 학교를 고르지 않는다).
     */
    public record Search(List<String> schoolinfoIds, String error) {
    }

    /**
     * 학년도 하나의 조회 결과.
     * @param schoolName    학교알리미 상세의 학교 이름(HG_NM)
     * @param defaultYear   학교 상세가 기본으로 고른 공시연도
     * @param resolvedYear  학년도 지정 조회 뒤 학교알리미가 되돌려 준 공시연도(없으면 null)
     * @param error         PLAN_NOT_PUBLISHED · YEAR_UNAVAILABLE · DOWNLOAD_FAILED · null
     */
    public record YearFetch(String schoolinfoId, String schoolName, Integer defaultYear, Integer resolvedYear,
            List<PlanFile> files, List<Problem> problems, String error) {
    }

    private final String base;
    private final String host;
    private final long politeDelayMillis;
    private final long retryBaseMillis;
    private final HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager())
            .followRedirects(HttpClient.Redirect.NEVER).connectTimeout(Duration.ofSeconds(10)).build();

    public SchoolInfoClient() {
        this(OFFICIAL_BASE, false, 500, 1000);
    }

    /**
     * @param allowLoopback 시험 전용: 127.0.0.1·localhost 의 가상 학교알리미를 허용
     */
    public SchoolInfoClient(String baseUrl, boolean allowLoopback, long politeDelayMillis, long retryBaseMillis) {
        String b = baseUrl == null ? OFFICIAL_BASE : baseUrl.strip().replaceAll("/+$", "");
        URI u = URI.create(b);
        boolean official = OFFICIAL_BASE.equals(b);
        boolean loopback = allowLoopback && u.getHost() != null && LOOPBACK.contains(u.getHost());
        if (!official && !loopback) {
            throw new IllegalStateException("학교알리미 주소는 " + OFFICIAL_BASE + " 만 허용합니다(시험은 루프백만)");
        }
        this.base = b;
        this.host = u.getHost();
        this.politeDelayMillis = Math.max(0, politeDelayMillis);
        this.retryBaseMillis = Math.max(0, retryBaseMillis);
    }

    public String base() {
        return base;
    }

    /** 학교 이름으로 검색. 학교를 고르지 않는다 — 몇 곳이 나왔는지 그대로 돌려준다. */
    public Search search(String schoolName) {
        try {
            get("/Main.do", null, null, StandardCharsets.UTF_8);
            Map<String, String> q = new LinkedHashMap<>();
            q.put("SEARCH_KEYWORD", schoolName);
            q.put("SEARCH_SCHUL_NM", schoolName);
            q.put("SEARCH_TYPE", "1");
            q.put("pageNumber", "1");
            q.put("SEARCH_MODE", "");
            String html = text(post("/ei/ss/Pneiss_f01_l0.do", q, EUC_KR).body());
            // 부록 H 실측: 첫 화면은 학교급마다 2곳만 보이고 '고등학교(N) 더보기+'(goDetailSearch('3'))로 나머지를 숨긴다
            // ('한빛고등학교' → 고등학교 4곳 중 대전한빛·위례한빛 2곳만 보여 파주·담양 한빛고등학교가 빠졌다).
            // 고등학교 건수 표시가 있으면 고등학교 목록(SEARCH_TYPE=2, SEARCH_MODE=3)을 한 번 더 받아 그 목록을 쓴다.
            Integer highTotal = highSchoolTotal(html);
            if (highTotal == null) {
                return new Search(List.copyOf(searchIds(html)), null);
            }
            if (highTotal == 0) {
                return new Search(List.of(), null);
            }
            q.put("SEARCH_TYPE", "2");
            q.put("SEARCH_MODE", "3");
            q.put("SEARCH_SIDO", "");
            q.put("SEARCH_SIGUNGU", "");
            q.put("SEARCH_FOND_SC_CODE", "");
            LinkedHashSet<String> ids = searchIds(text(post("/ei/ss/Pneiss_f01_l0.do", q, EUC_KR).body()));
            if (ids.size() < highTotal) {
                return new Search(List.copyOf(ids), "SEARCH_TRUNCATED");
            }
            return new Search(List.copyOf(ids), null);
        } catch (IOException e) {
            return new Search(List.of(), "DOWNLOAD_FAILED");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new Search(List.of(), "DOWNLOAD_FAILED");
        }
    }

    private static final Pattern HIGH_TOTAL = Pattern.compile("고등학교\\((\\d+)\\)");

    /** 검색 화면 탭의 '고등학교(N)'. 없으면 null(예전 모양 — 첫 화면 목록을 그대로 쓴다). */
    static Integer highSchoolTotal(String html) {
        Matcher m = HIGH_TOTAL.matcher(html);
        return m.find() ? Integer.valueOf(m.group(1)) : null;
    }

    static LinkedHashSet<String> searchIds(String html) {
        LinkedHashSet<String> ids = new LinkedHashSet<>();
        for (Pattern p : List.of(Pattern.compile("SHL_IDF_CD\"\\)\\.val\\('([0-9a-f-]{36})'\\)"),
                Pattern.compile("searchSchul\\('([0-9a-f-]{36})'\\)"))) {
            Matcher m = p.matcher(html);
            while (m.find()) {
                ids.add(m.group(1));
            }
        }
        return ids;
    }

    /**
     * 부록 F: 학교 상세 화면의 학교 이름·주소. 시도·시군구는 그 주소의 첫 두 낱말에서만 나눈다(지역 목록을 따로 두지 않는다).
     * <b>실제 학교알리미의 주소 표기 모양은 실측하지 않았다</b> — 읽지 못하면 address=null(이 후보는 고를 수 없다).
     */
    public record SchoolDetail(String schoolinfoId, String schoolName, String address, String sido, String sigungu, String error) {
    }

    public SchoolDetail describe(String shl) {
        try {
            String html = text(post("/ei/ss/Pneiss_b01_s0.do", Map.of("SHL_IDF_CD", shl), StandardCharsets.UTF_8).body());
            Matcher nm = Pattern.compile("HG_NM\\s*:\\s*\"([^\"]+)\"").matcher(html);
            String name = nm.find() ? nm.group(1) : null;
            String address = address(html);
            String[] region = region(address);
            return new SchoolDetail(shl, name, address, region[0], region[1], null);
        } catch (IOException e) {
            return new SchoolDetail(shl, null, null, null, null, "DOWNLOAD_FAILED");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new SchoolDetail(shl, null, null, null, null, "DOWNLOAD_FAILED");
        }
    }

    private static final Pattern ADDRESS = Pattern.compile("<th[^>]*>\\s*주\\s*소\\s*</th>\\s*<td[^>]*>\\s*([^<]{4,200}?)\\s*</td>");
    private static final Pattern SIDO = Pattern.compile(".+(특별시|광역시|특별자치시|특별자치도|도)");
    private static final Pattern SIGUNGU = Pattern.compile(".+(시|군|구)");

    /** 부록 G 실측: 실제 학교 상세는 '<span class="mt">주소 :</span>값</span>' 모양이다(th/td 는 예전 가정, 남겨 둠). */
    private static final Pattern ADDRESS_SPAN = Pattern.compile("<span class=\"mt\">\\s*주\\s*소\\s*:\\s*</span>\\s*([^<]{4,200}?)\\s*</span>");

    static String address(String html) {
        Matcher span = ADDRESS_SPAN.matcher(html);
        if (span.find()) {
            return span.group(1).replaceAll("\\s+", " ").strip();
        }
        Matcher m = ADDRESS.matcher(html);
        return m.find() ? m.group(1).replaceAll("\\s+", " ").strip() : null;
    }

    /** 주소 첫 낱말이 시·도 모양이면 시도, 둘째 낱말이 시·군·구 모양이면 시군구. 아니면 null. */
    static String[] region(String address) {
        if (address == null) {
            return new String[] {null, null};
        }
        String[] t = address.split(" ");
        String sido = t.length > 0 && SIDO.matcher(t[0]).matches() ? t[0] : null;
        String sigungu = sido != null && t.length > 1 && SIGUNGU.matcher(t[1]).matches() ? t[1] : null;
        return new String[] {sido, sigungu};
    }

    /** 학교알리미 학교 하나의 <b>지정 학년도</b> 평가계획 첨부를 받는다. 오류는 예외 대신 error 로 돌려준다. */
    public YearFetch fetchYear(String shl, int academicYear) {
        return fetchYear(shl, academicYear, null);
    }

    /**
     * expectedSchoolName 이 있으면 학교 상세의 이름(공백 무시)이 다를 때 평가계획 항목·첨부를 받지 않고 SCHOOL_NAME_MISMATCH 로 멈춘다
     * (다른 학교 파일을 받지 않는다).
     */
    public YearFetch fetchYear(String shl, int academicYear, String expectedSchoolName) {
        String name = null;
        Integer defaultYear = null;
        try {
            String html = text(post("/ei/ss/Pneiss_b01_s0.do", Map.of("SHL_IDF_CD", shl), StandardCharsets.UTF_8).body());
            Matcher nm = Pattern.compile("HG_NM\\s*:\\s*\"([^\"]+)\"").matcher(html);
            Matcher yr = Pattern.compile("JG_YEAR\\s*:\\s*\"(\\d{4})\"").matcher(html);
            name = nm.find() ? nm.group(1) : null;
            defaultYear = yr.find() ? Integer.valueOf(yr.group(1)) : null;
            if (expectedSchoolName != null && (name == null
                    || !name.replaceAll("\\s+", "").equals(expectedSchoolName.replaceAll("\\s+", "")))) {
                return new YearFetch(shl, name, defaultYear, null, List.of(), List.of(), "SCHOOL_NAME_MISMATCH");
            }
            TreeSet<Integer> offered = new TreeSet<>();
            Matcher opt = Pattern.compile("<option[^>]*value=\"(20\\d{2})\"").matcher(html);
            while (opt.find()) {
                offered.add(Integer.valueOf(opt.group(1)));
            }
            if (!offered.isEmpty() && !offered.contains(academicYear)) {
                return new YearFetch(shl, name, defaultYear, null, List.of(), List.of(), "YEAR_UNAVAILABLE");
            }
            Matcher call = Pattern.compile("loadGongSi\\('([^']+)',\\s*'([^']*)',\\s*'([^']*)',\\s*'([^']*)',\\s*'([^']*)',\\s*'([^']*)',\\s*'([^']*)',\\s*'([^']*)'\\)").matcher(html);
            String[] plan = null;
            while (call.find()) {
                if (call.group(4).contains("평가계획")) {
                    plan = new String[] {call.group(1), call.group(2), call.group(3), call.group(4), call.group(5), call.group(6), call.group(7), call.group(8)};
                    break;
                }
            }
            if (plan == null || !plan[0].startsWith("/")) {
                return new YearFetch(shl, name, defaultYear, null, List.of(), List.of(), "PLAN_NOT_PUBLISHED");
            }
            String y = String.valueOf(academicYear);
            Map<String, String> p = new LinkedHashMap<>();
            p.put("GS_HANGMOK_CD", plan[1]);
            p.put("GS_HANGMOK_NO", plan[2]);
            p.put("GS_HANGMOK_NM", plan[3]);
            p.put("GS_BURYU_CD", plan[4]);
            p.put("JG_BURYU_CD", plan[5]);
            p.put("JG_HANGMOK_CD", plan[6]);
            p.put("JG_GUBUN", plan[7]);
            p.put("JG_YEAR2", y);
            p.put("HG_NM", name == null ? "" : name);
            p.put("SHL_IDF_CD", shl);
            p.put("GS_TYPE", "Y");
            p.put("JG_YEAR", y);
            p.put("SORT", "BR");
            p.put("CHOSEN_JG_YEAR", y);
            p.put("PRE_JG_YEAR", defaultYear == null ? y : String.valueOf(defaultYear));
            p.put("LOAD_TYPE", "single");
            // 부록 G 실측: 항목 화면은 공시 차수(1차=4월, 3차=9월)마다 따로다. 기본 화면은 최신 차수만 준다.
            Page first = itemPage(plan, p, null);
            if (first == null) {
                return new YearFetch(shl, name, defaultYear, null, List.of(), List.of(), "DOWNLOAD_FAILED");
            }
            List<PlanFile> out = new ArrayList<>();
            List<Problem> problems = new ArrayList<>();
            Integer resolved = first.resolvedYear;
            boolean anyFiles = collect(first, out, problems);
            for (Disclosure o : first.options) {
                if (o.year() != academicYear || first.selected == null || o.chasu() == first.selected.chasu()) {
                    continue;
                }
                Page other = itemPage(plan, p, o.chasu());
                if (other == null || other.selected == null || other.selected.chasu() != o.chasu() || other.selected.year() != academicYear) {
                    // 차수 지정이 먹지 않으면 그 화면 파일은 쓰지 않는다(다른 차수 파일을 이 공시월로 붙이지 않음)
                    problems.add(new Problem("공시 " + o.month() + "월", "CHASU_IGNORED"));
                    continue;
                }
                if (resolved == null) {
                    resolved = other.resolvedYear;
                }
                anyFiles |= collect(other, out, problems);
            }
            if (!anyFiles) {
                return new YearFetch(shl, name, defaultYear, resolved, List.of(), problems, "PLAN_NOT_PUBLISHED");
            }
            return new YearFetch(shl, name, defaultYear, resolved, out, problems, null);
        } catch (IOException e) {
            return new YearFetch(shl, name, defaultYear, null, List.of(), List.of(), "DOWNLOAD_FAILED");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new YearFetch(shl, name, defaultYear, null, List.of(), List.of(), "DOWNLOAD_FAILED");
        }
    }

    /** 공시 차수 하나: 차수 번호·학년도·공시월(04·09). 항목 화면의 '자료기준일' 선택지에서 읽는다. */
    public record Disclosure(int year, int chasu, int month) {
    }

    private static final Pattern DISCLOSURE_OPTION = Pattern.compile(
            "<option value=\"(20\\d{2})(\\d)\"\\s*(selected)?\\s*>\\s*\\((\\d+)차\\)\\s*(20\\d{2})년\\s*(\\d{1,2})월");

    /** 항목 화면 하나(공시 차수 하나)의 첨부 목록·내려받기 Form·선택된 차수. */
    private static final class Page {
        final List<String> seqs = new ArrayList<>();
        final Map<String, String> form = new LinkedHashMap<>();
        final List<Disclosure> options = new ArrayList<>();
        Disclosure selected;
        Integer resolvedYear;
    }

    /** 선택지 목록. selectedOut[0] 에 selected 표시된 선택지. 값과 표시가 어긋난 선택지는 버린다. */
    static List<Disclosure> disclosures(String item, Disclosure[] selectedOut) {
        List<Disclosure> out = new ArrayList<>();
        Matcher m = DISCLOSURE_OPTION.matcher(item);
        while (m.find()) {
            if (!m.group(1).equals(m.group(5)) || !m.group(2).equals(m.group(4))) {
                continue;
            }
            Disclosure d = new Disclosure(Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)), Integer.parseInt(m.group(6)));
            out.add(d);
            if (m.group(3) != null && selectedOut != null) {
                selectedOut[0] = d;
            }
        }
        return out;
    }

    private Page itemPage(String[] plan, Map<String, String> params, Integer chasu) throws IOException, InterruptedException {
        Map<String, String> q = new LinkedHashMap<>(params);
        if (chasu != null) {
            q.put("JG_CHASU", String.valueOf(chasu));
        }
        String item = text(get(plan[0], q, base + "/ei/ss/Pneiss_b01_s0.do", StandardCharsets.UTF_8).body());
        if (item.contains("서비스 일시 중단")) {
            return null;
        }
        Page page = new Page();
        Matcher fn = Pattern.compile("function (getEiFile\\d+)\\(").matcher(item);
        String fnName = fn.find() ? fn.group(1) : "getEiFile" + plan[1];
        Matcher files = Pattern.compile(Pattern.quote(fnName) + "\\('(\\d+)'\\);?\"?[^>]*>\\s*([^<]+?)\\s*<").matcher(item);
        while (files.find()) {
            page.seqs.add(files.group(1));
        }
        int at = item.indexOf("id=\"eiFileDownForm\"");
        if (at >= 0) {
            Matcher f = Pattern.compile("name=\"([A-Z_0-9]+)\"[^>]*value=\"([^\"]*)\"").matcher(item.substring(at, Math.min(item.length(), at + 3000)));
            while (f.find()) {
                page.form.put(f.group(1), f.group(2));
            }
        }
        Disclosure[] sel = new Disclosure[1];
        page.options.addAll(disclosures(item, sel));
        page.selected = sel[0];
        page.resolvedYear = year(page.form.get("JG_YEAR"));
        return page;
    }

    /** 화면 하나의 첨부를 받는다. 파일마다 그 화면의 공시월을 붙인다. 받은 것이 있으면 true. */
    private boolean collect(Page page, List<PlanFile> out, List<Problem> problems) throws IOException, InterruptedException {
        if (page.seqs.isEmpty() || page.form.isEmpty()) {
            return false;
        }
        Integer month = page.selected == null ? null : page.selected.month();
        String prefix = page.selected == null ? "" : "c" + page.selected.chasu() + ":";
        for (String seq : page.seqs) {
            Map<String, String> q = new LinkedHashMap<>(page.form);
            q.put("FILE_SEQ", seq);
            Download d = download("/servlets/EiFileDownLoad.do", q, base + "/ei/ss/Pneiss_b01_s0.do");
            String fileName = fileName(d.disposition, "file_" + seq);
            if (d.status / 100 != 2) {
                // 부록 I REPLAY: 첨부 응답이 오류(4xx 등)면 그 본문(오류 HTML)을 원본으로 쓰지 않는다 — 그 첨부만 문제 목록에
                problems.add(new Problem(fileName, "FILE_DOWNLOAD_FAILED"));
            } else if (d.bytes == null) {
                problems.add(new Problem(fileName, "TOO_LARGE"));
            } else if (d.bytes.length >= 4 && d.bytes[0] == 'P' && d.bytes[1] == 'K' && fileName.toLowerCase().endsWith(".zip")) {
                List<PlanFile> inner = new ArrayList<>();
                unzip(d.bytes, prefix + seq, inner, problems, fileName);
                inner.forEach(x -> out.add(new PlanFile(x.fileName(), x.bytes(), x.attachmentSeq(), month)));
            } else {
                out.add(new PlanFile(fileName, d.bytes, prefix + seq, month));
            }
            pause(politeDelayMillis);
        }
        return true;
    }

    private static Integer year(String v) {
        return v != null && v.matches("20\\d{2}") ? Integer.valueOf(v) : null;
    }

    /** ZIP 풀기: 항목 수·크기 제한, ZIP 안 ZIP·경로 이동 거부, 손상은 문제로 남긴다. */
    static void unzip(byte[] zip, String seq, List<PlanFile> out, List<Problem> problems, String zipName) {
        for (Charset cs : List.of(StandardCharsets.UTF_8, Charset.forName("CP949"))) {
            List<PlanFile> got = new ArrayList<>();
            List<Problem> bad = new ArrayList<>();
            long total = 0;
            int count = 0;
            try (ZipInputStream z = new ZipInputStream(new ByteArrayInputStream(zip), cs)) {
                ZipEntry e;
                boolean any = false;
                while ((e = z.getNextEntry()) != null) {
                    any = true;
                    if (e.isDirectory()) {
                        continue;
                    }
                    String raw = e.getName().replace('\\', '/');
                    String n = raw.substring(raw.lastIndexOf('/') + 1);
                    if (++count > MAX_ZIP_ENTRIES) {
                        bad.add(new Problem(zipName, "ZIP_TOO_MANY_ENTRIES"));
                        break;
                    }
                    if (raw.startsWith("/") || raw.contains("../") || raw.startsWith("..")) {
                        bad.add(new Problem(n, "ZIP_PATH"));
                        continue;
                    }
                    if (n.toLowerCase().endsWith(".zip")) {
                        bad.add(new Problem(n, "NESTED_ZIP"));
                        continue;
                    }
                    byte[] b = z.readNBytes(MAX_FILE_BYTES + 1);
                    if (b.length > MAX_FILE_BYTES) {
                        bad.add(new Problem(n, "TOO_LARGE"));
                        continue;
                    }
                    total += b.length;
                    if (total > MAX_ZIP_TOTAL) {
                        bad.add(new Problem(zipName, "ZIP_TOO_LARGE"));
                        break;
                    }
                    got.add(new PlanFile(n, b, seq + "/" + n));
                }
                if (!any) {
                    problems.add(new Problem(zipName, "ZIP_CORRUPT"));
                    return;
                }
                out.addAll(got);
                problems.addAll(bad);
                return;
            } catch (IllegalArgumentException malformedName) {
                // 이름 인코딩이 다르면 CP949 로 다시
            } catch (ZipException | java.io.EOFException corrupt) {
                problems.add(new Problem(zipName, "ZIP_CORRUPT"));
                return;
            } catch (IOException io) {
                problems.add(new Problem(zipName, "ZIP_CORRUPT"));
                return;
            }
        }
        problems.add(new Problem(zipName, "ZIP_CORRUPT"));
    }

    static String fileName(String disp, String fallback) {
        if (disp == null) {
            return fallback;
        }
        Matcher m = Pattern.compile("filename\\*=UTF-8''([^;]+)", Pattern.CASE_INSENSITIVE).matcher(disp);
        if (m.find()) {
            return URLDecoder.decode(m.group(1), StandardCharsets.UTF_8);
        }
        m = Pattern.compile("filename=\"?([^\";]+)\"?", Pattern.CASE_INSENSITIVE).matcher(disp);
        if (!m.find()) {
            return fallback;
        }
        String name = m.group(1);
        if (name.contains("%")) {
            String u = URLDecoder.decode(name, StandardCharsets.UTF_8);
            return u.contains("\uFFFD") ? URLDecoder.decode(name, Charset.forName("CP949")) : u;
        }
        byte[] raw = name.getBytes(StandardCharsets.ISO_8859_1);
        String u = new String(raw, StandardCharsets.UTF_8);
        return u.contains("\uFFFD") ? new String(raw, Charset.forName("CP949")) : u;
    }

    static String text(byte[] b) {
        String u = new String(b, StandardCharsets.UTF_8);
        return u.contains("\uFFFD") ? new String(b, Charset.forName("CP949")) : u;
    }

    private record Download(byte[] bytes, String disposition, int status) {
    }

    private HttpResponse<byte[]> get(String path, Map<String, String> params, String referer, Charset cs) throws IOException, InterruptedException {
        return send(() -> HttpRequest.newBuilder(target(path, params, cs)).GET(), referer, HttpResponse.BodyHandlers.ofByteArray());
    }

    private Download download(String path, Map<String, String> params, String referer) throws IOException, InterruptedException {
        HttpResponse<InputStream> r = send(() -> HttpRequest.newBuilder(target(path, params, StandardCharsets.UTF_8)).GET(), referer,
                HttpResponse.BodyHandlers.ofInputStream());
        try (InputStream in = r.body()) {
            byte[] b = in.readNBytes(MAX_FILE_BYTES + 1);
            return new Download(b.length > MAX_FILE_BYTES ? null : b, r.headers().firstValue("Content-Disposition").orElse(null), r.statusCode());
        }
    }

    private HttpResponse<byte[]> post(String path, Map<String, String> data, Charset cs) throws IOException, InterruptedException {
        return send(() -> HttpRequest.newBuilder(URI.create(base + path)).header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form(data, cs))), null, HttpResponse.BodyHandlers.ofByteArray());
    }

    private URI target(String path, Map<String, String> params, Charset cs) {
        if (!path.startsWith("/")) {
            throw new IllegalArgumentException("relative path only");
        }
        return URI.create(base + path + (params == null ? "" : "?" + form(params, cs)));
    }

    private interface RequestFactory {
        HttpRequest.Builder create();
    }

    /** 재시도(429·5xx·연결 오류, 최대 3번) + 같은 호스트 Redirect(3번). 다른 호스트로 가는 Redirect 는 오류. */
    private <T> HttpResponse<T> send(RequestFactory factory, String referer, HttpResponse.BodyHandler<T> handler)
            throws IOException, InterruptedException {
        IOException last = null;
        for (int attempt = 0; attempt <= RETRIES; attempt++) {
            try {
                HttpRequest req = factory.create().header("User-Agent", UA)
                        .header("Referer", referer != null ? referer : base + "/Main.do").timeout(Duration.ofSeconds(60)).build();
                HttpResponse<T> r = http.send(req, handler);
                for (int hop = 0; r.statusCode() / 100 == 3 && hop < MAX_REDIRECTS; hop++) {
                    URI next = req.uri().resolve(r.headers().firstValue("Location").orElseThrow(() -> new IOException("redirect without location")));
                    if (!host.equals(next.getHost())) {
                        throw new IOException("redirect to other host");
                    }
                    req = HttpRequest.newBuilder(next).GET().header("User-Agent", UA).timeout(Duration.ofSeconds(60)).build();
                    r = http.send(req, handler);
                }
                if (r.statusCode() / 100 == 3) {
                    throw new IOException("too many redirects");
                }
                if (r.statusCode() == 429 || r.statusCode() >= 500) {
                    last = new IOException("http " + r.statusCode());
                } else {
                    return r;
                }
            } catch (IOException e) {
                if ("redirect to other host".equals(e.getMessage())) {
                    throw e;
                }
                last = e;
            }
            if (attempt < RETRIES) {
                pause((1L << attempt) * retryBaseMillis + (long) (Math.random() * retryBaseMillis));
            }
        }
        throw last;
    }

    private static void pause(long millis) throws InterruptedException {
        if (millis > 0) {
            Thread.sleep(millis);
        }
    }

    private static String form(Map<String, String> m, Charset cs) {
        List<String> parts = new ArrayList<>();
        m.forEach((k, v) -> parts.add(URLEncoder.encode(k, cs) + "=" + URLEncoder.encode(v == null ? "" : v, cs)));
        return String.join("&", parts);
    }
}
