package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.PlanUploadResponse;
import com.learnershigh.extension.assessment.entity.SchoolInfoSchoolMapping;
import com.learnershigh.extension.assessment.entity.SchoolInfoSlotLink;
import com.learnershigh.extension.assessment.entity.SchoolInfoSourceFile;
import com.learnershigh.extension.assessment.entity.SchoolInfoSyncYear;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.schoolinfo.SchoolInfoClient;
import com.learnershigh.extension.assessment.integration.storage.PlanDocumentStorage;
import com.learnershigh.extension.assessment.repository.SchoolInfoSchoolMappingRepository;
import com.learnershigh.extension.assessment.repository.EvaluationPlanRepository;
import com.learnershigh.extension.assessment.repository.PlanRevisionRepository;
import com.learnershigh.extension.assessment.repository.SchoolInfoSlotLinkRepository;
import com.learnershigh.extension.assessment.repository.SchoolInfoSourceFileRepository;
import com.learnershigh.extension.assessment.repository.SchoolInfoSyncYearRepository;
import com.learnershigh.extension.common.error.BusinessException;
import java.time.Instant;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * A27-UX 부록 E: 학교알리미 원본 기록·슬롯 연결·학년도 확인 기록을 트랜잭션 하나씩으로 쓴다.
 * 문서 등록(§38)과 슬롯 연결은 같은 트랜잭션이라, 연결 Unique 위반(동시 요청)이면 등록도 함께 되돌아간다.
 */
@Service
@Transactional
public class SchoolInfoSyncWriter {

    public enum Outcome { REGISTERED, REVISED, UNCHANGED }

    public record Linked(Outcome outcome, String planId, String revisionId) {
    }

    private final SchoolInfoSourceFileRepository sources;
    private final SchoolInfoSlotLinkRepository links;
    private final SchoolInfoSyncYearRepository years;
    private final PlanRevisionRepository revisions;
    private final EvaluationPlanService plans;
    private final PlanDocumentStorage storage;
    private final EvaluationPlanRepository planRows;
    private final SchoolInfoSchoolMappingRepository mappings;

    public SchoolInfoSyncWriter(SchoolInfoSourceFileRepository sources, SchoolInfoSlotLinkRepository links,
            SchoolInfoSyncYearRepository years, PlanRevisionRepository revisions, EvaluationPlanService plans,
            PlanDocumentStorage storage, EvaluationPlanRepository planRows, SchoolInfoSchoolMappingRepository mappings) {
        this.planRows = planRows;
        this.mappings = mappings;
        this.sources = sources;
        this.links = links;
        this.years = years;
        this.revisions = revisions;
        this.plans = plans;
        this.storage = storage;
    }

    /** 원본 기록. 이미 있으면(같은 학교·조회 학년도·SHA) 그 행을 돌려준다 — 분류도 처음 값 그대로. */
    public SchoolInfoSourceFile recordSource(String schoolId, int requestedYear, Integer resolvedYear, String schoolinfoId,
            String attachmentSeq, String fileName, String sha256, byte[] bytes, String format,
            SchoolInfoSourceFile.Verification verification, String evidenceJson, Instant now) {
        Optional<SchoolInfoSourceFile> existing = sources.findBySchoolIdAndRequestedYearAndSha256(schoolId, requestedYear, sha256);
        if (existing.isPresent()) {
            return existing.get();
        }
        String key = null;
        if (format != null && verification != SchoolInfoSourceFile.Verification.NOT_PLAN) {
            key = storage.store(bytes);
            String stored = key;
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED) {
                        storage.deleteQuietly(stored);
                    }
                }
            });
        }
        return sources.saveAndFlush(SchoolInfoSourceFile.record(schoolId, requestedYear, resolvedYear, schoolinfoId,
                attachmentSeq, fileName, sha256, bytes.length, format, key, verification, evidenceJson, now));
    }

    /**
     * 확인된 원본을 슬롯 하나에 연결한다.
     * <ul>
     *   <li>이미 연결됨 → UNCHANGED (문서·Revision 만들지 않음)</li>
     *   <li>같은 슬롯에 같은 파일 이름의 다른 원본이 연결돼 있음 → 그 문서에 개정본을 더한다(REVISED) — 이전 Revision·확정·초안 그대로</li>
     *   <li>그 문서를 관리자가 삭제했음 → 아무것도 하지 않음(UNCHANGED, 되살리지 않음)</li>
     *   <li>그 밖 → 새 문서(REGISTERED)</li>
     * </ul>
     */
    public Linked link(AdminActor admin, SchoolInfoSourceFile source, int academicYear, int grade, int semester,
            byte[] bytes, String sourceUrl, Instant now) {
        Optional<SchoolInfoSlotLink> existing = links.findBySchoolIdAndAcademicYearAndGradeAndSemesterAndSourceFileId(
                source.schoolId(), academicYear, grade, semester, source.id());
        if (existing.isPresent()) {
            return new Linked(Outcome.UNCHANGED, existing.get().planId(), existing.get().revisionId());
        }
        EvaluationPlanService.UploadedPdf file = new EvaluationPlanService.UploadedPdf(source.fileName(), null, bytes, sourceUrl);
        Optional<SchoolInfoSlotLink> sameName = links.findBySchoolIdAndAcademicYearIn(source.schoolId(), java.util.List.of(academicYear))
                .stream()
                .filter(l -> l.grade() == grade && l.semester() == semester)
                .filter(l -> sources.findById(l.sourceFileId()).map(s -> s.fileName().equals(source.fileName())
                        && !s.sha256().equals(source.sha256())).orElse(false))
                .findFirst();
        Outcome outcome;
        String planId;
        String revisionId;
        if (sameName.isPresent() && planRows.findById(sameName.get().planId()).isEmpty()) {
            // 관리자가 삭제한 문서에는 개정본을 붙이지도, 새 문서로 되살리지도 않는다
            return new Linked(Outcome.UNCHANGED, sameName.get().planId(), null);
        }
        if (sameName.isPresent()) {
            planId = sameName.get().planId();
            Optional<com.learnershigh.extension.assessment.entity.PlanRevision> already = revisions.findFirstByPlanIdAndSha256(planId, source.sha256());
            if (already.isPresent()) {
                revisionId = already.get().id();
                outcome = Outcome.UNCHANGED;
            } else {
                PlanUploadResponse up = plans.addRevision(admin, planId, file);
                revisionId = up.documentRevisionId();
                outcome = Outcome.REVISED;
            }
        } else {
            PlanUploadResponse up = plans.register(admin, source.schoolId(), academicYear, grade, semester, file);
            planId = up.planId();
            revisionId = up.documentRevisionId();
            outcome = Outcome.REGISTERED;
        }
        links.saveAndFlush(SchoolInfoSlotLink.link(source, academicYear, grade, semester, planId, revisionId, now));
        return new Linked(outcome, planId, revisionId);
    }

    /** 부록 F §38-13: 학교 선택 저장(학교마다 하나). 이미 다른 학교를 골랐으면 expectedVersion 이 맞아야 한다. */
    public SchoolInfoSchoolMapping saveMapping(String schoolId, long expectedVersion, SchoolInfoClient.SchoolDetail chosen, String adminId,
            Instant now) {
        SchoolInfoSchoolMapping m = mappings.findById(schoolId).orElseGet(() -> SchoolInfoSchoolMapping.start(schoolId));
        if (m.version() != expectedVersion) {
            throw new BusinessException(AssessmentErrorCode.SCHOOLINFO_SELECTION_CONFLICT);
        }
        m.select(chosen.schoolinfoId(), chosen.schoolName(), chosen.address(), chosen.sido(), chosen.sigungu(), adminId, now);
        return mappings.saveAndFlush(m);
    }

    /** 선택한 학교의 이름·주소가 학교알리미에서 바뀌었다 → 무효(등록하지 않고 다시 고르게 한다). */
    public void invalidateMapping(String schoolId, String reason) {
        mappings.findById(schoolId).filter(SchoolInfoSchoolMapping::active).ifPresent(m -> {
            m.invalidate(reason);
            mappings.save(m);
        });
    }

    /** 학년도 확인 결과 기록(끝난 상태만). */
    public void yearChecked(String schoolId, int academicYear, String status, Integer resolvedYear, String message, Instant now) {
        if ("QUEUED".equals(status) || "FETCHING".equals(status)) {
            throw new BusinessException(AssessmentErrorCode.INVALID_STATE_TRANSITION);
        }
        SchoolInfoSyncYear row = years.findById(new SchoolInfoSyncYear.Key(schoolId, academicYear))
                .orElseGet(() -> SchoolInfoSyncYear.of(schoolId, academicYear));
        row.checked(status, resolvedYear, message, now);
        years.save(row);
    }
}
