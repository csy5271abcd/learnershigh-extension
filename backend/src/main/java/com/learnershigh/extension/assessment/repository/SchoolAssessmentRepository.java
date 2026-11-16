package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.SchoolAssessment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SchoolAssessmentRepository extends JpaRepository<SchoolAssessment, String> {

    @Query("select a from SchoolAssessment a where a.studentId = :studentId"
            + " and a.academicYear = :academicYear and a.semester = :semester and a.deletedAt is null")
    List<SchoolAssessment> findTerm(@Param("studentId") String studentId, @Param("academicYear") int academicYear,
            @Param("semester") int semester);

    /** 소유 학생 조건을 Query에 넣는다: 다른 학생의 ID로는 존재 여부도 드러나지 않는다. */
    @Query("select a from SchoolAssessment a where a.id = :id and a.studentId = :studentId and a.deletedAt is null")
    Optional<SchoolAssessment> findOwned(@Param("id") String id, @Param("studentId") String studentId);

    /** 학생의 모든 학기 수행평가 (보관함·관리자 학생 현황, 2026-11-11) */
    List<SchoolAssessment> findByStudentIdAndDeletedAtIsNullOrderByUpdatedAtDesc(String studentId);

    /** 휴지통: 본인 소유이고 휴지통에 있는 것만 */
    List<SchoolAssessment> findByStudentIdAndDeletedAtIsNotNullOrderByDeletedAtDesc(String studentId);

    Optional<SchoolAssessment> findByIdAndStudentIdAndDeletedAtIsNotNull(String id, String studentId);
}
