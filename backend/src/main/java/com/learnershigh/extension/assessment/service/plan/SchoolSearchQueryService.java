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
    private final com.learnershigh.extension.assessment.repository.SchoolInfoSchoolMappingRepository mappings;
    /** 부록 O: 학적이 없는 학교(학교알리미 검색으로 고른 si_ 학교)는 그 학교의 공식 매핑 이름 */
    private static final String NAME_SOURCE_SCHOOLINFO = "SCHOOLINFO_MAPPING";

    /** A28-10: 같은 학교알리미 학교를 가리키는 si_ 별칭 판단(선택 주입 — 시험용 생성자 호환) */
    private SchoolInfoSyncService sync;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    void setSync(SchoolInfoSyncService sync) {
        this.sync = sync;
    }

    public SchoolSearchQueryService(PlanAccess access, EvaluationPlanRepository plans, AcademicContextProvider contexts,
            com.learnershigh.extension.assessment.repository.SchoolInfoSchoolMappingRepository mappings) {
        this.access = access;
        this.plans = plans;
        this.contexts = contexts;
        this.mappings = mappings;
    }

    public SchoolSearchResponse search(AdminActor admin, String query, int limit) {
        access.requireOperator(admin);
        String needle = query == null ? "" : query.strip().toLowerCase(Locale.ROOT);
        java.util.Map<String, SchoolSearchResponse.Item> byId = new java.util.LinkedHashMap<>();
        plans.countBySchool().forEach(row -> {
            Optional<String> name = nameOf(row.getSchoolId());
            Optional<String> mapped = name.isPresent() ? Optional.empty() : mappedName(row.getSchoolId());
            byId.put(row.getSchoolId(), new SchoolSearchResponse.Item(row.getSchoolId(), name.or(() -> mapped).orElse(null),
                    name.isPresent() ? NAME_SOURCE_ACADEMIC_CONTEXT : mapped.isPresent() ? NAME_SOURCE_SCHOOLINFO : null,
                    row.getPlanCount(), row.getLatestYear()));
        });
        // 부록 O: 학교알리미 검색으로 고른 학교는 평가계획서가 아직 0건이어도 목록에 남긴다(다시 검색하지 않아도 되게)
        mappings.findBySchoolIdStartingWithAndStatus(SchoolInfoSyncService.DIRECTORY_PREFIX, com.learnershigh.extension.assessment.entity.SchoolInfoSchoolMapping.ACTIVE)
                .forEach(m -> byId.putIfAbsent(m.schoolId(), new SchoolSearchResponse.Item(m.schoolId(), m.schoolName(), NAME_SOURCE_SCHOOLINFO, 0, null)));
        // A28-10: 담당·시연 학교와 같은 학교알리미 학교인 si_ 별칭은 목록에서 한 번만(대표 키) 보인다. 별칭 문서는 지우지 않는다
        List<SchoolSearchResponse.Item> all = byId.values().stream()
                .filter(item -> sync == null || sync.aliasOf(item.schoolId()).isEmpty())
                .filter(item -> needle.isEmpty() || item.schoolId().toLowerCase(Locale.ROOT).contains(needle)
                        || (item.name() != null && item.name().toLowerCase(Locale.ROOT).contains(needle)))
                .toList();
        return new SchoolSearchResponse(COVERAGE_REGISTERED_PLANS_ONLY, false, all.stream().limit(limit).toList(),
                all.size() > limit);
    }

    private Optional<String> mappedName(String schoolId) {
        if (!schoolId.startsWith(SchoolInfoSyncService.DIRECTORY_PREFIX)) {
            return Optional.empty();
        }
        return mappings.findById(schoolId).filter(com.learnershigh.extension.assessment.entity.SchoolInfoSchoolMapping::active)
                .map(com.learnershigh.extension.assessment.entity.SchoolInfoSchoolMapping::schoolName);
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
