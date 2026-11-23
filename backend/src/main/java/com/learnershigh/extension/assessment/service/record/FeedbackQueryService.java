package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.dto.PageResponse;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.AdminFeedbackDetail;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.AdminFeedbackRequest;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.DraftView;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.FeedbackReplyResponse;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.FeedbackRequestResponse;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.ReplyBody;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.SnapshotVersion;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.StudentRef;
import com.learnershigh.extension.assessment.dto.record.ItemsResponse;
import com.learnershigh.extension.assessment.entity.FeedbackReply;
import com.learnershigh.extension.assessment.entity.FeedbackRequest;
import com.learnershigh.extension.assessment.entity.SchoolAssessment;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.repository.FeedbackReplyRepository;
import com.learnershigh.extension.assessment.repository.FeedbackRequestRepository;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.integration.learnershigh.ExistingStudent;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** §31·32 학생 피드백 조회(전달된 답변만), §44 관리자 대기열·상세(담당 학생만). */
@Service
@Transactional(readOnly = true)
public class FeedbackQueryService {

    private final FeedbackRequestRepository requests;
    private final FeedbackReplyRepository replies;
    private final StudentRecordAccess access;
    private final AdminStudents adminStudents;
    private final NoteQueryService noteQuery;
    private final ArtifactQueryService artifactQuery;
    private final FeedbackViews views;
    private final RecordJson json;
    private final com.learnershigh.extension.assessment.service.AssessmentTimes times;

    public FeedbackQueryService(FeedbackRequestRepository requests, FeedbackReplyRepository replies,
            StudentRecordAccess access, AdminStudents adminStudents, NoteQueryService noteQuery,
            ArtifactQueryService artifactQuery, FeedbackViews views, RecordJson json,
            com.learnershigh.extension.assessment.service.AssessmentTimes times) {
        this.requests = requests;
        this.replies = replies;
        this.access = access;
        this.adminStudents = adminStudents;
        this.noteQuery = noteQuery;
        this.artifactQuery = artifactQuery;
        this.views = views;
        this.json = json;
        this.times = times;
    }

    public PageResponse<FeedbackRequestResponse> list(StudentActor student, String status, int page, int size) {
        List<FeedbackRequestResponse> all = requests.findByStudentIdOrderByRequestedAtDesc(student.studentId())
                .stream().filter(r -> status == null || status.equals(r.status())).map(views::forStudent).toList();
        return PageResponse.slice(all, page, size);
    }

    public FeedbackRequestResponse get(StudentActor student, String requestId) {
        return views.forStudent(owned(student, requestId));
    }

    /** 관리자 초안(DRAFT)은 돌려주지 않는다. 전달된 답변만 학생에게 보인다. */
    public FeedbackReplyResponse reply(StudentActor student, String requestId) {
        FeedbackRequest request = owned(student, requestId);
        ReplyBody body = request.isDelivered()
                ? replies.findById(requestId).filter(FeedbackReply::isDelivered).map(this::body).orElse(null)
                : null;
        return new FeedbackReplyResponse(request.id(), request.status(), times.toOffset(request.deliveredAt()), body);
    }

    public ItemsResponse<AdminFeedbackRequest> listForAdmin(AdminActor admin, String status, String query,
            String studentId, String sourceId) {
        Map<String, ExistingStudent> scope = adminStudents.inScope(admin).stream()
                .collect(Collectors.toMap(ExistingStudent::studentId, Function.identity()));
        String needle = query == null ? "" : query.strip().toLowerCase(Locale.ROOT);
        List<AdminFeedbackRequest> items = requests.findByStudentIdInOrderByRequestedAtDesc(scope.keySet()).stream()
                .filter(r -> status == null || status.equals(r.status()))
                .filter(r -> studentId == null || studentId.equals(r.studentId()))
                .filter(r -> sourceId == null || sourceId.equals(r.sourceId()))
                .map(r -> summary(r, scope.get(r.studentId())))
                .filter(item -> needle.isEmpty() || item.sourceTitle().toLowerCase(Locale.ROOT).contains(needle)
                        || item.student().displayName().toLowerCase(Locale.ROOT).contains(needle))
                .toList();
        return new ItemsResponse<>(items);
    }

    public AdminFeedbackDetail detailForAdmin(AdminActor admin, String requestId) {
        FeedbackRequest request = requests.findById(requestId)
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.FEEDBACK_REQUEST_NOT_FOUND));
        ExistingStudent student = adminStudents.find(admin, request.studentId())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.FEEDBACK_REQUEST_NOT_FOUND));
        AdminFeedbackRequest summary = summary(request, student);
        Optional<FeedbackReply> reply = replies.findById(requestId);
        List<String> versionIds = summary.snapshot().artifactVersionIds();
        List<SnapshotVersion> snapshotVersions = artifactQuery.snapshotVersions(versionIds).stream()
                .map(v -> SnapshotVersion.of(v.version(), v.artifactTitle())).toList();
        DraftView draft = reply.filter(r -> !r.isDelivered())
                .map(r -> new DraftView(r.overallComment(), json.array(r.commentsJson()),
                        json.array(r.recommendationsJson()), times.toOffset(r.draftSavedAt())))
                .orElse(null);
        ReplyBody delivered = reply.filter(FeedbackReply::isDelivered).map(this::body).orElse(null);
        return new AdminFeedbackDetail(summary.requestId(), summary.student(), summary.sourceType(),
                summary.sourceId(), summary.sourceTitle(), summary.subjectName(), summary.requestedAt(),
                summary.status(), summary.snapshot(), summary.draftSaved(), summary.deliveredAt(),
                noteQuery.snapshotRevision(request.noteRevisionId()).orElse(null),
                noteQuery.latestRevisionNumberOf(request.noteRevisionId()).orElse(null), snapshotVersions, draft,
                delivered);
    }

    private AdminFeedbackRequest summary(FeedbackRequest request, ExistingStudent student) {
        SchoolAssessment assessment = access.assessment(request.sourceId());
        StudentRef ref = adminStudents.ref(student.studentId(), student.name(), assessment.academicYear(),
                assessment.semester());
        String subjectName = adminStudents.context(student.studentId(), assessment.academicYear(),
                assessment.semester()).flatMap(c -> c.subjectName(assessment.subjectId())).orElse(null);
        boolean draftSaved = replies.findById(request.id()).map(r -> !r.isDelivered()).orElse(false);
        return new AdminFeedbackRequest(request.id(), ref, request.sourceType(), request.sourceId(),
                assessment.title(), subjectName, times.toOffset(request.requestedAt()), request.status(),
                views.snapshot(request), draftSaved, times.toOffset(request.deliveredAt()));
    }

    private ReplyBody body(FeedbackReply reply) {
        return new ReplyBody(reply.overallComment(), json.array(reply.commentsJson()),
                json.array(reply.recommendationsJson()));
    }

    private FeedbackRequest owned(StudentActor student, String requestId) {
        return requests.findByIdAndStudentId(requestId, student.studentId())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.FEEDBACK_REQUEST_NOT_FOUND));
    }
}
