package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.entity.PlanDocumentFormat;
import com.learnershigh.extension.assessment.entity.SchoolInfoSourceFile.Verification;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * A27-UX 부록 E (api-contract §38-12 '출처 분류'): 학교알리미 원본 하나가 <b>요청 학년도</b>의 어느 학년·학기 슬롯 문서인지 판정한다.
 * 근거가 모자라면 등록하지 않는 쪽으로 판정한다 — 임의 1학년·최신 학기·다른 학년도 대체 없음.
 */
final class SchoolInfoSourceClassifier {

    // 부록 G 실측: 평가계획 공시에 함께 실린 '최소 성취수준 보장지도 운영 계획'은 교과 평가계획이 아니다
    static final Pattern NOT_PLAN = Pattern.compile("성적관리|규정|부록|범교과|안전교육|최소성취수준|보장지도");
    private static final Pattern NAME_YEAR = Pattern.compile("(?<!\\d)(20\\d{2})(?!\\d)");
    private static final Pattern TEXT_YEAR = Pattern.compile("(20\\d{2})\\s*학년도");
    private static final Pattern BOTH_SEMESTERS = Pattern.compile("1\\s*(?:[,·ㆍ~∼-]|및)\\s*2\\s*학기");
    private static final Pattern SEMESTER = Pattern.compile("(?<!\\d)([12])\\s*학기");
    private static final int TITLE_CHARS = 200;
    /** A28-24: 과별 통합 공시의 과목 단원 학년을 찾을 때 읽는 원문 최대 글자 수(HWP·HWPX 전체, PDF 는 SourceTextProbe 규칙대로 앞 20쪽) */
    static final int DEPARTMENT_BODY_LIMIT = 1_500_000;
    /** '[과목]과 교수학습 및 평가 운영 계획 … N학년' — 과목 계획 머리글 뒤 80자 안의 첫 학년(공백 지운 원문 기준) */
    static final java.util.regex.Pattern SECTION_GRADE = java.util.regex.Pattern.compile(
            "[\\[【]([^\\]】\\[【]{1,25})[\\]】]과?교수학습및평가(?:운영)?계획.{0,80}?([1-3])학년");

    /** A28-24: 원문의 과목 계획 단원마다 그 과목 학년을 모은다(오름차순). 단원이 없으면 빈 목록 */
    static List<Integer> sectionGrades(String text) {
        java.util.TreeSet<Integer> out = new java.util.TreeSet<>();
        java.util.regex.Matcher m = SECTION_GRADE.matcher(compact(text));
        while (m.find()) {
            out.add(Integer.parseInt(m.group(2)));
        }
        return List.copyOf(out);
    }

    /** A28-09: 교과(과) 단위 공시 파일 이름 — '…과 교수학습', '…과 교수 학습', '…과 평가' (공백 제거한 이름 기준) */
    static final java.util.regex.Pattern SUBJECT_DEPARTMENT = java.util.regex.Pattern.compile("과(교수|평가|학습)");

    record Result(Verification verification, String reason, PlanDocumentFormat format, List<Integer> grades,
            List<Integer> semesters, Map<String, Object> evidence) {

        boolean verified() {
            return verification == Verification.VERIFIED;
        }
    }

    private SchoolInfoSourceClassifier() {
    }

    static Result classify(int requestedYear, Integer resolvedYear, boolean trustYearQuery, String fileName, byte[] bytes) {
        return classify(requestedYear, resolvedYear, trustYearQuery, fileName, bytes, null);
    }

    /**
     * 부록 G(2026-11-19 사용자 승인): disclosureMonth = 이 파일이 실린 학교알리미 공식 공시 차수의 공시월.
     * 학기: ① 원문(파일 이름·제목)의 명시 학기 → ② 공시월(4월=1학기, 9월=2학기) → ③ 보류. ①과 ②가 다르면 SEMESTER_CONFLICT 로 보류
     * (단 원문이 1·2학기 둘 다 명시하면 두 학기). 학년: 이름·제목의 학년 → 없으면 본문을 보고, 학년 표기가 전혀 없으면 고1·고2·고3 모두
     * (GRADE_UNSPECIFIED_ALL_GRADES_APPLIED), 본문이 1·2·3학년을 모두 가리키면 모두, 일부 학년만 가리키면 GRADE_SCOPE_CONFLICT 로 보류.
     * 학기를 정하지 못하면 전 학년 연결도 하지 않는다. 학년도·출처 확인 규칙은 그대로다.
     */
    static Result classify(int requestedYear, Integer resolvedYear, boolean trustYearQuery, String fileName, byte[] bytes, Integer disclosureMonth) {
        Map<String, Object> ev = new LinkedHashMap<>();
        ev.put("requestedYear", requestedYear);
        ev.put("resolvedSourceYear", resolvedYear);
        ev.put("yearQueryTrusted", trustYearQuery);
        PlanDocumentFormat format = LocalPlanAnalyzer.formatOf(bytes);
        String compact = compact(fileName);
        // 부록 G 실측: DOCX 등 다른 ZIP 형식이 PK 서명 때문에 HWPX 로 보이지 않게 HWPX 표식(mimetype)을 확인한다
        if (format == PlanDocumentFormat.HWPX && !looksHwpx(bytes)) {
            format = null;
        }
        if (format == null) {
            return new Result(Verification.UNSUPPORTED, "FORMAT", null, List.of(), List.of(), ev);
        }
        if (NOT_PLAN.matcher(compact).find()) {
            return new Result(Verification.NOT_PLAN, "NOT_PLAN_FILE", format, List.of(), List.of(), ev);
        }
        String head = SourceTextProbe.head(bytes, format);
        String title = head.length() <= TITLE_CHARS ? head : head.substring(0, TITLE_CHARS);
        String titleCompact = compact(title);

        TreeSet<Integer> nameYears = years(NAME_YEAR, fileName);
        Integer textYear = first(TEXT_YEAR, head);
        List<Integer> grades = SchoolInfoImportService.gradesOf(compact);
        String gradeFrom = "fileName";
        if (grades.isEmpty()) {
            grades = SchoolInfoImportService.gradesOf(titleCompact);
            gradeFrom = grades.isEmpty() ? null : "documentTitle";
        }
        List<Integer> semesters = semestersOf(compact);
        String semesterFrom = "fileName";
        if (semesters.isEmpty()) {
            semesters = semestersOf(titleCompact);
            semesterFrom = semesters.isEmpty() ? null : "documentTitle";
        }
        List<Integer> monthSemesters = disclosureMonth == null ? List.of() : disclosureMonth == 4 ? List.of(1) : disclosureMonth == 9 ? List.of(2) : List.of();
        ev.put("disclosureMonth", disclosureMonth);
        boolean semesterConflict = !semesters.isEmpty() && !monthSemesters.isEmpty() && !semesters.equals(monthSemesters)
                && !semesters.equals(List.of(1, 2));
        if (semesters.isEmpty() && !monthSemesters.isEmpty()) {
            semesters = monthSemesters;
            semesterFrom = "disclosureMonth";
        }
        String gradeReason = null;
        // A28-09: 파일 이름에 학년이 없는 '과별' 공시(예: '수학과 교수학습 및 평가 운영 계획')는 제목 첫머리의 첫 단원 학년(예: 1학년)만 보고
        // 그 학년에만 두지 않는다. 본문이 1·2·3학년을 모두 다루면 같은 학기의 전 학년 공용 원본으로 본다(근거 GRADES_FROM_BODY_ALL).
        // 본문이 제목 학년만 가리키거나 일부만 더 가리키면 기존대로 제목 학년(보수적 — 임의로 넓히지 않음).
        // 제목에 학년이 둘 이상 명시('1·2학년')되면 그 명시가 근거이므로 넓히지 않는다(제목 학년이 하나일 때만).
        if (grades.size() == 1 && "documentTitle".equals(gradeFrom) && SUBJECT_DEPARTMENT.matcher(compact).find()
                && !semesters.isEmpty() && !semesterConflict) {
            List<Integer> bodyGrades = SchoolInfoImportService.gradesOf(compact(SourceTextProbe.head(bytes, format, SourceTextProbe.BODY_LIMIT)));
            ev.put("titleGrades", grades);
            ev.put("bodyGrades", bodyGrades);
            if (bodyGrades.containsAll(List.of(1, 2, 3)) && !grades.containsAll(List.of(1, 2, 3))) {
                grades = List.of(1, 2, 3);
                gradeFrom = "GRADES_FROM_BODY_ALL";
                gradeReason = "GRADES_FROM_BODY_ALL";
            } else {
                // A28-24: 과별 통합 공시는 과목 단원(예: '[정치] 교수학습 및 평가 운영 계획 … 2학년')이 본문 4만 자 뒤에 이어진다.
                // 본문 앞부분만 보면 고1 로 잘못 고정된다 → 원문 전체에서 '과목 계획 머리글 + 그 과목 학년'만 모아 적용 학년을 정한다.
                // 학년 낱말 단순 출현(예: '2학년 진로 연계')은 세지 않는다. 1·2·3 모두면 전 학년(ALL_GRADES), 일부면 그 학년만(EXPLICIT_GRADES).
                List<Integer> sectionGrades = sectionGrades(SourceTextProbe.head(bytes, format, DEPARTMENT_BODY_LIMIT));
                ev.put("sectionGrades", sectionGrades);
                if (sectionGrades.containsAll(List.of(1, 2, 3))) {
                    grades = List.of(1, 2, 3);
                    gradeFrom = "SECTION_GRADES";
                    gradeReason = "GRADES_FROM_BODY_ALL";
                } else if (sectionGrades.size() > 1 && sectionGrades.containsAll(grades)) {
                    grades = sectionGrades;
                    gradeFrom = "SECTION_GRADES";
                    gradeReason = "GRADES_FROM_SECTIONS";
                }
            }
        }
        if (grades.isEmpty() && !semesters.isEmpty() && !semesterConflict) {
            List<Integer> bodyGrades = SchoolInfoImportService.gradesOf(compact(SourceTextProbe.head(bytes, format, SourceTextProbe.BODY_LIMIT)));
            ev.put("bodyGrades", bodyGrades);
            gradeReason = gradeScope(bodyGrades);
            if (!"GRADE_SCOPE_CONFLICT".equals(gradeReason)) {
                grades = List.of(1, 2, 3);
                gradeFrom = gradeReason;
            }
        }
        ev.put("fileNameYears", List.copyOf(nameYears));
        ev.put("documentYear", textYear);
        ev.put("grades", grades);
        ev.put("gradeFrom", gradeFrom);
        ev.put("semesters", semesters);
        ev.put("semesterFrom", semesterFrom);

        if (!trustYearQuery) {
            return new Result(Verification.NEEDS_SOURCE_VERIFICATION, "YEAR_QUERY_UNVERIFIED", format, grades, semesters, ev);
        }
        if (resolvedYear == null) {
            return new Result(Verification.NEEDS_SOURCE_VERIFICATION, "NO_DISCLOSURE_YEAR", format, grades, semesters, ev);
        }
        if (resolvedYear != requestedYear) {
            return new Result(Verification.YEAR_MISMATCH, "DISCLOSURE_YEAR_DIFFERS", format, grades, semesters, ev);
        }
        // 파일 이름에 연도가 있으면 그것만, 없으면 원문의 첫 'YYYY학년도'를 문서 학년도로 본다
        if (!nameYears.isEmpty()) {
            if (!nameYears.contains(requestedYear)) {
                return new Result(Verification.YEAR_MISMATCH, "FILE_YEAR_DIFFERS", format, grades, semesters, ev);
            }
            if (nameYears.size() > 1) {
                return new Result(Verification.NEEDS_SOURCE_VERIFICATION, "FILE_YEAR_CONFLICT", format, grades, semesters, ev);
            }
        } else if (textYear == null) {
            return new Result(Verification.NEEDS_SOURCE_VERIFICATION, "NO_FILE_YEAR_EVIDENCE", format, grades, semesters, ev);
        } else if (textYear != requestedYear) {
            return new Result(Verification.YEAR_MISMATCH, "FILE_YEAR_DIFFERS", format, grades, semesters, ev);
        }
        if (semesterConflict) {
            return new Result(Verification.UNCLASSIFIED, "SEMESTER_CONFLICT", format, grades, semesters, ev);
        }
        if (semesters.isEmpty()) {
            return new Result(Verification.UNCLASSIFIED, "NO_SEMESTER_EVIDENCE", format, grades, semesters, ev);
        }
        if ("GRADE_SCOPE_CONFLICT".equals(gradeReason)) {
            return new Result(Verification.UNCLASSIFIED, "GRADE_SCOPE_CONFLICT", format, List.of(), semesters, ev);
        }
        if (grades.isEmpty()) {
            return new Result(Verification.UNCLASSIFIED, "NO_GRADE_EVIDENCE", format, grades, semesters, ev);
        }
        // VERIFIED 의 reason: 학년 미표기 → 전 학년(관리 슬롯 분류일 뿐, 학생 공식 개설 과목 선언이 아님)
        return new Result(Verification.VERIFIED, gradeReason, format, grades, semesters, ev);
    }

    /** 공백을 지우되, 숫자 사이 공백('2026 1학년')은 구분자로 남겨 숫자가 붙지 않게 한다. */
    static String compact(String s) {
        return s.replaceAll("(\\d)\\s+(?=\\d)", "$1|").replaceAll("\\s+", "");
    }

    /** HWPX 는 첫 항목이 압축하지 않은 'mimetype'(application/hwp+zip)이다. DOCX·XLSX 는 아니다. */
    static boolean looksHwpx(byte[] b) {
        int n = Math.min(b.length, 200);
        String head = new String(b, 0, n, java.nio.charset.StandardCharsets.ISO_8859_1);
        return head.contains("mimetype") && head.contains("application/hwp+zip");
    }

    /**
     * 이름·제목에 학년이 없을 때 본문 학년 표기로 범위를 정한다: 없음 → 전 학년, 1·2·3 모두 → 전 학년, 일부만 → 보류.
     */
    static String gradeScope(List<Integer> bodyGrades) {
        if (bodyGrades.isEmpty()) {
            return "GRADE_UNSPECIFIED_ALL_GRADES_APPLIED";
        }
        if (bodyGrades.containsAll(List.of(1, 2, 3))) {
            return "GRADES_FROM_BODY_ALL";
        }
        return "GRADE_SCOPE_CONFLICT";
    }

    /** '1학기'·'2학기'·'1,2학기'·'1·2학기'. 둘 다 적힌 경우만 두 학기. 없으면 빈 목록. */
    static List<Integer> semestersOf(String compact) {
        if (BOTH_SEMESTERS.matcher(compact).find()) {
            return List.of(1, 2);
        }
        TreeSet<Integer> out = new TreeSet<>();
        Matcher m = SEMESTER.matcher(compact);
        while (m.find()) {
            out.add(Integer.parseInt(m.group(1)));
        }
        return List.copyOf(out);
    }

    private static TreeSet<Integer> years(Pattern p, String s) {
        TreeSet<Integer> out = new TreeSet<>();
        Matcher m = p.matcher(s);
        while (m.find()) {
            out.add(Integer.parseInt(m.group(1)));
        }
        return out;
    }

    private static Integer first(Pattern p, String s) {
        Matcher m = p.matcher(s);
        return m.find() ? Integer.valueOf(m.group(1)) : null;
    }
}
