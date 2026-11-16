package com.learnershigh.extension.assessment.integration.preview;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;

/** A25 변환 명령: 원본 파일명 대신 고정 이름, 네트워크 차단·자원 제한, 형식·크기 거절. 실제 변환은 하지 않는다. */
class ProcessPlanPreviewConverterTest {

    final Path work = Path.of("build", "tmp", "preview-work");

    @Test
    void docker_명령은_네트워크를_끊고_자원을_제한하며_고정_파일명만_넘긴다() {
        ProcessPlanPreviewConverter converter = new ProcessPlanPreviewConverter(ProcessPlanPreviewConverter.Mode.DOCKER,
                "docker", "lh-plan-preview-converter:0.1", Duration.ofSeconds(30), 1024, 1);
        List<String> command = converter.command(work, "hwpx");
        assertThat(command).containsSequence("--network", "none").contains("--memory", "--cpus", "--pids-limit", "--rm");
        assertThat(command.get(command.size() - 1)).isEqualTo("in/source.hwpx");
        assertThat(command).anyMatch(arg -> arg.endsWith(":/work/in:ro"));
        assertThat(converter.id()).isEqualTo("docker:lh-plan-preview-converter:0.1");
    }

    @Test
    void soffice_명령도_고정_파일명과_전용_프로필을_쓴다() {
        ProcessPlanPreviewConverter converter = new ProcessPlanPreviewConverter(ProcessPlanPreviewConverter.Mode.SOFFICE,
                "soffice", "unused", Duration.ofSeconds(30), 1024, 1);
        List<String> command = converter.command(work, "hwp");
        assertThat(command).contains("--headless", "--convert-to", "pdf");
        assertThat(command.get(command.size() - 1)).endsWith("source.hwp");
        assertThat(command).anyMatch(arg -> arg.startsWith("-env:UserInstallation="));
    }

    @Test
    void 지원하지_않는_형식과_크기_초과는_실행하지_않고_거절한다() {
        ProcessPlanPreviewConverter converter = new ProcessPlanPreviewConverter(ProcessPlanPreviewConverter.Mode.DOCKER,
                "definitely-not-a-real-executable", "img", Duration.ofSeconds(5), 4, 1);
        assertThat(converter.convert(new byte[] {1}, "exe").failure()).isEqualTo("unsupported_format");
        assertThat(converter.convert(new byte[] {1, 2, 3, 4, 5}, "hwp").failure()).isEqualTo("source_too_large");
        assertThat(converter.convert(new byte[0], "hwp").failure()).isEqualTo("source_too_large");
        // 실행 파일이 없으면 변환기 사용 불가(문서 문제 아님 → 실패로 기록하지 않는 원인)
        assertThat(converter.convert(new byte[] {1}, "hwp").failure()).isEqualTo("converter_unavailable");
    }
}
