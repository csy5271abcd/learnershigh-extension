package com.learnershigh.extension.common.testsupport;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** E2E 전용 Endpoint (api-contract.md §65-11). 운영 Profile에는 등록되지 않는다. */
@RestController
@Profile("e2e")
@RequestMapping("/api/test")
public class E2eTestSupportController {

    private final E2eTestSupport support;

    public E2eTestSupportController(E2eTestSupport support) {
        this.support = support;
    }

    @PutMapping("/clock")
    public Map<String, LocalDate> setClock(@Valid @RequestBody ClockRequest request) {
        support.setDate(request.date());
        return Map.of("date", request.date());
    }

    @PostMapping("/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reset() {
        support.reset();
    }

    @PutMapping("/integration")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setIntegration(@Valid @RequestBody IntegrationRequest request) {
        support.setStudyDataAvailable(request.studyDataAvailable());
    }

    public record ClockRequest(@NotNull LocalDate date) {
    }

    public record IntegrationRequest(@NotNull Boolean studyDataAvailable) {
    }
}
