package com.learnershigh.extension.assessment.service.plan.extract;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.util.List;
import org.junit.jupiter.api.Test;

/** 스캔본 쪽: 그림의 표 선 + OCR 단어 → 칸. OCR 엔진 없이 단어를 직접 준다. */
class ScanOcrTest {

    @Test
    void 그림의_표_선과_단어로_칸을_만든다() {
        BufferedImage img = new BufferedImage(1200, 800, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g = img.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, 1200, 800);
        g.setColor(Color.BLACK);
        int[] ys = {100, 200, 300, 400};
        int[] xs = {100, 500, 800, 1100};
        for (int y : ys) {
            g.fillRect(100, y, 1001, 2);
        }
        for (int x : xs) {
            g.fillRect(x, 100, 2, 302);
        }
        g.dispose();
        List<ScanOcr.Word> words = List.of(
                new ScanOcr.Word(120, 130, 120, 30, "평가 영역"), new ScanOcr.Word(520, 130, 120, 30, "반영비율"),
                new ScanOcr.Word(120, 230, 120, 30, "1자시험"), new ScanOcr.Word(520, 230, 60, 30, "30%"),
                new ScanOcr.Word(120, 330, 120, 30, "발표"), new ScanOcr.Word(520, 330, 60, 30, "40%"));
        ScanOcr.PageScan s = ScanOcr.scan(img, words);
        List<PdfTables.Table> tables = PdfTables.Grid.build(s.h(), s.v(), s.glyphs(), 1);
        assertThat(tables).hasSize(1);
        List<List<String>> cells = tables.get(0).cells;
        assertThat(cells).hasSize(3);
        assertThat(cells.get(1).get(0)).isEqualTo("1차시험");
        assertThat(cells.get(2).get(1)).isEqualTo("40%");
    }

    @Test
    void 자주_틀리는_OCR_글자를_고친다() {
        assertThat(ScanOcr.fix("2자시험")).isEqualTo("2차시험");
        assertThat(ScanOcr.fix("반영비율(96)")).isEqualTo("반영비율(%)");
        assertThat(ScanOcr.fix("공통국어기")).isEqualTo("공통국어2");
        assertThat(ScanOcr.fix("기능")).isEqualTo("기능");
    }

    @Test
    void 구분_열이_없는_평가표는_시험_행을_지필로_본다() {
        List<List<String>> g = List.of(
                List.of("평가 영역", "영역 만점", "학기말 반영비율"),
                List.of("1차시험(중간시험)", "100", "30"),
                List.of("2차시험", "100", "30"),
                List.of("독서 활동", "20", "20"),
                List.of("발표", "20", "20"));
        assertThat(RatioRules.isUnit(g)).isTrue();
        RatioRules.Result r = RatioRules.famRow(g);
        assertThat(r.examTotal()).isEqualTo(60.0);
        assertThat(r.perfTotal()).isEqualTo(40.0);
        assertThat(r.items()).extracting(RatioRules.Item::label).containsExactly("독서 활동", "발표");
    }
}
