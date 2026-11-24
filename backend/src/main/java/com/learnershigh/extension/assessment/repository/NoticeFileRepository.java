package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.NoticeFile;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoticeFileRepository extends JpaRepository<NoticeFile, String> {

    List<NoticeFile> findByAssessmentIdAndStudentIdAndDeletedAtIsNullOrderByUploadedAtAsc(String assessmentId,
            String studentId);

    Optional<NoticeFile> findByIdAndAssessmentIdAndStudentIdAndDeletedAtIsNull(String id, String assessmentId,
            String studentId);

    long countByAssessmentIdAndStudentIdAndDeletedAtIsNull(String assessmentId, String studentId);

    /** A28-49 영구 삭제: 삭제 표시 포함 그 수행평가의 안내문 첨부 */
    List<NoticeFile> findByAssessmentIdAndStudentId(String assessmentId, String studentId);
}
