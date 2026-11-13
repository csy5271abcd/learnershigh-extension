package com.learnershigh.extension.assessment.integration.storage;

import java.io.InputStream;

/**
 * 결과물 파일 Storage 경계 (api-contract.md §25·26, 2026-11-11 사용자 승인: 단기 개발용 로컬 격리 Storage).
 * Domain은 저장 키(storageKey)만 안다. 운영 Provider(객체 저장소·백업·보존·악성코드 검사)는 별도 결정이다.
 */
public interface ArtifactStorage {

    /** 바이트를 저장하고 새 저장 키(UUID)를 돌려준다. 같은 키를 덮어쓰지 않는다. */
    String store(byte[] bytes);

    InputStream open(String storageKey);

    /** DB 저장이 실패했을 때의 보상 삭제에만 쓴다(성공한 버전 파일은 지우지 않는다). */
    void deleteQuietly(String storageKey);
}
