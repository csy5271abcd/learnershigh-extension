package com.learnershigh.extension.common.integration.vision;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;

class VisionStorageEvidenceStoreTest {

    private static final String KEY = "a".repeat(64);
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-10T00:00:00Z"), ZoneOffset.UTC);

    @TempDir
    Path root;

    @Test
    void readsImageByStorageKeyWhenHashMatches() throws Exception {
        byte[] image = {(byte) 0xFF, (byte) 0xD8, 1, 2, (byte) 0xFF, (byte) 0xD9};
        Files.createDirectories(root.resolve(KEY));
        Files.write(root.resolve(KEY).resolve("image.bin"), image);
        var store = new VisionStorageEvidenceStore(jdbc(row(KEY, sha256(image))), root, CLOCK);
        var content = store.read("demo_large", "demo_s001", "asset_1").orElseThrow();
        assertEquals("image/jpeg", content.mimeType());
        assertArrayEquals(image, content.bytes());
    }

    @Test
    void changedImageIsNotReturned() throws Exception {
        Files.createDirectories(root.resolve(KEY));
        Files.write(root.resolve(KEY).resolve("image.bin"), new byte[] {9, 9});
        var store = new VisionStorageEvidenceStore(jdbc(row(KEY, sha256(new byte[] {1}))), root, CLOCK);
        assertTrue(store.read("demo_large", "demo_s001", "asset_1").isEmpty());
    }

    @Test
    void invalidStorageKeyIsNotFollowed() {
        var store = new VisionStorageEvidenceStore(jdbc(row("../../etc", "0".repeat(64))), root, CLOCK);
        assertTrue(store.read("demo_large", "demo_s001", "asset_1").isEmpty());
    }

    @Test
    void missingConfigurationIsUnavailableNotEmpty() {
        var store = new VisionStorageEvidenceStore(null, root, CLOCK);
        assertThrows(VisionEvidenceStore.VisionEvidenceUnavailable.class,
                () -> store.list("demo_large", "demo_s001", Instant.EPOCH, Instant.now()));
    }

    private static Map<String, Object> row(String storageKey, String hash) {
        return Map.of("storage_key", storageKey, "content_hash", hash,
                "record_json", "{\"mimeType\":\"image/jpeg\",\"capturedAt\":\"2026-10-27T02:00:00.000Z\"}");
    }

    private static JdbcTemplate jdbc(Map<String, Object> row) {
        var jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of(row));
        return jdbc;
    }

    private static String sha256(byte[] bytes) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    }
}
