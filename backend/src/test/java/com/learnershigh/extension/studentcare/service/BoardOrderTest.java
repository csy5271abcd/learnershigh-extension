package com.learnershigh.extension.studentcare.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/** 보드 이름 순 정렬은 이름이 비어 있어도 실패하지 않는다(맨 뒤). */
class BoardOrderTest {

    @Test
    void nullNamesSortLastInsteadOfFailing() {
        List<String> names = new ArrayList<>(Arrays.asList("박민지", null, "김서준"));

        names.sort(StudentCareQueryService.NAME_ORDER);

        assertThat(names).containsExactly("김서준", "박민지", null);
    }
}
