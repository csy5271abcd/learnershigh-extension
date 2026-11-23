package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.entity.Artifact;
import com.learnershigh.extension.assessment.entity.ArtifactVersion;
import com.learnershigh.extension.assessment.entity.AssessmentNote;
import com.learnershigh.extension.assessment.entity.NoticeFile;
import com.learnershigh.extension.assessment.entity.SchoolAssessment;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.integration.storage.ArtifactStorage;
import com.learnershigh.extension.assessment.repository.ArtifactRepository;
import com.learnershigh.extension.assessment.repository.ArtifactVersionRepository;
import com.learnershigh.extension.assessment.repository.AssessmentNoteRepository;
import com.learnershigh.extension.assessment.repository.FavoriteRepository;
import com.learnershigh.extension.assessment.repository.FeedbackRequestRepository;
import com.learnershigh.extension.assessment.repository.GrowthRecordRepository;
import com.learnershigh.extension.assessment.repository.NoteRevisionRepository;
import com.learnershigh.extension.assessment.repository.NoticeFileRepository;
import com.learnershigh.extension.assessment.repository.SchoolAssessmentRepository;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.FieldViolation;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * §12-1 수행평가 영구 삭제 (A28-49, DRAFT). 휴지통 이동(§30, 복원 가능)과 다른 되돌릴 수 없는 삭제다.
 * 기록 보존: 학교 확정 자동 등록 항목·피드백 요청이 있는 항목·성장 기록이 연결된 항목은 삭제하지 않는다(409, 휴지통만).
 * 삭제 범위(한 Transaction): 노트·Revision, 결과물·버전, 안내문 첨부 행, 즐겨찾기, 수행평가 행.
 * 커밋 뒤 결과물 버전·안내문 첨부 Storage 바이트를 지운다. 노트 첨부(§26-1)·상태 감사 이력은 남긴다.
 */
@Service
@Transactional
public class SchoolAssessmentDeletionService {

    private static final Logger log = LoggerFactory.getLogger(SchoolAssessmentDeletionService.class);
    private static final String SA = AssessmentNote.SOURCE_SCHOOL_ASSESSMENT;

    private final SchoolAssessmentRepository assessments;
    private final AssessmentNoteRepository notes;
    private final NoteRevisionRepository revisions;
    private final ArtifactRepository artifacts;
    private final ArtifactVersionRepository versions;
    private final NoticeFileRepository noticeFiles;
    private final FavoriteRepository favorites;
    private final FeedbackRequestRepository feedbackRequests;
    private final GrowthRecordRepository growthRecords;
    private final ArtifactStorage storage;

    public SchoolAssessmentDeletionService(SchoolAssessmentRepository assessments, AssessmentNoteRepository notes,
            NoteRevisionRepository revisions, ArtifactRepository artifacts, ArtifactVersionRepository versions,
            NoticeFileRepository noticeFiles, FavoriteRepository favorites, FeedbackRequestRepository feedbackRequests,
            GrowthRecordRepository growthRecords, ArtifactStorage storage) {
        this.assessments = assessments;
        this.notes = notes;
        this.revisions = revisions;
        this.artifacts = artifacts;
        this.versions = versions;
        this.noticeFiles = noticeFiles;
        this.favorites = favorites;
        this.feedbackRequests = feedbackRequests;
        this.growthRecords = growthRecords;
        this.storage = storage;
    }

    public void deletePermanently(StudentActor student, String assessmentId, String confirmTitle) {
        String studentId = student.studentId();
        SchoolAssessment assessment = assessments.findByIdAndStudentId(assessmentId, studentId)
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.ASSESSMENT_NOT_FOUND));
        if (confirmTitle == null || !confirmTitle.strip().equals(assessment.title().strip())) {
            throw RecordJson.invalid("confirmTitle", "mismatch");
        }
        if (assessment.isOfficial()) {
            throw blocked("official");
        }
        if (feedbackRequests.existsByStudentIdAndSourceTypeAndSourceId(studentId, SA, assessmentId)) {
            throw blocked("feedbackRequests");
        }
        if (growthRecords.existsByStudentIdAndRelatedSourceTypeAndRelatedSourceId(studentId, SA, assessmentId)) {
            throw blocked("growthRecords");
        }

        List<String> storageKeys = new ArrayList<>();
        for (AssessmentNote note : notes.findByStudentIdAndSourceTypeAndSourceId(studentId, SA, assessmentId)) {
            revisions.deleteAll(revisions.findByNoteIdOrderByRevisionNumberAsc(note.id()));
            revisions.flush();
            notes.delete(note);
        }
        for (Artifact artifact : artifacts.findByStudentIdAndSourceTypeAndSourceId(studentId, SA, assessmentId)) {
            List<ArtifactVersion> list = versions.findByArtifactIdOrderByVersionNumberAsc(artifact.id());
            list.forEach(v -> storageKeys.add(v.storageKey()));
            versions.deleteAll(list);
            versions.flush();
            artifacts.delete(artifact);
        }
        for (NoticeFile file : noticeFiles.findByAssessmentIdAndStudentId(assessmentId, studentId)) {
            storageKeys.add(file.storageKey());
            noticeFiles.delete(file);
        }
        favorites.deleteFor(studentId, SA, assessmentId);
        notes.flush();
        artifacts.flush();
        assessments.delete(assessment);
        assessments.flush();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                storageKeys.forEach(storage::deleteQuietly);
            }
        });
        log.info("school assessment permanently deleted id={} files={}", assessmentId, storageKeys.size());
    }

    private static BusinessException blocked(String field) {
        return BusinessException.withFields(AssessmentErrorCode.INVALID_STATE_TRANSITION,
                new FieldViolation(field, "keep_records"));
    }
}
