package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.dto.PageResponse;
import com.learnershigh.extension.assessment.dto.record.GrowthDtos.GrowthRecordResponse;
import com.learnershigh.extension.assessment.dto.record.ItemsResponse;
import com.learnershigh.extension.assessment.entity.AssessmentNote;
import com.learnershigh.extension.assessment.entity.GrowthRecord;
import com.learnershigh.extension.assessment.entity.GrowthRecord.Fields;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.repository.ArtifactRepository;
import com.learnershigh.extension.assessment.repository.GrowthRecordRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.common.error.BusinessException;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

/**
 * §29 성장 기록 (학생 본인 기록, 학교생활기록부 아님). 생성·PATCH(보낸 필드만 변경)·조회, §34 관리자 읽기 전용.
 * 관련 활동은 본인 학교 수행평가만, 결과물은 본인 결과물만 연결할 수 있다.
 */
@Service
@Transactional
public class GrowthRecordService {

    private static final int TEXT_MAX = 5000;
    private static final List<String> TEXT_FIELDS = List.of("motivation", "process", "contribution", "difficulty",
            "solution", "outcome", "reflection", "followUp");

    private final GrowthRecordRepository records;
    private final ArtifactRepository artifacts;
    private final StudentRecordAccess access;
    private final RecordJson json;
    private final AssessmentTimes times;

    public GrowthRecordService(GrowthRecordRepository records, ArtifactRepository artifacts,
            StudentRecordAccess access, RecordJson json, AssessmentTimes times) {
        this.records = records;
        this.artifacts = artifacts;
        this.access = access;
        this.json = json;
        this.times = times;
    }

    public GrowthRecordResponse create(StudentActor student, JsonNode body) {
        Fields fields = merge(student, new Fields(null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, "[]"), body, true);
        GrowthRecord record = records.saveAndFlush(GrowthRecord.create(student.studentId(), fields, times.now()));
        return view(record);
    }

    public GrowthRecordResponse update(StudentActor student, String recordId, JsonNode body) {
        GrowthRecord record = owned(student, recordId);
        record.apply(merge(student, record.fields(), body, false), times.now());
        records.flush();
        return view(record);
    }

    @Transactional(readOnly = true)
    public PageResponse<GrowthRecordResponse> list(StudentActor student, Integer academicYear, String query,
            int page, int size) {
        String needle = query == null ? "" : query.strip().toLowerCase(Locale.ROOT);
        List<GrowthRecordResponse> all = records.findByStudentIdAndDeletedAtIsNullOrderByUpdatedAtDesc(student.studentId()).stream()
                .filter(r -> academicYear == null || r.fields().activityStartDate() == null
                        || r.fields().activityStartDate().getYear() == academicYear)
                .filter(r -> needle.isEmpty() || r.fields().title().toLowerCase(Locale.ROOT).contains(needle))
                .map(this::view).toList();
        return PageResponse.slice(all, page, size);
    }

    @Transactional(readOnly = true)
    public GrowthRecordResponse get(StudentActor student, String recordId) {
        return view(owned(student, recordId));
    }

    @Transactional(readOnly = true)
    public ItemsResponse<GrowthRecordResponse> listForAdmin(AdminActor admin, String studentId) {
        access.requireReadable(admin, studentId);
        return new ItemsResponse<>(records.findByStudentIdAndDeletedAtIsNullOrderByUpdatedAtDesc(studentId).stream().map(this::view)
                .toList());
    }

    private GrowthRecord owned(StudentActor student, String recordId) {
        return records.findByIdAndStudentIdAndDeletedAtIsNull(recordId, student.studentId())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.NOT_FOUND, "성장 기록을 찾을 수 없습니다."));
    }

    /** body에 있는 필드만 바꾼다(PATCH). 생성 때는 title이 필수다. */
    private Fields merge(StudentActor student, Fields base, JsonNode body, boolean creating) {
        if (body == null || !body.isObject()) {
            throw RecordJson.invalid("body", "object");
        }
        String title = has(body, "title") ? str(body, "title", 200) : base.title();
        if (title == null || title.isBlank()) {
            throw RecordJson.invalid("title", "required");
        }
        String subjectId = has(body, "subjectId") ? str(body, "subjectId", 64) : base.subjectId();
        LocalDate start = base.activityStartDate();
        if (has(body, "activityStartDate")) {
            String raw = str(body, "activityStartDate", 10);
            try {
                start = raw == null ? null : LocalDate.parse(raw);
            } catch (DateTimeParseException invalid) {
                throw RecordJson.invalid("activityStartDate", "format");
            }
        }
        String role = has(body, "role") ? str(body, "role", 2000) : base.role();
        String[] texts = {base.motivation(), base.process(), base.contribution(), base.difficulty(), base.solution(),
                base.outcome(), base.reflection(), base.followUp()};
        for (int i = 0; i < TEXT_FIELDS.size(); i++) {
            if (has(body, TEXT_FIELDS.get(i))) {
                texts[i] = str(body, TEXT_FIELDS.get(i), TEXT_MAX);
            }
        }
        String relatedType = has(body, "relatedSourceType") ? str(body, "relatedSourceType", 30) : base.relatedSourceType();
        String relatedId = has(body, "relatedSourceId") ? str(body, "relatedSourceId", 64) : base.relatedSourceId();
        if ((relatedType == null) != (relatedId == null)) {
            throw RecordJson.invalid("relatedSourceId", "pair");
        }
        if (relatedType != null) {
            if (!AssessmentNote.SOURCE_SCHOOL_ASSESSMENT.equals(relatedType)) {
                throw RecordJson.invalid("relatedSourceType", "unsupported");
            }
            try {
                access.ownedAssessment(student.studentId(), relatedType, relatedId);
            } catch (BusinessException notOwned) {
                throw RecordJson.invalid("relatedSourceId", "unknown");
            }
        }
        String artifactIds = base.artifactIdsJson();
        if (has(body, "artifactIds")) {
            JsonNode node = body.get("artifactIds");
            if (!node.isArray() || node.size() > 20) {
                throw RecordJson.invalid("artifactIds", "invalid");
            }
            List<String> ids = new ArrayList<>();
            for (JsonNode id : node) {
                if (!id.isString() || artifacts.findByIdAndStudentIdAndDeletedAtIsNull(id.asString(), student.studentId()).isEmpty()) {
                    throw RecordJson.invalid("artifactIds", "unknown");
                }
                ids.add(id.asString());
            }
            artifactIds = json.write(new ArrayList<>(new LinkedHashSet<>(ids)));
        }
        return new Fields(title.strip(), subjectId, start, role, texts[0], texts[1], texts[2], texts[3], texts[4],
                texts[5], texts[6], texts[7], relatedType, relatedId, artifactIds);
    }

    private static boolean has(JsonNode body, String field) {
        return body.has(field);
    }

    private static String str(JsonNode body, String field, int max) {
        JsonNode value = body.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        if (!value.isString()) {
            throw RecordJson.invalid(field, "string");
        }
        String text = value.asString();
        if (text.length() > max) {
            throw RecordJson.invalid(field, "too_long");
        }
        return text.isBlank() ? null : text;
    }

    private GrowthRecordResponse view(GrowthRecord record) {
        Fields f = record.fields();
        return new GrowthRecordResponse(record.id(), f.title(), f.subjectId(), f.activityStartDate(), f.role(),
                f.motivation(), f.process(), f.contribution(), f.difficulty(), f.solution(), f.outcome(),
                f.reflection(), f.followUp(), f.relatedSourceType(), f.relatedSourceId(),
                json.strings(f.artifactIdsJson()), times.toOffset(record.createdAt()), times.toOffset(record.updatedAt()));
    }
}
