package com.learnershigh.extension.assessment.service.plan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.learnershigh.extension.assessment.dto.plan.SchoolSearchResponse;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.context.AcademicContextProvider;
import com.learnershigh.extension.assessment.repository.EvaluationPlanRepository;
import com.learnershigh.extension.assessment.repository.SchoolInfoSchoolMappingRepository;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;

/**
 * A28-10: 같은 학교알리미 학교를 가리키는 si_ 검색 학교 키(별칭)는 관리자 학교 목록에서 대표 학교(담당·시연 학교) 하나로만 보인다.
 * 고유 ID 가 다른 si_ 학교(이름이 같아도)는 그대로 남는다. 별칭 판단은 {@link SchoolInfoSyncService#aliasOf} 에 맡긴다.
 */
class SchoolSearchAliasTest {

    record Row(String getSchoolId, long getPlanCount, Integer getLatestYear) implements EvaluationPlanRepository.SchoolPlanCount {
    }

    @Test
    void 별칭_학교는_목록에서_빠지고_다른_학교는_남는다() {
        EvaluationPlanRepository plans = mock(EvaluationPlanRepository.class);
        when(plans.countBySchool()).thenReturn(List.of(new Row("sch_demo_daeshin", 359, 2026),
                new Row("si_856240f4-4a72-44c6-a032-3230ad66b9ea", 359, 2026), new Row("si_other", 6, 2026)));
        when(plans.latestOfSchool(anyString(), org.mockito.ArgumentMatchers.any())).thenReturn(List.of());
        SchoolInfoSchoolMappingRepository mappings = mock(SchoolInfoSchoolMappingRepository.class);
        when(mappings.findById(anyString())).thenReturn(Optional.empty());
        when(mappings.findBySchoolIdStartingWithAndStatus(anyString(), anyString())).thenReturn(List.of());
        SchoolInfoSyncService sync = mock(SchoolInfoSyncService.class);
        when(sync.aliasOf(anyString())).thenReturn(Optional.empty());
        when(sync.aliasOf("si_856240f4-4a72-44c6-a032-3230ad66b9ea")).thenReturn(Optional.of("sch_demo_daeshin"));

        SchoolSearchQueryService service = new SchoolSearchQueryService(mock(PlanAccess.class), plans, mock(AcademicContextProvider.class),
                mappings);
        service.setSync(sync);
        SchoolSearchResponse r = service.search(new AdminActor("adm_op", Set.of(), true), "", 50);

        assertThat(r.items()).extracting(SchoolSearchResponse.Item::schoolId).containsExactly("sch_demo_daeshin", "si_other");
        assertThat(r.items().getFirst().planCount()).as("별칭 문서를 더해 두 배로 세지 않는다").isEqualTo(359);
    }
}
