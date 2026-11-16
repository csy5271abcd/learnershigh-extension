package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.assessment.dto.record.ArtifactDtos.FileDownload;
import java.nio.charset.StandardCharsets;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/** §26 원본 파일 Stream 응답. 항상 첨부(attachment)로 내려 브라우저가 문서를 실행·렌더링하지 않게 한다. */
final class FileResponses {

    private FileResponses() {
    }

    /**
     * §26 미리보기: PDF·이미지(서버가 형식 검사·SHA 확인한 것만)를 inline으로. 정확한 Content-Type + nosniff + no-store.
     * HTML·SVG 등 실행 가능한 형식은 미리보기 대상이 아니다(ArtifactViews.PREVIEWABLE). 파일 경로·저장 키는 내보내지 않는다.
     */
    static ResponseEntity<InputStreamResource> inline(FileDownload file) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .contentLength(file.sizeBytes())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(file.fileName(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(new InputStreamResource(file.content()));
    }

    /** A25: HWP·HWPX 미리보기를 변환 PDF로 줄 때 원본이 아님을 알린다(X-Preview-Rendition: converted-pdf). */
    static ResponseEntity<InputStreamResource> preview(FileDownload file, boolean converted) {
        ResponseEntity<InputStreamResource> response = inline(file);
        if (!converted) {
            return response;
        }
        return ResponseEntity.status(response.getStatusCode())
                .headers(headers -> {
                    headers.addAll(response.getHeaders());
                    headers.set("X-Preview-Rendition", "converted-pdf");
                })
                .body(response.getBody());
    }

    static ResponseEntity<InputStreamResource> attachment(FileDownload file) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .contentLength(file.sizeBytes())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(file.fileName(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .body(new InputStreamResource(file.content()));
    }
}
