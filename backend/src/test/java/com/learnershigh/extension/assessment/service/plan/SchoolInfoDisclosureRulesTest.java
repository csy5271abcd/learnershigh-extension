package com.learnershigh.extension.assessment.service.plan;

import static org.assertj.core.api.Assertions.assertThat;

import com.learnershigh.extension.assessment.entity.SchoolInfoSourceFile.Verification;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * 부록 G (2026-11-19 사용자 승인): 공시월 4월 → 1학기 · 9월 → 2학기, 학년 미표기 → 고1·고2·고3.
 * 원문 명시가 먼저이고, 충돌·근거 부족이면 자동 등록하지 않는다. 파일 이름은 실측(가좌고·상산고) 이름 모양을 본뜬 가상 이름이다.
 */
class SchoolInfoDisclosureRulesTest {

    static byte[] pdf(String marker) {
        return ("%PDF-1.4\n% " + marker + "\n%%EOF").getBytes(StandardCharsets.UTF_8);
    }

    @Test
    void 공시월_4월_학년_미표기_교과군_문서는_1학기_고1_고2_고3() {
        var r = SchoolInfoSourceClassifier.classify(2026, 2026, true, "2026학년도 국어과 교수학습 및 평가 운영 계획.hwp", pdf("a"), 4);
        assertThat(r.verification()).isEqualTo(Verification.VERIFIED);
        assertThat(r.reason()).isEqualTo("GRADE_UNSPECIFIED_ALL_GRADES_APPLIED");
        assertThat(r.grades()).containsExactly(1, 2, 3);
        assertThat(r.semesters()).containsExactly(1);
        assertThat(r.evidence()).containsEntry("semesterFrom", "disclosureMonth").containsEntry("disclosureMonth", 4);
    }

    @Test
    void 공시월_9월_학년_미표기는_2학기_세_칸() {
        var r = SchoolInfoSourceClassifier.classify(2025, 2025, true, "2025학년도 과학과 교수학습 및 평가 운영 계획.hwp", pdf("b"), 9);
        assertThat(r.grades()).containsExactly(1, 2, 3);
        assertThat(r.semesters()).containsExactly(2);
    }

    @Test
    void 원문에_학년이_있으면_그_학년만() {
        var two = SchoolInfoSourceClassifier.classify(2026, 2026, true, "2026_2학기_2학년_확률과통계_교수학습평가운영계획.hwp", pdf("c"), 9);
        assertThat(two.verification()).isEqualTo(Verification.VERIFIED);
        assertThat(two.grades()).containsExactly(2);
        assertThat(two.semesters()).containsExactly(2);
        assertThat(two.reason()).isNull();
        var oneThree = SchoolInfoSourceClassifier.classify(2026, 2026, true, "2026학년도 1,3학년 평가계획.pdf", pdf("d"), 4);
        assertThat(oneThree.grades()).containsExactly(1, 3);
        assertThat(oneThree.semesters()).containsExactly(1);
    }

    @Test
    void 공시월과_원문_학기가_다르면_보류하고_양_학기_명시는_두_학기() {
        var conflict = SchoolInfoSourceClassifier.classify(2026, 2026, true, "2026학년도 2학기 국어과 평가계획.hwp", pdf("e"), 4);
        assertThat(conflict.verification()).isEqualTo(Verification.UNCLASSIFIED);
        assertThat(conflict.reason()).isEqualTo("SEMESTER_CONFLICT");
        var both = SchoolInfoSourceClassifier.classify(2026, 2026, true, "2026학년도 1·2학기 수학과 평가계획.hwp", pdf("f"), 9);
        assertThat(both.verification()).isEqualTo(Verification.VERIFIED);
        assertThat(both.semesters()).containsExactly(1, 2);
        var same = SchoolInfoSourceClassifier.classify(2026, 2026, true, "2026학년도 2학기 수학과 평가계획.hwp", pdf("g"), 9);
        assertThat(same.verification()).isEqualTo(Verification.VERIFIED);
        assertThat(same.grades()).containsExactly(1, 2, 3);
    }

    @Test
    void 공시월이_없거나_4_9월이_아니면_학기를_정하지_않고_전_학년도_연결하지_않는다() {
        for (Integer month : new Integer[] {null, 11, 5}) {
            var r = SchoolInfoSourceClassifier.classify(2026, 2026, true, "2026학년도 국어과 평가계획.hwp", pdf("h" + month), month);
            assertThat(r.verification()).as("month " + month).isEqualTo(Verification.UNCLASSIFIED);
            assertThat(r.reason()).isEqualTo("NO_SEMESTER_EVIDENCE");
            assertThat(r.grades()).isEmpty();
        }
    }

    @Test
    void 학년도_출처가_확인되지_않으면_공시월이_있어도_등록하지_않는다() {
        assertThat(SchoolInfoSourceClassifier.classify(2024, 2026, true, "국어과 평가계획.hwp", pdf("i"), 9).verification())
                .isEqualTo(Verification.YEAR_MISMATCH);
        assertThat(SchoolInfoSourceClassifier.classify(2026, 2026, false, "2026학년도 국어과 평가계획.hwp", pdf("j"), 4).reason())
                .isEqualTo("YEAR_QUERY_UNVERIFIED");
        assertThat(SchoolInfoSourceClassifier.classify(2026, 2026, true, "2025학년도 국어과 평가계획.hwp", pdf("k"), 4).verification())
                .isEqualTo(Verification.YEAR_MISMATCH);
        assertThat(SchoolInfoSourceClassifier.classify(2026, 2026, true, "2026학년도 학업성적관리규정.hwpx", pdf("l"), 4).verification())
                .isEqualTo(Verification.NOT_PLAN);
    }

    @Test
    void 실측에서_본_DOCX와_최소성취수준_계획은_등록하지_않는다() throws Exception {
        java.io.ByteArrayOutputStream bo = new java.io.ByteArrayOutputStream();
        try (java.util.zip.ZipOutputStream z = new java.util.zip.ZipOutputStream(bo)) {
            z.putNextEntry(new java.util.zip.ZipEntry("[Content_Types].xml"));
            z.write("<Types/>".getBytes(StandardCharsets.UTF_8));
            z.closeEntry();
        }
        var docx = SchoolInfoSourceClassifier.classify(2025, 2025, true, "2025_2학기_2학년_심화영어작문_교수학습평가운영계획서.docx", bo.toByteArray(), 9);
        assertThat(docx.verification()).isEqualTo(Verification.UNSUPPORTED);
        byte[] hwpx = SchoolInfoDisclosureRulesTest.class.getResourceAsStream("/assessment/multiformat/synthetic-plan.hwpx").readAllBytes();
        assertThat(SchoolInfoSourceClassifier.looksHwpx(hwpx)).isTrue();
        assertThat(SchoolInfoSourceClassifier.classify(2025, 2025, true, "2025학년도 1학년 2학기 최소 성취수준 보장지도 운영 계획.hwp", pdf("m"), 9)
                .verification()).isEqualTo(Verification.NOT_PLAN);
    }

    @Test
    void 본문_학년_표기로_범위를_정한다_일부만이면_보류() {
        assertThat(SchoolInfoSourceClassifier.gradeScope(List.of())).isEqualTo("GRADE_UNSPECIFIED_ALL_GRADES_APPLIED");
        assertThat(SchoolInfoSourceClassifier.gradeScope(List.of(1, 2, 3))).isEqualTo("GRADES_FROM_BODY_ALL");
        assertThat(SchoolInfoSourceClassifier.gradeScope(List.of(2))).isEqualTo("GRADE_SCOPE_CONFLICT");
        assertThat(SchoolInfoSourceClassifier.gradeScope(List.of(1, 3))).isEqualTo("GRADE_SCOPE_CONFLICT");
    }

    /**
     * 부록 J: 9월 목록에서 받지 않은 학업성적관리규정 6개(고양 가좌고·파주 한빛고 × 2024~2026)의 실제 이름 — 이름만으로 평가계획에서 빠진다.
     * 바이트는 가상(PDF 서명만)이다. 실제 원문 내용은 확인하지 않았다(NOT VERIFIED).
     */
    @Test
    void 받지_않은_학업성적관리규정_6개는_이름으로_평가계획에서_제외된다() {
        record Case(int year, String name) {
        }
        List<Case> regs = List.of(new Case(2026, "2026학년도 가좌고 학업성적관리규정.pdf"), new Case(2025, "2025학년도 가좌고 학업성적관리규정.pdf"),
                new Case(2024, "2024 학업성적관리규정.pdf"), new Case(2026, "2026학년도 학업성적관리규정.pdf"), new Case(2025, "2025학년도 학업성적관리규정.pdf"),
                new Case(2024, "2024학년도 한빛고 학업성적관리규정.pdf"));
        for (Case c : regs) {
            var r = SchoolInfoSourceClassifier.classify(c.year(), c.year(), true, c.name(), pdf("reg"), 9);
            assertThat(r.verification()).as(c.name()).isEqualTo(Verification.NOT_PLAN);
        }
    }
}
