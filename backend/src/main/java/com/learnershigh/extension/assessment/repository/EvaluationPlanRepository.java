package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.EvaluationPlan;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EvaluationPlanRepository extends JpaRepository<EvaluationPlan, String> {

    /** academicYear / grade / semester는 null이면 조건에서 뺀다. 학교 조건은 항상 건다. */
    @Query("select p from EvaluationPlan p where p.schoolId = :schoolId"
            + " and (:academicYear is null or p.academicYear = :academicYear)"
            + " and (:grade is null or p.grade = :grade)"
            + " and (:semester is null or p.semester = :semester)"
            + " order by p.academicYear desc, p.semester desc, p.createdAt asc")
    List<EvaluationPlan> search(@Param("schoolId") String schoolId, @Param("academicYear") Integer academicYear,
            @Param("grade") Integer grade, @Param("semester") Integer semester);

    /** A5 학교 검색: 평가계획서가 등록된 학교별 문서 수·최근 학년도. 학교 코드(부분 일치)로 거른다. 전체 학교 목록이 아니다. */
    @Query("select p.schoolId as schoolId, count(p) as planCount, max(p.academicYear) as latestYear from EvaluationPlan p"
            + " group by p.schoolId order by p.schoolId asc")
    List<SchoolPlanCount> countBySchool();

    interface SchoolPlanCount {
        String getSchoolId();

        long getPlanCount();

        Integer getLatestYear();
    }

    /** 학교의 최근 문서 하나 (학업 Context에서 학교 이름을 찾을 슬롯) */
    @Query("select p from EvaluationPlan p where p.schoolId = :schoolId order by p.academicYear desc, p.semester desc, p.createdAt desc")
    List<EvaluationPlan> latestOfSchool(@Param("schoolId") String schoolId, org.springframework.data.domain.Pageable page);
}
