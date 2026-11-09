package com.learnershigh.extension.common.integration.vision;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.json.JsonParserFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.stereotype.Component;

/**
 * 사진 관찰 서비스의 근거 사진 저장소를 읽는다.
 * 메타데이터: 사진 관찰 DB의 rhv_evidence_asset(사진 관찰 서비스 V11 마이그레이션). 원본: 비공개 저장 루트 아래 {storage_key}/image.bin
 * (FileEvidenceBlobStore 배치). 읽기 전용이며 state='available'이고 보관 기한 전인 사진만 내준다. 원본은 content_hash와 대조한다.
 * 두 서비스가 하나로 합쳐지면 이 클래스 대신 사진 관찰 쪽 저장소 코드를 직접 쓴다.
 */
@Component
public class VisionStorageEvidenceStore implements VisionEvidenceStore {

    private static final Pattern KEY = Pattern.compile("[0-9a-f]{64}");
    private final JdbcTemplate jdbc;
    private final Path root;
    private final Clock clock;

    @Autowired
    public VisionStorageEvidenceStore(@Value("${learnershigh.vision.evidence.datasource-url:}") String url,
                                      @Value("${learnershigh.vision.evidence.datasource-username:}") String username,
                                      @Value("${learnershigh.vision.evidence.datasource-password:}") String password,
                                      @Value("${learnershigh.vision.evidence.private-root:}") String root,
                                      Clock clock) {
        this.jdbc = url == null || url.isBlank() ? null : new JdbcTemplate(new DriverManagerDataSource(url, username, password));
        this.root = root == null || root.isBlank() ? null : Path.of(root).toAbsolutePath().normalize();
        this.clock = clock;
    }

    VisionStorageEvidenceStore(JdbcTemplate jdbc, Path root, Clock clock) {
        this.jdbc = jdbc;
        this.root = root;
        this.clock = clock;
    }

    @Override
    public List<Asset> list(String facilityId, String studentId, Instant from, Instant to) {
        return query("SELECT asset_id, capture_id, record_json FROM rhv_evidence_asset"
                        + " WHERE facility_id=? AND student_id=? AND state='available' AND expires_at_ms>? ORDER BY asset_id",
                facilityId, studentId, clock.millis()).stream()
                .map(row -> new Asset((String) row.get("asset_id"), (String) row.get("capture_id"),
                        Instant.parse((String) record(row).get("capturedAt"))))
                .filter(a -> !a.capturedAt().isBefore(from) && a.capturedAt().isBefore(to))
                .sorted((a, b) -> a.capturedAt().compareTo(b.capturedAt()))
                .toList();
    }

    @Override
    public Optional<Content> read(String facilityId, String studentId, String assetId) {
        var rows = query("SELECT storage_key, content_hash, record_json FROM rhv_evidence_asset"
                        + " WHERE asset_id=? AND facility_id=? AND student_id=? AND state='available' AND expires_at_ms>?",
                assetId, facilityId, studentId, clock.millis());
        if (rows.isEmpty()) {
            return Optional.empty();
        }
        var row = rows.getFirst();
        String storageKey = (String) row.get("storage_key");
        if (root == null) {
            throw new VisionEvidenceUnavailable(null);
        }
        if (storageKey == null || !KEY.matcher(storageKey).matches()) {
            return Optional.empty();
        }
        byte[] bytes;
        try {
            bytes = Files.readAllBytes(root.resolve(storageKey).resolve("image.bin"));
        } catch (NoSuchFileException missing) {
            return Optional.empty();
        } catch (IOException failure) {
            throw new VisionEvidenceUnavailable(failure);
        }
        if (!sha256(bytes).equals(row.get("content_hash"))) {
            return Optional.empty();
        }
        return Optional.of(new Content((String) record(row).get("mimeType"), bytes));
    }

    private List<Map<String, Object>> query(String sql, Object... args) {
        if (jdbc == null) {
            throw new VisionEvidenceUnavailable(null);
        }
        try {
            return jdbc.queryForList(sql, args);
        } catch (DataAccessException failure) {
            throw new VisionEvidenceUnavailable(failure);
        }
    }

    private static Map<String, Object> record(Map<String, Object> row) {
        return JsonParserFactory.getJsonParser().parseMap((String) row.get("record_json"));
    }

    private static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }
}
