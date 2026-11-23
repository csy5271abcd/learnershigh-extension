package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.CalendarPlacement;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CalendarPlacementRepository extends JpaRepository<CalendarPlacement, String> {

    @Query("select p from CalendarPlacement p where p.studentId = :studentId and p.academicYear = :year and p.semester = :semester order by p.sourceKey")
    List<CalendarPlacement> findTerm(@Param("studentId") String studentId, @Param("year") int year, @Param("semester") int semester);

    @Query("select p from CalendarPlacement p where p.studentId = :studentId and p.academicYear = :year and p.semester = :semester and p.sourceKey = :sourceKey")
    Optional<CalendarPlacement> findOne(@Param("studentId") String studentId, @Param("year") int year, @Param("semester") int semester,
            @Param("sourceKey") String sourceKey);

    @Modifying
    @Query("delete from CalendarPlacement p where p.studentId = :studentId and p.academicYear = :year and p.semester = :semester")
    int deleteTerm(@Param("studentId") String studentId, @Param("year") int year, @Param("semester") int semester);
}
