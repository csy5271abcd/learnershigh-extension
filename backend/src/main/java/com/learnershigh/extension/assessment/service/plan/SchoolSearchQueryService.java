package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.SchoolSearchResponse;
import com.learnershigh.extension.assessment.entity.EvaluationPlan;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.context.AcademicContextProvider;
import com.learnershigh.extension.assessment.integration.context.AcademicContextRecord;
import com.learnershigh.extension.assessment.repository.EvaluationPlanRepository;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 관리자 학교 검색 (A5, DRAFT §38-3). 검증된 학교 Master 원천이 없어(API-OD-A01, 1팀 통합) <b>평가계획서가 등록된 학교만</b> 돌려준다.
 * 이름은 학업 Context(현재 개발용 Mock)에서 그 학교 문서 슬롯으로 확인될 때만 채운다. 학교를 만들거나 이름을 지어내지 않는다.
 * 운영 권한은 평가계획서와 같다(OD-A08: 인증된 관리자 모두). 학생 기록·Student Care 권한과 무관하다.
 */
@Service
@Transactional(readOnly = true)
public class SchoolSearchQueryService {

    public static final String COVERAGE_REGISTERED_PLANS_ONLY = "REGISTERED_PLANS_ONLY";
    private static final String NAME_SOURCE_ACADEMIC_CONTEXT = "ACADEMIC_CONTEXT";

    private final PlanAccess access;
    private final EvaluationPlanRepository plans;
    private final AcademicContextProvider contexts;

    public SchoolSearchQueryService(PlanAccess access, EvaluationPlanRepository plans, AcademicContextProvider contexts) {
        this.access = access;
        this.plans = plans;
        this.contexts = contexts;
    }

    public SchoolSearchResponse search(AdminActor admin, String query, int limit) {
        access.requireOperator(admin);
        String needle = query == null ? "" : query.strip().toLowerCase(Locale.ROOT);
        List<SchoolSearchResponse.Item> all = plans.countBySchool().stream()
                .map(row -> {
                    Optional<String> name = nameOf(row.getSchoolId());
                    return new SchoolSearchResponse.Item(row.getSchoolId(), name.orElse(null),
                            name.isPresent() ? NAME_SOURCE_ACADEMIC_CONTEXT : null, row.getPlanCount(), row.getLatestYear());
                })
                .filter(item -> needle.isEmpty() || item.schoolId().toLowerCase(Locale.ROOT).contains(needle)
                        || (item.name() != null && item.name().toLowerCase(Locale.ROOT).contains(needle)))
                .toList();
        return new SchoolSearchResponse(COVERAGE_REGISTERED_PLANS_ONLY, false, all.stream().limit(limit).toList(),
                all.size() > limit);
    }

    private Optional<String> nameOf(String schoolId) {
        List<EvaluationPlan> latest = plans.latestOfSchool(schoolId, PageRequest.of(0, 1));
        if (latest.isEmpty()) {
            return Optional.empty();
        }
        EvaluationPlan plan = latest.getFirst();
        return contexts.findSlot(schoolId, plan.academicYear(), plan.grade(), plan.semester())
                .map(AcademicContextRecord::schoolName)
                .filter(name -> name != null && !name.isBlank());
    }
}
