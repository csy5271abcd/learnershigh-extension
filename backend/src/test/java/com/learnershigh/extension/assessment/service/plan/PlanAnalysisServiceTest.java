package com.learnershigh.extension.assessment.service.plan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.learnershigh.extension.assessment.entity.PlanAnalysisStatus;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.common.error.BusinessException;
import java.time.Instant;
import org.junit.jupiter.api.Test;

/** 분석기 판정 → 저장 상태 규칙 (A3, A3.5). PARTIAL을 성공(REVIEW_REQUIRED)으로 바꾸지 않는다. */
class PlanAnalysisServiceTest {

    @Test
    void PARTIAL은_REVIEW_REQUIRED로_바꾸지_않고_PARTIAL로_저장한다() {
        // 분석기 Adapter는 과목이 하나라도 있으면 payload status를 REVIEW_REQUIRED로 낸다 → Envelope 판정을 따른다
        assertThat(PlanAnalysisService.runStatus("PARTIAL", "REVIEW_REQUIRED")).isEqualTo(PlanAnalysisStatus.PARTIAL);
        // PARTIAL인데 payload에 후보가 없다(FAILED)면 모순이다
        assertThatThrownBy(() -> PlanAnalysisService.runStatus("PARTIAL", "FAILED"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("분석기 결과");
        assertThat(PlanAnalysisService.runStatus("OK_REVIEW_REQUIRED", "REVIEW_REQUIRED"))
                .isEqualTo(PlanAnalysisStatus.REVIEW_REQUIRED);
        assertThat(PlanAnalysisService.runStatus("OK_REVIEW_REQUIRED", "FAILED")).isEqualTo(PlanAnalysisStatus.FAILED);
        assertThat(PlanAnalysisService.runStatus("PARSE_FAILED", "FAILED")).isEqualTo(PlanAnalysisStatus.FAILED);
    }

    @Test
    void 모순되거나_모르는_판정은_저장하지_않는다() {
        assertThatThrownBy(() -> PlanAnalysisService.runStatus("PARSE_FAILED", "REVIEW_REQUIRED"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("분석기 결과");
        assertThatThrownBy(() -> PlanAnalysisService.runStatus("SOMETHING_NEW", "REVIEW_REQUIRED"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void 분석기_fileId_규칙에_맞춘다() {
        PlanRevision revision = PlanRevision.upload("plan_1", 1, "p.pdf", "application/pdf", 1, "a".repeat(64), 1,
                null, null, "adm", Instant.parse("2026-11-13T00:00:00Z"));
        String fileId = PlanAnalysisService.fileId(revision);
        assertThat(fileId).matches("[A-Za-z0-9_-]{1,40}").startsWith("rev");
    }
}
