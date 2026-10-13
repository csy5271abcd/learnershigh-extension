package com.learnershigh.extension.common.integration.learnershigh;

/** Existing LearnersHigh 지점. Extension에 필요한 값만 노출한다 (Anti-Corruption Layer). */
public record ExistingBranch(String branchId, String name) {
}
