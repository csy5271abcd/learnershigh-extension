package com.learnershigh.extension.assessment.integration.schoolinfo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * A27-UX 부록 E: 학교알리미 Client 를 가상 학교알리미(127.0.0.1)에 붙여 시험한다. 실제 학교알리미에 접속하지 않는다.
 * 학년도 지정 조회·되돌려 준 공시연도·주소 허용 목록·Redirect·재시도·ZIP 안전 제한.
 */
class SchoolInfoClientTest {

    static FakeSchoolInfoServer fake;
    static SchoolInfoClient client;

    @BeforeAll
    static void start() throws IOException {
        fake = new FakeSchoolInfoServer();
        client = new SchoolInfoClient(fake.baseUrl(), true, 0, 1);
    }

    @AfterAll
    static void stop() {
        fake.close();
    }

    @BeforeEach
    void reset() {
        fake.reset();
    }

    static byte[] pdf(String marker) {
        return ("%PDF-1.4\n% " + marker + "\n%%EOF").getBytes(StandardCharsets.UTF_8);
    }

    @Test
    void 공식_주소_밖이나_허용하지_않은_루프백은_만들_수_없다() {
        assertThatThrownBy(() -> new SchoolInfoClient("https://example.org", true, 0, 0)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new SchoolInfoClient(fake.baseUrl(), false, 0, 0)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new SchoolInfoClient("http://www.schoolinfo.go.kr", false, 0, 0)).isInstanceOf(IllegalStateException.class);
        assertThat(new SchoolInfoClient().base()).isEqualTo("https://www.schoolinfo.go.kr");
    }

    @Test
    void 학년도마다_따로_조회하고_학교알리미가_되돌려_준_공시연도를_알려_준다() {
        fake.years.put(2026, new FakeSchoolInfoServer.YearData(2026, new FakeSchoolInfoServer.Doc("2026학년도 1학년 1학기 평가계획.pdf", pdf("a"))));
        fake.years.put(2025, new FakeSchoolInfoServer.YearData(2025, new FakeSchoolInfoServer.Doc("2025학년도 2학년 2학기 평가계획.pdf", pdf("b"))));
        fake.years.put(2024, new FakeSchoolInfoServer.YearData(2026, new FakeSchoolInfoServer.Doc("평가계획.pdf", pdf("c"))));

        SchoolInfoClient.YearFetch y26 = client.fetchYear(FakeSchoolInfoServer.SCHOOL_UUID, 2026);
        SchoolInfoClient.YearFetch y25 = client.fetchYear(FakeSchoolInfoServer.SCHOOL_UUID, 2025);
        SchoolInfoClient.YearFetch y24 = client.fetchYear(FakeSchoolInfoServer.SCHOOL_UUID, 2024);

        assertThat(y26.files()).extracting(SchoolInfoClient.PlanFile::fileName).containsExactly("2026학년도 1학년 1학기 평가계획.pdf");
        assertThat(y25.files()).extracting(SchoolInfoClient.PlanFile::fileName).containsExactly("2025학년도 2학년 2학기 평가계획.pdf");
        assertThat(y26.resolvedYear()).isEqualTo(2026);
        assertThat(y25.resolvedYear()).isEqualTo(2025);
        assertThat(y24.resolvedYear()).as("학교알리미가 다른 공시연도를 되돌려 주면 그대로 알린다(서비스가 YEAR_MISMATCH 판단)").isEqualTo(2026);
        assertThat(y26.schoolName()).isEqualTo("가상고등학교");
        assertThat(y26.files().getFirst().attachmentSeq()).isEqualTo("1");
        // 항목 요청이 학년도별로 따로 나갔다
        assertThat(fake.log).anyMatch(l -> l.startsWith("/ei/pp/Pneipp_b06_s0p.do JG_YEAR=2026"))
                .anyMatch(l -> l.startsWith("/ei/pp/Pneipp_b06_s0p.do JG_YEAR=2025"))
                .anyMatch(l -> l.startsWith("/ei/pp/Pneipp_b06_s0p.do JG_YEAR=2024"));
    }

    @Test
    void 공시_없음과_학년도_선택_불가를_구분한다() {
        assertThat(client.fetchYear(FakeSchoolInfoServer.SCHOOL_UUID, 2025).error()).isEqualTo("PLAN_NOT_PUBLISHED");
        fake.offeredYears = List.of(2026, 2025);
        assertThat(client.fetchYear(FakeSchoolInfoServer.SCHOOL_UUID, 2024).error()).isEqualTo("YEAR_UNAVAILABLE");
        assertThat(fake.count("/ei/pp/")).as("고를 수 없는 학년도는 항목을 요청하지 않는다").isEqualTo(1);
    }

    @Test
    void 일시_오류는_정해진_횟수만_다시_시도하고_미공시로_보지_않는다() {
        FakeSchoolInfoServer.YearData d = new FakeSchoolInfoServer.YearData(2025, new FakeSchoolInfoServer.Doc("x.pdf", pdf("x")));
        d.itemStatus = 500;
        fake.years.put(2025, d);
        assertThat(client.fetchYear(FakeSchoolInfoServer.SCHOOL_UUID, 2025).error()).isEqualTo("DOWNLOAD_FAILED");
        assertThat(fake.count("/ei/pp/")).as("최초 1번 + 다시 시도 3번").isEqualTo(4);

        fake.searchStatus = 429;
        SchoolInfoClient.Search s = client.search("가상고등학교");
        assertThat(s.error()).isEqualTo("DOWNLOAD_FAILED");
        assertThat(fake.count("/ei/ss/Pneiss_f01_l0.do")).isEqualTo(4);
    }

    @Test
    void 다른_호스트로_가는_Redirect는_따라가지_않는다() {
        fake.mainRedirect = "http://example.org/steal";
        assertThat(client.search("가상고등학교").error()).isEqualTo("DOWNLOAD_FAILED");
        assertThat(fake.count("/Main.do")).as("다른 호스트 Redirect 는 다시 시도도 하지 않는다").isEqualTo(1);
    }

    @Test
    void 학교_상세의_주소에서_시도_시군구를_나누고_없으면_비워_둔다() {
        fake.schools.put(FakeSchoolInfoServer.SCHOOL_UUID, new String[] {"가상고등학교", "가상특별시  가상구 가상로 1"});
        SchoolInfoClient.SchoolDetail d = client.describe(FakeSchoolInfoServer.SCHOOL_UUID);
        assertThat(d.schoolName()).isEqualTo("가상고등학교");
        assertThat(d.address()).isEqualTo("가상특별시 가상구 가상로 1");
        assertThat(d.sido()).isEqualTo("가상특별시");
        assertThat(d.sigungu()).isEqualTo("가상구");
        fake.schools.put(FakeSchoolInfoServer.SCHOOL_UUID, new String[] {"가상고등학교", null});
        SchoolInfoClient.SchoolDetail none = client.describe(FakeSchoolInfoServer.SCHOOL_UUID);
        assertThat(none.address()).isNull();
        assertThat(none.sido()).isNull();
        assertThat(SchoolInfoClient.region("어딘가 무엇")).containsExactly(null, null);
        assertThat(SchoolInfoClient.region("가상도 시험군 시험면")).containsExactly("가상도", "시험군");
    }

    @Test
    void 실측_구조의_주소_표기와_공시_차수_선택지를_읽는다() {
        // 부록 G 실측(2026-11-19)에서 본 모양을 줄여 옮긴 것(가상 값)
        String detail = "<span class=\"md\"><span class=\"mt\">주소 :</span>가상광역시 가상구 가상로 287번길 24</span><br>";
        assertThat(SchoolInfoClient.address(detail)).isEqualTo("가상광역시 가상구 가상로 287번길 24");
        String item = "<select id=\"select_trans_dt\"><option value=\"20263\" selected>(3차) 2026년 09월</option>"
                + "<option value=\"20261\" >(1차) 2026년 04월</option><option value=\"20253\" >(3차) 2025년 09월</option>"
                + "<option value=\"20252\" >(3차) 2025년 09월</option></select>";
        SchoolInfoClient.Disclosure[] sel = new SchoolInfoClient.Disclosure[1];
        var all = SchoolInfoClient.disclosures(item, sel);
        assertThat(all).containsExactly(new SchoolInfoClient.Disclosure(2026, 3, 9), new SchoolInfoClient.Disclosure(2026, 1, 4),
                new SchoolInfoClient.Disclosure(2025, 3, 9));
        assertThat(sel[0]).as("값과 표시가 어긋난 선택지(20252 → 3차)는 버린다").isEqualTo(new SchoolInfoClient.Disclosure(2026, 3, 9));
    }

    @Test
    void 학년도마다_4월_9월_차수를_따로_받아_파일에_공시월을_붙이고_차수가_무시되면_쓰지_않는다() {
        FakeSchoolInfoServer.YearData sep = new FakeSchoolInfoServer.YearData(2026, new FakeSchoolInfoServer.Doc("2026학년도 2학기 국어과.hwp", pdf("s")));
        sep.month = 9;
        FakeSchoolInfoServer.YearData apr = new FakeSchoolInfoServer.YearData(2026, new FakeSchoolInfoServer.Doc("2026학년도 1학기 국어과.hwp", pdf("a")));
        apr.month = 4;
        fake.chasu.put("2026:3", sep);
        fake.chasu.put("2026:1", apr);
        SchoolInfoClient.YearFetch y = client.fetchYear(FakeSchoolInfoServer.SCHOOL_UUID, 2026);
        assertThat(y.files()).extracting(SchoolInfoClient.PlanFile::fileName).containsExactly("2026학년도 2학기 국어과.hwp", "2026학년도 1학기 국어과.hwp");
        assertThat(y.files()).extracting(SchoolInfoClient.PlanFile::disclosureMonth).containsExactly(9, 4);
        assertThat(y.files()).extracting(SchoolInfoClient.PlanFile::attachmentSeq).containsExactly("c3:1", "c1:1");
        fake.ignoreChasu = true;
        SchoolInfoClient.YearFetch ignored = client.fetchYear(FakeSchoolInfoServer.SCHOOL_UUID, 2026);
        assertThat(ignored.files()).extracting(SchoolInfoClient.PlanFile::disclosureMonth).containsExactly(9);
        assertThat(ignored.problems()).extracting(SchoolInfoClient.Problem::reason).containsExactly("CHASU_IGNORED");
    }

    @Test
    void 검색은_학교를_고르지_않고_몇_곳인지_그대로_돌려준다() {
        fake.searchIds = List.of(FakeSchoolInfoServer.SCHOOL_UUID, FakeSchoolInfoServer.OTHER_UUID);
        assertThat(client.search("가상고").schoolinfoIds()).hasSize(2);
    }

    @Test
    void ZIP은_안전한_파일만_풀고_문제는_따로_남긴다() throws IOException {
        byte[] zip = zip(List.of(
                new Object[] {"1학년/2026학년도 1학년 1학기 평가계획.pdf", pdf("z1")},
                new Object[] {"2026학년도 2학년 1학기 평가계획.hwp", pdf("z2")},
                new Object[] {"../../etc/2026학년도 3학년 1학기.pdf", pdf("z3")},
                new Object[] {"inner.zip", new byte[] {'P', 'K', 3, 4}}));
        List<SchoolInfoClient.PlanFile> out = new ArrayList<>();
        List<SchoolInfoClient.Problem> problems = new ArrayList<>();
        SchoolInfoClient.unzip(zip, "7", out, problems, "평가계획.zip");
        assertThat(out).extracting(SchoolInfoClient.PlanFile::fileName)
                .containsExactly("2026학년도 1학년 1학기 평가계획.pdf", "2026학년도 2학년 1학기 평가계획.hwp");
        assertThat(out).extracting(SchoolInfoClient.PlanFile::attachmentSeq)
                .containsExactly("7/2026학년도 1학년 1학기 평가계획.pdf", "7/2026학년도 2학년 1학기 평가계획.hwp");
        assertThat(problems).extracting(SchoolInfoClient.Problem::reason).containsExactly("ZIP_PATH", "NESTED_ZIP");

        List<SchoolInfoClient.Problem> broken = new ArrayList<>();
        SchoolInfoClient.unzip(new byte[] {'P', 'K', 3, 4, 9, 9, 9}, "8", new ArrayList<>(), broken, "손상.zip");
        assertThat(broken).extracting(SchoolInfoClient.Problem::reason).containsExactly("ZIP_CORRUPT");
    }

    @Test
    void ZIP_항목이_너무_많으면_더_풀지_않는다() throws IOException {
        List<Object[]> many = new ArrayList<>();
        for (int i = 0; i < SchoolInfoClient.MAX_ZIP_ENTRIES + 5; i++) {
            many.add(new Object[] {"f" + i + ".pdf", pdf("m" + i)});
        }
        List<SchoolInfoClient.PlanFile> out = new ArrayList<>();
        List<SchoolInfoClient.Problem> problems = new ArrayList<>();
        SchoolInfoClient.unzip(zip(many), "9", out, problems, "많음.zip");
        assertThat(out).hasSize(SchoolInfoClient.MAX_ZIP_ENTRIES);
        assertThat(problems).extracting(SchoolInfoClient.Problem::reason).containsExactly("ZIP_TOO_MANY_ENTRIES");
    }

    static byte[] zip(List<Object[]> entries) throws IOException {
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        try (ZipOutputStream z = new ZipOutputStream(bo, StandardCharsets.UTF_8)) {
            for (Object[] e : entries) {
                z.putNextEntry(new ZipEntry((String) e[0]));
                z.write((byte[]) e[1]);
                z.closeEntry();
            }
        }
        return bo.toByteArray();
    }

    /** 부록 I REPLAY 로 찾은 결함: 첨부 응답이 404 등 오류면 그 오류 HTML 을 원본으로 받지 않는다(그 첨부만 문제 목록) */
    @Test
    void 첨부_응답이_오류면_원본으로_쓰지_않고_그_첨부만_문제로_남긴다() {
        fake.years.put(2026, new FakeSchoolInfoServer.YearData(2026, new FakeSchoolInfoServer.Doc("2026학년도 1학년 2학기 평가계획.pdf", pdf("a")),
                new FakeSchoolInfoServer.Doc("2026학년도 2학년 2학기 평가계획.pdf", pdf("b")), new FakeSchoolInfoServer.Doc("2026학년도 3학년 2학기 평가계획.pdf", pdf("c"))));
        fake.missingSeqs.add(2);
        SchoolInfoClient.YearFetch y = client.fetchYear(FakeSchoolInfoServer.SCHOOL_UUID, 2026);
        assertThat(y.error()).isNull();
        assertThat(y.files()).extracting(SchoolInfoClient.PlanFile::fileName).containsExactly("2026학년도 1학년 2학기 평가계획.pdf", "2026학년도 3학년 2학기 평가계획.pdf");
        assertThat(y.files()).noneMatch(f -> new String(f.bytes(), StandardCharsets.UTF_8).contains("찾을 수 없습니다"));
        assertThat(y.problems()).extracting(SchoolInfoClient.Problem::reason).containsExactly("FILE_DOWNLOAD_FAILED");
        // 모든 첨부가 오류면 파일 0 + 문제만(서비스는 '공시 없음'이 아니라 FAILED 로 본다)
        fake.years.get(2026).downloadStatus = 403;
        SchoolInfoClient.YearFetch all = client.fetchYear(FakeSchoolInfoServer.SCHOOL_UUID, 2026);
        assertThat(all.files()).isEmpty();
        assertThat(all.problems()).hasSize(3).allMatch(p -> "FILE_DOWNLOAD_FAILED".equals(p.reason()));
    }

    /** 부록 H 실측: 검색 첫 화면은 고등학교 2곳만 보이고 '고등학교(4) 더보기'로 숨긴다 → 고등학교 목록을 한 번 더 받는다 */
    @Test
    void 검색_첫_화면이_고등학교_일부만_보여도_더보기_목록까지_읽는다() {
        fake.realSearchMarkup = true;
        fake.searchIds = java.util.List.of("0b9c5a4e-1111-4222-8333-000000000011", "0b9c5a4e-2222-4222-8333-000000000012",
                "0b9c5a4e-3333-4222-8333-000000000013", "0b9c5a4e-4444-4222-8333-000000000014");
        SchoolInfoClient.Search s = client.search("예시고등학교");
        assertThat(s.error()).isNull();
        assertThat(s.schoolinfoIds()).hasSize(4);
        assertThat(fake.log).contains("search SEARCH_MODE=", "search SEARCH_MODE=3");
        fake.highListLimit = 3;
        SchoolInfoClient.Search cut = client.search("예시고등학교");
        assertThat(cut.error()).isEqualTo("SEARCH_TRUNCATED");
        assertThat(SchoolInfoClient.highSchoolTotal("전체(16) 초등학교(5) 중학교(5) 고등학교(5) 기타학교(1)")).isEqualTo(5);
        assertThat(SchoolInfoClient.highSchoolTotal("<html>학교</html>")).isNull();
        // 고등학교 0곳이면 다시 묻지 않고 '없음'
        fake.searchIds = java.util.List.of();
        fake.log.clear();
        assertThat(client.search("없는고등학교").schoolinfoIds()).isEmpty();
        assertThat(fake.log).doesNotContain("search SEARCH_MODE=3");
    }
}
