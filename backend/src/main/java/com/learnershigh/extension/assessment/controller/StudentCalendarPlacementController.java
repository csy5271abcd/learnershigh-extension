package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.assessment.dto.school.CalendarPlacementRequest;
import com.learnershigh.extension.assessment.dto.school.CalendarPlacementResponse;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.service.school.CalendarPlacementService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * A28-33 학생 홈 달력 개인 임시 배치 (api-contract §30-b, 2026-11-23 DRAFT).
 * Actor: STUDENT. 소유 학생은 인증 Actor에서만 정한다(경로·본문에 학생 ID 없음, 관리자 Endpoint 없음).
 */
@RestController
@RequestMapping(path = "/api/student/assessment/calendar-placements", produces = MediaType.APPLICATION_JSON_VALUE)
public class StudentCalendarPlacementController {

    private final CalendarPlacementService placements;

    public StudentCalendarPlacementController(CalendarPlacementService placements) {
        this.placements = placements;
    }

    @GetMapping
    public CalendarPlacementResponse list(StudentActor student, @RequestParam int academicYear, @RequestParam int semester) {
        return placements.list(student, academicYear, semester);
    }

    @PutMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public CalendarPlacementResponse.Item place(StudentActor student, @Valid @RequestBody CalendarPlacementRequest request) {
        return placements.place(student, request);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reset(StudentActor student, @RequestParam int academicYear, @RequestParam int semester) {
        placements.reset(student, academicYear, semester);
    }
}
