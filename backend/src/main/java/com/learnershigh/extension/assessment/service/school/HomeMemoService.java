package com.learnershigh.extension.assessment.service.school;

import com.learnershigh.extension.assessment.dto.school.HomeMemoResponse;
import com.learnershigh.extension.assessment.entity.HomeMemo;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.repository.HomeMemoRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.common.error.BusinessException;
import com.learnershigh.extension.common.error.CommonErrorCode;
import com.learnershigh.extension.common.error.FieldViolation;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** A27-UX 학생 홈 메모(api-contract '§30-a', 2026-11-19 DRAFT). 본인 것만 읽고 쓴다(관리자 Endpoint 없음). */
@Service
@Transactional
public class HomeMemoService {

    private final HomeMemoRepository memos;
    private final AssessmentTimes times;

    public HomeMemoService(HomeMemoRepository memos, AssessmentTimes times) {
        this.memos = memos;
        this.times = times;
    }

    @Transactional(readOnly = true)
    public HomeMemoResponse get(StudentActor student) {
        return memos.findById(student.studentId()).map(this::toResponse).orElse(new HomeMemoResponse(null, null, 0));
    }

    public HomeMemoResponse write(StudentActor student, String body, long expectedVersion) {
        if (body != null && body.strip().length() > HomeMemo.BODY_MAX) {
            throw BusinessException.withFields(CommonErrorCode.VALIDATION_ERROR, new FieldViolation("body", "size"));
        }
        HomeMemo memo = memos.findById(student.studentId()).orElseGet(() -> HomeMemo.start(student.studentId(), times.now()));
        memo.write(body, expectedVersion, times.now());
        return toResponse(memos.saveAndFlush(memo));
    }

    private HomeMemoResponse toResponse(HomeMemo memo) {
        return new HomeMemoResponse(memo.body(), memo.version() == 0 ? null : times.toOffset(memo.updatedAt()),
                memo.version());
    }
}
