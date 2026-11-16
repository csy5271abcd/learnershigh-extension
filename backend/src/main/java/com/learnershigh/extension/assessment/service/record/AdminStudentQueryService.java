package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.dto.context.AcademicContextResponse;
import com.learnershigh.extension.assessment.dto.school.SchoolAssessmentResponse;
import com.learnershigh.extension.assessment.service.school.SchoolAssessmentMapper;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.StudentRef;
import com.learnershigh.extension.assessment.dto.record.ItemsResponse;
import com.learnershigh.extension.assessment.entity.FeedbackRequest;
import com.learnershigh.extension.assessment.entity.SchoolAssessment;
import com.learnershigh.extension.assessment.entity.SchoolAssessmentStatus;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.context.AcademicContextRecord;
import com.learnershigh.extension.assessment.service.school.AcademicContextQueryService;
import com.learnershigh.extension.assessment.repository.FeedbackRequestRepository;
import com.learnershigh.extension.assessment.repository.SchoolAssessmentRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.integration.learnershigh.ExistingStudent;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * §34 관리자 학생 목록·상세 (담당 지점 학생만). 활동 요약은 Source Entity에서 그때그때 계산한다(저장 Counter 없음).
 * 학생 원천·학업 Context는 개발용 Mock이다(실제 LearnersHigh 연동 전).
 */
@Service
@Transactional(readOnly = true)
public class AdminStudentQueryService {

    private final AdminStudents adminStudents;
    private final SchoolAssessmentRepository assessments;
    private final FeedbackRequestRepository requests;
    private final AssessmentTimes times;
    private final SchoolAssessmentMapper mapper;

    public AdminStudentQueryService(AdminStudents adminStudents, SchoolAssessmentRepository assessments,
            FeedbackRequestRepository requests, AssessmentTimes times, SchoolAssessmentMapper mapper) {
        this.mapper = mapper;
        this.adminStudents = adminStudents;
        this.assessments = assessments;
        this.requests = requests;
        this.times = times;
    }

    public record Counts(int beforeStart, int inProgress, int completed) {
    }

    public record FeedbackCounts(int pending, int delivered) {
    }

    public record Activity(Counts schoolAssessment, Counts enrichmentTask, FeedbackCounts feedback) {
    }

    public record NextDeadline(String assessmentId, String title, LocalDate deadlineDate) {
    }

    public record StudentSummary(StudentRef student, Activity activity, NextDeadline nextDeadline,
            OffsetDateTime lastActivityAt) {
    }

    public record StudentDetail(StudentRef student, List<AcademicContextResponse> academicContexts) {
    }

    /** 관리자 학생 기록 화면의 수행평가 단건 (학기 학년 포함). 담당 범위 밖·다른 학생 ID는 404. */
    public record StudentAssessment(StudentRef student, SchoolAssessmentResponse assessment, Integer grade) {
    }

    public StudentAssessment assessment(AdminActor admin, String studentId, String assessmentId) {
        ExistingStudent student = adminStudents.find(admin, studentId)
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.ASSESSMENT_NOT_FOUND));
        SchoolAssessment assessment = assessments.findOwned(assessmentId, studentId)
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.ASSESSMENT_NOT_FOUND));
        Integer grade = adminStudents.context(studentId, assessment.academicYear(), assessment.semester())
                .map(AcademicContextRecord::grade).orElse(null);
        return new StudentAssessment(adminStudents.ref(studentId, student.name(), assessment.academicYear(),
                assessment.semester()), mapper.toResponse(assessment), grade);
    }

    public ItemsResponse<StudentSummary> list(AdminActor admin, int academicYear, int semester, String query) {
        String needle = query == null ? "" : query.strip().toLowerCase(Locale.ROOT);
        LocalDate today = LocalDate.ofInstant(times.now(), java.time.ZoneId.of("Asia/Seoul"));
        return new ItemsResponse<>(adminStudents.inScope(admin).stream()
                .filter(s -> needle.isEmpty() || s.name().toLowerCase(Locale.ROOT).contains(needle)
                        || s.studentId().toLowerCase(Locale.ROOT).contains(needle))
                .map(s -> summary(s, academicYear, semester, today)).toList());
    }

    public StudentDetail detail(AdminActor admin, String studentId, int academicYear) {
        ExistingStudent student = adminStudents.find(admin, studentId)
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.ASSESSMENT_NOT_FOUND, "학생 기록을 찾을 수 없습니다."));
        List<AcademicContextResponse> contexts = Stream.of(1, 2)
                .map(semester -> adminStudents.context(studentId, academicYear, semester))
                .flatMap(Optional::stream).map(AcademicContextQueryService::toResponse).toList();
        return new StudentDetail(adminStudents.ref(studentId, student.name(), academicYear, 1), contexts);
    }

    private StudentSummary summary(ExistingStudent student, int academicYear, int semester, LocalDate today) {
        List<SchoolAssessment> all = assessments.findByStudentIdAndDeletedAtIsNullOrderByUpdatedAtDesc(student.studentId());
        List<SchoolAssessment> term = all.stream()
                .filter(a -> a.academicYear() == academicYear && a.semester() == semester).toList();
        Counts counts = new Counts(count(term, SchoolAssessmentStatus.BEFORE_START),
                count(term, SchoolAssessmentStatus.IN_PROGRESS), count(term, SchoolAssessmentStatus.COMPLETED));
        List<FeedbackRequest> feedback = requests.findByStudentIdOrderByRequestedAtDesc(student.studentId());
        FeedbackCounts feedbackCounts = new FeedbackCounts(
                (int) feedback.stream().filter(r -> !r.isDelivered()).count(),
                (int) feedback.stream().filter(FeedbackRequest::isDelivered).count());
        NextDeadline next = term.stream()
                .filter(a -> a.status() != SchoolAssessmentStatus.COMPLETED && a.deadlineDate() != null
                        && !a.deadlineDate().isBefore(today))
                .min(Comparator.comparing(SchoolAssessment::deadlineDate))
                .map(a -> new NextDeadline(a.id(), a.title(), a.deadlineDate())).orElse(null);
        Instant last = Stream.concat(all.stream().map(SchoolAssessment::updatedAt),
                        feedback.stream().map(FeedbackRequest::requestedAt))
                .filter(Objects::nonNull).max(Comparator.naturalOrder()).orElse(null);
        return new StudentSummary(adminStudents.ref(student.studentId(), student.name(), academicYear, semester),
                new Activity(counts, new Counts(0, 0, 0), feedbackCounts), next, times.toOffset(last));
    }

    private static int count(List<SchoolAssessment> list, SchoolAssessmentStatus status) {
        return (int) list.stream().filter(a -> a.status() == status).count();
    }
}
