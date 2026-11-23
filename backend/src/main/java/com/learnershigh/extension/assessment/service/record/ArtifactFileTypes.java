package com.learnershigh.extension.assessment.service.record;

import java.util.Arrays;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * 결과물 허용 형식 (Frontend 선택 목록 `.pdf,.hwp,.hwpx,.doc,.docx,.ppt,.pptx,.xlsx,image/*`와 같다).
 * 확장자와 파일 앞부분 서명이 **둘 다** 맞아야 한다. Content-Type은 클라이언트 값이 아니라 서버가 정한다.
 * 서명 검사는 형식 확인일 뿐 악성코드 검사가 아니다(운영 Storage 결정 대상).
 */
public final class ArtifactFileTypes {

    private static final byte[] PDF = {'%', 'P', 'D', 'F', '-'};
    private static final byte[] OLE = {(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1};
    private static final byte[] ZIP = {'P', 'K', 3, 4};
    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] GIF = {'G', 'I', 'F', '8'};
    private static final byte[] RIFF = {'R', 'I', 'F', 'F'};
    private static final byte[] WEBP = {'W', 'E', 'B', 'P'};

    private record Rule(byte[] signature, String contentType) {
    }

    private static final Map<String, Rule> RULES = Map.ofEntries(
            Map.entry("pdf", new Rule(PDF, "application/pdf")),
            Map.entry("hwp", new Rule(OLE, "application/x-hwp")),
            Map.entry("hwpx", new Rule(ZIP, "application/hwp+zip")),
            Map.entry("doc", new Rule(OLE, "application/msword")),
            Map.entry("docx", new Rule(ZIP, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")),
            Map.entry("ppt", new Rule(OLE, "application/vnd.ms-powerpoint")),
            Map.entry("pptx", new Rule(ZIP, "application/vnd.openxmlformats-officedocument.presentationml.presentation")),
            Map.entry("xlsx", new Rule(ZIP, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")),
            Map.entry("xls", new Rule(OLE, "application/vnd.ms-excel")),
            Map.entry("webp", new Rule(RIFF, "image/webp")),
            Map.entry("png", new Rule(PNG, "image/png")),
            Map.entry("jpg", new Rule(JPEG, "image/jpeg")),
            Map.entry("jpeg", new Rule(JPEG, "image/jpeg")),
            Map.entry("gif", new Rule(GIF, "image/gif")));

    private ArtifactFileTypes() {
    }

    /** 허용 형식이면 서버가 정한 Content-Type, 아니면 empty */
    public static Optional<String> contentTypeOf(String fileName, byte[] bytes) {
        int dot = fileName == null ? -1 : fileName.lastIndexOf('.');
        if (dot < 0) {
            return Optional.empty();
        }
        Rule rule = RULES.get(fileName.substring(dot + 1).toLowerCase(Locale.ROOT));
        if (rule == null || bytes.length < rule.signature().length
                || !Arrays.equals(Arrays.copyOf(bytes, rule.signature().length), rule.signature())) {
            return Optional.empty();
        }
        // WEBP: RIFF 컨테이너의 8~11번째 바이트가 'WEBP'여야 한다(WAV 등 다른 RIFF 거절)
        if (rule.signature() == RIFF && (bytes.length < 12 || !Arrays.equals(Arrays.copyOfRange(bytes, 8, 12), WEBP))) {
            return Optional.empty();
        }
        return Optional.of(rule.contentType());
    }

    private static final byte[] FTYP = {'f', 't', 'y', 'p'};
    private static final byte[] EBML = {0x1A, 0x45, (byte) 0xDF, (byte) 0xA3};
    private static final Map<String, String> ADMIN_VIDEO = Map.of("mp4", "video/mp4", "m4v", "video/mp4", "mov",
            "video/quicktime", "webm", "video/webm");

    /**
     * A27-UX §43-1: 관리자 참고자료실 전용 영상 형식(MP4·M4V·MOV·WEBM). 학생 자료함·결과물 허용 형식에는 넣지 않는다.
     * MP4·M4V·MOV는 ISO BMFF 4~7번째 바이트 'ftyp', WEBM은 EBML 머리 서명이 맞아야 한다(확장자만 바꾼 파일 거절).
     */
    public static Optional<String> adminVideoContentTypeOf(String fileName, byte[] bytes) {
        int dot = fileName == null ? -1 : fileName.lastIndexOf('.');
        if (dot < 0) {
            return Optional.empty();
        }
        String ext = fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
        String type = ADMIN_VIDEO.get(ext);
        if (type == null) {
            return Optional.empty();
        }
        boolean ok = "webm".equals(ext)
                ? bytes.length >= 4 && Arrays.equals(Arrays.copyOf(bytes, 4), EBML)
                : bytes.length >= 12 && Arrays.equals(Arrays.copyOfRange(bytes, 4, 8), FTYP);
        return ok ? Optional.of(type) : Optional.empty();
    }

    /** 원본 파일명 정리: 경로 구분자·제어문자 제거, 길이 제한. 저장 경로에는 쓰지 않는다(표시·다운로드 이름 전용). */
    public static String safeFileName(String original) {
        String name = original == null ? "" : original;
        name = name.substring(Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\')) + 1);
        name = name.replaceAll("[\\p{Cntrl}]", "").strip();
        if (name.length() > 255) {
            int dot = name.lastIndexOf('.');
            String ext = dot > 0 && name.length() - dot <= 10 ? name.substring(dot) : "";
            name = name.substring(0, 255 - ext.length()) + ext;
        }
        return name;
    }
}
