import java.io.File;
import java.util.*;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;

/**
 * 합성 평가계획서 PDF (가상 학교·과목, 실제 학교 자료 아님).
 * 계정 B v21 단위 테스트의 합성 DocumentModel(TEACHING/SUMMARY/DETAIL/AMBIG 표)과 같은 내용을
 * 실제 PDF로 그려서, 분석기를 PDF 경로(PdfLayout → DocumentModel → 조립 → Adapter)로 돌리기 위한 Fixture.
 * args: <out.pdf> <ttfFont>
 */
public class SynthPlanPdf {
    static PDType0Font f;
    static final float FS = 8.5f, LH = 11.5f, PAD = 4f;

    record Cell(int r, int c, String text, int rs, int cs) {}

    static Cell c(int r, int c, String t) { return new Cell(r, c, t, 1, 1); }
    static Cell c(int r, int c, String t, int rs, int cs) { return new Cell(r, c, t, rs, cs); }

    static void text(PDPageContentStream s, float x, float yTop, String t, float size) throws Exception {
        s.beginText(); s.setFont(f, size); s.newLineAtOffset(x, 842 - yTop); s.showText(t); s.endText();
    }

    /** 칸마다 사각형 테두리 + 줄바꿈 글. 반환: 표 아래 y. */
    static float table(PDPageContentStream s, float x0, float yTop, float[] widths, List<Cell> cells) throws Exception {
        int rows = 0;
        for (Cell k : cells) rows = Math.max(rows, k.r + k.rs);
        float[] rh = new float[rows];
        Arrays.fill(rh, LH + 2 * PAD);
        for (Cell k : cells) if (k.rs == 1) rh[k.r] = Math.max(rh[k.r], k.text.split("\n").length * LH + 2 * PAD);
        float[] ry = new float[rows + 1];
        ry[0] = yTop;
        for (int i = 0; i < rows; i++) ry[i + 1] = ry[i] + rh[i];
        float[] cx = new float[widths.length + 1];
        cx[0] = x0;
        for (int i = 0; i < widths.length; i++) cx[i + 1] = cx[i] + widths[i];
        for (Cell k : cells) {
            float l = cx[k.c], r = cx[k.c + k.cs], t = ry[k.r], b = ry[k.r + k.rs];
            s.addRect(l, 842 - b, r - l, b - t); s.stroke();
            String[] lines = k.text.split("\n");
            for (int i = 0; i < lines.length; i++) text(s, l + PAD, t + PAD + (i + 1) * LH - 2.5f, lines[i], FS);
        }
        return ry[rows];
    }

    public static void main(String[] a) throws Exception {
        try (PDDocument d = new PDDocument()) {
            f = PDType0Font.load(d, new File(a[1]));
            // ── 1쪽 ──
            PDPage p1 = new PDPage(PDRectangle.A4); d.addPage(p1);
            try (PDPageContentStream s = new PDPageContentStream(d, p1)) {
                s.addRect(50, 842 - 80, 495, 30); s.stroke();
                text(s, 60, 70, "2026학년도 1학년 1학기 [과학] 가상고등학교", 11);
                float y = table(s, 50, 95, new float[]{120, 120, 120, 135},
                        List.of(c(0, 0, "학교명"), c(0, 1, "학년"), c(0, 2, "학기"), c(0, 3, "과목"),
                                c(1, 0, "가상고"), c(1, 1, "1학년"), c(1, 2, "1학기"), c(1, 3, "과학")));
                text(s, 50, y + 22, "1. 교수·학습 운영 계획", 10);
                y = table(s, 50, y + 30, new float[]{30, 30, 70, 230, 135}, List.of(
                        c(0, 0, "월"), c(0, 1, "주"), c(0, 2, "단원"), c(0, 3, "학습 내용"), c(0, 4, "평가 방법"),
                        c(1, 0, "3"), c(1, 1, "1"), c(1, 2, "1. 물질"), c(1, 3, "모둠 토의 활동 후 발표\n활동지를 제출한다."), c(1, 4, "형성평가(자기평가)"),
                        c(2, 0, "4"), c(2, 1, "2"), c(2, 2, "2. 에너지"), c(2, 3, "개인별 실험 보고서 작성 20분 이내"), c(2, 4, "관찰평가")));
                text(s, 50, y + 22, "2. 평가 계획", 10);
                table(s, 50, y + 30, new float[]{45, 45, 100, 100, 100, 105}, List.of(
                        c(0, 0, "평가 종류", 1, 2), c(0, 2, "지 필 평 가", 1, 2), c(0, 4, "수 행 평 가", 1, 2),
                        c(1, 0, "반영비율", 1, 2), c(1, 2, "50%", 1, 2), c(1, 4, "50%", 1, 2),
                        c(2, 0, "평가영역", 1, 2), c(2, 2, "1차 시험(50%)", 1, 2), c(2, 4, "탐구 보고서"), c(2, 5, "발표 활동"),
                        c(3, 0, "평가 방법", 1, 2), c(3, 2, "선택형"), c(3, 3, "서답형"), c(3, 4, "서술형"), c(3, 5, "구술"),
                        c(4, 0, "영역만점", 1, 2), c(4, 2, "70점"), c(4, 3, "30점"), c(4, 4, "25점"), c(4, 5, "40점"),
                        c(5, 0, "세부\n반영비율", 1, 2), c(5, 2, "35%"), c(5, 3, "15%"), c(5, 4, "25%"), c(5, 5, "25%"),
                        c(6, 0, "기본점수", 1, 2), c(6, 2, "0점", 1, 2), c(6, 4, "5점"), c(6, 5, "5점"),
                        c(7, 0, "평가시기", 1, 2), c(7, 2, "5월", 1, 2), c(7, 4, "4월"), c(7, 5, "6월")));
                text(s, 285, 820, "- 1 -", 9);
            }
            // ── 2쪽 ──
            PDPage p2 = new PDPage(PDRectangle.A4); d.addPage(p2);
            try (PDPageContentStream s = new PDPageContentStream(d, p2)) {
                text(s, 50, 60, "가. 탐구 보고서 세부 계획", 10);
                float y = table(s, 50, 70, new float[]{90, 250, 80, 75}, List.of(
                        c(0, 0, "수행 과제"), c(0, 1, "1. 하천 수질 측정 실험을 수행한다.\n2. 측정 결과를 정리하여 탐구 보고서를\n제출한다.", 1, 3),
                        c(1, 0, "평가 목표"), c(1, 1, "• 변인을 통제하여 실험을 설계할 수 있다.", 1, 3),
                        c(2, 0, "유의사항"), c(2, 1, "보고서는 A4 2쪽 이상으로 작성한다.\n발표는 5분 이내로 한다.", 1, 3),
                        c(3, 0, "평가 요소"), c(3, 1, "채점 기준"), c(3, 2, "배점"),
                        c(4, 0, "실험 설계", 2, 1), c(4, 1, "변인 통제가 명확함"), c(4, 2, "10"),
                        c(5, 1, "변인 통제가 일부 부족함"), c(5, 2, "5"),
                        c(6, 0, "보고서 작성", 2, 1), c(6, 1, "결과와 결론이 타당함"), c(6, 2, "15"),
                        c(7, 1, "결과 해석이 부족함"), c(7, 2, "8")));
                text(s, 50, y + 22, "나. 발표 활동 및 탐구 보고서 공통 채점", 10);
                table(s, 50, y + 30, new float[]{90, 250, 80}, List.of(
                        c(0, 0, "평가 요소"), c(0, 1, "채점 기준"), c(0, 2, "배점"),
                        c(1, 0, "내용", 2, 1), c(1, 1, "우수함"), c(1, 2, "20"), c(2, 1, "보통임"), c(2, 2, "10"),
                        c(3, 0, "전달", 2, 1), c(3, 1, "명확함"), c(3, 2, "20"), c(4, 1, "부족함"), c(4, 2, "10")));
                text(s, 285, 820, "- 2 -", 9);
            }
            d.save(new File(a[0]));
        }
    }
}
