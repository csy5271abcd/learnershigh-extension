package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.dto.record.NoteDtos.CreateNoteRequest;
import com.learnershigh.extension.assessment.dto.record.NoteDtos.SaveNoteResponse;
import com.learnershigh.extension.assessment.dto.record.NoteDtos.UpdateNoteRequest;
import com.learnershigh.extension.assessment.entity.AssessmentNote;
import com.learnershigh.extension.assessment.entity.NoteRevision;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.repository.AssessmentNoteRepository;
import com.learnershigh.extension.assessment.repository.NoteRevisionRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.common.error.BusinessException;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

/**
 * §20 노트 저장. 저장할 때마다 새 Revision(불변)을 만들고 노트의 최신 포인터를 옮긴다(같은 Transaction).
 * 충돌: expectedRevisionId가 최신이 아니면 409 RESOURCE_VERSION_CONFLICT(학생 입력은 Frontend가 보존한다).
 * 같은 수행평가에 노트를 두 번 만들면(재시도·두 탭) 409로 응답한다(UNIQUE로도 막힌다).
 */
@Service
@Transactional
public class NoteService {

    static final int MAX_BLOCKS_JSON_CHARS = 1_000_000;

    private final AssessmentNoteRepository notes;
    private final NoteRevisionRepository revisions;
    private final StudentRecordAccess access;
    private final RecordJson json;
    private final AssessmentTimes times;
    private final NoteAttachmentService attachments;

    public NoteService(AssessmentNoteRepository notes, NoteRevisionRepository revisions, StudentRecordAccess access,
            RecordJson json, AssessmentTimes times, NoteAttachmentService attachments) {
        this.notes = notes;
        this.revisions = revisions;
        this.access = access;
        this.json = json;
        this.times = times;
        this.attachments = attachments;
    }

    public SaveNoteResponse create(StudentActor student, CreateNoteRequest request) {
        access.ownedAssessment(student.studentId(), request.sourceType(), request.sourceId());
        String blocks = validBlocks(student.studentId(), request.blocks());
        if (!notes.findByStudentIdAndSourceTypeAndSourceId(student.studentId(), request.sourceType(),
                request.sourceId()).isEmpty()) {
            throw existingNote();
        }
        Instant now = times.now();
        AssessmentNote note = AssessmentNote.start(student.studentId(), request.sourceType(), request.sourceId(), now);
        try {
            notes.saveAndFlush(note);
        } catch (DataIntegrityViolationException duplicate) {
            throw existingNote();
        }
        revisions.saveAndFlush(NoteRevision.of(note.latestRevisionId(), note.id(), 1, request.title(), blocks, now));
        return response(note, now);
    }

    public SaveNoteResponse update(StudentActor student, String noteId, UpdateNoteRequest request) {
        AssessmentNote note = notes.findByIdAndStudentId(noteId, student.studentId())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.NOTE_NOT_FOUND));
        String blocks = validBlocks(student.studentId(), request.blocks());
        if (!note.isLatest(request.expectedRevisionId())) {
            throw new BusinessException(AssessmentErrorCode.RESOURCE_VERSION_CONFLICT);
        }
        Instant now = times.now();
        String revisionId = note.appendRevision(now);
        notes.saveAndFlush(note);
        revisions.saveAndFlush(NoteRevision.of(revisionId, note.id(), note.latestRevisionNumber(), request.title(),
                blocks, now));
        return response(note, now);
    }

    private BusinessException existingNote() {
        return new BusinessException(AssessmentErrorCode.RESOURCE_VERSION_CONFLICT,
                "이미 이 수행평가의 노트가 있어요. 새로고침한 뒤 이어서 저장해 주세요.");
    }

    private SaveNoteResponse response(AssessmentNote note, Instant savedAt) {
        return new SaveNoteResponse(note.id(), note.latestRevisionId(), note.latestRevisionNumber(),
                times.toOffset(savedAt), times.toOffset(note.updatedAt()));
    }

    /**
     * 블록은 객체이고 blockId·type·text(문자열)가 있어야 한다. blockId는 노트 안에서 유일하다.
     * A28-41 §26-1: attrs.file.attachmentId 가 있으면 이 학생이 올린 첨부여야 한다(다른 학생 파일을 끼워 넣지 못함).
     */
    private String validBlocks(String studentId, List<JsonNode> blocks) {
        Set<String> ids = new HashSet<>();
        java.util.Map<String, String> attachmentFields = new java.util.LinkedHashMap<>();
        for (int index = 0; index < blocks.size(); index++) {
            JsonNode block = blocks.get(index);
            String field = "blocks[" + index + "]";
            if (block == null || !block.isObject()) {
                throw RecordJson.invalid(field, "object");
            }
            String blockId = text(block, "blockId");
            String type = text(block, "type");
            if (blockId == null || blockId.isBlank() || blockId.length() > 100) {
                throw RecordJson.invalid(field + ".blockId", "required");
            }
            if (type == null || type.isBlank() || type.length() > 40) {
                throw RecordJson.invalid(field + ".type", "required");
            }
            if (text(block, "text") == null) {
                throw RecordJson.invalid(field + ".text", "required");
            }
            JsonNode attrs = block.get("attrs");
            if (attrs != null && !attrs.isNull() && !attrs.isObject()) {
                throw RecordJson.invalid(field + ".attrs", "object");
            }
            if (!ids.add(blockId)) {
                throw RecordJson.invalid(field + ".blockId", "duplicate");
            }
            JsonNode file = attrs == null || attrs.isNull() ? null : attrs.get("file");
            JsonNode attachmentId = file == null || !file.isObject() ? null : file.get("attachmentId");
            if (attachmentId != null && !attachmentId.isNull()) {
                if (!attachmentId.isString() || attachmentId.asString().isBlank() || attachmentId.asString().length() > 64) {
                    throw RecordJson.invalid(field + ".attrs.file.attachmentId", "unknown");
                }
                attachmentFields.putIfAbsent(attachmentId.asString(), field + ".attrs.file.attachmentId");
            }
        }
        Set<String> unknown = attachments.unknownFor(studentId, attachmentFields.keySet());
        for (java.util.Map.Entry<String, String> entry : attachmentFields.entrySet()) {
            if (unknown.contains(entry.getKey())) {
                throw RecordJson.invalid(entry.getValue(), "unknown");
            }
        }
        String serialized = json.write(blocks);
        if (serialized.length() > MAX_BLOCKS_JSON_CHARS) {
            throw RecordJson.invalid("blocks", "too_large");
        }
        return serialized;
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value != null && value.isString() ? value.asString() : null;
    }
}
