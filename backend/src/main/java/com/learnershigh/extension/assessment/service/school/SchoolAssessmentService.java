package com.learnershigh.extension.assessment.service.school;

import com.learnershigh.extension.assessment.dto.school.ChangeStatusResponse;
import com.learnershigh.extension.assessment.dto.school.CreateSchoolAssessmentRequest;
import com.learnershigh.extension.assessment.dto.school.EvaluationItemRefDto;
import com.learnershigh.extension.assessment.dto.school.SchoolAssessmentResponse;
import com.learnershigh.extension.assessment.dto.school.UpdateSchoolAssessmentRequest;
import com.learnershigh.extension.assessment.entity.EvaluationItemRef;
import com.learnershigh.extension.assessment.entity.EvaluationPlan;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.assessment.entity.SchoolAssessment;
import com.learnershigh.extension.assessment.entity.SchoolAssessmentStatus;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.integration.context.AcademicContextProvider;
import com.learnershigh.extension.assessment.integration.context.AcademicContextRecord;
import com.learnershigh.extension.assessment.repository.EvaluationPlanRepository;
import com.learnershigh.extension.assessment.repository.PlanRevisionRepository;
import com.learnershigh.extension.assessment.repository.SchoolAssessmentRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.assessment.service.plan.ConfirmedItemKeys;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.CommonErrorCode;
import com.learnershigh.extension.common.error.FieldViolation;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** §12·§13 학생 수행평가 변경. 소유 학생은 항상 인증된 학생이다. */
@Service
@Transactional
public class SchoolAssessmentService {

    private final SchoolAssessmentRepository repository;
    private final EvaluationPlanRepository plans;
    private final PlanRevisionRepository revisions;
    private final AcademicContextProvider contexts;
    private final SchoolAssessmentMapper mapper;
    private final AssessmentTimes times;
    private final ConfirmedItemKeys confirmedItemKeys;

    public SchoolAssessmentService(SchoolAssessmentRepository repository, EvaluationPlanRepository plans,
            PlanRevisionRepository revisions, AcademicContextProvider contexts, SchoolAssessmentMapper mapper,
            AssessmentTimes times, ConfirmedItemKeys confirmedItemKeys) {
        this.repository = repository;
        this.plans = plans;
        this.revisions = revisions;
        this.contexts = contexts;
        this.mapper = mapper;
        this.times = times;
        this.confirmedItemKeys = confirmedItemKeys;
    }

    public SchoolAssessmentResponse create(StudentActor student, CreateSchoolAssessmentRequest request) {
        List<FieldViolation> violations = new ArrayList<>();
        Optional<AcademicContextRecord> context = contexts.find(student.studentId(), request.academicYear(),
                request.semester());
        if (context.isEmpty()) {
            violations.add(new FieldViolation("semester", "unknown"));
        } else if (!context.get().hasSubject(request.subjectId())) {
            violations.add(new FieldViolation("subjectId", "unknown"));
        }
        EvaluationItemRef ref = null;
        if (request.evaluationItemRef() != null && context.isPresent()) {
            ref = verifiedRef(request, context.get(), violations);
        }
        if (!violations.isEmpty()) {
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, violations.toArray(FieldViolation[]::new));
        }
        SchoolAssessmentStatus status = request.status() == null ? SchoolAssessmentStatus.BEFORE_START
                : SchoolAssessmentStatus.valueOf(request.status());
        SchoolAssessment created = repository.save(SchoolAssessment.register(student.studentId(),
                request.academicYear(), request.semester(), request.subjectId(), request.title(),
                request.description(), request.deadlineDate(), status, ref, times.now()));
        return mapper.toResponse(created);
    }

    public SchoolAssessmentResponse update(StudentActor student, String assessmentId,
            UpdateSchoolAssessmentRequest request) {
        SchoolAssessment assessment = owned(student, assessmentId);
        assessment.editPersonalInfo(
                request.title().present() ? request.title().value() : assessment.title(),
                request.description().present() ? request.description().value() : assessment.description(),
                request.deadlineDate().present() ? request.deadlineDate().value() : assessment.deadlineDate(),
                times.now());
        repository.flush();
        return mapper.toResponse(assessment);
    }

    public ChangeStatusResponse changeStatus(StudentActor student, String assessmentId, String targetStatus) {
        SchoolAssessmentStatus target = SchoolAssessmentStatus.valueOf(targetStatus);
        SchoolAssessment assessment = owned(student, assessmentId);
        Instant now = times.now();
        assessment.changeStatus(target, now);
        repository.flush();
        return new ChangeStatusResponse(assessment.id(), assessment.status().name(),
                times.toOffset(assessment.updatedAt()));
    }

    private SchoolAssessment owned(StudentActor student, String assessmentId) {
        return repository.findOwned(assessmentId, student.studentId())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.ASSESSMENT_NOT_FOUND));
    }

    /**
     * evaluationItemRef 검사: 학생 학교·학년도·학년·학기와 같은 슬롯의, 관리자가 확인(CONFIRMED)한 Revision만 참조할 수 있다.
     * 참조 과목은 등록 과목과 같아야 한다. itemKey는 그 Revision의 검토가 확정에 쓴 분석 결과에 있어야 한다(ConfirmedItemKeys).
     * itemKey의 의미(지필/수행 구분 등)는 자동 매핑 규칙 미합의(§12)라 해석하지 않는다. Key가 있다는 것은 항목별 사람 확인을 뜻하지 않는다.
     * 같은 항목을 다시 등록해도 막지 않는다: 중복은 알림 대상이며 자동 병합·차단하지 않는다 (domain.md §9-3).
     */
    private EvaluationItemRef verifiedRef(CreateSchoolAssessmentRequest request, AcademicContextRecord context,
            List<FieldViolation> violations) {
        EvaluationItemRefDto dto = request.evaluationItemRef();
        Optional<PlanRevision> revision = revisions.findById(dto.documentRevisionId());
        Optional<EvaluationPlan> plan = revision.flatMap(r -> plans.findById(r.planId()));
        boolean visible = plan.isPresent() && plan.get().matchesSlot(context.schoolId(), context.academicYear(),
                context.grade(), context.semester());
        if (!visible) {
            violations.add(new FieldViolation("evaluationItemRef.documentRevisionId", "unknown"));
            return null;
        }
        if (!revision.get().isConfirmed()) {
            violations.add(new FieldViolation("evaluationItemRef.documentRevisionId", "not_confirmed"));
        } else {
            ConfirmedItemKeys.KeyKind kind = confirmedItemKeys.kindInReviewedAnalysis(revision.get().id(), dto.itemKey());
            if (kind == ConfirmedItemKeys.KeyKind.ABSENT) {
                violations.add(new FieldViolation("evaluationItemRef.itemKey", "unknown"));
            } else if (kind == ConfirmedItemKeys.KeyKind.WRITTEN_EXAM) {
                // §12: 지필평가 항목을 수행평가로 생성하지 않는다
                violations.add(new FieldViolation("evaluationItemRef.itemKey", "not_allowed"));
            }
        }
        if (!dto.subjectId().equals(request.subjectId())) {
            violations.add(new FieldViolation("evaluationItemRef.subjectId", "mismatch"));
        }
        return new EvaluationItemRef(dto.documentRevisionId(), dto.subjectId(), dto.itemKey());
    }
}
