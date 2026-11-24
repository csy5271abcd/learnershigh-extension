package com.learnershigh.extension.assessment.service.plan;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.learnershigh.extension.assessment.dto.plan.SchoolInfoSyncResponse;
import com.learnershigh.extension.assessment.dto.plan.StudentOfficialPlanResponse;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.integration.context.AcademicContextProvider;
import com.learnershigh.extension.assessment.integration.context.AcademicContextRecord;
import com.learnershigh.extension.assessment.integration.officialplan.OfficialPlanLookup;
import com.learnershigh.extension.assessment.integration.officialplan.OfficialPlanSourceProvider;
import com.learnershigh.extension.assessment.integration.storage.PlanDocumentStorage;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * A28-01 학생 공식 원본 3개년 — 칸 규칙(slotOf)과 재시작 뒤 동명 학교 상태. DB·Docker 없이 협력 객체만 바꿔 본다.
 * 학적: 2026학년도 2학기 고1(예시고) 하나뿐. 서버 기준 최근 3개 학년도 = 2026·2025·2024.
 */
class OfficialPlanQueryServiceTest {

    static final String STUDENT = "stu_unit";
    static final StudentActor ACTOR = new StudentActor(STUDENT, "br_unit");
    static final AcademicContextRecord CURRENT = new AcademicContextRecord("school_unit", "단위고등학교", 2026, 1, 2, List.of(), "TEST",
            List.of(), null, null);

    AcademicContextProvider contexts;
    OfficialPlanSourceProvider sources;
    SchoolInfoSyncService sync;
    StudentOfficialViewService views;
    OfficialPlanQueryService service;

    @BeforeEach
    void setUp() {
        contexts = mock(AcademicContextProvider.class);
        sources = mock(OfficialPlanSourceProvider.class);
        sync = mock(SchoolInfoSyncService.class);
        views = mock(StudentOfficialViewService.class);
        service = new OfficialPlanQueryService(contexts, sources, mock(SchoolInfoOfficialPlanSource.class), mock(PlanDocumentStorage.class),
                sync, views, mock(com.learnershigh.extension.assessment.repository.SchoolInfoSlotLinkRepository.class),
                mock(com.learnershigh.extension.assessment.repository.PlanRevisionRepository.class), mock(PlanPreviewRenditionService.class));
        when(sync.expectedYears()).thenReturn(List.of(2026, 2025, 2024));
        when(contexts.find(anyString(), anyInt(), anyInt())).thenReturn(Optional.empty());
        when(contexts.find(STUDENT, 2026, 2)).thenReturn(Optional.of(CURRENT));
        when(views.currentContext(STUDENT)).thenReturn(Optional.of(CURRENT));
        when(views.resolve(eq(STUDENT), anyString())).thenAnswer(a -> new StudentOfficialViewService.Resolved(a.getArgument(1), a.getArgument(1), null));
        when(sources.find(anyString(), anyInt(), anyInt(), anyInt())).thenReturn(new OfficialPlanLookup(true, List.of()));
        when(sources.connected()).thenReturn(true);
    }

    @Test
    void 학적이_있는_학년도는_학적_칸이다() {
        StudentOfficialPlanResponse r = service.studentGet(ACTOR, 2026, 2, null);
        assertThat(r.contextFound()).isTrue();
        assertThat(r.basis()).isEqualTo("ACADEMIC_RECORD");
        assertThat(r.grade()).isEqualTo(1);
        verify(sources).find("school_unit", 2026, 1, 2);
    }

    @Test
    void 과거_학적이_없어도_현재_학교의_같은_학년_학기_공개_원본을_찾고_학적은_없다고_답한다() {
        StudentOfficialPlanResponse r = service.studentGet(ACTOR, 2025, 2, null);
        assertThat(r.contextFound()).as("학적을 만들지 않는다").isFalse();
        assertThat(r.basis()).isEqualTo("SCHOOL_PUBLIC");
        assertThat(r.schoolId()).isEqualTo("school_unit");
        assertThat(r.grade()).isEqualTo(1);
        verify(sources).find("school_unit", 2025, 1, 2);
    }

    @Test
    void 학년을_고르면_같은_학교의_그_학년_공개_원본이고_학적_칸이_아니다() {
        StudentOfficialPlanResponse r = service.studentGet(ACTOR, 2026, 2, 3);
        assertThat(r.contextFound()).isTrue();
        assertThat(r.basis()).isEqualTo("SCHOOL_PUBLIC");
        assertThat(r.grade()).isEqualTo(3);
        verify(sources).find("school_unit", 2026, 3, 2);
    }

    @Test
    void 최근_3개_학년도_밖이거나_학적이_전혀_없으면_칸이_없다() {
        StudentOfficialPlanResponse old = service.studentGet(ACTOR, 2023, 2, null);
        assertThat(old.basis()).isNull();
        assertThat(old.documents()).isEmpty();
        assertThat(old.schoolId()).isNull();

        when(contexts.find(STUDENT, 2026, 2)).thenReturn(Optional.empty());
        when(views.currentContext(STUDENT)).thenReturn(Optional.empty());
        StudentOfficialPlanResponse none = service.studentGet(ACTOR, 2025, 2, null);
        assertThat(none.basis()).isNull();
        assertThat(none.contextFound()).isFalse();
        verify(sources, never()).find(anyString(), eq(2023), anyInt(), anyInt());
    }

    static SchoolInfoSyncService.Ensured stored(String status) {
        List<SchoolInfoSyncResponse.YearStatus> years = List.of(2026, 2025, 2024).stream()
                .map(y -> new SchoolInfoSyncResponse.YearStatus(y, status, null, null, null, null)).toList();
        return new SchoolInfoSyncService.Ensured(new SchoolInfoSyncResponse("job", "school_unit", List.of(2026, 2025, 2024), "FAILED", years,
                List.of(), null, List.of(), null), false);
    }

    @Test
    void 재시작_뒤_저장_기록만_동명이면_가져오기_실패가_아니라_학교_선택_필요다() {
        when(sync.ensureForStudentSchool("school_unit")).thenReturn(stored("SCHOOL_AMBIGUOUS"));
        when(sync.ambiguous("school_unit")).thenReturn(true);
        when(sync.adminMapped("school_unit")).thenReturn(false);
        var r = service.studentEnsure(ACTOR).body();
        assertThat(r.state()).isEqualTo("SCHOOL_CONFIRMATION_REQUIRED");
        assertThat(r.schoolSelectionRequired()).isTrue();
        assertThat(r.message()).contains("같은 이름");
    }

    @Test
    void 진짜_연결_실패는_그대로_FAILED_이고_관리자_매핑이_있으면_학교_선택을_묻지_않는다() {
        when(sync.ensureForStudentSchool("school_unit")).thenReturn(stored("FAILED"));
        when(sync.ambiguous("school_unit")).thenReturn(false);
        assertThat(service.studentEnsure(ACTOR).body().state()).isEqualTo("FAILED");

        when(sync.ambiguous("school_unit")).thenReturn(true);
        when(sync.adminMapped("school_unit")).thenReturn(true);
        var mapped = service.studentEnsure(ACTOR).body();
        assertThat(mapped.state()).isEqualTo("FAILED");
        assertThat(mapped.schoolSelectionRequired()).isFalse();
        verify(sync, never()).refreshCandidates(any());
    }
}
