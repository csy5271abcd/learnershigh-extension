package com.learnershigh.extension.studentcare.repository;

import com.learnershigh.extension.studentcare.entity.CareEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CareEventRepository extends JpaRepository<CareEvent, String> {

    /**
     * 학생 기록 Timeline: 그 지점에서 연 건의 이벤트만, 최신순. 같은 시각이면 나중에 기록한 이벤트가 먼저 (api-contract.md §65-8).
     */
    @Query("select e from CareEvent e join e.careCase c where c.branchId = :branchId and e.studentId = :studentId"
            + " order by e.createdAt desc, e.recordNo desc")
    List<CareEvent> findTimeline(String branchId, String studentId);
}
