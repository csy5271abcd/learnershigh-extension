package com.learnershigh.extension.studentcare.dto;

import java.util.List;

public record StudentHistoryResponse(StudentRef student, List<CareEventResponse> items, List<CareCaseResponse> cases) {
    public StudentHistoryResponse(StudentRef student, List<CareEventResponse> items) { this(student, items, List.of()); }
}
