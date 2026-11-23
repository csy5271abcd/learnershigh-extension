package com.learnershigh.extension.assessment.dto.plan;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * §38-16 (A27-UX 부록 O) 학생 본인의 '공식 원본 열람 대상' 학교 선택 상태와 후보.
 *
 * @param state      NO_CONTEXT · NOT_REQUIRED(같은 이름 학교 없음) · ADMIN_CONFIRMED(선생님이 학교를 확인함 — 학생 선택 안 씀)
 *                   · RUNNING(후보 확인 중) · SELECT_REQUIRED(후보 중 선택 필요) · SELECTED(학생이 고름, 선생님 확인 전)
 *                   · UNAVAILABLE(후보를 구별할 수 없음 — 검색 잘림·주소 없음 등)
 * @param schoolName 학적의 학교 이름(학적 그대로)
 * @param candidates 서버가 검증한 같은 이름 후보(학교알리미 학교 ID 는 주지 않는다)
 * @param selection  현재 학생 선택(없으면 null). 학적·관리자 매핑과 별개다.
 */
public record StudentOfficialViewResponse(String state, String schoolName, List<Candidate> candidates, Selection selection, String message) {

    public record Candidate(String candidateId, String schoolName, String sido, String sigungu, String address, boolean selectable,
            String unselectableReason) {
    }

    /** teacherConfirmed=false: 학생이 고른 학교(선생님 확인 전). 확정된 평가 정보는 학적 학교 기준이며 이 선택으로 바뀌지 않는다. */
    public record Selection(String schoolName, String sido, String sigungu, String address, OffsetDateTime selectedAt, long version,
            boolean teacherConfirmed) {
    }
}
