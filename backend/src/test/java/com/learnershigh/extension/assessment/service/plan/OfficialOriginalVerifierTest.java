package com.learnershigh.extension.assessment.service.plan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.learnershigh.extension.assessment.entity.EvaluationPlan;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.assessment.entity.SchoolInfoSlotLink;
import com.learnershigh.extension.assessment.entity.SchoolInfoSourceFile;
import com.learnershigh.extension.assessment.integration.storage.PlanDocumentStorage;
import com.learnershigh.extension.assessment.repository.SchoolInfoSlotLinkRepository;
import com.learnershigh.extension.assessment.repository.SchoolInfoSourceFileRepository;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/** A28-05 서버 원본 검증: 보관 바이트를 다시 읽어 SHA·크기를 대조한다(DB·Docker 없이). */
class OfficialOriginalVerifierTest {

    @TempDir
    Path root;
    PlanDocumentStorage storage;
    SchoolInfoSlotLinkRepository links;
    SchoolInfoSourceFileRepository sources;
    OfficialOriginalVerifier verifier;
    EvaluationPlan plan;
    PlanRevision revision;
    byte[] bytes = "official original bytes".getBytes(StandardCharsets.UTF_8);
    String sha = OfficialOriginalVerifier.sha256(bytes);

    @BeforeEach
    void setUp() {
        storage = new PlanDocumentStorage(root.toString());
        links = mock(SchoolInfoSlotLinkRepository.class);
        sources = mock(SchoolInfoSourceFileRepository.class);
        verifier = new OfficialOriginalVerifier(links, sources, storage);
        plan = mock(EvaluationPlan.class);
        when(plan.id()).thenReturn("plan_1");
        when(plan.schoolId()).thenReturn("sch_x");
        when(plan.academicYear()).thenReturn(2026);
        when(plan.grade()).thenReturn(1);
        when(plan.semester()).thenReturn(2);
        revision = mock(PlanRevision.class);
        when(revision.id()).thenReturn("rev_1");
        when(revision.sha256()).thenReturn(sha);
        when(revision.sizeBytes()).thenReturn((long) bytes.length);
        when(revision.hasStoredFile()).thenReturn(true);
        SchoolInfoSlotLink link = mock(SchoolInfoSlotLink.class);
        when(link.planId()).thenReturn("plan_1");
        when(link.schoolId()).thenReturn("sch_x");
        when(link.academicYear()).thenReturn(2026);
        when(link.grade()).thenReturn(1);
        when(link.semester()).thenReturn(2);
        when(link.sourceFileId()).thenReturn("src_1");
        when(links.findByRevisionId("rev_1")).thenReturn(List.of(link));
        SchoolInfoSourceFile source = mock(SchoolInfoSourceFile.class);
        when(source.sha256()).thenReturn(sha);
        when(sources.findById("src_1")).thenReturn(Optional.of(source));
    }

    @Test
    void 보관_원본_바이트가_Revision_과_같으면_통과하고_서버가_계산한_SHA_를_돌려준다() {
        when(revision.fileRef()).thenReturn(storage.store(bytes));
        OfficialOriginalVerifier.Result result = verifier.verify(plan, revision);
        assertThat(result.ok()).isTrue();
        assertThat(result.sha256()).isEqualTo(sha);
    }

    @Test
    void 보관_원본이_바뀌었으면_무결성_실패다() {
        when(revision.fileRef()).thenReturn(storage.store("tampered".getBytes(StandardCharsets.UTF_8)));
        OfficialOriginalVerifier.Result result = verifier.verify(plan, revision);
        assertThat(result.ok()).isFalse();
        assertThat(result.integrityBroken()).isTrue();
        assertThat(result.failure()).isEqualTo("stored_original_mismatch");
    }

    @Test
    void 다른_학기_칸_연결이나_원본_없음은_검증_대상이_아니다() {
        when(plan.semester()).thenReturn(1);
        assertThat(verifier.verify(plan, revision).failure()).isEqualTo("not_official_original");
        assertThat(verifier.isOfficialOriginal(plan, revision)).isFalse();
        when(plan.semester()).thenReturn(2);
        when(revision.hasStoredFile()).thenReturn(false);
        assertThat(verifier.verify(plan, revision).failure()).isEqualTo("original_missing");
    }
}
