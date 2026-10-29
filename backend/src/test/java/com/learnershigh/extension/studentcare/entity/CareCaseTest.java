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
            new CareBaselineSignal(CareSignalType.SUBJECT_SHARE, "수학 계획 30% → 실제 12%", 12, 30, "수학"));

    @Test void recorderNamesArePreservedWithoutRewritingEarlierEvents() {
        var careCase = adjusting();
        var old = careCase.events().getFirst();
        assertThat(old.actorName()).isNull();
        var note = careCase.addNote(NoteChannel.CALL, "학습 계획 확인", TODAY, NOW);
        note.recordActor("  기록 담당자  ");
        assertThat(note.actorName()).isEqualTo("기록 담당자");
        assertThat(old.actorName()).isNull();
        var response = com.learnershigh.extension.studentcare.dto.CareEventResponse.from(note, java.time.ZoneId.of("Asia/Seoul"));
        assertThat(response.actorName()).isEqualTo("기록 담당자");
    }

    private static CareCase adjusting() {
        return CareCase.open("br", "stu", CareReason.ADJUSTMENT_NEEDED, BASELINE, NoteChannel.CALL, null,
                TODAY.plusDays(7), TODAY, NOW);
    }

    private static CareCase closing(CareReason reason, String memo) {
        return CareCase.open("br", "stu", reason, BASELINE, NoteChannel.MEETING, memo, null, TODAY, NOW);
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
        void noProblemClosesImmediatelyWithCounselingLine() {
            CareCase careCase = closing(CareReason.EXPECTED_CHANGE, " 시험 뒤 휴식 ");

            assertThat(careCase.status()).isEqualTo(CareCaseStatus.CLOSED);
            assertThat(careCase.closeType()).isEqualTo(CareCloseType.EXPECTED_CHANGE);
            assertThat(careCase.closedOn()).isEqualTo(TODAY);
            assertThat(careCase.events()).extracting(CareEvent::type)
                    .containsExactly(CareEventType.REASON_CONFIRMED, CareEventType.CLOSED);
            assertThat(careCase.events().getFirst().content()).isEqualTo("상담 · 면담 — 시험 뒤 휴식");
            assertThat(careCase.events().getFirst().noteChannel()).isEqualTo(NoteChannel.MEETING);
            assertThat(careCase.events().get(1).content()).isEqualTo("문제없음 · 관리 종료");
        }

        @Test
        void recordIssueClosesImmediately() {
            CareCase careCase = closing(CareReason.RECORD_ISSUE, null);

            assertThat(careCase.closeType()).isEqualTo(CareCloseType.RECORD_ISSUE);
            assertThat(careCase.events().getFirst().content()).isEqualTo("상담 · 면담");
            assertThat(careCase.events().getLast().content()).isEqualTo("기록 오류 · 관리 종료");
        }

        @Test
        void continueStartsManagementWithRecheckDate() {
            CareCase careCase = adjusting();

            assertThat(careCase.status()).isEqualTo(CareCaseStatus.IN_ADJUSTMENT);
            assertThat(careCase.recheckDate()).isEqualTo(TODAY.plusDays(7));
            assertThat(careCase.events()).extracting(CareEvent::type)
                    .containsExactly(CareEventType.REASON_CONFIRMED, CareEventType.ADJUSTMENT_STARTED);
            assertThat(careCase.events().getFirst().content()).isEqualTo("상담 · 통화");
            assertThat(careCase.events().getLast().content()).isEqualTo("계속 관리 · 다음 점검 10월 7일");
        }

        @Test
        void memoOfMaxLengthIsKeptWhole() {
            String memo = "가".repeat(CareCase.MEMO_MAX);

            assertThat(closing(CareReason.EXPECTED_CHANGE, memo).events().getFirst().content())
                    .isEqualTo("상담 · 면담 — " + memo);
        }

        @Test
        void memoOverMaxLengthIsRejectedNotTruncated() {
            BusinessException exception = error(() -> closing(CareReason.EXPECTED_CHANGE, "가".repeat(CareCase.MEMO_MAX + 1)));

            assertThat(exception.errorCode()).isEqualTo(CommonErrorCode.VALIDATION_ERROR);
            assertThat(fields(exception)).containsExactly(new FieldViolation("memo", "length"));
        }

        @Test
        void closingRecordsClosedAt() {
            assertThat(closing(CareReason.RECORD_ISSUE, null).closedAt()).isEqualTo(NOW);
            assertThat(adjusting().closedAt()).isNull();
        }

        @Test
        void requiresSignal() {
            assertThat(error(() -> CareCase.open("br", "stu", CareReason.EXPECTED_CHANGE, List.of(), NoteChannel.CALL,
                    null, null, TODAY, NOW)).errorCode()).isEqualTo(StudentCareErrorCode.STUDENT_NOT_FLAGGED);
        }

        @Test
        void recheckDateIsIgnoredWhenClosingImmediately() {
            CareCase careCase = CareCase.open("br", "stu", CareReason.EXPECTED_CHANGE, BASELINE, NoteChannel.CALL, null,
                    TODAY.minusDays(3), TODAY, NOW);

            assertThat(careCase.recheckDate()).isNull();
        }

        @Test
        void recheckDateMustBeWithinNextTwentyEightDays() {
            for (LocalDate invalid : List.of(TODAY, TODAY.minusDays(1), TODAY.plusDays(29))) {
                BusinessException exception = error(() -> CareCase.open("br", "stu", CareReason.ADJUSTMENT_NEEDED,
                        BASELINE, NoteChannel.CALL, null, invalid, TODAY, NOW));
                assertThat(exception.errorCode()).isEqualTo(StudentCareErrorCode.INVALID_RECHECK_DATE);
                assertThat(fields(exception)).containsExactly(new FieldViolation("recheckDate", "range"));
            }
            BusinessException missing = error(() -> CareCase.open("br", "stu", CareReason.ADJUSTMENT_NEEDED, BASELINE,
                    NoteChannel.CALL, null, null, TODAY, NOW));
            assertThat(fields(missing)).containsExactly(new FieldViolation("recheckDate", "required"));
            for (LocalDate valid : List.of(TODAY.plusDays(1), TODAY.plusDays(28))) {
                assertThat(CareCase.open("br", "stu", CareReason.ADJUSTMENT_NEEDED, BASELINE, NoteChannel.CALL, null,
                        valid, TODAY, NOW).recheckDate()).isEqualTo(valid);
            }
        }
    }

    @Test
    void noteContentIsValidatedAndNeverTruncated() {
        CareCase careCase = adjusting();
        String content = "메".repeat(CareCase.MEMO_MAX);

        assertThat(careCase.addNote(NoteChannel.MESSAGE, content, TODAY, NOW).content()).isEqualTo("상담 · 문자 — " + content);
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
        CareCase closed = closing(CareReason.EXPECTED_CHANGE, null);

        CareEvent note = closed.addNote(NoteChannel.CALL, " 어머니와 통화 ", TODAY, NOW);

        assertThat(note.type()).isEqualTo(CareEventType.NOTE);
        assertThat(note.content()).isEqualTo("상담 · 통화 — 어머니와 통화");
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

            careCase.closeAfterRecheck("점검 · 좋아짐 — 수학 비중 12% → 24%", recheckDay, NOW);

            assertThat(careCase.status()).isEqualTo(CareCaseStatus.CLOSED);
            assertThat(careCase.closeType()).isEqualTo(CareCloseType.AFTER_RECHECK);
            assertThat(careCase.recheckDate()).isNull();
            assertThat(careCase.events()).extracting(CareEvent::type).endsWith(
                    CareEventType.RECHECKED, CareEventType.CLOSED);
            assertThat(careCase.events().getLast().content()).isEqualTo("관리 종료");
        }

        @Test
        void continueSetsNewRecheckDate() {
            CareCase careCase = adjusting();

            careCase.continueAfterRecheck("비교", recheckDay.plusDays(7), recheckDay, NOW);

            assertThat(careCase.status()).isEqualTo(CareCaseStatus.IN_ADJUSTMENT);
            assertThat(careCase.recheckDate()).isEqualTo(recheckDay.plusDays(7));
            assertThat(careCase.events().getLast().content()).isEqualTo("계속 관리 · 다음 점검 10월 14일");
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


            careCase.closeAfterRecheck("비교", TODAY.plusDays(14), NOW);
            assertThat(careCase.activeStudentId()).isNull();
        }

        @Test
        void casesClosedImmediatelyNeverHoldTheActiveStudent() {
            assertThat(closing(CareReason.EXPECTED_CHANGE, null).activeStudentId()).isNull();
            assertThat(closing(CareReason.RECORD_ISSUE, null).activeStudentId()).isNull();
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
