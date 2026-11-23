package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.StudentOfficialViewResponse;
import com.learnershigh.extension.assessment.entity.StudentOfficialView;
import com.learnershigh.extension.assessment.entity.StudentOfficialViewEvent;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.integration.context.AcademicContextProvider;
import com.learnershigh.extension.assessment.integration.context.AcademicContextRecord;
import com.learnershigh.extension.assessment.repository.StudentOfficialViewEventRepository;
import com.learnershigh.extension.assessment.repository.StudentOfficialViewRepository;
import com.learnershigh.extension.common.error.BusinessException;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

/**
 * §38-16 (A27-UX 부록 O, 사용자 승인 부록 N-7): 학생 개인의 '공식 원본 열람 대상' 학교 선택.
 * <ul>
 *   <li>학적 학교에 같은 이름 학교가 여럿이고(저장된 확인 기록이 SCHOOL_AMBIGUOUS) 관리자 매핑이 없을 때만 고를 수 있다.</li>
 *   <li>관리자 매핑이 있으면 늘 그것이 먼저다(학생 선택은 쓰이지 않는다). 학생 선택은 학적·관리자 매핑·확정값을 바꾸지 않는다.</li>
 *   <li>원본은 학교알리미 학교 단위 키(기존 키 재사용 또는 si_)에 한 번만 저장·공유된다(학생마다 재다운로드 0).</li>
 *   <li>학적 학교가 바뀌면 예전 선택은 쓰지 않는다(보류).</li>
 * </ul>
 */
@Service
public class StudentOfficialViewService {

    /** 학생 선택으로 만든 학교 키 매핑의 기록 주체(관리자가 아님) */
    static final String ACTOR = "system_student_view";

    private final AcademicContextProvider contexts;
    private final SchoolInfoSyncService sync;
    private final StudentOfficialViewRepository views;
    private final StudentOfficialViewEventRepository events;
    private final Clock clock;

    public StudentOfficialViewService(AcademicContextProvider contexts, SchoolInfoSyncService sync, StudentOfficialViewRepository views,
            StudentOfficialViewEventRepository events, Clock clock) {
        this.contexts = contexts;
        this.sync = sync;
        this.views = views;
        this.events = events;
        this.clock = clock;
    }

    /** 공식 원본을 찾을 학교 키. selection!=null 이면 학생이 고른 학교(선생님 확인 전). */
    public record Resolved(String rosterSchoolId, String viewSchoolId, StudentOfficialView selection) {
    }

    public Resolved resolve(String studentId, String rosterSchoolId) {
        if (sync.adminMapped(rosterSchoolId) || !sync.ambiguous(rosterSchoolId)) {
            return new Resolved(rosterSchoolId, rosterSchoolId, null);
        }
        return views.findById(studentId)
                .filter(v -> v.rosterSchoolId().equals(rosterSchoolId))
                .map(v -> new Resolved(rosterSchoolId, v.viewSchoolId(), v))
                .orElse(new Resolved(rosterSchoolId, rosterSchoolId, null));
    }

    /** 최근 3개 학년도 중 학적이 있는 첫 학년도·학기(학생 ensure 와 같은 규칙). 추측하지 않는다. */
    public Optional<AcademicContextRecord> currentContext(String studentId) {
        for (int year : sync.expectedYears()) {
            for (int semester : List.of(1, 2)) {
                Optional<AcademicContextRecord> c = contexts.find(studentId, year, semester);
                if (c.isPresent()) {
                    return c;
                }
            }
        }
        return Optional.empty();
    }

    public StudentOfficialViewResponse get(StudentActor student) {
        Optional<AcademicContextRecord> context = currentContext(student.studentId());
        if (context.isEmpty()) {
            return new StudentOfficialViewResponse("NO_CONTEXT", null, List.of(), null, "최근 3개 학년도 학적 정보가 없어요.");
        }
        String roster = context.get().schoolId();
        String name = context.get().schoolName();
        if (sync.adminMapped(roster)) {
            return new StudentOfficialViewResponse("ADMIN_CONFIRMED", name, List.of(), null, null);
        }
        if (!sync.ambiguous(roster)) {
            return new StudentOfficialViewResponse("NOT_REQUIRED", name, List.of(), null, null);
        }
        Resolved r = resolve(student.studentId(), roster);
        SchoolInfoSyncService.CandidateState cs = sync.candidatesOf(roster);
        if (cs.candidates().isEmpty() && !cs.running()) {
            // 서버 재시작 등으로 후보가 메모리에 없다 → 그 학교만 다시 확인(동명 학교는 검색·상세 조회만, 5분에 한 번)
            sync.refreshCandidates(roster);
            cs = sync.candidatesOf(roster);
        }
        List<StudentOfficialViewResponse.Candidate> list = cs.candidates().stream()
                .filter(c -> SchoolInfoSyncService.norm(c.detail().schoolName()).equals(SchoolInfoSyncService.norm(name)))
                .map(c -> new StudentOfficialViewResponse.Candidate(c.candidateId(), c.detail().schoolName(), c.detail().sido(),
                        c.detail().sigungu(), c.detail().address(), c.selectable(), c.unselectableReason()))
                .toList();
        StudentOfficialViewResponse.Selection selection = r.selection() == null ? null : selectionOf(r.selection());
        String state;
        String message = null;
        if (selection != null) {
            state = "SELECTED";
        } else if (cs.running() || (list.isEmpty() && cs.selectionReason() == null)) {
            state = "RUNNING";
        } else if (list.stream().noneMatch(StudentOfficialViewResponse.Candidate::selectable)) {
            state = "UNAVAILABLE";
            message = "같은 이름 학교를 지역·주소로 구별할 수 없어요. 선생님(관리자)에게 학교 확인을 요청해 주세요.";
        } else {
            state = "SELECT_REQUIRED";
            message = "같은 이름의 학교가 있어요. 지역·주소를 골라 우리 학교 평가계획서 원본을 볼 수 있어요.";
        }
        return new StudentOfficialViewResponse(state, name, list, selection, message);
    }

    /** 학생이 후보 하나를 고른다(본인만). 학적·관리자 매핑은 바꾸지 않는다. 고른 학교의 원본 확인을 바로 시작한다. */
    public StudentOfficialViewResponse select(StudentActor student, String candidateId, Long expectedVersion) {
        AcademicContextRecord context = currentContext(student.studentId())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.OFFICIAL_VIEW_NOT_ALLOWED));
        String roster = context.schoolId();
        if (sync.adminMapped(roster) || !sync.ambiguous(roster)) {
            throw new BusinessException(AssessmentErrorCode.OFFICIAL_VIEW_NOT_ALLOWED);
        }
        SchoolInfoSyncService.CandidateView chosen = sync.candidatesOf(roster).candidates().stream()
                .filter(c -> c.candidateId().equals(candidateId))
                .findFirst()
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.OFFICIAL_VIEW_CANDIDATE_INVALID));
        if (!chosen.selectable() || chosen.detail().address() == null
                || !SchoolInfoSyncService.norm(chosen.detail().schoolName()).equals(SchoolInfoSyncService.norm(context.schoolName()))) {
            throw new BusinessException(AssessmentErrorCode.OFFICIAL_VIEW_CANDIDATE_INVALID);
        }
        Optional<StudentOfficialView> current = views.findById(student.studentId());
        long currentVersion = current.map(StudentOfficialView::version).orElse(0L);
        if (expectedVersion != null && expectedVersion != currentVersion) {
            throw new BusinessException(AssessmentErrorCode.OFFICIAL_VIEW_VERSION_CONFLICT);
        }
        String key = sync.directoryKey(chosen.detail(), ACTOR);
        StudentOfficialView view = current.orElseGet(() -> StudentOfficialView.start(student.studentId()));
        String action = current.isPresent() ? StudentOfficialViewEvent.CHANGE : StudentOfficialViewEvent.SELECT;
        view.select(roster, chosen.detail().schoolinfoId(), key, chosen.detail().schoolName(), chosen.detail().sido(),
                chosen.detail().sigungu(), chosen.detail().address(), clock.instant());
        try {
            views.saveAndFlush(view);
        } catch (DataIntegrityViolationException | org.springframework.orm.ObjectOptimisticLockingFailureException race) {
            throw new BusinessException(AssessmentErrorCode.OFFICIAL_VIEW_VERSION_CONFLICT);
        }
        events.save(StudentOfficialViewEvent.of(student.studentId(), action, roster, chosen.detail().schoolinfoId(), eventTime(student.studentId())));
        sync.ensureForStudentSchool(key);
        return get(student);
    }

    /** 본인 선택 철회(없으면 그대로). 다시 고를 수 있다. */
    public StudentOfficialViewResponse clear(StudentActor student, Long expectedVersion) {
        Optional<StudentOfficialView> current = views.findById(student.studentId());
        if (current.isPresent()) {
            if (expectedVersion != null && expectedVersion != current.get().version()) {
                throw new BusinessException(AssessmentErrorCode.OFFICIAL_VIEW_VERSION_CONFLICT);
            }
            views.delete(current.get());
            views.flush();
            events.save(StudentOfficialViewEvent.of(student.studentId(), StudentOfficialViewEvent.CLEAR, current.get().rosterSchoolId(),
                    current.get().schoolinfoSchoolId(), eventTime(student.studentId())));
        }
        return get(student);
    }

    /** 감사 기록 순서 보장: 같은 학생의 새 기록은 직전 기록보다 늘 뒤(같은 순간·고정 시계여도 1마이크로초씩 민다, DATETIME(6)). */
    private java.time.Instant eventTime(String studentId) {
        java.time.Instant now = clock.instant().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        return events.findTopByStudentIdOrderByOccurredAtDesc(studentId)
                .map(StudentOfficialViewEvent::occurredAt)
                .filter(last -> !now.isAfter(last))
                .map(last -> last.plusNanos(1_000))
                .orElse(now);
    }

    static StudentOfficialViewResponse.Selection selectionOf(StudentOfficialView v) {
        return new StudentOfficialViewResponse.Selection(v.schoolName(), v.sido(), v.sigungu(), v.address(),
                v.selectedAt().atOffset(ZoneOffset.ofHours(9)), v.version(), false);
    }
}
