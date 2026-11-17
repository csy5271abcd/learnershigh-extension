package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.dto.record.ItemsResponse;
import com.learnershigh.extension.assessment.dto.record.NoteDtos.AdminNote;
import com.learnershigh.extension.assessment.dto.record.NoteDtos.AdminNoteRevision;
import com.learnershigh.extension.assessment.dto.record.NoteDtos.NoteResponse;
import com.learnershigh.extension.assessment.dto.record.NoteDtos.NoteRevisionDetail;
import com.learnershigh.extension.assessment.dto.record.NoteDtos.NoteRevisionSummary;
import com.learnershigh.extension.assessment.entity.AssessmentNote;
import com.learnershigh.extension.assessment.entity.NoteRevision;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.repository.AssessmentNoteRepository;
import com.learnershigh.extension.assessment.repository.NoteRevisionRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.common.error.BusinessException;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** §20·21 노트 조회(학생 본인), §35 관리자 읽기 전용. */
@Service
@Transactional(readOnly = true)
public class NoteQueryService {

    private final AssessmentNoteRepository notes;
    private final NoteRevisionRepository revisions;
    private final StudentRecordAccess access;
    private final RecordJson json;
    private final AssessmentTimes times;

    public NoteQueryService(AssessmentNoteRepository notes, NoteRevisionRepository revisions,
            StudentRecordAccess access, RecordJson json, AssessmentTimes times) {
        this.notes = notes;
        this.revisions = revisions;
        this.access = access;
        this.json = json;
        this.times = times;
    }

    public ItemsResponse<NoteResponse> list(StudentActor student, String sourceType, String sourceId) {
        access.ownedAssessment(student.studentId(), sourceType, sourceId);
        return new ItemsResponse<>(notes.findByStudentIdAndSourceTypeAndSourceId(student.studentId(), sourceType,
                sourceId).stream().map(this::current).toList());
    }

    public ItemsResponse<NoteRevisionSummary> revisions(StudentActor student, String noteId) {
        AssessmentNote note = owned(student, noteId);
        return new ItemsResponse<>(revisions.findByNoteIdOrderByRevisionNumberAsc(note.id()).stream()
                .map(r -> new NoteRevisionSummary(r.id(), r.revisionNumber(), times.toOffset(r.savedAt()))).toList());
    }

    public NoteRevisionDetail revision(StudentActor student, String noteId, String revisionId) {
        AssessmentNote note = owned(student, noteId);
        NoteRevision revision = revisions.findByIdAndNoteId(revisionId, note.id())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.NOTE_REVISION_NOT_FOUND));
        return new NoteRevisionDetail(revision.id(), revision.revisionNumber(), times.toOffset(revision.savedAt()),
                note.id(), revision.title(), json.array(revision.blocksJson()));
    }

    public ItemsResponse<AdminNote> listForAdmin(AdminActor admin, String studentId, String sourceType,
            String sourceId) {
        access.requireReadable(admin, studentId);
        StudentRecordAccess.requireSourceType(sourceType);
        return new ItemsResponse<>(notes.findByStudentIdAndSourceTypeAndSourceId(studentId, sourceType, sourceId)
                .stream()
                .map(note -> new AdminNote(note.id(), note.sourceType(), note.sourceId(),
                        revisions.findByNoteIdOrderByRevisionNumberAsc(note.id()).stream()
                                .map(this::adminRevision).toList()))
                .toList());
    }

    /** 피드백 상세에서 쓰는 요청 당시 Revision. 최신 Revision으로 바꿔 끼우지 않는다. */
    public Optional<AdminNoteRevision> snapshotRevision(String revisionId) {
        return revisions.findById(revisionId).map(this::adminRevision);
    }

    public Optional<Integer> latestRevisionNumberOf(String revisionId) {
        return revisions.findById(revisionId).flatMap(r -> notes.findById(r.noteId()))
                .map(AssessmentNote::latestRevisionNumber);
    }

    /** 노트 최신 Revision의 블록 수 (보관함 목록용, 노트 없으면 null) */
    public Integer latestBlockCount(String studentId, String sourceType, String sourceId) {
        return notes.findByStudentIdAndSourceTypeAndSourceId(studentId, sourceType, sourceId).stream().findFirst()
                .flatMap(note -> revisions.findById(note.latestRevisionId()))
                .map(r -> json.array(r.blocksJson()).size()).orElse(null);
    }

    private AdminNoteRevision adminRevision(NoteRevision r) {
        return new AdminNoteRevision(r.id(), r.revisionNumber(), times.toOffset(r.savedAt()), r.title(),
                json.array(r.blocksJson()));
    }

    private AssessmentNote owned(StudentActor student, String noteId) {
        return notes.findByIdAndStudentId(noteId, student.studentId())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.NOTE_NOT_FOUND));
    }

    private NoteResponse current(AssessmentNote note) {
        NoteRevision latest = revisions.findById(note.latestRevisionId())
                .orElseThrow(() -> new IllegalStateException("latest revision missing: " + note.id()));
        return new NoteResponse(note.id(), note.sourceType(), note.sourceId(), latest.title(),
                json.array(latest.blocksJson()), latest.id(), latest.revisionNumber(), times.toOffset(latest.savedAt()),
                times.toOffset(note.updatedAt()));
    }
}
