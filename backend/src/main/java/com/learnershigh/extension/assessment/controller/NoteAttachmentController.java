package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.assessment.dto.record.NoteAttachmentDtos.NoteAttachmentResponse;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.service.record.AdminStudentViewAccess;
import com.learnershigh.extension.assessment.service.record.NoteAttachmentService;
import java.io.IOException;
import java.io.UncheckedIOException;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * §26-1 탐구 노트 첨부 파일 (A28-41, DRAFT). 업로드는 학생 본인만. 관리자는 담당 학생 첨부를 읽기만 한다.
 * 학생 화면 보기 경로(student-view)는 그 학생 범위 검사 뒤 학생 조회 Service 를 그대로 쓴다(쓰기 경로 없음).
 */
@RestController
public class NoteAttachmentController {

    private final NoteAttachmentService attachments;
    private final AdminStudentViewAccess viewAccess;

    public NoteAttachmentController(NoteAttachmentService attachments, AdminStudentViewAccess viewAccess) {
        this.attachments = attachments;
        this.viewAccess = viewAccess;
    }

    @PostMapping(path = "/api/student/assessment/note-attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public NoteAttachmentResponse upload(StudentActor student, @RequestPart("file") MultipartFile file) {
        try {
            return attachments.upload(student, file.getOriginalFilename(), file.getBytes());
        } catch (IOException failure) {
            throw new UncheckedIOException(failure);
        }
    }

    @GetMapping(path = "/api/student/assessment/note-attachments/{attachmentId}/file", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> file(StudentActor student, @PathVariable String attachmentId) {
        return FileResponses.attachment(attachments.download(student, attachmentId));
    }

    @GetMapping(path = "/api/student/assessment/note-attachments/{attachmentId}/preview", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> preview(StudentActor student, @PathVariable String attachmentId) {
        return FileResponses.inline(attachments.preview(student, attachmentId));
    }

    @GetMapping(path = "/api/admin/assessment/note-attachments/{attachmentId}/file", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> adminFile(AdminActor admin, @PathVariable String attachmentId) {
        return FileResponses.attachment(attachments.downloadForAdmin(admin, attachmentId));
    }

    @GetMapping(path = "/api/admin/assessment/note-attachments/{attachmentId}/preview", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> adminPreview(AdminActor admin, @PathVariable String attachmentId) {
        return FileResponses.inline(attachments.previewForAdmin(admin, attachmentId));
    }

    @GetMapping(path = "/api/admin/assessment/students/{studentId}/student-view/note-attachments/{attachmentId}/file",
            produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> viewFile(AdminActor admin, @PathVariable String studentId,
            @PathVariable String attachmentId) {
        return FileResponses.attachment(attachments.download(viewAccess.readOnlyContext(admin, studentId), attachmentId));
    }

    @GetMapping(path = "/api/admin/assessment/students/{studentId}/student-view/note-attachments/{attachmentId}/preview",
            produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> viewPreview(AdminActor admin, @PathVariable String studentId,
            @PathVariable String attachmentId) {
        return FileResponses.inline(attachments.preview(viewAccess.readOnlyContext(admin, studentId), attachmentId));
    }
}
