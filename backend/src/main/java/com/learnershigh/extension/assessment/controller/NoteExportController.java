package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.service.record.NoteExportService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** §20-1 탐구 노트 PDF 내보내기 (A28-51, DRAFT). 학생 본인만, 쓰기 없음. 관리자 경로 없음. */
@RestController
public class NoteExportController {

    public record NoteExportRequest(@Size(max = 300) String subjectName, @Size(max = 20) List<List<String>> meta) {
    }

    private final NoteExportService export;

    public NoteExportController(NoteExportService export) {
        this.export = export;
    }

    @PostMapping(path = "/api/student/assessment/school-assessments/{assessmentId}/note-export",
            consumes = MediaType.APPLICATION_JSON_VALUE, produces = {MediaType.APPLICATION_PDF_VALUE, MediaType.APPLICATION_JSON_VALUE})
    public ResponseEntity<InputStreamResource> export(StudentActor student, @PathVariable String assessmentId,
            @Valid @RequestBody NoteExportRequest request) {
        return FileResponses.attachment(export.export(student, assessmentId, request.subjectName(), request.meta()));
    }
}
