package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.CreateFeedbackRequestBody;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.DeliveredResponse;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.DraftSavedResponse;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.FeedbackRequestResponse;
import com.learnershigh.extension.assessment.dto.record.FeedbackDtos.ReplyDraftRequest;
import com.learnershigh.extension.assessment.entity.AssessmentNote;
import com.learnershigh.extension.assessment.entity.FeedbackReply;
import com.learnershigh.extension.assessment.entity.FeedbackRequest;
import com.learnershigh.extension.assessment.entity.FeedbackSnapshotItem;
import com.learnershigh.extension.assessment.entity.NoteRevision;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.repository.ArtifactRepository;
import com.learnershigh.extension.assessment.repository.ArtifactVersionRepository;
import com.learnershigh.extension.assessment.repository.AssessmentNoteRepository;
import com.learnershigh.extension.assessment.repository.FeedbackReplyRepository;
import com.learnershigh.extension.assessment.repository.FeedbackRequestRepository;
import com.learnershigh.extension.assessment.repository.FeedbackSnapshotItemRepository;
import com.learnershigh.extension.assessment.repository.NoteRevisionRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.common.error.BusinessException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * 피드백 변경 (ADR-0009, api-contract.md §31·45).
 * <ul>
 *   <li>학생 요청: 본인 노트의 Revision과 본인 결과물 버전만 Snapshot으로 고정한다. 같은 Snapshot 재요청은 기존 요청을 돌려준다.</li>
 *   <li>관리자 초안: 요청은 계속 PENDING. 학생에게 보이지 않는다.</li>
 *   <li>관리자 전달: Reply와 요청을 같은 Transaction에서 DELIVERED로. 이후 변경 불가. 수행평가 상태는 바꾸지 않는다.</li>
 * </ul>
 */
@Service
@Transactional
public class FeedbackService {

    private static final int COMMENT_TEXT_MAX = 2000;

    private final FeedbackRequestRepository requests;
    private final FeedbackSnapshotItemRepository snapshotItems;
    private final FeedbackReplyRepository replies;
    private final AssessmentNoteRepository notes;
    private final NoteRevisionRepository revisions;
    private final ArtifactRepository artifacts;
    private final ArtifactVersionRepository versions;
    private final StudentRecordAccess access;
    private final FeedbackViews views;
    private final RecordJson json;
    private final AssessmentTimes times;

    public FeedbackService(FeedbackRequestRepository requests, FeedbackSnapshotItemRepository snapshotItems,
            FeedbackReplyRepository replies, AssessmentNoteRepository notes, NoteRevisionRepository revisions,
            ArtifactRepository artifacts, ArtifactVersionRepository versions, StudentRecordAccess access,
            FeedbackViews views, RecordJson json, AssessmentTimes times) {
        this.requests = requests;
        this.snapshotItems = snapshotItems;
        this.replies = replies;
        this.notes = notes;
        this.revisions = revisions;
        this.artifacts = artifacts;
        this.versions = versions;
        this.access = access;
        this.views = views;
        this.json = json;
        this.times = times;
    }

    public FeedbackRequestResponse request(StudentActor student, CreateFeedbackRequestBody body) {
        access.ownedAssessment(student.studentId(), body.sourceType(), body.sourceId());
        NoteRevision revision = revisions.findById(body.noteRevisionId())
                .orElseThrow(() -> RecordJson.invalid("noteRevisionId", "unknown"));
        AssessmentNote note = notes.findByIdAndStudentId(revision.noteId(), student.studentId())
                .filter(n -> n.sourceType().equals(body.sourceType()) && n.sourceId().equals(body.sourceId()))
                .orElseThrow(() -> RecordJson.invalid("noteRevisionId", "unknown"));
        List<String> versionIds = new ArrayList<>(new LinkedHashSet<>(body.artifactVersionIds()));
        for (String versionId : versionIds) {
            boolean ownedHere = versions.findById(versionId)
                    .flatMap(v -> artifacts.findByIdAndStudentIdAndDeletedAtIsNull(v.artifactId(), student.studentId()))
                    .filter(a -> a.sourceType().equals(body.sourceType()) && a.sourceId().equals(body.sourceId()))
                    .isPresent();
            if (!ownedHere) {
                throw RecordJson.invalid("artifactVersionIds", "unknown");
            }
        }
        String key = snapshotKey(revision.id(), versionIds);
        Optional<FeedbackRequest> existing = requests.findByStudentIdAndSnapshotKey(student.studentId(), key);
        if (existing.isPresent()) {
            return views.forStudent(existing.get());
        }
        FeedbackRequest created = requests.saveAndFlush(FeedbackRequest.open(student.studentId(), note.sourceType(),
                note.sourceId(), revision.id(), key, times.now()));
        for (int index = 0; index < versionIds.size(); index++) {
            snapshotItems.save(FeedbackSnapshotItem.of(created.id(), versionIds.get(index), index));
        }
        snapshotItems.flush();
        return views.forStudent(created);
    }

    public DraftSavedResponse saveDraft(AdminActor admin, String requestId, ReplyDraftRequest draft) {
        FeedbackRequest request = readable(admin, requestId);
        if (request.isDelivered()) {
            throw new BusinessException(AssessmentErrorCode.FEEDBACK_ALREADY_DELIVERED);
        }
        String comments = json.write(validComments(request, draft.comments()));
        String recommendations = json.write(validRecommendations(draft.recommendations()));
        Instant now = times.now();
        FeedbackReply reply = replies.findById(requestId).orElse(null);
        if (reply == null) {
            replies.saveAndFlush(FeedbackReply.draft(requestId, admin.adminId(), draft.overallComment().strip(),
                    comments, recommendations, now));
        } else {
            reply.saveDraft(admin.adminId(), draft.overallComment().strip(), comments, recommendations, now);
            replies.flush();
        }
        return new DraftSavedResponse("DRAFT_SAVED", times.toOffset(now));
    }

    public DeliveredResponse deliver(AdminActor admin, String requestId, ReplyDraftRequest draft) {
        FeedbackRequest request = readable(admin, requestId);
        if (request.isDelivered()) {
            throw new BusinessException(AssessmentErrorCode.FEEDBACK_ALREADY_DELIVERED);
        }
        ArrayNode comments = validComments(request, draft.comments());
        if (draft.overallComment().isBlank() && comments.isEmpty()) {
            throw RecordJson.invalid("overallComment", "required");
        }
        String commentsJson = json.write(comments);
        String recommendations = json.write(validRecommendations(draft.recommendations()));
        Instant now = times.now();
        FeedbackReply reply = replies.findById(requestId).orElse(null);
        if (reply == null) {
            reply = FeedbackReply.draft(requestId, admin.adminId(), draft.overallComment().strip(), commentsJson,
                    recommendations, now);
            reply.deliver(admin.adminId(), draft.overallComment().strip(), commentsJson, recommendations, now);
            replies.save(reply);
        } else {
            reply.deliver(admin.adminId(), draft.overallComment().strip(), commentsJson, recommendations, now);
        }
        request.markDelivered(now);
        replies.flush();
        requests.flush();
        return new DeliveredResponse("DELIVERED", times.toOffset(now));
    }

    private FeedbackRequest readable(AdminActor admin, String requestId) {
        FeedbackRequest request = requests.findById(requestId)
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.FEEDBACK_REQUEST_NOT_FOUND));
        try {
            access.requireReadable(admin, request.studentId());
        } catch (BusinessException outOfScope) {
            throw new BusinessException(AssessmentErrorCode.FEEDBACK_REQUEST_NOT_FOUND);
        }
        return request;
    }

    /** 코멘트 대상은 그 요청 Snapshot의 노트 Revision·결과물 버전이어야 한다(§45 전달 직전 검증). */
    private ArrayNode validComments(FeedbackRequest request, List<JsonNode> comments) {
        Set<String> snapshotVersions = new TreeSet<>();
        snapshotItems.findByRequestId(request.id()).forEach(item -> snapshotVersions.add(item.artifactVersionId()));
        ArrayNode result = json.newArray();
        for (int index = 0; index < comments.size(); index++) {
            JsonNode comment = comments.get(index);
            String field = "comments[" + index + "]";
            if (comment == null || !comment.isObject()) {
                throw RecordJson.invalid(field, "object");
            }
            String targetType = text(comment, "targetType");
            String text = text(comment, "text");
            if (targetType == null || targetType.isBlank() || targetType.length() > 30) {
                throw RecordJson.invalid(field + ".targetType", "required");
            }
            if (text == null || text.isBlank() || text.length() > COMMENT_TEXT_MAX) {
                throw RecordJson.invalid(field + ".text", "required");
            }
            String versionId = text(comment, "artifactVersionId");
            String noteRevisionId = text(comment, "noteRevisionId");
            if (versionId != null && !snapshotVersions.contains(versionId)) {
                throw RecordJson.invalid(field + ".artifactVersionId", "not_in_snapshot");
            }
            if (noteRevisionId != null && !noteRevisionId.equals(request.noteRevisionId())) {
                throw RecordJson.invalid(field + ".noteRevisionId", "not_in_snapshot");
            }
            ObjectNode saved = result.addObject();
            saved.put("commentId", "comment_" + (index + 1));
            saved.put("targetType", targetType);
            if (versionId != null) {
                saved.put("artifactVersionId", versionId);
            }
            if (noteRevisionId != null) {
                saved.put("noteRevisionId", noteRevisionId);
            }
            saved.set("location", validLocation(comment.get("location"), field + ".location"));
            saved.put("text", text.strip());
        }
        return result;
    }

    private JsonNode validLocation(JsonNode location, String field) {
        if (location == null || location.isNull()) {
            return json.newArray().nullNode();
        }
        String type = location.isObject() ? text(location, "type") : null;
        if ("PDF_PAGE".equals(type)) {
            JsonNode page = location.get("pageNumber");
            if (page == null || !page.isInt() || page.asInt() < 1) {
                throw RecordJson.invalid(field + ".pageNumber", "invalid");
            }
            return location;
        }
        if ("NOTE_BLOCK".equals(type)) {
            String blockId = text(location, "blockId");
            if (blockId == null || blockId.isBlank()) {
                throw RecordJson.invalid(field + ".blockId", "required");
            }
            return location;
        }
        throw RecordJson.invalid(field + ".type", "unsupported");
    }

    private ArrayNode validRecommendations(List<JsonNode> recommendations) {
        ArrayNode result = json.newArray();
        for (int index = 0; index < recommendations.size(); index++) {
            JsonNode item = recommendations.get(index);
            String field = "recommendations[" + index + "]";
            if (item == null || !item.isObject() || text(item, "type") == null || text(item, "note") == null) {
                throw RecordJson.invalid(field, "invalid");
            }
            result.add(item);
        }
        return result;
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value != null && value.isString() ? value.asString() : null;
    }

    static String snapshotKey(String noteRevisionId, List<String> versionIds) {
        String material = noteRevisionId + "|" + String.join(",", new TreeSet<>(versionIds));
        return ArtifactService.sha256(material.getBytes(StandardCharsets.UTF_8));
    }
}
