package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.dto.PageResponse;
import com.learnershigh.extension.assessment.dto.record.ResourceDtos.ArchiveItem;
import com.learnershigh.extension.assessment.entity.Artifact;
import com.learnershigh.extension.assessment.entity.AssessmentNote;
import com.learnershigh.extension.assessment.entity.AssessmentResource;
import com.learnershigh.extension.assessment.entity.GrowthRecord;
import com.learnershigh.extension.assessment.entity.SchoolAssessment;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.repository.ArtifactRepository;
import com.learnershigh.extension.assessment.repository.AssessmentResourceRepository;
import com.learnershigh.extension.assessment.repository.GrowthRecordRepository;
import com.learnershigh.extension.assessment.repository.SchoolAssessmentRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.common.error.BusinessException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 휴지통(소프트 삭제·복원, 2026-11-11 사용자 지시 정책). OD-A11의 보존 기간·영구 삭제는 미결 → 영구 삭제 명령은 없다.
 *
 * <ul>
 *   <li>삭제 표시는 상위 항목(수행평가·결과물·자료·성장 기록)에만 한다. 노트 Revision·결과물 Version·피드백 요청/Snapshot/답변·
 *       실제 파일 바이트는 바꾸지 않는다 → 복원하면 같은 ID·이력·파일 그대로 돌아온다.</li>
 *   <li>수행평가를 휴지통에 넣으면 그 노트·결과물도 함께 가려진다(소유 확인이 활성 수행평가만 통과). 노트는 수행평가와 1:1이라 따로 삭제하지 않는다.</li>
 *   <li>학생은 본인 것만, 관리자는 자기가 만든 참고자료만 삭제·복원한다. 남의 ID는 존재 여부도 드러내지 않고 404.</li>
 *   <li>관리자의 피드백 Snapshot 열람(요청 당시 노트·파일)은 휴지통과 무관하게 유지된다(감사 기록).</li>
 * </ul>
 */
@Service
@Transactional
public class TrashService {

    public static final String TYPE_ARTIFACT = "ARTIFACT";
    public static final String TYPE_RESOURCE = "RESOURCE";
    public static final String TYPE_GROWTH_RECORD = "GROWTH_RECORD";

    private final SchoolAssessmentRepository assessments;
    private final ArtifactRepository artifacts;
    private final AssessmentResourceRepository resources;
    private final GrowthRecordRepository growth;
    private final AssessmentTimes times;

    public TrashService(SchoolAssessmentRepository assessments, ArtifactRepository artifacts,
            AssessmentResourceRepository resources, GrowthRecordRepository growth, AssessmentTimes times) {
        this.assessments = assessments;
        this.artifacts = artifacts;
        this.resources = resources;
        this.growth = growth;
        this.times = times;
    }

    // ---- 학생: 휴지통으로 이동 ----

    public void trashSchoolAssessment(StudentActor student, String assessmentId) {
        SchoolAssessment assessment = assessments.findOwned(assessmentId, student.studentId())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.ASSESSMENT_NOT_FOUND));
        assessment.moveToTrash(student.studentId(), times.now());
        assessments.flush();
    }

    public void trashArtifact(StudentActor student, String artifactId) {
        Artifact artifact = artifacts.findByIdAndStudentIdAndDeletedAtIsNull(artifactId, student.studentId())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.ARTIFACT_NOT_FOUND));
        artifact.moveToTrash(student.studentId(), times.now());
        artifacts.flush();
    }

    public void trashResource(StudentActor student, String resourceId) {
        AssessmentResource resource = resources.findByIdAndOwnerTypeAndOwnerIdAndDeletedAtIsNull(resourceId,
                        AssessmentResource.OWNER_STUDENT, student.studentId())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.NOT_FOUND, "자료를 찾을 수 없습니다."));
        resource.moveToTrash(student.studentId(), times.now());
        resources.flush();
    }

    public void trashGrowthRecord(StudentActor student, String recordId) {
        GrowthRecord record = growth.findByIdAndStudentIdAndDeletedAtIsNull(recordId, student.studentId())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.NOT_FOUND, "성장 기록을 찾을 수 없습니다."));
        record.moveToTrash(student.studentId(), times.now());
        growth.flush();
    }

    // ---- 학생: 복원 (§30 POST /archive/restore) ----

    public ArchiveItem restore(StudentActor student, String sourceType, String sourceId) {
        if (sourceId == null || sourceId.isBlank()) {
            throw RecordJson.invalid("sourceId", "required");
        }
        String id = student.studentId();
        switch (sourceType == null ? "" : sourceType) {
            case AssessmentNote.SOURCE_SCHOOL_ASSESSMENT -> {
                SchoolAssessment a = assessments.findByIdAndStudentIdAndDeletedAtIsNotNull(sourceId, id)
                        .orElseThrow(TrashService::notInTrash);
                a.restoreFromTrash();
                assessments.flush();
                return assessmentItem(a, null);
            }
            case TYPE_ARTIFACT -> {
                Artifact artifact = artifacts.findByIdAndStudentIdAndDeletedAtIsNotNull(sourceId, id)
                        .orElseThrow(TrashService::notInTrash);
                // 상위 수행평가가 휴지통이면 결과물만 복원해도 보이지 않는다 → 수행평가를 먼저 복원하게 한다.
                if (assessments.findOwned(artifact.sourceId(), id).isEmpty()) {
                    throw RecordJson.invalid("sourceId", "parent_in_trash");
                }
                artifact.restoreFromTrash();
                artifacts.flush();
                return artifactItem(artifact, null, null);
            }
            case TYPE_RESOURCE -> {
                AssessmentResource r = resources.findByIdAndOwnerTypeAndOwnerIdAndDeletedAtIsNotNull(sourceId,
                        AssessmentResource.OWNER_STUDENT, id).orElseThrow(TrashService::notInTrash);
                r.restoreFromTrash();
                resources.flush();
                return resourceItem(r);
            }
            case TYPE_GROWTH_RECORD -> {
                GrowthRecord g = growth.findByIdAndStudentIdAndDeletedAtIsNotNull(sourceId, id)
                        .orElseThrow(TrashService::notInTrash);
                g.restoreFromTrash();
                growth.flush();
                return growthItem(g);
            }
            default -> throw RecordJson.invalid("sourceType", "not_allowed");
        }
    }

    // ---- 학생: 휴지통 목록 (§30 tab=trash) ----

    @Transactional(readOnly = true)
    public PageResponse<ArchiveItem> list(StudentActor student, int page, int size) {
        String id = student.studentId();
        List<ArchiveItem> items = new ArrayList<>();
        assessments.findByStudentIdAndDeletedAtIsNotNullOrderByDeletedAtDesc(id).forEach(a -> items.add(assessmentItem(a, null)));
        List<Artifact> trashedArtifacts = artifacts.findByStudentIdAndDeletedAtIsNotNullOrderByDeletedAtDesc(id);
        Map<String, SchoolAssessment> parents = assessments.findAllById(
                        trashedArtifacts.stream().map(Artifact::sourceId).distinct().toList()).stream()
                .filter(a -> a.studentId().equals(id))
                .collect(Collectors.toMap(SchoolAssessment::id, Function.identity()));
        trashedArtifacts.forEach(artifact -> {
            SchoolAssessment parent = parents.get(artifact.sourceId());
            items.add(artifactItem(artifact, parent == null ? null : parent.title(), parent));
        });
        resources.findByOwnerTypeAndOwnerIdAndDeletedAtIsNotNullOrderByDeletedAtDesc(AssessmentResource.OWNER_STUDENT, id)
                .forEach(r -> items.add(resourceItem(r)));
        growth.findByStudentIdAndDeletedAtIsNotNullOrderByDeletedAtDesc(id).forEach(g -> items.add(growthItem(g)));
        items.sort(Comparator.comparing(ArchiveItem::deletedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return PageResponse.slice(items, page, size);
    }

    // ---- 관리자 참고자료(자기가 만든 것만) ----

    public void trashScrap(AdminActor admin, String scrapId) {
        AssessmentResource r = adminOwn(admin, scrapId).filter(x -> !x.inTrash()).orElseThrow(TrashService::scrapNotFound);
        r.moveToTrash(admin.adminId(), times.now());
        resources.flush();
    }

    public void restoreScrap(AdminActor admin, String scrapId) {
        AssessmentResource r = adminOwn(admin, scrapId).filter(AssessmentResource::inTrash).orElseThrow(TrashService::notInTrash);
        r.restoreFromTrash();
        resources.flush();
    }

    @Transactional(readOnly = true)
    public List<AssessmentResource> trashedScraps(AdminActor admin) {
        return resources.findByOwnerTypeAndOwnerIdAndDeletedAtIsNotNullOrderByDeletedAtDesc(AssessmentResource.OWNER_ADMIN,
                admin.adminId());
    }

    private Optional<AssessmentResource> adminOwn(AdminActor admin, String scrapId) {
        return resources.findById(scrapId).filter(r -> AssessmentResource.OWNER_ADMIN.equals(r.ownerType())
                && admin.adminId().equals(r.ownerId()));
    }

    // ---- 보기 ----

    private ArchiveItem assessmentItem(SchoolAssessment a, String origin) {
        return new ArchiveItem(AssessmentNote.SOURCE_SCHOOL_ASSESSMENT, a.id(), a.title(), a.subjectId(), a.academicYear(),
                a.semester(), a.status().name(), times.toOffset(a.updatedAt()), null, false,
                a.deletedAt() == null ? null : times.toOffset(a.deletedAt()), origin);
    }

    private ArchiveItem artifactItem(Artifact artifact, String parentTitle, SchoolAssessment parent) {
        return new ArchiveItem(TYPE_ARTIFACT, artifact.id(), artifact.title(), parent == null ? null : parent.subjectId(),
                parent == null ? null : parent.academicYear(), parent == null ? null : parent.semester(), null, null,
                null, false, artifact.deletedAt() == null ? null : times.toOffset(artifact.deletedAt()),
                parentTitle == null ? "결과물" : "수행평가 '" + parentTitle + "'의 결과물");
    }

    private ArchiveItem resourceItem(AssessmentResource r) {
        return new ArchiveItem(TYPE_RESOURCE, r.id(), r.fields().title(), null, null, null, null,
                times.toOffset(r.updatedAt()), null, false, r.deletedAt() == null ? null : times.toOffset(r.deletedAt()),
                "자료함");
    }

    private ArchiveItem growthItem(GrowthRecord g) {
        return new ArchiveItem(TYPE_GROWTH_RECORD, g.id(), g.fields().title(), g.fields().subjectId(), null, null, null,
                times.toOffset(g.updatedAt()), null, false, g.deletedAt() == null ? null : times.toOffset(g.deletedAt()),
                "성장 기록");
    }

    private static BusinessException notInTrash() {
        return new BusinessException(AssessmentErrorCode.NOT_FOUND, "휴지통에서 항목을 찾을 수 없습니다.");
    }

    private static BusinessException scrapNotFound() {
        return new BusinessException(AssessmentErrorCode.NOT_FOUND, "자료를 찾을 수 없습니다.");
    }
}
