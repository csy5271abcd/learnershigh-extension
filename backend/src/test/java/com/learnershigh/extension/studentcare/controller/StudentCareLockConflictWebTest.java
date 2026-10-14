package com.learnershigh.extension.studentcare.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.learnershigh.extension.studentcare.service.StudentCareQueryService;
import com.learnershigh.extension.studentcare.service.StudentCareService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * 잠금 대기 실패(PessimisticLockingFailureException, 예: MySQL lock wait timeout)가 MVC Dispatch를 거쳐
 * GlobalExceptionHandler에 닿으면 500이 아니라 409 CONCURRENT_MODIFICATION JSON이다 (api-contract.md §5).
 */
@WebMvcTest(StudentCareController.class)
class StudentCareLockConflictWebTest {

    @Autowired
    MockMvc mvc;

    @MockitoBean
    StudentCareQueryService queryService;

    @MockitoBean
    StudentCareService service;

    @Test
    void lockWaitFailureOnOpenIs409ConcurrentModification() throws Exception {
        when(service.open(any())).thenThrow(new CannotAcquireLockException("Lock wait timeout exceeded"));

        mvc.perform(post("/api/admin/student-care/cases").contentType(MediaType.APPLICATION_JSON).content("""
                        {"branchId":"br_gangnam","studentId":"stu_002","channel":"CALL","reason":"RECORD_ISSUE"}"""))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("CONCURRENT_MODIFICATION"))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void lockWaitFailureOnReadIs409ConcurrentModification() throws Exception {
        when(queryService.board("br_gangnam")).thenThrow(new CannotAcquireLockException("Lock wait timeout exceeded"));

        mvc.perform(get("/api/admin/student-care/board").param("branchId", "br_gangnam"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONCURRENT_MODIFICATION"));
    }
}
