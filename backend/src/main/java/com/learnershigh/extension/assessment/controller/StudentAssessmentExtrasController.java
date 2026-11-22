package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.assessment.dto.record.ItemsResponse;
import com.learnershigh.extension.assessment.dto.school.HomeMemoRequest;
import com.learnershigh.extension.assessment.dto.school.HomeMemoResponse;
import com.learnershigh.extension.assessment.dto.school.NoticeFileResponse;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.service.record.NoticeFileService;
import com.learnershigh.extension.assessment.service.school.HomeMemoService;
import jakarta.validation.Valid;
import java.io.IOException;
import java.io.UncheckedIOException;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * A27-UX 학생 화면 개선 API (api-contract 'A27-UX 학생 화면 개선 추가 계약' §30-a 홈 메모, §12-c 안내문 첨부, 2026-11-19 DRAFT).
 * Actor: STUDENT. 소유 학생은 인증 Actor에서만 정한다(관리자 Endpoint 없음).
 */
@RestController
@RequestMapping(path = "/api/student/assessment", produces = MediaType.APPLICATION_JSON_VALUE)
public class StudentAssessmentExtrasController {

    private final HomeMemoService memos;
    private final NoticeFileService noticeFiles;

    public StudentAssessmentExtrasController(HomeMemoService memos, NoticeFileService noticeFiles) {
        this.memos = memos;
        this.noticeFiles = noticeFiles;
    }

    @GetMapping("/home-memo")
    public HomeMemoResponse homeMemo(StudentActor student) {
        return memos.get(student);
    }

    @PutMapping(path = "/home-memo", consumes = MediaType.APPLICATION_JSON_VALUE)
    public HomeMemoResponse writeHomeMemo(StudentActor student, @Valid @RequestBody HomeMemoRequest request) {
        return memos.write(student, request.body(), request.expectedVersion());
    }

    @GetMapping("/school-assessments/{assessmentId}/notice-files")
    public ItemsResponse<NoticeFileResponse> noticeFiles(StudentActor student, @PathVariable String assessmentId) {
        return noticeFiles.list(student, assessmentId);
    }

    @PostMapping(path = "/school-assessments/{assessmentId}/notice-files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public NoticeFileResponse attachNoticeFile(StudentActor student, @PathVariable String assessmentId,
            @RequestPart("file") MultipartFile file) {
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException failure) {
            throw new UncheckedIOException(failure);
        }
        return noticeFiles.attach(student, assessmentId, file.getOriginalFilename(), bytes);
    }

    @DeleteMapping("/school-assessments/{assessmentId}/notice-files/{fileId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeNoticeFile(StudentActor student, @PathVariable String assessmentId, @PathVariable String fileId) {
        noticeFiles.remove(student, assessmentId, fileId);
    }

    @GetMapping(path = "/school-assessments/{assessmentId}/notice-files/{fileId}", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> noticeFile(StudentActor student, @PathVariable String assessmentId,
            @PathVariable String fileId) {
        return FileResponses.attachment(noticeFiles.download(student, assessmentId, fileId));
    }

    @GetMapping(path = "/school-assessments/{assessmentId}/notice-files/{fileId}/preview", produces = MediaType.ALL_VALUE)
    public ResponseEntity<InputStreamResource> noticeFilePreview(StudentActor student, @PathVariable String assessmentId,
            @PathVariable String fileId) {
        return FileResponses.inline(noticeFiles.download(student, assessmentId, fileId));
    }
}
