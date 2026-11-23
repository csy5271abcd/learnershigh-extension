package com.learnershigh.extension.assessment.integration.preview;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** A27 변환 실패 진단: H2Orestart 로그의 예외 종류·첫 위치, LibreOffice 마지막 줄만 남기고 문서 내용(한글 등)은 남기지 않는다. */
class ConversionDiagnosticsTest {

    @TempDir
    Path work;

    @Test
    void 필터_예외와_LibreOffice_메시지를_요약한다() throws Exception {
        Files.createDirectories(work.resolve("log").resolve("H2Orestart"));
        Files.writeString(work.resolve("console.txt"), "Error: source file could not be loaded\n", StandardCharsets.UTF_8);
        Files.writeString(work.resolve("log").resolve("H2Orestart").resolve("import_0.log"), """
                [11-17 04:19] (.comp.H2OrestartImpl.filt) INFO: Converting document. name=source.hwp, size=1123328, detectedType=HWP
                [11-17 04:19] (HwpDoc.HwpSection.pars) SEVERE: Unknown CtrlId=tmct. Skip HWPTAG_PARA_HEADER
                [11-17 04:19] (.comp.H2OrestartImpl.logF) SEVERE: Failed to convert document. java.lang.NullPointerException: Cannot invoke "x" because "formulaProps" is null
                java.lang.NullPointerException: Cannot invoke "x" because "formulaProps" is null
                \tat soffice.ConvEquation.addFormula(ConvEquation.java:102)
                \tat soffice.HwpRecurs.printParaRecurs(HwpRecurs.java:307)
                """, StandardCharsets.UTF_8);
        assertThat(ConversionDiagnostics.summarize(0, work))
                .isEqualTo("exit=0; office=Error: source file could not be loaded; filter=NullPointerException at soffice.ConvEquation.addFormula");
    }

    @Test
    void 예외_기록이_없으면_마지막_SEVERE를_단서로_남긴다() throws Exception {
        Files.createDirectories(work.resolve("log").resolve("H2Orestart"));
        Files.writeString(work.resolve("log").resolve("H2Orestart").resolve("import_0.log"), """
                [11-17 04:34] (soffice.ConvGraphics.setW) SEVERE: ContourOutside has exception
                [11-17 04:34] (t.HwpRecord_CtrlData.pars) SEVERE: Neither known ctrlID= lbt nor implemented.
                """, StandardCharsets.UTF_8);
        assertThat(ConversionDiagnostics.summarize(0, work)).isEqualTo("exit=0; filter=lastSevere t.HwpRecord_CtrlData.pars Neither known ctrlID= lbt nor implemented.");
    }

    @Test
    void 로그가_없으면_종료_코드만_남기고_문서_내용은_지운다() throws Exception {
        Files.writeString(work.resolve("console.txt"), "평가계획 본문 내용 2026학년도 비밀\n", StandardCharsets.UTF_8);
        String summary = ConversionDiagnostics.summarize(1, work);
        assertThat(summary).startsWith("exit=1").doesNotContain("평가", "비밀");
        assertThat(ConversionDiagnostics.safe("x".repeat(500))).hasSize(200);
    }
}
