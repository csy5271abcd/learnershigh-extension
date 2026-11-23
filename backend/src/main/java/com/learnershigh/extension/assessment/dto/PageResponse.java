package com.learnershigh.extension.assessment.dto;

import java.util.List;

/** api-contract.md §4 / §49 목록 응답. page는 0-based. */
public record PageResponse<T>(List<T> items, Page page) {

    public record Page(int number, int size, long totalElements, int totalPages) {
    }

    public static <T> PageResponse<T> slice(List<T> all, int page, int size) {
        int from = (int) Math.min((long) page * size, all.size());
        int to = Math.min(from + size, all.size());
        int totalPages = (int) Math.ceil(all.size() / (double) size);
        return new PageResponse<>(List.copyOf(all.subList(from, to)), new Page(page, size, all.size(), totalPages));
    }
}
