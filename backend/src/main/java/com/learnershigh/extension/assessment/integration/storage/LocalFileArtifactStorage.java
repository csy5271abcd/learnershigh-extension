package com.learnershigh.extension.assessment.integration.storage;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 개발용 로컬 격리 Storage. 기본 위치는 사용자 홈의 `.learnershigh-extension/dev-artifact-storage`(Git 저장소·웹 공개 경로 밖).
 * <ul>
 *   <li>파일 이름은 원본 이름이 아니라 UUID 저장 키다(원본 이름은 DB에만). 경로 문자열을 외부에서 받지 않는다.</li>
 *   <li>키 형식을 UUID로 검사하고, 해석한 경로가 Root 안인지 다시 확인한다(경로 이동 공격 차단).</li>
 *   <li>임시 파일에 쓴 뒤 원자적으로 옮긴다. 이미 있는 키는 덮어쓰지 않는다.</li>
 * </ul>
 */
@Component
public class LocalFileArtifactStorage implements ArtifactStorage {

    private static final Logger log = LoggerFactory.getLogger(LocalFileArtifactStorage.class);
    private static final Pattern KEY = Pattern.compile("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$");

    private final Path root;

    public LocalFileArtifactStorage(@Value("${assessment.storage.root}") String root) {
        this.root = Path.of(root).toAbsolutePath().normalize();
    }

    @Override
    public String store(byte[] bytes) {
        String key = UUID.randomUUID().toString();
        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Path temp = Files.createTempFile(target.getParent(), ".upload-", ".tmp");
            try {
                Files.write(temp, bytes);
                Files.move(temp, target, StandardCopyOption.ATOMIC_MOVE);
            } finally {
                Files.deleteIfExists(temp);
            }
            return key;
        } catch (IOException failure) {
            throw new UncheckedIOException("artifact storage write failed", failure);
        }
    }

    @Override
    public InputStream open(String storageKey) {
        try {
            return Files.newInputStream(resolve(storageKey));
        } catch (IOException failure) {
            throw new UncheckedIOException("artifact storage read failed", failure);
        }
    }

    @Override
    public void deleteQuietly(String storageKey) {
        try {
            Files.deleteIfExists(resolve(storageKey));
        } catch (IOException | RuntimeException failure) {
            log.warn("artifact storage compensation delete failed key={}", storageKey);
        }
    }

    Path resolve(String storageKey) {
        if (storageKey == null || !KEY.matcher(storageKey).matches()) {
            throw new IllegalArgumentException("invalid storage key");
        }
        Path path = root.resolve(storageKey.substring(0, 2)).resolve(storageKey).normalize();
        if (!path.startsWith(root)) {
            throw new IllegalArgumentException("storage key escapes root");
        }
        return path;
    }
}
