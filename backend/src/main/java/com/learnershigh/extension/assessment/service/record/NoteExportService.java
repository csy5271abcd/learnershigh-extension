package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.FileDownload;
import com.learnershigh.extension.assessment.entity.AssessmentNote;
import com.learnershigh.extension.assessment.entity.NoteRevision;
import com.learnershigh.extension.assessment.entity.SchoolAssessment;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.repository.AssessmentNoteRepository;
import com.learnershigh.extension.assessment.repository.NoteRevisionRepository;
import com.learnershigh.extension.assessment.repository.SchoolAssessmentRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.common.error.BusinessException;
import java.io.ByteArrayInputStream;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

/**
 * §20-1 탐구 노트 PDF 내보내기 (A28-51, DRAFT). 학생 본인의 휴지통 밖 수행평가만.
 * 서버에 저장된 최신 노트 Revision 을 그대로 쓴다(편집 중 미저장 내용은 화면이 먼저 저장을 안내한다). 쓰기 없음.
 */
@Service
@Transactional(readOnly = true)
public class NoteExportService {

    static final int MAX_META = 12;
    static final int MAX_META_TEXT = 300;
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final SchoolAssessmentRepository assessments;
    private final AssessmentNoteRepository notes;
    private final NoteRevisionRepository revisions;
    private final NoteAttachmentService attachments;
    private final RecordJson json;
    private final AssessmentTimes times;
    private final ExportFontLocator fonts;

    public NoteExportService(SchoolAssessmentRepository assessments, AssessmentNoteRepository notes,
            NoteRevisionRepository revisions, NoteAttachmentService attachments, RecordJson json,
            AssessmentTimes times, ExportFontLocator fonts) {
        this.assessments = assessments;
        this.notes = notes;
        this.revisions = revisions;
        this.attachments = attachments;
        this.json = json;
        this.times = times;
        this.fonts = fonts;
    }

    public FileDownload export(StudentActor student, String assessmentId, String subjectName, List<List<String>> meta) {
        SchoolAssessment assessment = assessments.findOwned(assessmentId, student.studentId())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.ASSESSMENT_NOT_FOUND));
        Path font = fonts.find().orElseThrow(() -> new BusinessException(AssessmentErrorCode.EXPORT_FONT_UNAVAILABLE));
        NoteRevision latest = notes.findByStudentIdAndSourceTypeAndSourceId(student.studentId(),
                        AssessmentNote.SOURCE_SCHOOL_ASSESSMENT, assessmentId).stream().findFirst()
                .filter(note -> note.latestRevisionId() != null)
                .flatMap(note -> revisions.findByIdAndNoteId(note.latestRevisionId(), note.id()))
                .orElse(null);
        List<JsonNode> blocks = new ArrayList<>();
        if (latest != null) {
            json.array(latest.blocksJson()).forEach(blocks::add);
        }
        OffsetDateTime now = times.toOffset(times.now());
        String basis = latest == null ? "노트 기준: 저장된 노트 없음"
                : "노트 기준: 서버에 저장된 v" + latest.revisionNumber() + " ("
                        + times.toOffset(latest.savedAt()).format(DATE_TIME) + " 저장) · 저장하지 않은 편집 내용은 들어 있지 않아요";
        NotePdfRenderer.Model model = new NotePdfRenderer.Model(assessment.title(), clip(subjectName), metaPairs(meta),
                basis, now.format(DATE_TIME), latest == null ? null : latest.title(), blocks);
        byte[] pdf = NotePdfRenderer.render(font, model, block -> attachments.imageForExport(student.studentId(),
                block.path("attrs").path("file").path("attachmentId").asString(""), NotePdfRenderer.MAX_IMAGE_BYTES));
        return new FileDownload(fileName(assessment.title(), now), "application/pdf", pdf.length,
                new ByteArrayInputStream(pdf));
    }

    static List<String[]> metaPairs(List<List<String>> meta) {
        List<String[]> pairs = new ArrayList<>();
        if (meta == null) {
            return pairs;
        }
        for (List<String> pair : meta) {
            if (pairs.size() >= MAX_META || pair == null || pair.isEmpty() || pair.get(0) == null || pair.get(0).isBlank()) {
                continue;
            }
            pairs.add(new String[] {clip(pair.get(0)), clip(pair.size() > 1 ? pair.get(1) : null)});
        }
        return pairs;
    }

    private static String clip(String value) {
        if (value == null) {
            return "";
        }
        String v = value.strip();
        return v.length() > MAX_META_TEXT ? v.substring(0, MAX_META_TEXT) : v;
    }

    /** `제목_탐구노트_yyyy-MM-dd.pdf` — 파일 이름에 쓸 수 없는 글자 제거, 한글 유지 */
    static String fileName(String title, OffsetDateTime now) {
        String safe = title == null ? "" : title.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", " ").replaceAll("\\s+", " ").strip();
        if (safe.length() > 80) {
            safe = safe.substring(0, 80).strip();
        }
        if (safe.isEmpty()) {
            safe = "수행평가";
        }
        return safe + "_탐구노트_" + now.format(DATE) + ".pdf";
    }
}
