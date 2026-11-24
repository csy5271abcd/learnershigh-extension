package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.SchoolInfoSchoolMapping;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SchoolInfoSchoolMappingRepository extends JpaRepository<SchoolInfoSchoolMapping, String> {

    /** 부록 O: 같은 학교알리미 학교를 이미 쓰는 학교 키(원본 공유·재다운로드 0) */
    java.util.List<SchoolInfoSchoolMapping> findBySchoolinfoSchoolIdAndStatus(String schoolinfoSchoolId, String status);

    /** 부록 O: 학교알리미 검색으로 고른 학교(si_ 키) 목록 */
    java.util.List<SchoolInfoSchoolMapping> findBySchoolIdStartingWithAndStatus(String prefix, String status);
}
