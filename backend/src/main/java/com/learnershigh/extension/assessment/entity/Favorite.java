package com.learnershigh.extension.assessment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

/** 중요 표시 (api-contract.md §30 PUT archive/favorites). 있으면 중요, 없으면 아님(같은 요청 반복은 결과가 같다). */
@Entity
@Table(name = "assessment_favorite")
public class Favorite {

    @EmbeddedId
    private Key key;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Favorite() {
    }

    public static Favorite of(String studentId, String sourceType, String sourceId, Instant now) {
        Favorite favorite = new Favorite();
        favorite.key = new Key(studentId, sourceType, sourceId);
        favorite.createdAt = now;
        return favorite;
    }

    public String sourceType() {
        return key.sourceType;
    }

    public String sourceId() {
        return key.sourceId;
    }

    @Embeddable
    public static class Key implements Serializable {

        @Column(name = "student_id", length = 64, updatable = false)
        private String studentId;

        @Column(name = "source_type", length = 30, updatable = false)
        private String sourceType;

        @Column(name = "source_id", length = 64, updatable = false)
        private String sourceId;

        protected Key() {
        }

        public Key(String studentId, String sourceType, String sourceId) {
            this.studentId = studentId;
            this.sourceType = sourceType;
            this.sourceId = sourceId;
        }

        @Override
        public boolean equals(Object other) {
            return other instanceof Key key && studentId.equals(key.studentId) && sourceType.equals(key.sourceType)
                    && sourceId.equals(key.sourceId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(studentId, sourceType, sourceId);
        }
    }
}
