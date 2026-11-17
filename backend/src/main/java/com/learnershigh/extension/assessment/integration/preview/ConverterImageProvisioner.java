package com.learnershigh.extension.assessment.integration.preview;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 변환기 Docker 이미지 자동 준비 (A26). 개발자가 docker build를 직접 하지 않아도 되게 한다.
 * <ul>
 *   <li>이미지 Tag = {@code lh-plan-preview-converter:<Dockerfile SHA-256 앞 12자>} — Dockerfile이 바뀌면 다른 Tag라 새로 만든다.
 *       설정으로 이미지를 지정하면(운영의 미리 만든 이미지) 그 Tag를 쓰고 Build하지 않는다.</li>
 *   <li>상태: 확인 전 → 확인 중 → 준비됨 / 만드는 중 / Docker 없음 / Build 실패. 한 번에 하나만 만든다(단일 실행).</li>
 *   <li>Backend 기동을 막지 않는다: {@link #prepareAsync()}는 별도 Thread에서 돌고, 변환 요청은 준비 전이면 바로 '준비 중'을 받는다.</li>
 *   <li>Docker 없음·Build 실패는 {@link #RETRY_AFTER} 뒤 다음 요청에서 다시 시도한다(무한 반복 없음).</li>
 *   <li>Build는 Dockerfile을 표준 입력으로 넘긴다(Build Context 없음 → 작업 폴더·저장소 파일이 Docker로 가지 않는다).</li>
 * </ul>
 */
public class ConverterImageProvisioner {

    private static final Logger log = LoggerFactory.getLogger(ConverterImageProvisioner.class);
    static final String DOCKERFILE_RESOURCE = "/assessment/preview-converter/Dockerfile";
    static final Duration RETRY_AFTER = Duration.ofSeconds(60);
    static final Duration CHECK_TIMEOUT = Duration.ofSeconds(20);
    static final Duration BUILD_TIMEOUT = Duration.ofMinutes(30);

    public enum State { NOT_CHECKED, CHECKING, BUILDING, READY, DOCKER_UNAVAILABLE, BUILD_FAILED }

    /** 명령 실행(시험에서 바꿔 끼운다). 결과는 종료 코드와 마지막 출력 일부만 — 문서 내용은 다루지 않는다. */
    public interface CommandRunner {
        Result run(List<String> command, byte[] stdin, Duration timeout) throws IOException, InterruptedException;

        record Result(int exitCode, String tail) {
        }
    }

    private final String docker;
    private final String image;
    private final boolean buildAllowed;
    private final byte[] dockerfile;
    private final CommandRunner runner;
    private final Clock clock;
    private State state = State.NOT_CHECKED;
    private String detail = "";
    private Instant lastFailure = Instant.EPOCH;
    private Thread worker;

    public ConverterImageProvisioner(String docker, String configuredImage, boolean buildAllowed, CommandRunner runner, Clock clock) {
        this.docker = docker;
        this.dockerfile = readDockerfile();
        this.image = configuredImage == null || configuredImage.isBlank() ? "lh-plan-preview-converter:" + shortHash(dockerfile) : configuredImage.strip();
        this.buildAllowed = buildAllowed && (configuredImage == null || configuredImage.isBlank());
        this.runner = runner;
        this.clock = clock;
    }

    public String image() {
        return image;
    }

    public synchronized State state() {
        return state;
    }

    public synchronized String detail() {
        return detail;
    }

    /** 준비가 안 됐으면 백그라운드 준비를 시작(이미 진행 중·최근 실패면 그대로)하고, 지금 준비됐는지 돌려준다. 기다리지 않는다. */
    public boolean readyOrStart() {
        synchronized (this) {
            if (state == State.READY) {
                return true;
            }
            boolean running = worker != null && worker.isAlive();
            boolean recentFailure = (state == State.DOCKER_UNAVAILABLE || state == State.BUILD_FAILED)
                    && Duration.between(lastFailure, clock.instant()).compareTo(RETRY_AFTER) < 0;
            if (running || recentFailure) {
                return false;
            }
            worker = Thread.ofVirtual().name("plan-preview-image").unstarted(this::prepare);
            worker.start();
        }
        return false;
    }

    /** Backend 기동 직후 비차단 사전 준비 */
    public void prepareAsync() {
        readyOrStart();
    }

    /** 시험·진단용: 동기 준비(같은 단일 실행 규칙) */
    void prepare() {
        try {
            set(State.CHECKING, "");
            CommandRunner.Result version = runner.run(List.of(docker, "version", "--format", "{{.Server.Version}}"), null, CHECK_TIMEOUT);
            if (version.exitCode() != 0) {
                fail(State.DOCKER_UNAVAILABLE, "Docker에 연결하지 못했어요(Docker Desktop 실행 확인)");
                return;
            }
            CommandRunner.Result inspect = runner.run(List.of(docker, "image", "inspect", "--format", "{{.Id}}", image), null, CHECK_TIMEOUT);
            if (inspect.exitCode() == 0) {
                set(State.READY, "");
                log.info("plan preview converter image ready: {}", image);
                return;
            }
            if (!buildAllowed) {
                fail(State.BUILD_FAILED, "변환기 이미지가 없고 자동 준비가 꺼져 있어요(" + image + ")");
                return;
            }
            set(State.BUILDING, "");
            log.info("plan preview converter image missing — building {} (first time only, a few minutes)", image);
            CommandRunner.Result build = runner.run(List.of(docker, "build", "--pull=false", "-t", image, "-"), dockerfile, BUILD_TIMEOUT);
            if (build.exitCode() != 0) {
                fail(State.BUILD_FAILED, "변환기 이미지를 만들지 못했어요: " + build.tail());
                return;
            }
            set(State.READY, "");
            log.info("plan preview converter image built: {}", image);
        } catch (IOException exception) {
            fail(State.DOCKER_UNAVAILABLE, "Docker 명령을 실행하지 못했어요(" + exception.getClass().getSimpleName() + ")");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            fail(State.BUILD_FAILED, "준비가 중단됐어요");
        }
    }

    private synchronized void set(State next, String message) {
        state = next;
        detail = message;
    }

    private synchronized void fail(State next, String message) {
        state = next;
        detail = message;
        lastFailure = clock.instant();
        log.warn("plan preview converter image not ready: {} — {}", next, message);
    }

    private static byte[] readDockerfile() {
        try (InputStream in = ConverterImageProvisioner.class.getResourceAsStream(DOCKERFILE_RESOURCE)) {
            if (in == null) {
                throw new IllegalStateException("converter Dockerfile resource missing: " + DOCKERFILE_RESOURCE);
            }
            return in.readAllBytes();
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        }
    }

    static String shortHash(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes), 0, 6);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    /** 실제 프로세스 실행기: 셸 없이 인자 목록, 시간 초과 시 강제 종료, 출력은 마지막 2KB만 */
    public static final class ProcessCommandRunner implements CommandRunner {
        @Override
        public Result run(List<String> command, byte[] stdin, Duration timeout) throws IOException, InterruptedException {
            Process process = new ProcessBuilder(command).redirectErrorStream(true).start();
            Thread pump = Thread.ofVirtual().start(() -> {
                try (OutputStream in = process.getOutputStream()) {
                    if (stdin != null) {
                        in.write(stdin);
                    }
                } catch (IOException ignored) {
                    // 프로세스가 먼저 끝난 경우
                }
            });
            ByteArrayOutputStream tail = new ByteArrayOutputStream();
            Thread reader = Thread.ofVirtual().start(() -> {
                byte[] buffer = new byte[8192];
                try (InputStream out = process.getInputStream()) {
                    int read;
                    while ((read = out.read(buffer)) != -1) {
                        synchronized (tail) {
                            tail.write(buffer, 0, read);
                            if (tail.size() > 64_000) {
                                byte[] keep = tail.toByteArray();
                                tail.reset();
                                tail.write(keep, keep.length - 4_000, 4_000);
                            }
                        }
                    }
                } catch (IOException ignored) {
                    // 프로세스 종료
                }
            });
            if (!process.waitFor(timeout.toMillis(), TimeUnit.MILLISECONDS)) {
                process.destroyForcibly();
                return new Result(-1, "시간 초과");
            }
            pump.join(1_000);
            reader.join(2_000);
            String text;
            synchronized (tail) {
                text = tail.toString(StandardCharsets.UTF_8);
            }
            String last = text.length() > 300 ? text.substring(text.length() - 300) : text;
            return new Result(process.exitValue(), last.replaceAll("\\s+", " ").strip());
        }
    }
}
