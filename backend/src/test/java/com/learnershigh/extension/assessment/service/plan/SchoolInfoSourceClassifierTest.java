package com.learnershigh.extension.assessment.service.plan;

import static org.assertj.core.api.Assertions.assertThat;

import com.learnershigh.extension.assessment.entity.SchoolInfoSourceFile.Verification;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;

/** A27-UX 부록 E §38-12 '출처 분류'. 근거가 모자라면 등록하지 않는 쪽으로 판정하는지 본다. */
class SchoolInfoSourceClassifierTest {

    static byte[] pdf(String marker) {
        return ("%PDF-1.4\n% " + marker + "\n%%EOF").getBytes(StandardCharsets.UTF_8);
    }

    static byte[] resource(String path) throws IOException {
        try (InputStream in = SchoolInfoSourceClassifierTest.class.getResourceAsStream(path)) {
            return in.readAllBytes();
        }
    }

    @Test
    void 연도_조회를_실측하지_않은_기본_설정에서는_모두_출처_확인_필요() {
        var r = SchoolInfoSourceClassifier.classify(2026, 2026, false, "2026학년도 1학년 1학기 평가계획.pdf", pdf("a"));
        assertThat(r.verification()).isEqualTo(Verification.NEEDS_SOURCE_VERIFICATION);
        assertThat(r.reason()).isEqualTo("YEAR_QUERY_UNVERIFIED");
        assertThat(r.grades()).as("근거는 남긴다").containsExactly(1);
    }

    @Test
    void 공시연도나_파일_연도가_요청과_다르면_학년도_불일치() {
        assertThat(SchoolInfoSourceClassifier.classify(2024, 2026, true, "2024학년도 1학년 1학기.pdf", pdf("a")).verification())
                .isEqualTo(Verification.YEAR_MISMATCH);
        var r = SchoolInfoSourceClassifier.classify(2024, 2024, true, "2026학년도 1학년 1학기 평가계획.pdf", pdf("b"));
        assertThat(r.verification()).isEqualTo(Verification.YEAR_MISMATCH);
        assertThat(r.reason()).isEqualTo("FILE_YEAR_DIFFERS");
        assertThat(SchoolInfoSourceClassifier.classify(2025, null, true, "2025학년도 1학년 1학기.pdf", pdf("c")).reason())
                .isEqualTo("NO_DISCLOSURE_YEAR");
        assertThat(SchoolInfoSourceClassifier.classify(2025, 2025, true, "2025_2026 1학년 1학기.pdf", pdf("d")).reason())
                .isEqualTo("FILE_YEAR_CONFLICT");
    }

    @Test
    void 연도_학년_학기_근거가_없으면_임의로_넣지_않는다() {
        assertThat(SchoolInfoSourceClassifier.classify(2026, 2026, true, "평가계획.pdf", pdf("a")).reason()).isEqualTo("NO_FILE_YEAR_EVIDENCE");
        // 부록 G(사용자 승인 규칙 변경): 학기가 확인되고 학년 표기가 전혀 없으면 고1·고2·고3 모두(이전: NO_GRADE_EVIDENCE 보류)
        var noGrade = SchoolInfoSourceClassifier.classify(2026, 2026, true, "2026학년도 1학기 평가계획.pdf", pdf("b"));
        assertThat(noGrade.verification()).isEqualTo(Verification.VERIFIED);
        assertThat(noGrade.reason()).isEqualTo("GRADE_UNSPECIFIED_ALL_GRADES_APPLIED");
        assertThat(noGrade.grades()).containsExactly(1, 2, 3);
        var noSemester = SchoolInfoSourceClassifier.classify(2026, 2026, true, "2026학년도 2학년 평가계획.pdf", pdf("c"));
        assertThat(noSemester.verification()).isEqualTo(Verification.UNCLASSIFIED);
        assertThat(noSemester.reason()).isEqualTo("NO_SEMESTER_EVIDENCE");
    }

    @Test
    void 여러_학년과_두_학기가_적힌_합본은_그_슬롯들로_판정한다() {
        var all = SchoolInfoSourceClassifier.classify(2025, 2025, true, "2025학년도 1,2,3학년 1·2학기 교과별 평가계획.pdf", pdf("a"));
        assertThat(all.verification()).isEqualTo(Verification.VERIFIED);
        assertThat(all.grades()).containsExactly(1, 2, 3);
        assertThat(all.semesters()).containsExactly(1, 2);
        var range = SchoolInfoSourceClassifier.classify(2025, 2025, true, "2025 1~3학년 2학기 과학과.hwp", pdf("b"));
        assertThat(range.grades()).containsExactly(1, 2, 3);
        assertThat(range.semesters()).containsExactly(2);
        // 공백으로 떨어진 숫자가 붙어 학년을 놓치지 않는다 ('2026 1학년' ≠ '20261학년')
        var spaced = SchoolInfoSourceClassifier.classify(2026, 2026, true, "2026 1학년 2학기 평가계획.pdf", pdf("c"));
        assertThat(spaced.verification()).isEqualTo(Verification.VERIFIED);
        assertThat(spaced.grades()).containsExactly(1);
        assertThat(spaced.semesters()).containsExactly(2);
    }

    @Test
    void 파일_이름에_근거가_없으면_원문_제목줄의_학년도_학년_학기를_쓴다() throws IOException {
        byte[] hwpx = resource("/assessment/multiformat/synthetic-plan.hwpx");
        var r = SchoolInfoSourceClassifier.classify(2026, 2026, true, "synthetic-plan.hwpx", hwpx);
        assertThat(r.verification()).isEqualTo(Verification.VERIFIED);
        assertThat(r.grades()).containsExactly(1);
        assertThat(r.semesters()).containsExactly(1);
        assertThat(r.evidence()).containsEntry("documentYear", 2026).containsEntry("gradeFrom", "documentTitle");
        // 같은 원문이라도 다른 학년도 요청이면 불일치
        assertThat(SchoolInfoSourceClassifier.classify(2025, 2025, true, "synthetic-plan.hwpx", hwpx).verification())
                .isEqualTo(Verification.YEAR_MISMATCH);
    }

    /** 합성 HWPX 의 마지막 본문 문장에 text 를 덧붙인다(제목 200자 밖). mimetype 은 압축하지 않고 첫 항목으로 둔다. */
    static byte[] hwpxWithBody(String text) throws IOException {
        byte[] src = resource("/assessment/multiformat/synthetic-plan.hwpx");
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        try (var in = new java.util.zip.ZipInputStream(new java.io.ByteArrayInputStream(src));
                var zip = new java.util.zip.ZipOutputStream(out)) {
            java.util.zip.ZipEntry e;
            while ((e = in.getNextEntry()) != null) {
                byte[] data = in.readAllBytes();
                if (e.getName().equals("Contents/section0.xml")) {
                    String xml = new String(data, StandardCharsets.UTF_8);
                    int at = xml.lastIndexOf("</hp:t>");
                    data = (xml.substring(0, at) + " " + text + xml.substring(at)).getBytes(StandardCharsets.UTF_8);
                }
                java.util.zip.ZipEntry n = new java.util.zip.ZipEntry(e.getName());
                if (e.getName().equals("mimetype")) {
                    java.util.zip.CRC32 crc = new java.util.zip.CRC32();
                    crc.update(data);
                    n.setMethod(java.util.zip.ZipEntry.STORED);
                    n.setSize(data.length);
                    n.setCompressedSize(data.length);
                    n.setCrc(crc.getValue());
                }
                zip.putNextEntry(n);
                zip.write(data);
                zip.closeEntry();
            }
        }
        return out.toByteArray();
    }

    @Test
    void A28_09_과별_공시는_본문이_1_2_3학년을_모두_다루면_같은_학기_전_학년_공용이다() throws IOException {
        byte[] all = hwpxWithBody("2학년 단원 계획 3학년 단원 계획");
        var r = SchoolInfoSourceClassifier.classify(2026, 2026, true, "2026학년도 1학기 과학과 교수학습 및 평가 운영 계획.hwpx", all, 4);
        assertThat(r.verification()).isEqualTo(Verification.VERIFIED);
        assertThat(r.grades()).containsExactly(1, 2, 3);
        assertThat(r.semesters()).as("같은 학기만").containsExactly(1);
        assertThat(r.reason()).isEqualTo("GRADES_FROM_BODY_ALL");
        assertThat(r.evidence()).containsEntry("titleGrades", List.of(1)).containsEntry("gradeFrom", "GRADES_FROM_BODY_ALL");
        assertThat(SchoolInfoSyncService.groupOf(r.verification(), r.reason())).as("관리자에게 전 학년 자동 적용으로 보인다")
                .isEqualTo("AUTO_ALL_GRADES");
    }

    /** 과목 계획 단원 머리글(실측 가정고 형식) — '[과목] 교수학습 및 평가 운영 계획 학교명 과목 학년 … 과목 N학년' */
    static String section(String subject, int grade) {
        return " 2026학년도 1학기 [" + subject + "] 교수학습 및 평가 운영 계획 학교명 과목 학년 학급 학점수 지도교사 가정고 " + subject + " " + grade + "학년 1~10반 3 1 ";
    }

    static final String DEPT = "2026학년도 1학기 사회윤리역사과 교수학습 및 평가 운영 계획.hwpx";

    @Test
    void A28_24_과별_통합_공시는_본문_4만자_뒤의_과목_단원까지_보고_1_2_3학년이면_전_학년이다() throws IOException {
        // 실측: 2·3학년 과목 단원이 본문 4만 자 뒤에 나온다(가정고 사회윤리역사과 2학년 첫 출현 35k, 3학년 95k)
        String filler = "단원 내용 ".repeat(9_000);
        byte[] bytes = hwpxWithBody(section("통합사회1", 1) + filler + section("정치", 2) + filler + section("여행지리", 3));
        var r = SchoolInfoSourceClassifier.classify(2026, 2026, true, DEPT, bytes, 4);
        assertThat(r.verification()).isEqualTo(Verification.VERIFIED);
        assertThat(r.grades()).containsExactly(1, 2, 3);
        assertThat(r.semesters()).as("같은 학기만").containsExactly(1);
        assertThat(r.evidence()).containsEntry("sectionGrades", List.of(1, 2, 3)).containsEntry("gradeFrom", "SECTION_GRADES");
        assertThat(SchoolInfoSyncService.groupOf(r.verification(), r.reason())).isEqualTo("AUTO_ALL_GRADES");
    }

    @Test
    void A28_24_과목_단원이_일부_학년뿐이면_그_학년만_하고_단원이_없으면_제목_학년이다() throws IOException {
        // 1·2학년 단원만 → 1·2학년만(3학년에 공개하지 않음)
        var twoGrades = SchoolInfoSourceClassifier.classify(2026, 2026, true, DEPT,
                hwpxWithBody(section("통합사회1", 1) + section("정치", 2)), 4);
        assertThat(twoGrades.grades()).containsExactly(1, 2);
        assertThat(twoGrades.reason()).isEqualTo("GRADES_FROM_SECTIONS");
        // 1학년 단원만 → 제목 학년(1) 그대로
        var oneGrade = SchoolInfoSourceClassifier.classify(2026, 2026, true, DEPT, hwpxWithBody(section("통합사회1", 1)), 4);
        assertThat(oneGrade.grades()).containsExactly(1);
        // 단원 머리글 없이 '2학년'·'3학년' 낱말만 본문 4만 자 뒤에 → 넓히지 않음(단순 출현은 근거 아님)
        var wordsOnly = SchoolInfoSourceClassifier.classify(2026, 2026, true, DEPT,
                hwpxWithBody("단원 내용 ".repeat(9_000) + " 2학년 진로 연계 3학년 심화 "), 4);
        assertThat(wordsOnly.grades()).containsExactly(1);
        // 파일 이름에 학년이 명시되면(예: 1학년) 본문 단원과 무관하게 그 학년만
        var explicit = SchoolInfoSourceClassifier.classify(2026, 2026, true, "2026학년도 1학년 1학기 사회과 교수학습 및 평가 운영 계획.hwpx",
                hwpxWithBody(section("통합사회1", 1) + section("정치", 2) + section("여행지리", 3)), 4);
        assertThat(explicit.grades()).containsExactly(1);
        // 과별 공시 이름이 아니면 단원 판정을 하지 않는다
        var notDepartment = SchoolInfoSourceClassifier.classify(2026, 2026, true, "synthetic-plan.hwpx",
                hwpxWithBody(section("통합사회1", 1) + section("정치", 2) + section("여행지리", 3)), 4);
        assertThat(notDepartment.grades()).containsExactly(1);
    }

    @Test
    void A28_24_단원_머리글_형식_실측_변형() {
        assertThat(SchoolInfoSourceClassifier.sectionGrades(
                "2026학년도 2학기 [문학] 교수학습 및 평가 운영 계획 학교명 학년 학점수 지도교사 가정고 2학년 4 1 "
                        + "2026학년도 1학기 [미술창작]과 교수학습 및 평가 운영 계획 학교명 과목 학년 학급 학점수 지도교사 가정고 미술창작 3학년 선택반 "
                        + "2026학년도 1학기 [통합사회1] 교수학습 및 평가 운영 계획 학교명 과목 학년 학급 학점수 지도교사 가정고 통합사회1 1학년 1~12반"))
                .containsExactly(1, 2, 3);
        assertThat(SchoolInfoSourceClassifier.sectionGrades("수학과 교수학습 운영 2학년 3학년")).isEmpty();
    }

    @Test
    void A28_09_근거가_모자라면_제목_학년만_둔다() throws IOException {
        // 과별 이름이지만 본문이 제목 학년만 가리킴
        var only1 = SchoolInfoSourceClassifier.classify(2026, 2026, true, "2026학년도 1학기 과학과 교수학습 및 평가 운영 계획.hwpx",
                resource("/assessment/multiformat/synthetic-plan.hwpx"), 4);
        assertThat(only1.grades()).containsExactly(1);
        // 본문이 일부 학년만 더 가리킴(1·2) → 넓히지 않음
        var partial = SchoolInfoSourceClassifier.classify(2026, 2026, true, "2026학년도 1학기 과학과 교수학습 및 평가 운영 계획.hwpx",
                hwpxWithBody("2학년 단원 계획"), 4);
        assertThat(partial.grades()).containsExactly(1);
        // 과별 공시 이름이 아니면 본문이 전 학년을 말해도 제목 학년 그대로(학년별 문서의 진급 안내 등)
        var notDepartment = SchoolInfoSourceClassifier.classify(2026, 2026, true, "synthetic-plan.hwpx", hwpxWithBody("2학년 3학년"), 4);
        assertThat(notDepartment.grades()).containsExactly(1);
        assertThat(notDepartment.reason()).isNull();
    }

    @Test
    void 형식이_아니거나_평가계획이_아닌_파일은_등록_대상이_아니다() {
        assertThat(SchoolInfoSourceClassifier.classify(2026, 2026, true, "2026학년도 1학년 1학기.pdf", "hello".getBytes()).verification())
                .isEqualTo(Verification.UNSUPPORTED);
        assertThat(SchoolInfoSourceClassifier.classify(2026, 2026, true, "2026학년도 학업성적관리규정.pdf", pdf("x")).verification())
                .isEqualTo(Verification.NOT_PLAN);
    }

    @Test
    void 학기_표기_해석() {
        assertThat(SchoolInfoSourceClassifier.semestersOf("1학기")).containsExactly(1);
        assertThat(SchoolInfoSourceClassifier.semestersOf("1,2학기")).containsExactly(1, 2);
        assertThat(SchoolInfoSourceClassifier.semestersOf("1학기와2학기")).containsExactly(1, 2);
        assertThat(SchoolInfoSourceClassifier.semestersOf("12학기")).isEqualTo(List.of());
        assertThat(SchoolInfoSourceClassifier.semestersOf("평가계획")).isEmpty();
    }
}
