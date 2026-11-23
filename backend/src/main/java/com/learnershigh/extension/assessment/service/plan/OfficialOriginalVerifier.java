package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.entity.EvaluationPlan;
import com.learnershigh.extension.assessment.entity.PlanRevision;
import com.learnershigh.extension.assessment.entity.SchoolInfoSlotLink;
import com.learnershigh.extension.assessment.entity.SchoolInfoSourceFile;
import com.learnershigh.extension.assessment.integration.storage.PlanDocumentStorage;
import com.learnershigh.extension.assessment.repository.SchoolInfoSlotLinkRepository;
import com.learnershigh.extension.assessment.repository.SchoolInfoSourceFileRepository;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * A28-05 서버 원본 검증: 학교알리미에서 자동 수집·보관한 공식 원본이면 관리자가 같은 파일을 다시 고르지 않아도 된다.
 * 대신 서버가 다음을 모두 확인한다(하나라도 아니면 검증 실패 → 확정 0건).
 * <ol>
 *   <li>이 Revision 이 학교알리미 슬롯 연결(SchoolInfoSlotLink)에서 왔다 — 관리자 직접 업로드·출처 링크만 있는 문서는 대상 아님</li>
 *   <li>연결의 학교·학년도·학년·학기 = 문서 슬롯(다른 학교·학년도 원본 혼입 차단)</li>
 *   <li>학교알리미 원본 기록 SHA = Revision SHA</li>
 *   <li>Storage 의 보관 바이트를 다시 읽어 계산한 크기·SHA-256 = Revision 기록(변조·손상 차단)</li>
 * </ol>
 * 권한·분석 결과 소속·과목·근거 위치 검사는 확정 서비스가 그대로 한다(이 검증이 그 검사를 대신하지 않는다).
 */
@Component
public class OfficialOriginalVerifier {

    /** 검증 결과. failure != null 이면 실패 사유(FieldViolation reason) */
    public record Result(String sha256, String failure, boolean integrityBroken) {
        public boolean ok() {
            return failure == null;
        }
    }

    private final SchoolInfoSlotLinkRepository links;
    private final SchoolInfoSourceFileRepository sources;
    private final PlanDocumentStorage storage;

    public OfficialOriginalVerifier(SchoolInfoSlotLinkRepository links, SchoolInfoSourceFileRepository sources, PlanDocumentStorage storage) {
        this.links = links;
        this.sources = sources;
        this.storage = storage;
    }

    /** 화면 표시용: 서버 원본 검증 대상(학교알리미 수집 원본)인가 — 바이트는 읽지 않는다 */
    public boolean isOfficialOriginal(EvaluationPlan plan, PlanRevision revision) {
        return slotLink(plan, revision).isPresent();
    }

    public Result verify(EvaluationPlan plan, PlanRevision revision) {
        Optional<SchoolInfoSlotLink> link = slotLink(plan, revision);
        if (link.isEmpty()) {
            return new Result(null, "not_official_original", false);
        }
        Optional<SchoolInfoSourceFile> source = sources.findById(link.get().sourceFileId());
        if (source.isEmpty() || !revision.sha256().equals(source.get().sha256())) {
            return new Result(null, "official_source_mismatch", false);
        }
        if (!revision.hasStoredFile()) {
            return new Result(null, "original_missing", false);
        }
        byte[] bytes;
        try (InputStream in = storage.open(revision.fileRef())) {
            bytes = in.readAllBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        String sha = sha256(bytes);
        if (bytes.length != revision.sizeBytes() || !sha.equals(revision.sha256())) {
            return new Result(null, "stored_original_mismatch", true);
        }
        return new Result(sha, null, false);
    }

    private Optional<SchoolInfoSlotLink> slotLink(EvaluationPlan plan, PlanRevision revision) {
        List<SchoolInfoSlotLink> found = links.findByRevisionId(revision.id());
        return found.stream()
                .filter(l -> l.planId().equals(plan.id()) && l.schoolId().equals(plan.schoolId()) && l.academicYear() == plan.academicYear()
                        && l.grade() == plan.grade() && l.semester() == plan.semester())
                .findFirst();
    }

    static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
