package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.SchoolInfoSlotLink;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SchoolInfoSlotLinkRepository extends JpaRepository<SchoolInfoSlotLink, String> {

    Optional<SchoolInfoSlotLink> findBySchoolIdAndAcademicYearAndGradeAndSemesterAndSourceFileId(String schoolId,
            int academicYear, int grade, int semester, String sourceFileId);

    List<SchoolInfoSlotLink> findBySchoolIdAndAcademicYearIn(String schoolId, Collection<Integer> years);

    /** A28-05: 이 Revision 이 학교알리미 공식 수집 원본에서 왔는지(서버 원본 검증) */
    List<SchoolInfoSlotLink> findByRevisionId(String revisionId);

    /** A28-06: 학생 원본 미리보기 — 이 학교알리미 원본이 연결된 문서 Revision(변환 미리보기 캐시 재사용) */
    List<SchoolInfoSlotLink> findBySourceFileId(String sourceFileId);
}
