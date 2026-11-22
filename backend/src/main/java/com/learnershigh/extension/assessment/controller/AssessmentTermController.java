package com.learnershigh.extension.assessment.controller;

import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * §9-2 (A27-UX 부록 O, 사용자 지시 '현재 학년도·학기는 Backend 가 KST Clock 으로'): 현재 학년도·학기.
 * 화면이 VITE_ASSESSMENT_DEV_CURRENT_TERM 같은 설정 없이 이 값으로 학적을 조회한다. 학적이 없으면 학적 조회가 '정보 없음'을 돌려준다(추측 없음).
 * 인증된 학생·관리자만(기존 인증 경로 그대로).
 */
@RestController
public class AssessmentTermController {

    private final AssessmentTimes times;

    public AssessmentTermController(AssessmentTimes times) {
        this.times = times;
    }

    public record CurrentTerm(int academicYear, int semester, String basis) {
    }

    @GetMapping(path = "/api/student/assessment/current-term", produces = MediaType.APPLICATION_JSON_VALUE)
    public CurrentTerm studentTerm(StudentActor student) {
        return current();
    }

    @GetMapping(path = "/api/admin/assessment/current-term", produces = MediaType.APPLICATION_JSON_VALUE)
    public CurrentTerm adminTerm(AdminActor admin) {
        return current();
    }

    private CurrentTerm current() {
        AssessmentTimes.Term term = times.currentTerm();
        return new CurrentTerm(term.academicYear(), term.semester(), "KST_CALENDAR_MARCH_SEPTEMBER");
    }
}
