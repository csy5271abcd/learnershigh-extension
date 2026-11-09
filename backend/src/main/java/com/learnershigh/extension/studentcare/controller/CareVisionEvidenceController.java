package com.learnershigh.extension.studentcare.controller;

import com.learnershigh.extension.studentcare.dto.VisionEvidenceListResponse;
import com.learnershigh.extension.studentcare.service.CareVisionEvidenceQueryService;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 학생 케어 사진 관찰 근거 사진 (api-contract.md §65-11). Actor: ADMIN.
 * 사진 판정은 사진 관찰 서비스가 맡고, 이 컨트롤러는 관리자에게 보여주기만 한다.
 */
@Validated
@RestController
@RequestMapping("/api/admin/student-care/students/{studentId}/vision-evidence")
public class CareVisionEvidenceController {

    private final CareVisionEvidenceQueryService evidenceService;

    public CareVisionEvidenceController(CareVisionEvidenceQueryService evidenceService) {
        this.evidenceService = evidenceService;
    }

    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public VisionEvidenceListResponse list(@PathVariable String studentId, @RequestParam @NotBlank String branchId,
                                           @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                           @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return evidenceService.list(branchId, studentId, from, to);
    }

    /** 사진 원본. 이 경로만 이미지로 응답한다(img 요청의 Accept: image/*) */
    @GetMapping("/{evidenceId}/content")
    public ResponseEntity<byte[]> content(@PathVariable String studentId, @PathVariable String evidenceId,
                                          @RequestParam @NotBlank String branchId) {
        var content = evidenceService.content(branchId, studentId, evidenceId);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(content.contentType()))
                .cacheControl(CacheControl.noStore().cachePrivate()).header("X-Content-Type-Options", "nosniff").body(content.bytes());
    }
}
