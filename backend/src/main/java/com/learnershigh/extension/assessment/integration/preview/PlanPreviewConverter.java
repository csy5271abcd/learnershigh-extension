package com.learnershigh.extension.assessment.integration.preview;

/**
 * HWP·HWPX 원문 → PDF 미리보기 변환기 (A25 외부 경계). 원본은 바꾸지 않고, 미리보기용 파생 PDF만 만든다.
 * 구현: 변환기 미설정({@link DisabledPlanPreviewConverter}) / 로컬 LibreOffice+H2Orestart 프로세스({@link ProcessPlanPreviewConverter}).
 * 문서를 외부 서비스로 보내지 않는다.
 */
public interface PlanPreviewConverter {

    /** 변환기가 설정되어 있는가. false면 HWP·HWPX 미리보기는 지금처럼 415 PREVIEW_UNAVAILABLE. */
    boolean enabled();

    /** 변환기 식별(캐시 무효화 기준). 예: "docker:lh-plan-preview-converter:0.1" */
    String id();

    /**
     * 변환한다. 실패는 예외 대신 {@link Result#failure}로 돌려준다(원인 코드만, 문서 내용·경로는 담지 않는다).
     * @param extension "hwp" 또는 "hwpx" — 원본 파일명은 쓰지 않는다(명령 삽입 방지)
     */
    Result convert(byte[] source, String extension);

    record Result(byte[] pdf, String failure) {
        public static Result success(byte[] pdf) {
            return new Result(pdf, null);
        }

        public static Result failure(String code) {
            return new Result(null, code);
        }

        public boolean ok() {
            return pdf != null;
        }
    }
}
