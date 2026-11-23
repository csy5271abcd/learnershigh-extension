package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.service.record.SchoolAssessmentDeletionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** §12-1 수행평가 영구 삭제 (A28-49, DRAFT). 학생 본인만, 제목을 그대로 적어야 한다. 휴지통 이동은 §30 DELETE 그대로. */
@RestController
public class SchoolAssessmentDeletionController {

    public record PermanentDeleteRequest(@Size(max = 300) String confirmTitle) {
    }

    private final SchoolAssessmentDeletionService deletion;

    public SchoolAssessmentDeletionController(SchoolAssessmentDeletionService deletion) {
        this.deletion = deletion;
    }

    @PostMapping(path = "/api/student/assessment/school-assessments/{assessmentId}/permanent-delete",
            consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void permanentDelete(StudentActor student, @PathVariable String assessmentId,
            @Valid @RequestBody PermanentDeleteRequest request) {
        deletion.deletePermanently(student, assessmentId, request.confirmTitle());
    }
}
