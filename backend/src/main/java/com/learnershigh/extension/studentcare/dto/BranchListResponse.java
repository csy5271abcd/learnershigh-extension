package com.learnershigh.extension.studentcare.dto;

import java.util.List;

public record BranchListResponse(List<Item> items) {

    public record Item(String branchId, String name, int studentCount) {
    }
}
