package com.learnershigh.extension.studentcare.repository;

import com.learnershigh.extension.studentcare.entity.CareEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CareEventRepository extends JpaRepository<CareEvent, String> {

    /** 학생 기록 Timeline: 최신순. 같은 시각이면 나중에 남긴 이벤트가 먼저. */
    @Query("select e from CareEvent e where e.studentId = :studentId order by e.createdAt desc, e.sequence desc")
    List<CareEvent> findTimeline(String studentId);
}
