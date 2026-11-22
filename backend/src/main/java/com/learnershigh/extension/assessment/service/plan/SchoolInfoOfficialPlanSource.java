package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.entity.EvaluationPlan;
import com.learnershigh.extension.assessment.entity.SchoolInfoSchoolMapping;
import com.learnershigh.extension.assessment.entity.SchoolInfoSlotLink;
import com.learnershigh.extension.assessment.entity.SchoolInfoSourceFile;
import com.learnershigh.extension.assessment.entity.SchoolInfoSourceFile.Verification;
import com.learnershigh.extension.assessment.integration.officialplan.OfficialPlanLookup;
import com.learnershigh.extension.assessment.integration.officialplan.OfficialPlanSourceProvider;
import com.learnershigh.extension.assessment.repository.EvaluationPlanRepository;
import com.learnershigh.extension.assessment.repository.SchoolInfoSchoolMappingRepository;
import com.learnershigh.extension.assessment.repository.SchoolInfoSlotLinkRepository;
import com.learnershigh.extension.assessment.repository.SchoolInfoSourceFileRepository;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * A27-UX 부록 K: 학생 §10-1-3 공식 원본 공급자 = 학교알리미 자동 수집 원본(§38-12~14, 학교 단위 공유).
 *
 * <p>읽기만 한다(외부 요청·DB 쓰기 없음). 포함 조건은 api-contract §10-1-3 '부록 K 변경'과 같다:
 * 그 칸 연결(SchoolInfoSlotLink) + 삭제되지 않은 문서 + VERIFIED 또는 관리자가 분류한 UNCLASSIFIED + 원본 바이트 있음 +
 * 학교알리미 학교 선택이 있으면 같은 학교알리미 학교. 관리자 직접 등록 문서·분석 결과는 여기 들어오지 않는다.
 */
@Component
@Primary
public class SchoolInfoOfficialPlanSource implements OfficialPlanSourceProvider {

    static final String PROVIDER = "SCHOOLINFO";
    static final String SOURCE_URL = "https://www.schoolinfo.go.kr";
    private static final Pattern MONTH = Pattern.compile("\"disclosureMonth\"\\s*:\\s*(\\d{1,2})");

    private final SchoolInfoSlotLinkRepository links;
    private final SchoolInfoSourceFileRepository sources;
    private final EvaluationPlanRepository plans;
    private final SchoolInfoSchoolMappingRepository mappings;

    public SchoolInfoOfficialPlanSource(SchoolInfoSlotLinkRepository links, SchoolInfoSourceFileRepository sources,
            EvaluationPlanRepository plans, SchoolInfoSchoolMappingRepository mappings) {
        this.links = links;
        this.sources = sources;
        this.plans = plans;
        this.mappings = mappings;
    }

    @Override
    @Transactional(readOnly = true)
    public OfficialPlanLookup find(String schoolId, int academicYear, int grade, int semester) {
        List<OfficialPlanLookup.Document> docs = new ArrayList<>();
        for (SchoolInfoSourceFile f : files(schoolId, academicYear, grade, semester)) {
            docs.add(new OfficialPlanLookup.Document(f.id(), PROVIDER, f.fileName(), f.format(), SOURCE_URL, f.sha256(), null,
                    f.downloadedAt().atOffset(ZoneOffset.UTC), true, f.sizeBytes(), disclosureMonth(f.evidenceJson())));
        }
        return new OfficialPlanLookup(true, docs);
    }

    @Override
    public boolean connected() {
        return true;
    }

    /** 그 칸에 학생이 볼 수 있는 원본(파일 순서: 공시월·이름). 내려받기 권한 확인도 이 목록으로 한다. */
    @Transactional(readOnly = true)
    public List<SchoolInfoSourceFile> files(String schoolId, int academicYear, int grade, int semester) {
        Optional<String> selected = mappings.findById(schoolId).filter(SchoolInfoSchoolMapping::active).map(SchoolInfoSchoolMapping::schoolinfoSchoolId);
        Set<String> ids = new LinkedHashSet<>();
        for (SchoolInfoSlotLink l : links.findBySchoolIdAndAcademicYearIn(schoolId, List.of(academicYear))) {
            if (l.grade() != grade || l.semester() != semester) {
                continue;
            }
            Optional<EvaluationPlan> plan = plans.findById(l.planId());
            if (plan.isEmpty() || plan.get().deletedAt() != null) {
                continue;   // 관리자 삭제(§38-9) = 학생에게서도 사라짐
            }
            ids.add(l.sourceFileId());
        }
        List<SchoolInfoSourceFile> out = new ArrayList<>();
        for (SchoolInfoSourceFile f : sources.findAllById(ids)) {
            boolean trusted = f.verification() == Verification.VERIFIED || f.verification() == Verification.UNCLASSIFIED;
            if (!trusted || f.storageKey() == null || f.format() == null || !f.schoolId().equals(schoolId) || f.requestedYear() != academicYear) {
                continue;
            }
            if (selected.isPresent() && f.schoolinfoSchoolId() != null && !selected.get().equals(f.schoolinfoSchoolId())) {
                continue;   // 학교를 다시 고른 뒤 이전 학교 원본이 섞이지 않게
            }
            out.add(f);
        }
        out.sort(Comparator.comparing((SchoolInfoSourceFile f) -> Optional.ofNullable(disclosureMonth(f.evidenceJson())).orElse(99))
                .thenComparing(SchoolInfoSourceFile::fileName));
        return out;
    }

    static Integer disclosureMonth(String evidenceJson) {
        if (evidenceJson == null) {
            return null;
        }
        Matcher m = MONTH.matcher(evidenceJson);
        return m.find() ? Integer.valueOf(m.group(1)) : null;
    }
}
