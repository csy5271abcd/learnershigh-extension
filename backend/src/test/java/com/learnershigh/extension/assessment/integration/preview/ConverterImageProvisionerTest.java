package com.learnershigh.extension.assessment.integration.preview;

import static org.assertj.core.api.Assertions.assertThat;

import com.learnershigh.extension.assessment.integration.preview.ConverterImageProvisioner.CommandRunner;
import com.learnershigh.extension.assessment.integration.preview.ConverterImageProvisioner.State;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

/** A26 변환기 이미지 자동 준비(실제 Docker 없이, 명령 실행기를 바꿔 끼운다). */
class ConverterImageProvisionerTest {

    /** version/inspect/build 각 종료 코드를 정하고, 받은 명령을 기록한다 */
    static final class FakeRunner implements CommandRunner {
        final List<List<String>> calls = new CopyOnWriteArrayList<>();
        volatile int version;
        volatile int inspect;
        volatile int build;
        volatile byte[] buildInput;
        CountDownLatch buildGate;

        FakeRunner(int version, int inspect, int build) {
            this.version = version;
            this.inspect = inspect;
            this.build = build;
        }

        @Override
        public Result run(List<String> command, byte[] stdin, java.time.Duration timeout) throws InterruptedException {
            calls.add(command);
            return switch (command.get(1)) {
                case "version" -> new Result(version, "");
                case "image" -> new Result(inspect, "");
                default -> {
                    buildInput = stdin;
                    if (buildGate != null) {
                        buildGate.await(5, TimeUnit.SECONDS);
                    }
                    yield new Result(build, build == 0 ? "" : "network error while pulling ubuntu");
                }
            };
        }

        long builds() {
            return calls.stream().filter(command -> command.get(1).equals("build")).count();
        }
    }

    static void await(ConverterImageProvisioner images, State... states) throws InterruptedException {
        for (int i = 0; i < 200 && !List.of(states).contains(images.state()); i++) {
            Thread.sleep(10);
        }
    }

    @Test
    void 이미지가_있으면_만들지_않고_재사용한다() throws Exception {
        FakeRunner runner = new FakeRunner(0, 0, 0);
        ConverterImageProvisioner images = new ConverterImageProvisioner("docker", "", true, runner, Clock.systemUTC());
        assertThat(images.readyOrStart()).isFalse();
        await(images, State.READY);
        assertThat(images.state()).isEqualTo(State.READY);
        assertThat(images.readyOrStart()).isTrue();
        assertThat(runner.builds()).isZero();
    }

    @Test
    void 이미지가_없으면_Dockerfile을_표준입력으로_한_번만_만든다() throws Exception {
        FakeRunner runner = new FakeRunner(0, 1, 0);
        runner.buildGate = new CountDownLatch(1);
        ConverterImageProvisioner images = new ConverterImageProvisioner("docker", "", true, runner, Clock.systemUTC());
        images.prepareAsync();
        await(images, State.BUILDING);
        // 만드는 동안 여러 요청이 와도 Build는 하나
        for (int i = 0; i < 5; i++) {
            assertThat(images.readyOrStart()).isFalse();
        }
        runner.buildGate.countDown();
        await(images, State.READY);
        assertThat(images.state()).isEqualTo(State.READY);
        assertThat(runner.builds()).isEqualTo(1);
        List<String> build = runner.calls.stream().filter(command -> command.get(1).equals("build")).findFirst().orElseThrow();
        assertThat(build).containsExactly("docker", "build", "--pull=false", "-t", images.image(), "-");
        assertThat(new String(runner.buildInput, java.nio.charset.StandardCharsets.UTF_8)).contains("H2Orestart", "FROM ubuntu");
    }

    @Test
    void Docker가_꺼져_있으면_만들지_않고_잠시_뒤에만_다시_확인한다() throws Exception {
        FakeRunner runner = new FakeRunner(1, 1, 0);
        AtomicInteger seconds = new AtomicInteger();
        Clock clock = new Clock() {
            @Override
            public java.time.ZoneId getZone() {
                return ZoneOffset.UTC;
            }

            @Override
            public Clock withZone(java.time.ZoneId zone) {
                return this;
            }

            @Override
            public Instant instant() {
                return Instant.parse("2026-11-17T00:00:00Z").plusSeconds(seconds.get());
            }
        };
        ConverterImageProvisioner images = new ConverterImageProvisioner("docker", "", true, runner, clock);
        images.prepareAsync();
        await(images, State.DOCKER_UNAVAILABLE);
        assertThat(images.state()).isEqualTo(State.DOCKER_UNAVAILABLE);
        int calls = runner.calls.size();
        images.readyOrStart();
        Thread.sleep(50);
        assertThat(runner.calls).hasSize(calls); // 60초 안에는 다시 시도하지 않는다
        seconds.set(61);
        runner.version = 0;
        runner.inspect = 0;
        images.readyOrStart();
        await(images, State.READY);
        assertThat(images.state()).isEqualTo(State.READY);
        assertThat(runner.builds()).isZero();
    }

    @Test
    void Build_실패는_원인을_남기고_지정_이미지는_만들지_않는다() throws Exception {
        FakeRunner runner = new FakeRunner(0, 1, 1);
        ConverterImageProvisioner images = new ConverterImageProvisioner("docker", "", true, runner, Clock.systemUTC());
        images.prepareAsync();
        await(images, State.BUILD_FAILED);
        assertThat(images.state()).isEqualTo(State.BUILD_FAILED);
        assertThat(images.detail()).contains("network error");

        FakeRunner prebuilt = new FakeRunner(0, 1, 0);
        ConverterImageProvisioner fixed = new ConverterImageProvisioner("docker", "registry.example/preview:1", true, prebuilt, Clock.systemUTC());
        assertThat(fixed.image()).isEqualTo("registry.example/preview:1");
        fixed.prepareAsync();
        await(fixed, State.BUILD_FAILED);
        assertThat(prebuilt.builds()).isZero();
    }

    @Test
    void 이미지_Tag는_Dockerfile_내용으로_정해진다() {
        String a = ConverterImageProvisioner.shortHash("FROM ubuntu:24.04\n".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String b = ConverterImageProvisioner.shortHash("FROM ubuntu:24.10\n".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        assertThat(a).hasSize(12).isNotEqualTo(b);
    }
}
