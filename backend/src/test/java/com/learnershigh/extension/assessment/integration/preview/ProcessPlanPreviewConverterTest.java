package com.learnershigh.extension.assessment.integration.preview;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;

/** A25·A26 변환 명령: 원본 파일명 대신 고정 이름, 네트워크 차단·자원 제한, 형식·크기 거절, 이미지 준비 전 거절. 실제 변환은 하지 않는다. */
class ProcessPlanPreviewConverterTest {

    final Path work = Path.of("build", "tmp", "preview-work");

    static ConverterImageProvisioner images(int dockerExit, int inspectExit) {
        return new ConverterImageProvisioner("docker", "", true,
                (command, stdin, timeout) -> new ConverterImageProvisioner.CommandRunner.Result(
                        command.get(1).equals("version") ? dockerExit : command.get(1).equals("image") ? inspectExit : 0, ""),
                Clock.systemUTC());
    }

    @Test
    void docker_명령은_네트워크를_끊고_자원을_제한하며_고정_파일명과_Dockerfile_해시_이미지를_쓴다() {
        ConverterImageProvisioner provisioner = images(0, 0);
        ProcessPlanPreviewConverter converter = new ProcessPlanPreviewConverter(ProcessPlanPreviewConverter.Mode.DOCKER,
                "docker", provisioner, Duration.ofSeconds(30), 1024, 1);
        List<String> command = converter.command(work, "hwpx");
        assertThat(command).containsSequence("--network", "none").contains("--memory", "--cpus", "--pids-limit", "--rm");
        assertThat(command.get(command.size() - 1)).isEqualTo("in/source.hwpx");
        assertThat(command).anyMatch(arg -> arg.endsWith(":/work/in:ro"));
        assertThat(provisioner.image()).matches("lh-plan-preview-converter:[0-9a-f]{12}");
        assertThat(command).contains(provisioner.image());
        assertThat(converter.id()).isEqualTo("docker:" + provisioner.image());
    }

    @Test
    void soffice_명령도_고정_파일명과_전용_프로필을_쓴다() {
        ProcessPlanPreviewConverter converter = new ProcessPlanPreviewConverter(ProcessPlanPreviewConverter.Mode.SOFFICE,
                "soffice", null, Duration.ofSeconds(30), 1024, 1);
        List<String> command = converter.command(work, "hwp");
        assertThat(command).contains("--headless", "--convert-to", "pdf");
        assertThat(command.get(command.size() - 1)).endsWith("source.hwp");
        assertThat(command).anyMatch(arg -> arg.startsWith("-env:UserInstallation="));
    }

    @Test
    void 지원하지_않는_형식과_크기_초과는_실행하지_않고_거절한다() {
        ProcessPlanPreviewConverter converter = new ProcessPlanPreviewConverter(ProcessPlanPreviewConverter.Mode.SOFFICE,
                "definitely-not-a-real-executable", null, Duration.ofSeconds(5), 4, 1);
        assertThat(converter.convert(new byte[] {1}, "exe").failure()).isEqualTo("unsupported_format");
        assertThat(converter.convert(new byte[] {1, 2, 3, 4, 5}, "hwp").failure()).isEqualTo("source_too_large");
        assertThat(converter.convert(new byte[0], "hwp").failure()).isEqualTo("source_too_large");
        // 실행 파일이 없으면 변환기 사용 불가(문서 문제 아님 → 실패로 기록하지 않는 원인)
        assertThat(converter.convert(new byte[] {1}, "hwp").failure()).isEqualTo("converter_unavailable");
    }

    @Test
    void 이미지가_준비되기_전에는_변환하지_않고_준비_중으로_답한다() {
        ProcessPlanPreviewConverter converter = new ProcessPlanPreviewConverter(ProcessPlanPreviewConverter.Mode.DOCKER,
                "docker", images(1, 1), Duration.ofSeconds(5), 1024, 1);
        assertThat(converter.convert(new byte[] {1}, "hwp").failure()).isIn("converter_preparing", "docker_unavailable");
    }
}
