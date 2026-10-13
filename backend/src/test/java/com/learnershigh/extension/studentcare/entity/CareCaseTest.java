package com.learnershigh.extension.studentcare.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.CommonErrorCode;
import com.learnershigh.extension.common.error.FieldViolation;
import com.learnershigh.extension.studentcare.exception.StudentCareErrorCode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

class CareCaseTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 9, 30);
    private static final Instant NOW = Instant.parse("2026-09-30T03:00:00Z");
    private static final List<CareBaselineSignal> BASELINE = List.of(
            new CareBaselineSignal(CareSignalType.SUBJECT_SHARE, "계획한 수학 비중 30% → 최근 12%", 12, 30, "수학"));

    private static CarePlan plan() {
        return CarePlan.of("수학 비중을 계획한 30% 가까이", "큰 수학 항목을 30분씩 4회로 나누기", "주 2시간 추가까지", true);
    }

    private static CareCase adjusting() {
        return CareCase.open("br", "stu", CareReason.ADJUSTMENT_NEEDED, BASELINE, null, plan(), TODAY.plusDays(7),
                TODAY, NOW);
    }

    @SuppressWarnings("unchecked")
    private static List<FieldViolation> fields(BusinessException exception) {
        return (List<FieldViolation>) exception.details().get("fields");
    }

    private static BusinessException error(Runnable action) {
        try {
            action.run();
        } catch (BusinessException exception) {
            return exception;
        }
        throw new AssertionError("BusinessException expected");
    }

    @Nested
    class Open {

        @Test
        void expectedChangeClosesImmediatelyWithMemo() {
            CareCase careCase = CareCase.open("br", "stu", CareReason.EXPECTED_CHANGE, BASELINE, " 시험 뒤 휴식 ",
                    null, null, TODAY, NOW);

            assertThat(careCase.status()).isEqualTo(CareCaseStatus.CLOSED);
            assertThat(careCase.closeType()).isEqualTo(CareCloseType.EXPECTED_CHANGE);
            assertThat(careCase.closedOn()).isEqualTo(TODAY);
            assertThat(careCase.events()).extracting(CareEvent::type)
                    .containsExactly(CareEventType.REASON_CONFIRMED, CareEventType.CLOSED);
            assertThat(careCase.events().getFirst().content()).isEqualTo("사유 확인: 예상된 변화 — 시험 뒤 휴식");
            assertThat(careCase.events().get(1).content()).isEqualTo("기록만 남기고 종결");
        }

        @Test
        void recordIssueClosesImmediately() {
            CareCase careCase = CareCase.open("br", "stu", CareReason.RECORD_ISSUE, BASELINE, null, null, null,
                    TODAY, NOW);

            assertThat(careCase.closeType()).isEqualTo(CareCloseType.RECORD_ISSUE);
            assertThat(careCase.events().getLast().content()).isEqualTo("기록 확인으로 넘기고 종결");
        }

        @Test
        void adjustmentStartsWithPlanAndRecheckDate() {
            CareCase careCase = adjusting();

            assertThat(careCase.status()).isEqualTo(CareCaseStatus.IN_ADJUSTMENT);
            assertThat(careCase.recheckDate()).isEqualTo(TODAY.plusDays(7));
            assertThat(careCase.plan().goal()).isEqualTo("수학 비중을 계획한 30% 가까이");
            assertThat(careCase.events()).extracting(CareEvent::type)
                    .containsExactly(CareEventType.REASON_CONFIRMED, CareEventType.ADJUSTMENT_STARTED);
            assertThat(careCase.events().getLast().content())
                    .isEqualTo("조정 시작 — 큰 수학 항목을 30분씩 4회로 나누기 (재점검 10월 7일)");
        }

        @Test
        void memoOfMaxLengthIsKeptWhole() {
            String memo = "가".repeat(CareCase.MEMO_MAX);

            CareCase careCase = CareCase.open("br", "stu", CareReason.EXPECTED_CHANGE, BASELINE, memo, null, null,
                    TODAY, NOW);

            assertThat(careCase.events().getFirst().content()).isEqualTo("사유 확인: 예상된 변화 — " + memo);
        }

        @Test
        void memoOverMaxLengthIsRejectedNotTruncated() {
            BusinessException exception = error(() -> CareCase.open("br", "stu", CareReason.EXPECTED_CHANGE, BASELINE,
                    "가".repeat(CareCase.MEMO_MAX + 1), null, null, TODAY, NOW));

            assertThat(exception.errorCode()).isEqualTo(CommonErrorCode.VALIDATION_ERROR);
            assertThat(fields(exception)).containsExactly(new FieldViolation("memo", "length"));
        }

        @Test
        void closingRecordsClosedAt() {
            CareCase careCase = CareCase.open("br", "stu", CareReason.RECORD_ISSUE, BASELINE, null, null, null,
                    TODAY, NOW);

            assertThat(careCase.closedAt()).isEqualTo(NOW);
            assertThat(adjusting().closedAt()).isNull();
        }

        @Test
        void requiresSignal() {
            assertThat(error(() -> CareCase.open("br", "stu", CareReason.EXPECTED_CHANGE, List.of(), null, null, null,
                    TODAY, NOW)).errorCode()).isEqualTo(StudentCareErrorCode.STUDENT_NOT_FLAGGED);
        }

        @Test
        void adjustmentRequiresPlan() {
            BusinessException exception = error(() -> CareCase.open("br", "stu", CareReason.ADJUSTMENT_NEEDED, BASELINE,
                    null, null, TODAY.plusDays(7), TODAY, NOW));

            assertThat(exception.errorCode()).isEqualTo(StudentCareErrorCode.PLAN_REQUIRED);
            assertThat(fields(exception)).containsExactly(new FieldViolation("plan", "required"));
        }

        @Test
        void recheckDateMustBeWithinNextTwentyEightDays() {
            for (LocalDate invalid : List.of(TODAY, TODAY.minusDays(1), TODAY.plusDays(29))) {
                BusinessException exception = error(() -> CareCase.open("br", "stu", CareReason.ADJUSTMENT_NEEDED,
                        BASELINE, null, plan(), invalid, TODAY, NOW));
                assertThat(exception.errorCode()).isEqualTo(StudentCareErrorCode.INVALID_RECHECK_DATE);
                assertThat(fields(exception)).containsExactly(new FieldViolation("plan.recheckDate", "range"));
            }
            BusinessException missing = error(() -> CareCase.open("br", "stu", CareReason.ADJUSTMENT_NEEDED, BASELINE,
                    null, plan(), null, TODAY, NOW));
            assertThat(fields(missing)).containsExactly(new FieldViolation("plan.recheckDate", "required"));
            for (LocalDate valid : List.of(TODAY.plusDays(1), TODAY.plusDays(28))) {
                assertThat(CareCase.open("br", "stu", CareReason.ADJUSTMENT_NEEDED, BASELINE, null, plan(),
                        valid, TODAY, NOW).recheckDate()).isEqualTo(valid);
            }
        }
    }

    @Nested
    class Plan {

        @Test
        void goalAndActionAreRequiredWithFieldPaths() {
            BusinessException blankGoal = error(() -> CarePlan.of(" ", "행동", null, true));
            assertThat(blankGoal.errorCode()).isEqualTo(StudentCareErrorCode.PLAN_REQUIRED);
            assertThat(fields(blankGoal)).containsExactly(new FieldViolation("plan.goal", "required"));

            BusinessException blankAction = error(() -> CarePlan.of("목표", "", null, true));
            assertThat(fields(blankAction)).containsExactly(new FieldViolation("plan.action", "required"));

            BusinessException both = error(() -> CarePlan.of(null, " ", null, false));
            assertThat(both.errorCode()).isEqualTo(StudentCareErrorCode.PLAN_REQUIRED);
            assertThat(fields(both)).containsExactly(
                    new FieldViolation("plan.goal", "required"), new FieldViolation("plan.action", "required"));
        }

        @Test
        void lengthLimitsAreValidationErrors() {
            assertThat(CarePlan.of("가".repeat(CarePlan.GOAL_MAX), "나".repeat(CarePlan.ACTION_MAX),
                    "다".repeat(CarePlan.LOAD_LIMIT_MAX), true).goal()).hasSize(CarePlan.GOAL_MAX);

            BusinessException tooLong = error(() -> CarePlan.of("가".repeat(CarePlan.GOAL_MAX + 1),
                    "나".repeat(CarePlan.ACTION_MAX + 1), "다".repeat(CarePlan.LOAD_LIMIT_MAX + 1), true));
            assertThat(tooLong.errorCode()).isEqualTo(CommonErrorCode.VALIDATION_ERROR);
            assertThat(fields(tooLong)).containsExactly(new FieldViolation("plan.goal", "length"),
                    new FieldViolation("plan.action", "length"), new FieldViolation("plan.loadLimit", "length"));
        }

        @Test
        void studentAgreementIsRequired() {
            BusinessException exception = error(() -> CarePlan.of("목표", "행동", null, false));

            assertThat(exception.errorCode()).isEqualTo(StudentCareErrorCode.STUDENT_AGREEMENT_REQUIRED);
            assertThat(fields(exception)).containsExactly(new FieldViolation("plan.agreedWithStudent", "required"));
        }

        @Test
        void blankLoadLimitIsStoredAsNull() {
            assertThat(CarePlan.of(" 목표 ", " 행동 ", "  ", true).loadLimit()).isNull();
        }
    }

    @Test
    void noteContentIsValidatedAndNeverTruncated() {
        CareCase careCase = adjusting();
        String content = "메".repeat(CareCase.MEMO_MAX);

        assertThat(careCase.addNote(NoteChannel.OTHER, content, TODAY, NOW).content()).isEqualTo(content);
        assertThat(fields(error(() -> careCase.addNote(NoteChannel.OTHER, content + "모", TODAY, NOW))))
                .containsExactly(new FieldViolation("content", "length"));
        assertThat(fields(error(() -> careCase.addNote(NoteChannel.OTHER, "  ", TODAY, NOW))))
                .containsExactly(new FieldViolation("content", "required"));
        assertThat(careCase.events()).hasSize(3);
    }

    @Test
    void eventContentOverColumnLengthIsAProgrammingErrorNotTruncation() {
        CareCase careCase = adjusting();

        assertThatThrownBy(() -> new CareEvent(careCase, 9, CareEventType.NOTE, TODAY, "가".repeat(CareEvent.CONTENT_MAX + 1),
                null, NOW)).isInstanceOf(IllegalArgumentException.class);
        assertThat(new CareEvent(careCase, 9, CareEventType.NOTE, TODAY, "가".repeat(CareEvent.CONTENT_MAX), null, NOW)
                .content()).hasSize(CareEvent.CONTENT_MAX);
    }

    @Test
    void baselineRejectsSubjectAndSummaryOverColumnLength() {
        assertThatThrownBy(() -> new CareBaselineSignal(CareSignalType.SUBJECT_SHARE, "s", 1, 2,
                "과".repeat(CareBaselineSignal.SUBJECT_MAX + 1))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new CareBaselineSignal(CareSignalType.SUBJECT_SHARE,
                "s".repeat(CareBaselineSignal.SUMMARY_MAX + 1), 1, 2, "수학")).isInstanceOf(IllegalArgumentException.class);
        assertThat(new CareBaselineSignal(CareSignalType.SUBJECT_SHARE, "s", 1, 2,
                "과".repeat(CareBaselineSignal.SUBJECT_MAX)).subject()).hasSize(CareBaselineSignal.SUBJECT_MAX);
    }

    @Test
    void noteIsAppendedInAnyState() {
        CareCase closed = CareCase.open("br", "stu", CareReason.EXPECTED_CHANGE, BASELINE, null, null, null, TODAY, NOW);

        CareEvent note = closed.addNote(NoteChannel.CALL, " 어머니와 통화 ", TODAY, NOW);

        assertThat(note.type()).isEqualTo(CareEventType.NOTE);
        assertThat(note.content()).isEqualTo("어머니와 통화");
        assertThat(note.noteChannel()).isEqualTo(NoteChannel.CALL);
        assertThat(note.sequence()).isEqualTo(3);
    }

    @Nested
    class Recheck {

        private final LocalDate recheckDay = TODAY.plusDays(7);

        @Test
        void decisionBeforeRecheckDateIsRejected() {
            CareCase careCase = adjusting();

            assertThat(careCase.isRecheckDue(recheckDay.minusDays(1))).isFalse();
            assertThat(error(() -> careCase.closeAfterRecheck("비교", recheckDay.minusDays(1), NOW)).errorCode())
                    .isEqualTo(StudentCareErrorCode.RECHECK_NOT_DUE);
        }

        @Test
        void closeAfterRecheckRecordsComparison() {
            CareCase careCase = adjusting();

            careCase.closeAfterRecheck("재점검 — 변화 관찰: 수학 비중 12% → 24%", recheckDay, NOW);

            assertThat(careCase.status()).isEqualTo(CareCaseStatus.CLOSED);
            assertThat(careCase.closeType()).isEqualTo(CareCloseType.AFTER_RECHECK);
            assertThat(careCase.recheckDate()).isNull();
            assertThat(careCase.events()).extracting(CareEvent::type).endsWith(
                    CareEventType.RECHECKED, CareEventType.CLOSED);
            assertThat(careCase.events().getLast().content()).isEqualTo("재점검 후 선생님이 종결");
        }

        @Test
        void continueKeepsPlanWithNewRecheckDate() {
            CareCase careCase = adjusting();

            careCase.continueAfterRecheck("비교", recheckDay.plusDays(7), recheckDay, NOW);

            assertThat(careCase.status()).isEqualTo(CareCaseStatus.IN_ADJUSTMENT);
            assertThat(careCase.recheckDate()).isEqualTo(recheckDay.plusDays(7));
            assertThat(careCase.plan().action()).isEqualTo("큰 수학 항목을 30분씩 4회로 나누기");
            assertThat(careCase.events().getLast().content()).isEqualTo("같은 약속으로 계속 (다음 재점검 10월 14일)");
        }

        @Test
        void reviseReplacesPlan() {
            CareCase careCase = adjusting();

            careCase.reviseAfterRecheck("비교", CarePlan.of("새 목표", "새 행동", null, true), recheckDay.plusDays(3),
                    recheckDay, NOW);

            assertThat(careCase.plan().goal()).isEqualTo("새 목표");
            assertThat(careCase.recheckDate()).isEqualTo(recheckDay.plusDays(3));
            assertThat(careCase.events().getLast().type()).isEqualTo(CareEventType.REVISED);
        }

        @Test
        void continueRequiresValidNextRecheckDate() {
            CareCase careCase = adjusting();

            for (LocalDate invalid : java.util.Arrays.asList(recheckDay, recheckDay.plusDays(29), null)) {
                BusinessException exception = error(
                        () -> careCase.continueAfterRecheck("비교", invalid, recheckDay, NOW));
                assertThat(exception.errorCode()).isEqualTo(StudentCareErrorCode.INVALID_RECHECK_DATE);
                assertThat(fields(exception)).extracting(FieldViolation::field).containsExactly("recheckDate");
            }
            assertThat(careCase.events()).extracting(CareEvent::type).doesNotContain(CareEventType.RECHECKED);

            careCase.continueAfterRecheck("비교", recheckDay.plusDays(1), recheckDay, NOW);
            assertThat(careCase.recheckDate()).isEqualTo(recheckDay.plusDays(1));
        }

        @Test
        void failedReviseLeavesNoEventsAndKeepsPlan() {
            CareCase careCase = adjusting();
            CarePlan newPlan = CarePlan.of("새 목표", "새 행동", null, true);

            BusinessException tooEarly = error(
                    () -> careCase.reviseAfterRecheck("비교", newPlan, recheckDay, recheckDay, NOW));
            BusinessException tooLate = error(
                    () -> careCase.reviseAfterRecheck("비교", newPlan, recheckDay.plusDays(29), recheckDay, NOW));
            BusinessException noPlan = error(
                    () -> careCase.reviseAfterRecheck("비교", null, recheckDay.plusDays(7), recheckDay, NOW));

            assertThat(tooEarly.errorCode()).isEqualTo(StudentCareErrorCode.INVALID_RECHECK_DATE);
            assertThat(tooLate.errorCode()).isEqualTo(StudentCareErrorCode.INVALID_RECHECK_DATE);
            assertThat(fields(noPlan)).containsExactly(new FieldViolation("plan", "required"));
            assertThat(careCase.events()).extracting(CareEvent::type)
                    .containsExactly(CareEventType.REASON_CONFIRMED, CareEventType.ADJUSTMENT_STARTED);
            assertThat(careCase.plan().goal()).isEqualTo("수학 비중을 계획한 30% 가까이");

            careCase.reviseAfterRecheck("비교", newPlan, recheckDay.plusDays(1), recheckDay, NOW);
            assertThat(careCase.recheckDate()).isEqualTo(recheckDay.plusDays(1));
        }

        @Test
        void closedCaseCannotBeDecidedAgain() {
            CareCase careCase = adjusting();
            careCase.closeAfterRecheck("비교", recheckDay, NOW);

            assertThat(error(() -> careCase.closeAfterRecheck("비교", recheckDay, NOW)).errorCode())
                    .isEqualTo(StudentCareErrorCode.INVALID_STATE_TRANSITION);
        }
    }

    /** (branch_id, active_student_id) Unique 제약은 진행 중 건에만 값이 있어야 같은 학생의 다음 건을 막지 않는다 (domain.md §5-1). */
    @Nested
    class ActiveStudent {

        @Test
        void adjustmentHoldsTheActiveStudentUntilClosedAfterRecheck() {
            CareCase careCase = adjusting();
            assertThat(careCase.activeStudentId()).isEqualTo("stu");

            careCase.continueAfterRecheck("비교", TODAY.plusDays(14), TODAY.plusDays(7), NOW);
            assertThat(careCase.activeStudentId()).isEqualTo("stu");

            careCase.reviseAfterRecheck("비교", plan(), TODAY.plusDays(21), TODAY.plusDays(14), NOW);
            assertThat(careCase.activeStudentId()).isEqualTo("stu");

            careCase.closeAfterRecheck("비교", TODAY.plusDays(21), NOW);
            assertThat(careCase.activeStudentId()).isNull();
        }

        @Test
        void casesClosedImmediatelyNeverHoldTheActiveStudent() {
            assertThat(CareCase.open("br", "stu", CareReason.EXPECTED_CHANGE, BASELINE, null, null, null, TODAY, NOW)
                    .activeStudentId()).isNull();
            assertThat(CareCase.open("br", "stu", CareReason.RECORD_ISSUE, BASELINE, null, null, null, TODAY, NOW)
                    .activeStudentId()).isNull();
        }
    }

    @Test
    void timelineSequencesAreConsecutive() {
        CareCase careCase = adjusting();
        careCase.addNote(NoteChannel.MEETING, "면담", TODAY, NOW);

        assertThat(careCase.events()).extracting(CareEvent::sequence).containsExactly(1, 2, 3);
        assertThatThrownBy(() -> careCase.events().clear()).isInstanceOf(UnsupportedOperationException.class);
    }
}
