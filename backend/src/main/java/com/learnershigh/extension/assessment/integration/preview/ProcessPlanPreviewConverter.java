package com.learnershigh.extension.assessment.integration.preview;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * LibreOffice(headless) + H2Orestart로 HWP·HWPX → PDF (A25). 두 가지 실행 방식:
 * <ul>
 *   <li>{@code docker}: {@code docker run --rm --network none --memory --cpus} 일회용 컨테이너(이미지: resources/assessment/preview-converter/Dockerfile, A26 자동 준비). 네트워크 차단.</li>
 *   <li>{@code soffice}: 같은 프로그램이 설치된 서버(예: Backend Docker 이미지)에서 직접 실행.</li>
 * </ul>
 * 안전: 원본 파일명은 쓰지 않고 임시 폴더의 {@code source.hwp|hwpx}로만 넘긴다(명령 삽입 방지, 셸 없이 인자 목록 실행).
 * 크기 상한·시간 제한(넘으면 프로세스 강제 종료)·동시 실행 수 제한·임시 폴더 삭제. 결과가 PDF 서명이 아니거나 상한을 넘으면 실패.
 */
public class ProcessPlanPreviewConverter implements PlanPreviewConverter {

    private static final Logger log = LoggerFactory.getLogger(ProcessPlanPreviewConverter.class);
    private static final Set<String> EXTENSIONS = Set.of("hwp", "hwpx");
    static final long MAX_OUTPUT_BYTES = 60L * 1024 * 1024;

    public enum Mode { DOCKER, SOFFICE }

    private final Mode mode;
    private final String executable;
    private final ConverterImageProvisioner images;
    private final Duration timeout;
    private final long maxSourceBytes;
    private final Semaphore slots;

    /** images: DOCKER 방식의 이미지 준비(A26 자동 준비). SOFFICE 방식은 null */
    public ProcessPlanPreviewConverter(Mode mode, String executable, ConverterImageProvisioner images, Duration timeout,
            long maxSourceBytes, int maxConcurrent) {
        this.mode = mode;
        this.executable = executable;
        this.images = images;
        this.timeout = timeout;
        this.maxSourceBytes = maxSourceBytes;
        this.slots = new Semaphore(Math.max(1, maxConcurrent));
    }

    @Override
    public boolean enabled() {
        return true;
    }

    @Override
    public String id() {
        return mode == Mode.DOCKER ? "docker:" + images.image() : "soffice";
    }

    List<String> command(Path work, String extension) {
        List<String> command = new ArrayList<>();
        if (mode == Mode.DOCKER) {
            command.addAll(List.of(executable, "run", "--rm", "--network", "none", "--memory", "1g", "--cpus", "2",
                    "--pids-limit", "256", "-v", work.resolve("in").toAbsolutePath() + ":/work/in:ro",
                    "-v", work.resolve("out").toAbsolutePath() + ":/work/out", images.image(), "in/source." + extension));
        } else {
            command.addAll(List.of(executable, "-env:UserInstallation=" + work.resolve("profile").toUri(), "--headless",
                    "--norestore", "--nolockcheck", "--convert-to", "pdf", "--outdir", work.resolve("out").toString(),
                    work.resolve("in").resolve("source." + extension).toString()));
        }
        return command;
    }

    @Override
    public Result convert(byte[] source, String extension) {
        if (!EXTENSIONS.contains(extension)) {
            return Result.failure("unsupported_format");
        }
        if (source.length == 0 || source.length > maxSourceBytes) {
            return Result.failure("source_too_large");
        }
        if (mode == Mode.DOCKER && !images.readyOrStart()) {
            // 이미지 준비 전(처음 한 번 만드는 중·Docker 꺼짐·Build 실패) — 일시 원인이라 실패로 기록하지 않는다
            return Result.failure(switch (images.state()) {
                case DOCKER_UNAVAILABLE -> "docker_unavailable";
                case BUILD_FAILED -> "converter_image_failed";
                default -> "converter_preparing";
            });
        }
        boolean acquired = false;
        Path work = null;
        try {
            acquired = slots.tryAcquire(timeout.toMillis(), TimeUnit.MILLISECONDS);
            if (!acquired) {
                return Result.failure("busy");
            }
            work = Files.createTempDirectory("lh-plan-preview-");
            Files.createDirectories(work.resolve("in"));
            Files.createDirectories(work.resolve("out"));
            Files.write(work.resolve("in").resolve("source." + extension), source);
            Process process = new ProcessBuilder(command(work, extension))
                    .redirectErrorStream(true)
                    .redirectOutput(ProcessBuilder.Redirect.DISCARD)
                    .start();
            if (!process.waitFor(timeout.toMillis(), TimeUnit.MILLISECONDS)) {
                process.destroyForcibly();
                return Result.failure("timeout");
            }
            Path pdf = work.resolve("out").resolve("source.pdf");
            if (mode == Mode.DOCKER && process.exitValue() >= 125 && process.exitValue() <= 127) {
                // docker 자체가 실행되지 못함(이미지 없음·데몬 꺼짐 등) — 문서 문제가 아니므로 실패로 기록하지 않는다
                return Result.failure("converter_unavailable");
            }
            if (process.exitValue() != 0 || !Files.isRegularFile(pdf)) {
                return Result.failure("conversion_failed");
            }
            long size = Files.size(pdf);
            if (size == 0 || size > MAX_OUTPUT_BYTES) {
                return Result.failure("output_invalid");
            }
            byte[] bytes = Files.readAllBytes(pdf);
            if (bytes.length < 5 || !new String(bytes, 0, 5, java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-")) {
                return Result.failure("output_invalid");
            }
            return Result.success(bytes);
        } catch (IOException exception) {
            log.warn("plan preview conversion could not run: {}", exception.getClass().getSimpleName());
            return Result.failure("converter_unavailable");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return Result.failure("interrupted");
        } finally {
            if (acquired) {
                slots.release();
            }
            deleteQuietly(work);
        }
    }

    private static void deleteQuietly(Path work) {
        if (work == null) {
            return;
        }
        try (Stream<Path> paths = Files.walk(work)) {
            paths.sorted(Comparator.reverseOrder()).forEach(path -> {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException ignored) {
                    // 임시 폴더 정리 실패는 미리보기 결과에 영향이 없다
                }
            });
        } catch (IOException ignored) {
            // 위와 같음
        }
    }
}
