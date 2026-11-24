package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.StudentOfficialEnsureResponse;
import com.learnershigh.extension.assessment.dto.plan.StudentOfficialPlanResponse;
import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.FileDownload;
import com.learnershigh.extension.assessment.entity.SchoolInfoSourceFile;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.context.AcademicContextRecord;
import com.learnershigh.extension.assessment.integration.storage.PlanDocumentStorage;
import com.learnershigh.extension.common.error.BusinessException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.integration.context.AcademicContextProvider;
import com.learnershigh.extension.assessment.integration.officialplan.OfficialPlanLookup;
import com.learnershigh.extension.assessment.integration.officialplan.OfficialPlanSourceProvider;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * A27-UX 학생 공식 공개 원본 조회. 학생 본인의 학적 Context(학교·학년)로만 슬롯을 정한다 — 요청에서 학교·학년을 받지 않는다.
 * 관리자 등록 평가계획서·분석 결과는 여기서 다루지 않는다(공개 규칙 분리).
 */
@Service
public class OfficialPlanQueryService {

    private final AcademicContextProvider contexts;
    private final OfficialPlanSourceProvider sources;
    private final SchoolInfoOfficialPlanSource schoolinfo;
    private final PlanDocumentStorage storage;
    private final SchoolInfoSyncService sync;
    private final StudentOfficialViewService views;
    private final com.learnershigh.extension.assessment.repository.SchoolInfoSlotLinkRepository links;
    private final com.learnershigh.extension.assessment.repository.PlanRevisionRepository revisions;
    private final PlanPreviewRenditionService renditions;

    public OfficialPlanQueryService(AcademicContextProvider contexts, OfficialPlanSourceProvider sources,
            SchoolInfoOfficialPlanSource schoolinfo, PlanDocumentStorage storage, SchoolInfoSyncService sync, StudentOfficialViewService views,
            com.learnershigh.extension.assessment.repository.SchoolInfoSlotLinkRepository links,
            com.learnershigh.extension.assessment.repository.PlanRevisionRepository revisions, PlanPreviewRenditionService renditions) {
        this.links = links;
        this.revisions = revisions;
        this.renditions = renditions;
        this.contexts = contexts;
        this.sources = sources;
        this.schoolinfo = schoolinfo;
        this.storage = storage;
        this.sync = sync;
        this.views = views;
    }

    /**
     * 부록 K: 학생 본인 학적 슬롯의 원본 바이트. 그 학년도·학기 documents 를 다시 계산해 그 안의 ID 만 준다(다른 학교·학년·학기·삭제·보류 404).
     * 내려주기 전에 크기·SHA-256 을 저장 기록과 비교한다.
     */
    public FileDownload studentFile(StudentActor student, int academicYear, int semester, String sourceDocumentId, boolean preview) {
        return studentFile(student, academicYear, semester, null, sourceDocumentId, preview);
    }

    /**
     * A28-01: 목록(studentGet)과 같은 칸 규칙(slotOf)으로 다시 계산한 칸 안의 원본만 준다.
     * 학생 학교(학적 → 없으면 현재 학교)의 공개 원본만 — 다른 학교·다른 학년도 범위·삭제·보류는 404.
     */
    public FileDownload studentFile(StudentActor student, int academicYear, int semester, Integer grade, String sourceDocumentId, boolean preview) {
        Found found = verifiedSource(student, academicYear, semester, grade, sourceDocumentId);
        if (preview && !"PDF".equals(found.file().format())) {
            throw new BusinessException(AssessmentErrorCode.PREVIEW_UNAVAILABLE);
        }
        return new FileDownload(found.file().fileName(), contentType(found.file().format()), found.bytes().length,
                new ByteArrayInputStream(found.bytes()));
    }

    /**
     * A28-06 학생 원본 미리보기(앱 안 Viewer): PDF 는 원본 그대로, HWP·HWPX 는 관리자 원문 보기와 같은 변환기로 만든 미리보기 PDF(원본 아님).
     * 칸 규칙·권한·SHA 검증은 내려받기와 같다. 변환은 이 원본이 연결된 문서 Revision(같은 SHA)의 변환 캐시를 재사용한다.
     * 변환기가 없거나 연결 Revision 이 없으면 415(내려받기 안내), 변환 실패·준비 중은 기존 미리보기 오류 그대로.
     */
    public EvaluationPlanQueryService.PreviewFile studentPreview(StudentActor student, int academicYear, int semester, Integer grade,
            String sourceDocumentId) {
        Found found = verifiedSource(student, academicYear, semester, grade, sourceDocumentId);
        SchoolInfoSourceFile f = found.file();
        if ("PDF".equals(f.format())) {
            return new EvaluationPlanQueryService.PreviewFile(new FileDownload(f.fileName(), "application/pdf", found.bytes().length,
                    new ByteArrayInputStream(found.bytes())), false);
        }
        com.learnershigh.extension.assessment.entity.PlanRevision revision = links.findBySourceFileId(f.id()).stream()
                .map(l -> revisions.findById(l.revisionId()))
                .flatMap(Optional::stream)
                .filter(r -> f.sha256().equals(r.sha256()) && renditions.converts(r))
                .findFirst()
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.PREVIEW_UNAVAILABLE));
        byte[] pdf = renditions.pdf(revision, found.bytes());
        String base = f.fileName().replaceAll("\\.(?i)(hwpx?|pdf)$", "");
        return new EvaluationPlanQueryService.PreviewFile(new FileDownload(base + " (미리보기 변환).pdf", "application/pdf", pdf.length,
                new ByteArrayInputStream(pdf)), true);
    }

    private record Found(SchoolInfoSourceFile file, byte[] bytes) {
    }

    /** 목록과 같은 칸 규칙으로 다시 계산한 칸 안의 원본 + 크기·SHA-256 검증한 바이트 */
    private Found verifiedSource(StudentActor student, int academicYear, int semester, Integer grade, String sourceDocumentId) {
        Slot slot = slotOf(student.studentId(), academicYear, semester, grade)
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.SCHOOLINFO_SOURCE_NOT_FOUND));
        // 부록 O: 관리자 매핑이 없는 동명 학교면 학생이 고른 열람 대상 학교의 원본(학년·학기는 칸 그대로)
        String key = views.resolve(student.studentId(), slot.schoolId()).viewSchoolId();
        SchoolInfoSourceFile f = schoolinfo.files(key, academicYear, slot.grade(), semester).stream()
                .filter(x -> x.id().equals(sourceDocumentId))
                .findFirst()
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.SCHOOLINFO_SOURCE_NOT_FOUND));
        byte[] bytes;
        try (InputStream in = storage.open(f.storageKey())) {
            bytes = in.readAllBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        if (bytes.length != f.sizeBytes() || !sha256(bytes).equals(f.sha256())) {
            throw new BusinessException(AssessmentErrorCode.FILE_INTEGRITY_FAILED);
        }
        return new Found(f, bytes);
    }

    /**
     * 부록 K: 학생 화면 진입 자동 확보. 학교는 학생 학적(최근 3개 학년도 중 학적이 있는 첫 학년도)에서만 정한다.
     * 관리자 화면 진입과 같은 확인을 재사용한다(학교당 작업 1개·TTL 기록 재사용·같은 이름 학교는 관리자 선택 전 등록 0).
     */
    public Ensured studentEnsure(StudentActor student) {
        Optional<AcademicContextRecord> context = Optional.empty();
        for (int year : sync.expectedYears()) {
            for (int semester : List.of(1, 2)) {
                if (context.isEmpty()) {
                    context = contexts.find(student.studentId(), year, semester);
                }
            }
        }
        if (context.isEmpty()) {
            return new Ensured(new StudentOfficialEnsureResponse("NO_CONTEXT", false, List.of(), "최근 3개 학년도 학적 정보가 없어요."), false);
        }
        StudentOfficialViewService.Resolved resolved = views.resolve(student.studentId(), context.get().schoolId());
        boolean viewSelected = resolved.selection() != null;
        SchoolInfoSyncService.Ensured e = sync.ensureForStudentSchool(resolved.viewSchoolId());
        var body = e.body();
        List<StudentOfficialEnsureResponse.Year> years = body.yearStatuses() == null ? List.of()
                : body.yearStatuses().stream().map(y -> new StudentOfficialEnsureResponse.Year(y.academicYear(), y.status())).toList();
        // A28-01: 서버 재시작 뒤에는 동명 후보가 메모리에 없어 저장 기록(SCHOOL_AMBIGUOUS)만으로 답하면 상태가 FAILED 로 계산된다.
        // 같은 이름 학교 문제는 '가져오지 못함'이 아니라 '학교 선택 필요'다 — 학생 선택(§38-16)이 후보를 다시 확인한다(관리자 매핑이 있으면 그것이 먼저).
        boolean storedAmbiguous = !viewSelected && "FAILED".equals(body.state())
                && sync.ambiguous(resolved.viewSchoolId()) && !sync.adminMapped(resolved.viewSchoolId());
        boolean selection = (body.schoolSelection() != null && body.schoolSelection().required()) || storedAmbiguous;
        String state;
        String message = null;
        if (selection) {
            state = "SCHOOL_CONFIRMATION_REQUIRED";
            message = "같은 이름의 학교가 있어요. 지역·주소를 골라 우리 학교 평가계획서 원본을 볼 수 있어요(선생님 확인 전).";
        } else if ((e.running() || "RUNNING".equals(body.state()))
                && (years.isEmpty() || !years.stream().allMatch(y -> REGISTRATION_DONE.contains(y.status())))) {
            // 진행 중 작업: 모든 학년도의 수집·등록이 끝났으면(서버 분석만 남음) 원본은 이미 볼 수 있어 READY.
            // 학교 식별(같은 이름 후보)처럼 아직 정해지지 않은 학년도가 있으면 끝날 때까지 RUNNING
            state = "RUNNING";
        } else if (years.stream().anyMatch(y -> "SCHOOL_IDENTITY_REQUIRED".equals(y.status()))) {
            state = "SCHOOL_IDENTITY_REQUIRED";
            message = "학업 정보에서 학교를 확인하지 못했어요.";
        } else if ("FAILED".equals(body.state())) {
            state = "FAILED";
            message = "학교알리미에서 자료를 가져오지 못했어요. 잠시 뒤 다시 들어와 주세요.";
        } else {
            state = "READY";
        }
        return new Ensured(new StudentOfficialEnsureResponse(state, selection, years, message, viewSelected), "RUNNING".equals(state));
    }

    /** §38-12 학년도 상태 중 수집·등록이 끝난 값 */
    private static final java.util.Set<String> REGISTRATION_DONE = java.util.Set.of("COMPLETED", "PARTIAL", "NOT_PUBLISHED", "YEAR_MISMATCH",
            "NEEDS_SOURCE_VERIFICATION", "YEAR_UNAVAILABLE", "FAILED");

    public record Ensured(StudentOfficialEnsureResponse body, boolean running) {
    }

    private static String contentType(String format) {
        return switch (format == null ? "" : format) {
            case "PDF" -> "application/pdf";
            case "HWP" -> "application/x-hwp";
            case "HWPX" -> "application/hwp+zip";
            default -> "application/octet-stream";
        };
    }

    private static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    public StudentOfficialPlanResponse studentGet(StudentActor student, int academicYear, int semester) {
        return studentGet(student, academicYear, semester, null);
    }

    /**
     * A28-01: 학생 학교의 최근 3개 학년도 공개 원본. 학적 기록과 학교 공개 자료를 구분한다.
     * - 그 학년도·학기 학적이 있고 학년을 따로 고르지 않았으면 학적 칸(basis=ACADEMIC_RECORD, 기존 동작).
     * - 학적이 없거나(과거 학년도) 다른 학년을 골랐으면 그 학교(학적이 없으면 현재 학교)의 공개 원본 칸(basis=SCHOOL_PUBLIC).
     *   학적을 만들거나 바꾸지 않는다. contextFound 는 학적 유무 그대로다.
     */
    public StudentOfficialPlanResponse studentGet(StudentActor student, int academicYear, int semester, Integer grade) {
        boolean contextFound = contexts.find(student.studentId(), academicYear, semester).isPresent();
        return slotOf(student.studentId(), academicYear, semester, grade)
                .map(slot -> {
                    // 부록 O: 칸의 학교·학년·학기는 그대로, 원본을 찾을 학교 키만 학생 열람 선택(선생님 확인 전)을 따른다
                    StudentOfficialViewService.Resolved resolved = views.resolve(student.studentId(), slot.schoolId());
                    OfficialPlanLookup lookup = sources.find(resolved.viewSchoolId(), academicYear, slot.grade(), semester);
                    return new StudentOfficialPlanResponse(academicYear, semester, contextFound, slot.schoolId(),
                            slot.schoolName(), slot.grade(), lookup.connected(), lookup.documents(),
                            resolved.selection() == null ? null : StudentOfficialViewService.selectionOf(resolved.selection()),
                            slot.record() ? StudentOfficialPlanResponse.BASIS_ACADEMIC_RECORD : StudentOfficialPlanResponse.BASIS_SCHOOL_PUBLIC);
                })
                .orElseGet(() -> new StudentOfficialPlanResponse(academicYear, semester, contextFound, null, null, null,
                        sources.connected(), List.of(), null, null));
    }

    /** 원본 칸: 학교 · 학년 · 학적 칸 여부 */
    record Slot(String schoolId, String schoolName, int grade, boolean record) {
    }

    /**
     * A28-01 칸 규칙(목록·내려받기·미리보기 공용).
     * 1) 그 학년도·학기 학적이 있고 학년 지정이 없거나 같으면 학적 칸.
     * 2) 최근 3개 학년도(서버 KST) 안이면 그 해 학적 학교 → 없으면 현재 학교(학생 ensure 와 같은 규칙)의 공개 원본 칸.
     *    학년은 지정값 → 없으면 그 해 학적 학년 → 현재 학년. 학교는 학생 자신의 학교로만 정한다(요청에서 학교를 받지 않는다).
     * 3) 그 밖(범위 밖 학년도 · 학적이 전혀 없음)은 칸 없음.
     */
    Optional<Slot> slotOf(String studentId, int academicYear, int semester, Integer grade) {
        Optional<AcademicContextRecord> own = contexts.find(studentId, academicYear, semester);
        if (own.isPresent() && (grade == null || grade == own.get().grade())) {
            return Optional.of(new Slot(own.get().schoolId(), own.get().schoolName(), own.get().grade(), true));
        }
        if (!sync.expectedYears().contains(academicYear)) {
            return Optional.empty();
        }
        Optional<AcademicContextRecord> base = own.isPresent() ? own : views.currentContext(studentId);
        return base.map(c -> new Slot(c.schoolId(), c.schoolName(), grade != null ? grade : c.grade(), false));
    }
}
