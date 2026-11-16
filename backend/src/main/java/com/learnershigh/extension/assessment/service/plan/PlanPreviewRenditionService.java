package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.entity.PlanDocumentFormat;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.preview.PlanPreviewConverter;
import com.learnershigh.extension.common.error.BusinessException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * HWP·HWPX 원문의 미리보기용 PDF 파생 파일 (A25). 원본 Revision 파일은 그대로 두고, 파생 PDF를 따로 캐시한다.
 * <ul>
 *   <li>캐시 키 = Revision ID + 원본 SHA-256 + 변환기 ID. 원본이 바뀌면(무결성 위반은 앞에서 409) 다른 키라 섞이지 않는다.</li>
 *   <li>실패도 같은 키로 기록해 같은 원본을 매 요청마다 다시 변환하지 않는다(무한 재시도 방지). 변환기를 바꾸면 키가 바뀌어 다시 시도한다.</li>
 *   <li>같은 Revision 동시 요청은 한 번만 변환한다(Revision별 잠금).</li>
 *   <li>파생 PDF는 원본으로 취급하지 않는다: 다운로드(/file)는 계속 원본 HWP·HWPX, 미리보기(/preview)만 이 PDF.</li>
 * </ul>
 */
@Service
public class PlanPreviewRenditionService {

    private final PlanPreviewConverter converter;
    private final Path cacheRoot;
    private final ConcurrentHashMap<String, Object> locks = new ConcurrentHashMap<>();

    public PlanPreviewRenditionService(PlanPreviewConverter converter,
            @Value("${assessment.plan-storage.root:${assessment.storage.root}/plan-documents}") String storageRoot) {
        this.converter = converter;
        this.cacheRoot = Path.of(storageRoot).resolve("preview-renditions");
    }

    public boolean converts(PlanRevision revision) {
        return converter.enabled() && (revision.format() == PlanDocumentFormat.HWP || revision.format() == PlanDocumentFormat.HWPX);
    }

    /** 검증된 원본 바이트로 미리보기 PDF를 돌려준다. 실패는 422 PLAN_PREVIEW_FAILED(원인 코드만). */
    public byte[] pdf(PlanRevision revision, byte[] verifiedSource) {
        String key = key(revision);
        Path pdf = cacheRoot.resolve(key + ".pdf");
        Path failed = cacheRoot.resolve(key + ".failed");
        synchronized (locks.computeIfAbsent(revision.id(), id -> new Object())) {
            try {
                if (Files.isRegularFile(pdf)) {
                    return Files.readAllBytes(pdf);
                }
                if (Files.isRegularFile(failed)) {
                    throw failure(Files.readString(failed, StandardCharsets.UTF_8).strip());
                }
                PlanPreviewConverter.Result result = converter.convert(verifiedSource,
                        revision.format() == PlanDocumentFormat.HWP ? "hwp" : "hwpx");
                Files.createDirectories(cacheRoot);
                if (!result.ok()) {
                    // 일시적인 원인(바쁨·실행 불가·중단)은 기록하지 않아 다음 요청에서 다시 시도한다
                    if (!result.failure().equals("busy") && !result.failure().equals("converter_unavailable")
                            && !result.failure().equals("interrupted")) {
                        Files.writeString(failed, result.failure(), StandardCharsets.UTF_8);
                    }
                    throw failure(result.failure());
                }
                Path temp = Files.createTempFile(cacheRoot, key, ".tmp");
                Files.write(temp, result.pdf());
                Files.move(temp, pdf, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
                return result.pdf();
            } catch (IOException exception) {
                throw failure("cache_unavailable");
            }
        }
    }

    private String key(PlanRevision revision) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest((revision.sha256() + "|" + converter.id()).getBytes(StandardCharsets.UTF_8));
            return revision.id().replaceAll("[^A-Za-z0-9_-]", "_") + "-" + HexFormat.of().formatHex(digest, 0, 12);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static BusinessException failure(String reason) {
        return new BusinessException(AssessmentErrorCode.PLAN_PREVIEW_FAILED,
                "원문을 PDF로 변환하지 못했어요(" + reason + "). 원본을 내려받아 한글 프로그램에서 확인해 주세요.");
    }
}
