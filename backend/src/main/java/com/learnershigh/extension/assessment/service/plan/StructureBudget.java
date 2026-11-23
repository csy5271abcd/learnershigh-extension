package com.learnershigh.extension.assessment.service.plan;

/**
 * HWP·HWPX 구조 미리보기 판독 한도 (A10). 악성·비정상 문서가 서버 자원을 오래 쓰지 못하게 한다.
 * 시간 한도는 판독 반복마다 확인한다(별도 Thread 없이 같은 요청 안에서 중단).
 */
final class StructureBudget {

    /** 전 학년·전 과목을 한 파일로 묶은 학교 문서(공개 코퍼스 최대 약 10.8만 위치)도 읽도록 정했다(A10 코퍼스 대조). */
    static final int MAX_NODES = 250_000;
    static final long MAX_TEXT_CHARS = 8_000_000;
    static final int MAX_DEPTH = 16;
    static final long MAX_INFLATED_BYTES = 128L * 1024 * 1024;

    private final long deadlineNanos;
    private int nodes;
    private long textChars;
    private long inflated;
    int paragraphs;
    int tables;
    int cells;

    StructureBudget(long timeoutMillis) {
        this.deadlineNanos = System.nanoTime() + timeoutMillis * 1_000_000L;
    }

    /** 판독 실패 사유: parse_failed · limit_exceeded · timeout · protected. 화면 안내와 시험이 이 값을 쓴다. */
    static final class Failure extends RuntimeException {
        private final String reason;

        Failure(String reason, String detail) {
            super(detail, null, false, false);
            this.reason = reason;
        }

        String reason() {
            return reason;
        }
    }

    static Failure parseFailed(String detail) {
        return new Failure("parse_failed", detail);
    }

    void tick() {
        if (System.nanoTime() > deadlineNanos) {
            throw new Failure("timeout", "structure preview timed out");
        }
    }

    void node() {
        if (++nodes > MAX_NODES) {
            throw new Failure("limit_exceeded", "too many nodes");
        }
        tick();
    }

    void text(int length) {
        textChars += length;
        if (textChars > MAX_TEXT_CHARS) {
            throw new Failure("limit_exceeded", "too much text");
        }
    }

    void depth(int depth) {
        if (depth > MAX_DEPTH) {
            throw new Failure("limit_exceeded", "nesting too deep");
        }
    }

    void inflated(long bytes) {
        inflated += bytes;
        if (inflated > MAX_INFLATED_BYTES) {
            throw new Failure("limit_exceeded", "decompressed size too large");
        }
    }

    long textChars() {
        return textChars;
    }
}
