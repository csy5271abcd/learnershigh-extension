package com.learnershigh.extension.assessment.integration.storage;

import java.io.InputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 평가계획서 원문 Storage (S-4·S-5, 2026-11-13 사용자 승인: 개발용 로컬 격리 Storage).
 * 결과물 Storage({@link LocalFileArtifactStorage})의 구현을 그대로 재사용하되 Root만 분리한다: 학생 개인 결과물과 학교 공통 문서를
 * 한 폴더에 섞지 않는다. 기본 위치는 결과물 Storage Root 아래 {@code plan-documents} (Git 저장소·웹 공개 경로 밖).
 * 원문 바이트는 형식(PDF·HWP·HWPX) 그대로 보관하고 덮어쓰지 않는다. 운영 Provider는 별도 결정(API-OD-A03 나머지).
 *
 * <p>{@link ArtifactStorage}를 구현하지 않는다: 같은 타입의 Bean이 둘이 되어 결과물 Service 주입이 모호해지지 않게 한다.
 */
@Component
public class PlanDocumentStorage {

    private final LocalFileArtifactStorage files;

    public PlanDocumentStorage(
            @Value("${assessment.plan-storage.root:${assessment.storage.root}/plan-documents}") String root) {
        this.files = new LocalFileArtifactStorage(root);
    }

    /** 바이트를 저장하고 새 저장 키(UUID)를 돌려준다. 같은 키를 덮어쓰지 않는다. */
    public String store(byte[] bytes) {
        return files.store(bytes);
    }

    public InputStream open(String storageKey) {
        return files.open(storageKey);
    }

    /** DB 저장이 실패했을 때의 보상 삭제에만 쓴다. */
    public void deleteQuietly(String storageKey) {
        files.deleteQuietly(storageKey);
    }
}
