package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.Favorite;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FavoriteRepository extends JpaRepository<Favorite, Favorite.Key> {

    @Query("select f from Favorite f where f.key.studentId = :studentId")
    List<Favorite> findByStudentId(@Param("studentId") String studentId);

    @org.springframework.data.jpa.repository.Modifying
    @Query("delete from Favorite f where f.key.studentId = :studentId and f.key.sourceType = :sourceType and f.key.sourceId = :sourceId")
    int deleteFor(@Param("studentId") String studentId, @Param("sourceType") String sourceType, @Param("sourceId") String sourceId);
}
