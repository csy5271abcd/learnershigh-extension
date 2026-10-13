package com.learnershigh.extension.studentcare.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.learnershigh.extension.common.error.BusinessException;
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
        void requiresSignal() {
            assertThat(error(() -> CareCase.open("br", "stu", CareReason.EXPECTED_CHANGE, List.of(), null, null, null,
                    TODAY, NOW)).errorCode()).isEqualTo(StudentCareErrorCode.STUDENT_NOT_FLAGGED);
        }

        @Test
        void adjustmentRequiresPlan() {
            assertThat(error(() -> CareCase.open("br", "stu", CareReason.ADJUSTMENT_NEEDED, BASELINE, null, null,
                    TODAY.plusDays(7), TODAY, NOW)).errorCode()).isEqualTo(StudentCareErrorCode.PLAN_REQUIRED);
        }

        @Test
        void recheckDateMustBeWithinNextTwentyEightDays() {
            for (LocalDate invalid : List.of(TODAY, TODAY.minusDays(1), TODAY.plusDays(29))) {
                assertThat(error(() -> CareCase.open("br", "stu", CareReason.ADJUSTMENT_NEEDED, BASELINE, null, plan(),
                        invalid, TODAY, NOW)).errorCode()).isEqualTo(StudentCareErrorCode.INVALID_RECHECK_DATE);
            }
            assertThat(CareCase.open("br", "stu", CareReason.ADJUSTMENT_NEEDED, BASELINE, null, plan(),
                    TODAY.plusDays(28), TODAY, NOW).recheckDate()).isEqualTo(TODAY.plusDays(28));
        }
    }

    @Nested
    class Plan {

        @Test
        void goalAndActionAreRequired() {
            assertThat(error(() -> CarePlan.of(" ", "행동", null, true)).errorCode())
                    .isEqualTo(StudentCareErrorCode.PLAN_REQUIRED);
            assertThat(error(() -> CarePlan.of("목표", "", null, true)).errorCode())
                    .isEqualTo(StudentCareErrorCode.PLAN_REQUIRED);
            assertThat(error(() -> CarePlan.of("가".repeat(201), "행동", null, true)).errorCode())
                    .isEqualTo(StudentCareErrorCode.PLAN_REQUIRED);
        }

        @Test
        void studentAgreementIsRequired() {
            assertThat(error(() -> CarePlan.of("목표", "행동", null, false)).errorCode())
                    .isEqualTo(StudentCareErrorCode.STUDENT_AGREEMENT_REQUIRED);
        }

        @Test
        void blankLoadLimitIsStoredAsNull() {
            assertThat(CarePlan.of(" 목표 ", " 행동 ", "  ", true).loadLimit()).isNull();
        }
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

            assertThat(error(() -> careCase.continueAfterRecheck("비교", recheckDay, recheckDay, NOW)).errorCode())
                    .isEqualTo(StudentCareErrorCode.INVALID_RECHECK_DATE);
            assertThat(careCase.events()).extracting(CareEvent::type).doesNotContain(CareEventType.RECHECKED);
        }

        @Test
        void closedCaseCannotBeDecidedAgain() {
            CareCase careCase = adjusting();
            careCase.closeAfterRecheck("비교", recheckDay, NOW);

            assertThat(error(() -> careCase.closeAfterRecheck("비교", recheckDay, NOW)).errorCode())
                    .isEqualTo(StudentCareErrorCode.INVALID_STATE_TRANSITION);
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
