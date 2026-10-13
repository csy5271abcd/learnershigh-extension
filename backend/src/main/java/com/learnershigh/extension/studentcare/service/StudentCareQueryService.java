package com.learnershigh.extension.studentcare.service;

import com.learnershigh.extension.common.integration.learnershigh.ExistingBranch;
import com.learnershigh.extension.common.integration.learnershigh.ExistingDailyStudy;
import com.learnershigh.extension.common.integration.learnershigh.ExistingStudent;
import com.learnershigh.extension.studentcare.dto.BranchListResponse;
import com.learnershigh.extension.studentcare.dto.BranchRef;
import com.learnershigh.extension.studentcare.dto.CareBoardResponse;
import com.learnershigh.extension.studentcare.dto.CareCaseResponse;
import com.learnershigh.extension.studentcare.dto.CareEventResponse;
import com.learnershigh.extension.studentcare.dto.CareSettingsResponse;
import com.learnershigh.extension.studentcare.dto.CareSummaryResponse;
import com.learnershigh.extension.studentcare.dto.SignalSummary;
import com.learnershigh.extension.studentcare.dto.StudentCareDetailResponse;
import com.learnershigh.extension.studentcare.dto.StudentHistoryResponse;
import com.learnershigh.extension.studentcare.dto.StudentRef;
import com.learnershigh.extension.studentcare.entity.CareCase;
import com.learnershigh.extension.studentcare.entity.CareCaseStatus;
import com.learnershigh.extension.studentcare.entity.CareCloseType;
import com.learnershigh.extension.studentcare.entity.CareSettings;
import com.learnershigh.extension.studentcare.entity.CareSignalType;
import com.learnershigh.extension.studentcare.repository.CareCaseRepository;
import com.learnershigh.extension.studentcare.repository.CareEventRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 학생 케어 조회 (api-contract.md §65). 다른 Domain(예: Today Board)은 이 Service의 public 메서드로만 학생 케어 상태를 읽는다.
 */
@Service
@Transactional(readOnly = true)
public class StudentCareQueryService {

    private static final int CLOSED_SUMMARY_DAYS = 30;
    /** 이름 순. 연동 Contract상 이름은 비어 있지 않지만, 비어 있어도 정렬이 실패하지 않게 맨 뒤로 보낸다. */
    static final Comparator<String> NAME_ORDER = Comparator.nullsLast(Comparator.naturalOrder());

    private final StudentCareReader reader;
    private final CareCaseRepository caseRepository;
    private final CareEventRepository eventRepository;

    StudentCareQueryService(StudentCareReader reader, CareCaseRepository caseRepository,
            CareEventRepository eventRepository) {
        this.reader = reader;
        this.caseRepository = caseRepository;
        this.eventRepository = eventRepository;
    }

    public BranchListResponse branches() {
        List<BranchListResponse.Item> items = reader.branches().stream()
                .map(branch -> new BranchListResponse.Item(branch.branchId(), branch.name(),
                        reader.students(branch.branchId()).size()))
                .toList();
        return new BranchListResponse(items);
    }

    public CareBoardResponse board(String branchId) {
        ExistingBranch branch = reader.branch(branchId);
        Board board = buildBoard(branchId);
        return new CareBoardResponse(board.asOf(), new BranchRef(branch.branchId(), branch.name()),
                board.needsCheck(), board.inAdjustment(), board.deferred());
    }

    public StudentCareDetailResponse detail(String branchId, String studentId) {
        ExistingStudent student = reader.student(branchId, studentId);
        LocalDate asOf = reader.today();
        CareSettings.Values settings = reader.settings(branchId);
        List<ExistingDailyStudy> history = reader.history(studentId, asOf);
        Optional<CareCase> active = caseRepository.findWithEventsByBranchIdAndStudentIdAndStatus(
                branchId, studentId, CareCaseStatus.IN_ADJUSTMENT);

        Set<CareSignalType> suppressed = reader.cooldown(branchId, asOf, settings).getOrDefault(studentId, Set.of());
        SignalEvaluation evaluation = reader.evaluate(history, asOf, settings, suppressed);
        CareComparison comparison = active.filter(careCase -> careCase.isRecheckDue(asOf))
                .map(careCase -> CareComparator.compare(careCase.baseline(), history, asOf))
                .orElse(null);

        List<StudentCareDetailResponse.Signal> signals = evaluation.signals().stream()
                .map(signal -> new StudentCareDetailResponse.Signal(signal.type(), signal.type().label(),
                        signal.summary(), signal.evidence(), StudentCareTexts.question(signal)))
                .toList();
        List<StudentCareDetailResponse.DailyStudy> daily = CareSignalCalculator.last14(history, asOf).stream()
                .map(day -> new StudentCareDetailResponse.DailyStudy(day.date(), day.studyMinutes()))
                .toList();
        StudentCareDetailResponse.PlanSuggestion suggestion = active.isPresent() || evaluation.signals().isEmpty()
                ? null
                : toSuggestion(StudentCareTexts.suggestion(evaluation.signals().getFirst(), asOf));

        return new StudentCareDetailResponse(
                asOf,
                toRef(student),
                signals,
                evaluation.deferred() ? new StudentCareDetailResponse.Deferred(evaluation.validDays()) : null,
                daily,
                CareSignalCalculator.usualDailyMinutes(history, asOf),
                suggestion,
                active.map(careCase -> CareCaseMapper.toResponse(careCase, asOf, reader.zone(), comparison)).orElse(null));
    }

    /** 그 지점에서 연 이 학생의 모든 건 이벤트, 최신순 (api-contract.md §65-8). */
    public StudentHistoryResponse history(String branchId, String studentId) {
        ExistingStudent student = reader.student(branchId, studentId);
        List<CareEventResponse> items = eventRepository.findTimeline(branchId, studentId).stream()
                .map(event -> CareEventResponse.from(event, reader.zone()))
                .toList();
        return new StudentHistoryResponse(toRef(student), items);
    }

    public CareSettingsResponse settings(String branchId) {
        reader.branch(branchId);
        return CareSettingsResponse.from(reader.settings(branchId));
    }

    public CareSummaryResponse summary(String branchId) {
        reader.branch(branchId);
        Board board = buildBoard(branchId);

        Map<CareSignalType, Integer> counts = new EnumMap<>(CareSignalType.class);
        board.needsCheck().forEach(card -> card.signals()
                .forEach(signal -> counts.merge(signal.type(), 1, Integer::sum)));
        List<CareSummaryResponse.SignalCount> signalCounts = counts.entrySet().stream()
                .map(entry -> new CareSummaryResponse.SignalCount(entry.getKey(), entry.getKey().label(), entry.getValue()))
                .toList();

        // closedOn이 asOf−29 ~ asOf인 건 (api-contract.md §65-10)
        List<CareCase> closed = caseRepository.findByBranchIdAndStatusAndClosedOnBetween(
                branchId, CareCaseStatus.CLOSED, board.asOf().minusDays(CLOSED_SUMMARY_DAYS - 1L), board.asOf());
        Map<CareCloseType, Long> closedCounts = closed.stream()
                .collect(Collectors.groupingBy(CareCase::closeType, () -> new EnumMap<>(CareCloseType.class),
                        Collectors.counting()));

        int recheckDue = (int) board.inAdjustment().stream().filter(CareBoardResponse.InAdjustmentCard::recheckDue).count();
        return new CareSummaryResponse(
                board.asOf(),
                board.needsCheck().size(),
                board.deferred().size(),
                board.inAdjustment().size(),
                recheckDue,
                signalCounts,
                new CareSummaryResponse.ClosedCounts(
                        closedCounts.getOrDefault(CareCloseType.EXPECTED_CHANGE, 0L).intValue(),
                        closedCounts.getOrDefault(CareCloseType.RECORD_ISSUE, 0L).intValue(),
                        closedCounts.getOrDefault(CareCloseType.AFTER_RECHECK, 0L).intValue()));
    }

    private Board buildBoard(String branchId) {
        LocalDate asOf = reader.today();
        CareSettings.Values settings = reader.settings(branchId);
        List<ExistingStudent> students = reader.students(branchId);
        Map<String, ExistingStudent> byId = students.stream()
                .collect(Collectors.toMap(ExistingStudent::studentId, Function.identity()));
        Map<String, CareCase> active = caseRepository.findByBranchIdAndStatus(branchId, CareCaseStatus.IN_ADJUSTMENT)
                .stream().collect(Collectors.toMap(CareCase::studentId, Function.identity()));
        Map<String, Set<CareSignalType>> cooldown = reader.cooldown(branchId, asOf, settings);

        List<CareBoardResponse.NeedsCheckCard> needsCheck = new ArrayList<>();
        List<CareBoardResponse.DeferredStudent> deferred = new ArrayList<>();
        for (ExistingStudent student : students) {
            if (active.containsKey(student.studentId())) {
                continue;
            }
            SignalEvaluation evaluation = reader.evaluate(reader.history(student.studentId(), asOf), asOf, settings,
                    cooldown.getOrDefault(student.studentId(), Set.of()));
            if (!evaluation.signals().isEmpty()) {
                needsCheck.add(new CareBoardResponse.NeedsCheckCard(student.studentId(), student.name(),
                        student.className(), evaluation.signals().stream()
                                .map(signal -> SignalSummary.of(signal.type(), signal.summary())).toList()));
            } else if (evaluation.deferred()) {
                deferred.add(new CareBoardResponse.DeferredStudent(student.studentId(), student.name(),
                        student.className(), evaluation.validDays()));
            }
        }
        // 신호 수 많은 순 → 이름 순 (student-care.md §3-1). 같은 이름은 학생 ID로 순서를 고정한다.
        needsCheck.sort(Comparator.comparing((CareBoardResponse.NeedsCheckCard card) -> -card.signals().size())
                .thenComparing(CareBoardResponse.NeedsCheckCard::studentName, NAME_ORDER)
                .thenComparing(CareBoardResponse.NeedsCheckCard::studentId));

        List<CareBoardResponse.InAdjustmentCard> inAdjustment = active.values().stream()
                .filter(careCase -> byId.containsKey(careCase.studentId()))
                .map(careCase -> {
                    ExistingStudent student = byId.get(careCase.studentId());
                    return new CareBoardResponse.InAdjustmentCard(careCase.id(), student.studentId(), student.name(),
                            student.className(), CareCaseMapper.signals(careCase), careCase.plan().goal(),
                            careCase.recheckDate(), careCase.isRecheckDue(asOf));
                })
                // 재점검이 된 건 먼저 → 재점검일 빠른 순 (student-care.md §3-2) → 이름 → 건 ID
                .sorted(Comparator.comparing((CareBoardResponse.InAdjustmentCard card) -> !card.recheckDue())
                        .thenComparing(CareBoardResponse.InAdjustmentCard::recheckDate)
                        .thenComparing(CareBoardResponse.InAdjustmentCard::studentName, NAME_ORDER)
                        .thenComparing(CareBoardResponse.InAdjustmentCard::caseId))
                .toList();

        return new Board(asOf, List.copyOf(needsCheck), inAdjustment, List.copyOf(deferred));
    }

    private static StudentCareDetailResponse.PlanSuggestion toSuggestion(StudentCareTexts.Suggestion suggestion) {
        return new StudentCareDetailResponse.PlanSuggestion(suggestion.goal(), suggestion.action(),
                suggestion.loadLimit(), suggestion.recheckDate());
    }

    private static StudentRef toRef(ExistingStudent student) {
        return new StudentRef(student.studentId(), student.name(), student.className(), student.branchId());
    }

    private record Board(
            LocalDate asOf,
            List<CareBoardResponse.NeedsCheckCard> needsCheck,
            List<CareBoardResponse.InAdjustmentCard> inAdjustment,
            List<CareBoardResponse.DeferredStudent> deferred) {
    }
}
