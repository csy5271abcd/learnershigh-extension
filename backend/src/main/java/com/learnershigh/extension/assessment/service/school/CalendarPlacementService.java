package com.learnershigh.extension.assessment.service.school;

import com.learnershigh.extension.assessment.dto.school.CalendarPlacementRequest;
import com.learnershigh.extension.assessment.dto.school.CalendarPlacementResponse;
import com.learnershigh.extension.assessment.entity.CalendarPlacement;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.repository.CalendarPlacementRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.CommonErrorCode;
import com.learnershigh.extension.common.error.FieldViolation;
import java.time.LocalDate;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * A28-33 학생 홈 달력 개인 임시 배치(api-contract §30-b DRAFT). 학생 본인 것만 읽고 쓴다(학생 ID는 인증에서만, 관리자 Endpoint 없음).
 * 공식 일정(운영계획·수행평가·D-day)은 이 표를 읽지 않는다.
 */
@Service
@Transactional
public class CalendarPlacementService {

    /** 공백·제어문자 없는 1~200자 (화면 키 planId|subjectId|rowKey) */
    private static final Pattern SOURCE_KEY = Pattern.compile("[^\\s\\p{Cntrl}]{1,200}");

    private final CalendarPlacementRepository placements;
    private final AssessmentTimes times;

    public CalendarPlacementService(CalendarPlacementRepository placements, AssessmentTimes times) {
        this.placements = placements;
        this.times = times;
    }

    @Transactional(readOnly = true)
    public CalendarPlacementResponse list(StudentActor student, int academicYear, int semester) {
        checkTerm(academicYear, semester);
        return new CalendarPlacementResponse(academicYear, semester,
                placements.findTerm(student.studentId(), academicYear, semester).stream().map(this::item).toList());
    }

    /** 같은 학생·학기·키는 덮어쓴다(멱등) */
    public CalendarPlacementResponse.Item place(StudentActor student, CalendarPlacementRequest request) {
        int year = request.academicYear();
        int semester = request.semester();
        checkTerm(year, semester);
        String key = request.sourceKey();
        if (!SOURCE_KEY.matcher(key).matches()) {
            throw invalid("sourceKey", "invalid");
        }
        LocalDate from = request.rangeFrom();
        LocalDate to = request.rangeTo();
        LocalDate date = request.displayDate();
        if (from.isAfter(to)) {
            throw invalid("rangeTo", "before_from");
        }
        if (from.getYear() != to.getYear() || from.getMonth() != to.getMonth()) {
            throw invalid("rangeTo", "other_month");
        }
        int expectedYear = from.getMonthValue() >= 3 ? year : year + 1;
        if (from.getYear() != expectedYear) {
            throw invalid("rangeFrom", "other_year");
        }
        if (date.isBefore(from) || date.isAfter(to)) {
            throw invalid("displayDate", "out_of_range");
        }
        CalendarPlacement placement = placements.findOne(student.studentId(), year, semester, key)
                .orElseGet(() -> CalendarPlacement.start(student.studentId(), year, semester, key));
        placement.place(date, from, to, times.now());
        return item(placements.saveAndFlush(placement));
    }

    /** 그 학기 배치 초기화(본인 것만) */
    public void reset(StudentActor student, int academicYear, int semester) {
        checkTerm(academicYear, semester);
        placements.deleteTerm(student.studentId(), academicYear, semester);
    }

    private static void checkTerm(int academicYear, int semester) {
        if (academicYear < 2000 || academicYear > 2100) {
            throw invalid("academicYear", "range");
        }
        if (semester != 1 && semester != 2) {
            throw invalid("semester", "range");
        }
    }

    private static BusinessException invalid(String field, String reason) {
        return BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, new FieldViolation(field, reason));
    }

    private CalendarPlacementResponse.Item item(CalendarPlacement placement) {
        return new CalendarPlacementResponse.Item(placement.sourceKey(), placement.displayDate(), placement.rangeFrom(),
                placement.rangeTo(), times.toOffset(placement.updatedAt()));
    }
}
