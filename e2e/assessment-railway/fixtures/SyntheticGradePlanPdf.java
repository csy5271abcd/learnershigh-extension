import java.io.File;
import java.util.Arrays;
import java.util.Calendar;
import java.util.GregorianCalendar;
import java.util.TimeZone;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;

/**
 * A19 원격(Railway) 분석기 시험용 합성 평가계획서 PDF — 가상 학교·가상 과목만(실제 학교 자료 아님).
 * 계정 B 공개 Fixture(Contract03PlanMaker)와 같은 방식(괘선 표, 고정 메타데이터 → 같은 입력이면 같은 바이트)으로,
 * 학년을 인자로 받아 1쪽 머리표 + 평가 요약표 + 탐구 보고서 채점기준표 / 2쪽 교수·학습 운영 계획표를 만든다.
 * 내용은 synthetic_grade_plans.py의 HTML과 같다(과목·과제·운영 행).
 * args: <grade 1|2|3> <out.pdf> <ttfFont (공개 라이선스 글꼴, 예: NanumGothic SIL OFL)>
 */
public class SyntheticGradePlanPdf {
    static PDType0Font f;
    static final float H = 842, LINE = 12, PAD = 4;
    static final String[] SUBJECT = {"", "가상과학탐구", "가상사회탐구", "가상융합탐구"};
    static final String[] TASK = {"", "가상 하천의 수질을 측정하는 실험을 수행한다.", "가상 도시의 인구 자료를 분석한다.", "가상 에너지 절약 방안을 설계한다."};

    static void text(PDPageContentStream c, float x, float yTop, String s, float size) throws Exception {
        c.beginText(); c.setFont(f, size); c.newLineAtOffset(x, H - yTop); c.showText(s); c.endText();
    }

    static float table(PDPageContentStream c, float x0, float y0, float[] colW, Object[][] cells) throws Exception {
        int rows = 0;
        for (Object[] k : cells) rows = Math.max(rows, (int) k[0] + (int) k[2]);
        float[] rh = new float[rows];
        Arrays.fill(rh, 2 * PAD + LINE);
        for (Object[] k : cells) if ((int) k[2] == 1) {
            int n = ((String) k[4]).split("\n").length;
            rh[(int) k[0]] = Math.max(rh[(int) k[0]], 2 * PAD + LINE * n);
        }
        float[] ry = new float[rows + 1]; ry[0] = y0;
        for (int i = 0; i < rows; i++) ry[i + 1] = ry[i] + rh[i];
        float[] cx = new float[colW.length + 1]; cx[0] = x0;
        for (int i = 0; i < colW.length; i++) cx[i + 1] = cx[i] + colW[i];
        for (Object[] k : cells) {
            int r = (int) k[0], q = (int) k[1], rs = (int) k[2], cs = (int) k[3];
            float a = cx[q], b = cx[q + cs], t = ry[r], u = ry[r + rs];
            c.addRect(a, H - u, b - a, u - t); c.stroke();
            String[] ls = ((String) k[4]).split("\n");
            for (int i = 0; i < ls.length; i++) if (!ls[i].isEmpty()) text(c, a + PAD, t + PAD + LINE * (i + 1) - 2, ls[i], 9);
        }
        return ry[rows];
    }

    static Object[] k(int r, int q, int rs, int cs, String s) { return new Object[]{r, q, rs, cs, s}; }

    public static void main(String[] a) throws Exception {
        int g = Integer.parseInt(a[0]);
        if (g < 1 || g > 3) throw new IllegalArgumentException("grade 1..3");
        String s = SUBJECT[g];
        try (PDDocument d = new PDDocument()) {
            Calendar fixed = new GregorianCalendar(2099, Calendar.JANUARY, 1, 0, 0, 0);
            fixed.setTimeZone(TimeZone.getTimeZone("UTC"));
            d.getDocumentInformation().setCreationDate(fixed);
            d.getDocumentInformation().setModificationDate(fixed);
            d.getDocumentInformation().setTitle("synthetic plan grade " + g + " (virtual school)");
            d.getDocumentInformation().setProducer("SyntheticGradePlanPdf");
            f = PDType0Font.load(d, new File(a[2]));
            PDPage p1 = new PDPage(PDRectangle.A4); d.addPage(p1);
            try (PDPageContentStream c = new PDPageContentStream(d, p1)) {
                c.addRect(50, H - 80, 495, 30); c.stroke();
                text(c, 60, 70, "2099학년도 " + g + "학년 1학기 [" + s + "] 가상고등학교 평가 계획", 11);
                table(c, 50, 100, new float[]{120, 120, 120, 135}, new Object[][]{
                    k(0, 0, 1, 1, "학교명"), k(0, 1, 1, 1, "학년"), k(0, 2, 1, 1, "학기"), k(0, 3, 1, 1, "과목"),
                    k(1, 0, 1, 1, "가상고"), k(1, 1, 1, 1, g + "학년"), k(1, 2, 1, 1, "1학기"), k(1, 3, 1, 1, s)});
                text(c, 50, 170, "1. 평가 계획", 10);
                float y = table(c, 50, 180, new float[]{95, 100, 100, 100, 100}, new Object[][]{
                    k(0, 0, 1, 1, "평가 종류"), k(0, 1, 1, 2, "지필평가"), k(0, 3, 1, 2, "수행평가"),
                    k(1, 0, 1, 1, "반영비율"), k(1, 1, 1, 2, "40%"), k(1, 3, 1, 2, "60%"),
                    k(2, 0, 1, 1, "평가영역"), k(2, 1, 1, 2, "1차 지필평가(40%)"), k(2, 3, 1, 1, "탐구 보고서"), k(2, 4, 1, 1, "토론 활동"),
                    k(3, 0, 1, 1, "평가 방법"), k(3, 1, 1, 1, "선택형"), k(3, 2, 1, 1, "서답형"), k(3, 3, 1, 1, "서술형"), k(3, 4, 1, 1, "토의토론"),
                    k(4, 0, 1, 1, "영역만점"), k(4, 1, 1, 1, "70점"), k(4, 2, 1, 1, "30점"), k(4, 3, 1, 1, "100점"), k(4, 4, 1, 1, "100점"),
                    k(5, 0, 1, 1, "세부 반영비율"), k(5, 1, 1, 1, "28%"), k(5, 2, 1, 1, "12%"), k(5, 3, 1, 1, "30%"), k(5, 4, 1, 1, "30%"),
                    k(6, 0, 1, 1, "기본점수"), k(6, 1, 1, 2, "0점"), k(6, 3, 1, 1, "10점"), k(6, 4, 1, 1, "10점"),
                    k(7, 0, 1, 1, "평가시기"), k(7, 1, 1, 2, "5월"), k(7, 3, 1, 1, "4월"), k(7, 4, 1, 1, "6월")});
                text(c, 50, y + 25, "가. 탐구 보고서 세부 계획", 10);
                table(c, 50, y + 35, new float[]{95, 300, 100}, new Object[][]{
                    k(0, 0, 1, 1, "수행 과제"), k(0, 1, 1, 2, "1. " + TASK[g] + "\n2. 결과를 정리하여 탐구 보고서를 제출한다."),
                    k(1, 0, 1, 1, "평가 목표"), k(1, 1, 1, 2, "자료를 근거로 결론을 도출할 수 있다."),
                    k(2, 0, 1, 1, "평가 요소"), k(2, 1, 1, 1, "채점 기준"), k(2, 2, 1, 1, "배점"),
                    k(3, 0, 2, 1, "탐구 설계"), k(3, 1, 1, 1, "설계가 명확함"), k(3, 2, 1, 1, "50"),
                    k(4, 1, 1, 1, "설계가 일부 부족함"), k(4, 2, 1, 1, "30"),
                    k(5, 0, 2, 1, "보고서 작성"), k(5, 1, 1, 1, "결과와 결론이 타당함"), k(5, 2, 1, 1, "50"),
                    k(6, 1, 1, 1, "결과 해석이 부족함"), k(6, 2, 1, 1, "30")});
                text(c, 290, 820, "- 1 -", 9);
            }
            PDPage p2 = new PDPage(PDRectangle.A4); d.addPage(p2);
            try (PDPageContentStream c = new PDPageContentStream(d, p2)) {
                text(c, 50, 60, "2. 교수·학습 운영 계획", 10);
                table(c, 50, 70, new float[]{60, 90, 130, 215}, new Object[][]{
                    k(0, 0, 1, 1, "월"), k(0, 1, 1, 1, "주"), k(0, 2, 1, 1, "단원명"), k(0, 3, 1, 1, "학습내용"),
                    k(1, 0, 1, 1, "3"), k(1, 1, 1, 1, "3월 1주"), k(1, 2, 1, 1, "1. 가상 기초 단원"), k(1, 3, 1, 1, "가상 개념 관찰"),
                    k(2, 0, 1, 1, "3"), k(2, 1, 1, 1, "3월 2주"), k(2, 2, 1, 1, "1. 가상 기초 단원"), k(2, 3, 1, 1, "탐구 주제 정하기"),
                    k(3, 0, 1, 1, "4"), k(3, 1, 1, 1, "4월 1주"), k(3, 2, 1, 1, "2. 가상 응용 단원"), k(3, 3, 1, 1, "가상 자료 수집"),
                    k(4, 0, 1, 1, "5"), k(4, 1, 1, 1, ""), k(4, 2, 1, 1, "2. 가상 응용 단원"), k(4, 3, 1, 1, "토론 활동 준비"),
                    k(5, 0, 1, 1, "6~7"), k(5, 1, 1, 1, ""), k(5, 2, 1, 1, "3. 가상 정리 단원"), k(5, 3, 1, 1, "학기 정리 발표")});
                text(c, 290, 820, "- 2 -", 9);
            }
            d.save(new File(a[1]));
        }
    }
}
