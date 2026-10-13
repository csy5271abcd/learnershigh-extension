package com.learnershigh.extension.studentcare.dto;

import java.util.List;

public record StudentHistoryResponse(StudentRef student, List<CareEventResponse> items) {
}
