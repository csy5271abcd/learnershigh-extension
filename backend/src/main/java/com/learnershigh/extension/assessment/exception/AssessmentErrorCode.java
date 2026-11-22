package com.learnershigh.extension.assessment.exception;

import com.learnershigh.extension.common.error.ErrorCode;
import org.springframework.http.HttpStatus;

/**
 * 신규 Assessment Error Code (api-contract.md §53 초안의 code만 사용한다).
 * §53에 없는 code는 새로 만들지 않는다. 필요하면 계약 개정 제안으로 남긴다.
 */
public enum AssessmentErrorCode implements ErrorCode {
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
    ASSESSMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "수행평가를 찾을 수 없습니다."),
    INVALID_STATE_TRANSITION(HttpStatus.CONFLICT, "현재 상태에서 해당 동작을 할 수 없습니다."),
    UNSUPPORTED_FILE_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "PDF 파일만 등록할 수 있어요."),
    FILE_TOO_LARGE(HttpStatus.CONTENT_TOO_LARGE, "파일이 너무 커요. 20MB 이하 PDF만 등록할 수 있어요."),
    PDF_EXTRACTION_FAILED(HttpStatus.UNPROCESSABLE_CONTENT, "PDF를 읽지 못했어요. 암호가 걸렸거나 손상된 파일일 수 있어요."),
    // ---- 학생 기록 (2026-11-11, §53에 있는 code만) ----
    NOTE_NOT_FOUND(HttpStatus.NOT_FOUND, "노트를 찾을 수 없습니다."),
    NOTE_REVISION_NOT_FOUND(HttpStatus.NOT_FOUND, "노트 기록을 찾을 수 없습니다."),
    RESOURCE_VERSION_CONFLICT(HttpStatus.CONFLICT, "다른 곳에서 먼저 저장됐어요. 최신 내용을 확인한 뒤 다시 저장해 주세요."),
    ARTIFACT_NOT_FOUND(HttpStatus.NOT_FOUND, "결과물을 찾을 수 없습니다."),
    ARTIFACT_VERSION_NOT_FOUND(HttpStatus.NOT_FOUND, "결과물 버전을 찾을 수 없습니다."),
    PREVIEW_UNAVAILABLE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "이 형식은 앱 안 미리보기를 지원하지 않아요. 원본을 내려받아 확인해 주세요."),
    FILE_INTEGRITY_FAILED(HttpStatus.CONFLICT, "저장된 파일이 등록 당시와 달라 열 수 없어요."),
    /** A10 §38-6: HWP·HWPX 원문 구조를 읽지 못함. details.fields[file].reason = parse_failed·limit_exceeded·timeout·protected */
    PLAN_PREVIEW_FAILED(HttpStatus.UNPROCESSABLE_CONTENT, "원문을 화면에 표시하지 못했어요. 원본을 내려받아 확인해 주세요."),
    PLAN_PREVIEW_PREPARING(HttpStatus.SERVICE_UNAVAILABLE, "PDF 변환기를 준비하고 있어요. 잠시 후 다시 열어 주세요."),
    // PR #18 학교알리미 불러오기 (§38-11, 2026-11-19 A27-UX 통합)
    SCHOOLINFO_SCHOOL_NOT_FOUND(HttpStatus.NOT_FOUND, "학교알리미에서 학교를 찾지 못했어요. 학교 이름을 확인해 주세요."),
    /** 부록 D: 같은 이름 학교가 여럿이면 첫 학교를 임의로 골라 다른 학교 문서를 등록하지 않는다. */
    SCHOOLINFO_SCHOOL_AMBIGUOUS(HttpStatus.CONFLICT, "같은 이름으로 검색되는 학교가 여러 곳이에요. 학교 전체 이름으로 다시 시도해 주세요."),
    SCHOOLINFO_PLAN_NOT_PUBLISHED(HttpStatus.NOT_FOUND, "학교알리미에 교과별 평가계획 공시가 없어요."),
    SCHOOLINFO_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "학교알리미에서 파일을 받지 못했어요. 잠시 후 다시 시도해 주세요."),
    /** 부록 E §38-12: 요청 학년도 3개·학년·학기가 서버 기대값(KST 기준 [Y, Y-1, Y-2]·[1,2,3]·[1,2])과 다름. details.expectedAcademicYears */
    SCHOOLINFO_SYNC_YEARS_MISMATCH(HttpStatus.CONFLICT, "자동 확인할 학년도가 서버 기준과 달라요. 화면을 새로고침해 주세요."),
    /** 부록 F §38-13 */
    SCHOOLINFO_SELECTION_INVALID(HttpStatus.CONFLICT, "고를 수 없는 학교예요. 자동 확인을 다시 열어 후보를 확인해 주세요."),
    SCHOOLINFO_SELECTION_CONFLICT(HttpStatus.CONFLICT, "다른 곳에서 먼저 학교를 골랐어요. 최신 선택을 확인해 주세요."),
    /** 부록 O §38-15 학교알리미 학교 검색 */
    SCHOOL_DIRECTORY_QUERY_INVALID(HttpStatus.BAD_REQUEST, "학교 이름을 2자 이상 입력해 주세요."),
    SCHOOL_DIRECTORY_CANDIDATE_INVALID(HttpStatus.CONFLICT, "고를 수 없는 학교예요. 다시 검색해 후보를 확인해 주세요."),
    SCHOOL_DIRECTORY_UNAVAILABLE(HttpStatus.BAD_GATEWAY, "학교알리미에서 학교를 검색하지 못했어요. 잠시 뒤 다시 시도해 주세요."),
    SCHOOL_DIRECTORY_RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS, "학교 검색을 너무 자주 했어요. 잠시 뒤 다시 시도해 주세요."),
    /** 부록 O §38-16 학생 열람 선택 */
    OFFICIAL_VIEW_NOT_ALLOWED(HttpStatus.CONFLICT, "지금은 학교를 직접 고를 수 없어요(선생님이 학교를 확인했거나 같은 이름 학교가 없어요)."),
    OFFICIAL_VIEW_CANDIDATE_INVALID(HttpStatus.CONFLICT, "고를 수 없는 학교예요. 학교 목록을 다시 불러와 주세요."),
    OFFICIAL_VIEW_VERSION_CONFLICT(HttpStatus.CONFLICT, "다른 화면에서 먼저 학교를 바꿨어요. 최신 선택을 확인해 주세요."),
    /** 부록 O §39-13 한 번에 확정 */
    BULK_CONFIRM_BLOCKED(HttpStatus.UNPROCESSABLE_ENTITY, "한 번에 확정할 수 없는 항목이 있어요. 표시된 항목을 먼저 해결해 주세요."),
    BULK_CONFIRM_STALE(HttpStatus.CONFLICT, "검토 초안이나 원본이 그사이 바뀌었어요. 새로고침한 뒤 다시 확정해 주세요."),
    /** 부록 F §38-14 */
    SCHOOLINFO_SOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "학교알리미 원본을 찾지 못했어요."),
    SCHOOLINFO_SOURCE_NOT_CLASSIFIABLE(HttpStatus.CONFLICT, "출처나 학년도가 확인되지 않은 원본이라 학년·학기를 정할 수 없어요."),
    SCHOOLINFO_CLASSIFICATION_CONFLICT(HttpStatus.CONFLICT, "다른 곳에서 먼저 분류했어요. 최신 분류를 확인해 주세요."),
    SCHOOLINFO_CLASSIFICATION_SLOT_REMOVAL(HttpStatus.CONFLICT, "이미 등록된 칸은 분류에서 뺄 수 없어요. 평가계획서 칸에서 문서를 삭제해 주세요."),
    SCHOOLINFO_JOB_NOT_FOUND(HttpStatus.NOT_FOUND, "불러오기 작업을 찾지 못했어요. 서버가 다시 시작됐다면 평가계획서 목록에서 분석 상태를 확인해 주세요."),
    PLAN_ANALYZER_NOT_CONFIGURED(HttpStatus.SERVICE_UNAVAILABLE, "평가계획서 분석기가 서버에 설정되지 않았어요."),
    PLAN_ANALYZER_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "평가계획서 분석기에 연결하지 못했거나 응답이 늦어요. 잠시 후 다시 시도해 주세요."),
    PLAN_ANALYZER_BAD_RESPONSE(HttpStatus.BAD_GATEWAY, "분석기 결과를 저장할 수 없어요. 결과 형식이 계약과 맞지 않아요."),
    PLAN_ANALYSIS_IN_PROGRESS(HttpStatus.CONFLICT, "이 개정본을 이미 분석하고 있어요. 끝난 뒤 결과를 확인해 주세요."),
    PLAN_ANALYSIS_UNSUPPORTED(HttpStatus.UNPROCESSABLE_CONTENT, "이 개정본은 지금 서버 분석을 실행할 수 없어요."),
    /** A7: 분석기는 정상 응답했지만 문서에서 평가 정보를 찾지 못함(장애·계약 불일치와 구분). 결과는 저장하지 않는다(FAILED 저장은 합의 대기). */
    PLAN_ANALYSIS_NO_RESULT(HttpStatus.UNPROCESSABLE_CONTENT, "문서에서 평가항목을 찾지 못했어요. 평가계획서가 맞는지, 원본 파일을 확인해 주세요."),
    // A5 공유 검토 초안 (DRAFT 계약 §39-4)
    PLAN_REVIEW_DRAFT_CONFLICT(HttpStatus.CONFLICT, "다른 관리자가 먼저 검토 초안을 저장했어요. 최신 초안을 확인한 뒤 다시 저장해 주세요."),
    PLAN_REVIEW_DRAFT_STALE(HttpStatus.CONFLICT, "분석 결과가 새로 바뀌었어요. 이전 초안은 보존되어 있고, 새 결과를 다시 검토해야 해요."),
    PLAN_DELETE_CONFIRMATION_REQUIRED(HttpStatus.CONFLICT, "학생에게 공개 중인 평가계획서예요. 삭제하면 학생 화면에서도 사라져요. 확인한 뒤 다시 삭제해 주세요."),
    PLAN_FILE_DUPLICATE(HttpStatus.CONFLICT, "같은 파일이 이미 이 평가계획서의 개정본으로 등록되어 있어요."),
    FILE_VERSION_MISMATCH(HttpStatus.CONFLICT, "다른 버전이 먼저 올라왔어요. 버전 목록을 확인한 뒤 다시 올려 주세요."),
    FEEDBACK_REQUEST_NOT_FOUND(HttpStatus.NOT_FOUND, "피드백 요청을 찾을 수 없습니다."),
    FEEDBACK_ALREADY_DELIVERED(HttpStatus.CONFLICT, "이미 전달된 피드백이에요. 전달 후에는 바꿀 수 없어요."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "요청한 자원을 찾을 수 없습니다.");

    private final HttpStatus status;
    private final String message;

    AssessmentErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }

    @Override
    public String code() {
        return name();
    }

    @Override
    public HttpStatus status() {
        return status;
    }

    @Override
    public String message() {
        return message;
    }
}
