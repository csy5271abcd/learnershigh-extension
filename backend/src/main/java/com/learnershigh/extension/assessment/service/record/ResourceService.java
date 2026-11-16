package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.dto.record.ResourceDtos.TrashedScrap;
import com.learnershigh.extension.assessment.dto.PageResponse;
import com.learnershigh.extension.assessment.dto.record.ItemsResponse;
import com.learnershigh.extension.assessment.dto.record.ResourceDtos.ReferenceScrapResponse;
import com.learnershigh.extension.assessment.dto.record.ResourceDtos.SharedResourceResponse;
import com.learnershigh.extension.assessment.dto.record.ResourceDtos.StudentResourceResponse;
import com.learnershigh.extension.assessment.entity.AssessmentResource;
import com.learnershigh.extension.assessment.entity.AssessmentResource.Fields;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.repository.AssessmentResourceRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import com.learnershigh.extension.common.error.BusinessException;
import java.net.URI;
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
 * §22 학생 자료함(본인 비공개), §43 관리자 참고자료실(기본 비공개 → 공개 시 학생 조회).
 * 정적 심화 탐구 카탈로그와 다른 기능이다. 파일 첨부(fileRef)는 지원하지 않는다(링크 자료만).
 */
@Service
@Transactional
public class ResourceService {

    private final AssessmentResourceRepository resources;
    private final RecordJson json;
    private final AssessmentTimes times;

    public ResourceService(AssessmentResourceRepository resources, RecordJson json, AssessmentTimes times) {
        this.resources = resources;
        this.json = json;
        this.times = times;
    }

    // ---- 학생 ----

    @Transactional(readOnly = true)
    public PageResponse<StudentResourceResponse> list(StudentActor student, String query, String type, int page,
            int size) {
        List<StudentResourceResponse> all = resources.findByOwnerTypeAndOwnerIdAndDeletedAtIsNullOrderByUpdatedAtDesc(
                        AssessmentResource.OWNER_STUDENT, student.studentId()).stream()
                .filter(r -> matches(r, query, type)).map(this::studentView).toList();
        return PageResponse.slice(all, page, size);
    }

    @Transactional(readOnly = true)
    public StudentResourceResponse get(StudentActor student, String resourceId) {
        return studentView(ownedByStudent(student, resourceId));
    }

    public StudentResourceResponse create(StudentActor student, JsonNode body) {
        Fields fields = merge(empty(), body, "author", false);
        return studentView(resources.saveAndFlush(AssessmentResource.create(AssessmentResource.OWNER_STUDENT,
                student.studentId(), fields, times.now())));
    }

    public StudentResourceResponse update(StudentActor student, String resourceId, JsonNode body) {
        AssessmentResource resource = ownedByStudent(student, resourceId);
        resource.apply(merge(resource.fields(), body, "author", false), times.now());
        resources.flush();
        return studentView(resource);
    }

    /** 관리자가 공개한 자료만 (모든 학생 공통) */
    @Transactional(readOnly = true)
    public ItemsResponse<SharedResourceResponse> shared(StudentActor student) {
        return new ItemsResponse<>(resources.findByOwnerTypeAndVisibilityAndDeletedAtIsNullOrderByPublishedAtDesc(
                AssessmentResource.OWNER_ADMIN, AssessmentResource.PUBLISHED).stream().map(this::sharedView).toList());
    }

    // ---- 관리자 ----

    @Transactional(readOnly = true)
    public PageResponse<ReferenceScrapResponse> adminList(AdminActor admin, String query, String type, int page,
            int size) {
        List<ReferenceScrapResponse> all = resources.findByOwnerTypeAndDeletedAtIsNullOrderByUpdatedAtDesc(AssessmentResource.OWNER_ADMIN)
                .stream().filter(r -> matches(r, query, type)).map(this::adminView).toList();
        return PageResponse.slice(all, page, size);
    }

    @Transactional(readOnly = true)
    public ReferenceScrapResponse adminGet(AdminActor admin, String scrapId) {
        return adminView(adminOwned(scrapId));
    }

    public ReferenceScrapResponse adminCreate(AdminActor admin, JsonNode body) {
        Fields fields = merge(empty(), body, "authorOrOrg", true);
        return adminView(resources.saveAndFlush(AssessmentResource.create(AssessmentResource.OWNER_ADMIN,
                admin.adminId(), fields, times.now())));
    }

    public ReferenceScrapResponse adminUpdate(AdminActor admin, String scrapId, JsonNode body) {
        AssessmentResource resource = adminOwned(scrapId);
        resource.apply(merge(resource.fields(), body, "authorOrOrg", true), times.now());
        resources.flush();
        return adminView(resource);
    }

    public ReferenceScrapResponse setPublished(AdminActor admin, String scrapId, Boolean published) {
        if (published == null) {
            throw RecordJson.invalid("published", "required");
        }
        AssessmentResource resource = adminOwned(scrapId);
        resource.setPublished(published, times.now());
        resources.flush();
        return adminView(resource);
    }

    /** 관리자 참고자료 휴지통(본인이 만든 것만) */
    @Transactional(readOnly = true)
    public ItemsResponse<TrashedScrap> adminTrash(List<AssessmentResource> trashed) {
        return new ItemsResponse<>(trashed.stream()
                .map(r -> new TrashedScrap(adminView(r), times.toOffset(r.deletedAt()))).toList());
    }

    // ---- 공통 ----

    private AssessmentResource ownedByStudent(StudentActor student, String resourceId) {
        return resources.findByIdAndOwnerTypeAndOwnerIdAndDeletedAtIsNull(resourceId, AssessmentResource.OWNER_STUDENT,
                        student.studentId())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.NOT_FOUND, "자료를 찾을 수 없습니다."));
    }

    /** 관리자 참고자료실은 관리자 공용(지점 구분 정책 미정)이다. 학생 자료는 관리자에게 보이지 않는다. */
    private AssessmentResource adminOwned(String scrapId) {
        return resources.findById(scrapId).filter(r -> AssessmentResource.OWNER_ADMIN.equals(r.ownerType()) && !r.inTrash())
                .orElseThrow(() -> new BusinessException(AssessmentErrorCode.NOT_FOUND, "자료를 찾을 수 없습니다."));
    }

    private Fields empty() {
        return new Fields(null, null, null, null, null, null, null, "[]", null, "[]");
    }

    private Fields merge(Fields base, JsonNode body, String authorField, boolean adminShape) {
        if (body == null || !body.isObject()) {
            throw RecordJson.invalid("body", "object");
        }
        String type = body.has("type") ? str(body, "type", 50) : base.type();
        String title = body.has("title") ? str(body, "title", 200) : base.title();
        String sourceName = body.has("sourceName") ? str(body, "sourceName", 200) : base.sourceName();
        String sourceUrl = body.has("sourceUrl") ? str(body, "sourceUrl", 2000) : base.sourceUrl();
        String author = body.has(authorField) ? str(body, authorField, 200) : base.author();
        String memo = body.has("memo") ? str(body, "memo", 2000) : base.memo();
        String referenceSourceId = adminShape && body.has("referenceSourceId")
                ? str(body, "referenceSourceId", 64) : base.referenceSourceId();
        LocalDate publishedDate = base.publishedDate();
        if (body.has("publishedDate")) {
            String raw = str(body, "publishedDate", 10);
            try {
                publishedDate = raw == null ? null : LocalDate.parse(raw);
            } catch (DateTimeParseException invalid) {
                throw RecordJson.invalid("publishedDate", "format");
            }
        }
        String tags = body.has("tags") ? stringArray(body, "tags", 20, 50) : base.tagsJson();
        String subjects = body.has("subjectIds") ? stringArray(body, "subjectIds", 20, 64) : base.subjectIdsJson();
        if (type == null) {
            throw RecordJson.invalid("type", "required");
        }
        if (title == null) {
            throw RecordJson.invalid("title", "required");
        }
        if (adminShape && sourceUrl == null) {
            throw RecordJson.invalid("sourceUrl", "required");
        }
        if (sourceUrl != null && !httpUrl(sourceUrl)) {
            throw RecordJson.invalid("sourceUrl", "format");
        }
        return new Fields(type, title.strip(), sourceName, sourceUrl, author, publishedDate, memo, subjects,
                referenceSourceId, tags);
    }

    private String stringArray(JsonNode body, String field, int maxItems, int maxLength) {
        JsonNode node = body.get(field);
        if (node == null || !node.isArray() || node.size() > maxItems) {
            throw RecordJson.invalid(field, "invalid");
        }
        List<String> values = new ArrayList<>();
        for (JsonNode item : node) {
            if (!item.isString() || item.asString().isBlank() || item.asString().length() > maxLength) {
                throw RecordJson.invalid(field, "invalid");
            }
            values.add(item.asString().strip());
        }
        return json.write(new ArrayList<>(new LinkedHashSet<>(values)));
    }

    private static boolean httpUrl(String value) {
        try {
            URI uri = URI.create(value);
            return ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    && uri.getHost() != null;
        } catch (IllegalArgumentException invalid) {
            return false;
        }
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

    private boolean matches(AssessmentResource resource, String query, String type) {
        Fields f = resource.fields();
        if (type != null && !type.isBlank() && !type.equals(f.type())) {
            return false;
        }
        String needle = query == null ? "" : query.strip().toLowerCase(Locale.ROOT);
        return needle.isEmpty() || (f.title() + " " + (f.memo() == null ? "" : f.memo()) + " " + f.tagsJson())
                .toLowerCase(Locale.ROOT).contains(needle);
    }

    private StudentResourceResponse studentView(AssessmentResource r) {
        Fields f = r.fields();
        return new StudentResourceResponse(r.id(), f.type(), f.title(), f.sourceName(), f.sourceUrl(), f.author(),
                f.publishedDate(), f.memo(), json.strings(f.tagsJson()), json.strings(f.subjectIdsJson()), null,
                times.toOffset(r.createdAt()), times.toOffset(r.updatedAt()));
    }

    private ReferenceScrapResponse adminView(AssessmentResource r) {
        Fields f = r.fields();
        return new ReferenceScrapResponse(r.id(), f.title(), f.sourceUrl(), f.sourceName(), f.referenceSourceId(),
                f.type(), f.memo(), json.strings(f.tagsJson()), json.strings(f.subjectIdsJson()), f.author(),
                f.publishedDate(), List.of(), List.of(), r.isPublished(), times.toOffset(r.publishedAt()),
                times.toOffset(r.createdAt()), times.toOffset(r.updatedAt()));
    }

    private SharedResourceResponse sharedView(AssessmentResource r) {
        Fields f = r.fields();
        return new SharedResourceResponse(r.id(), f.type(), f.title(), f.sourceName(), f.sourceUrl(), f.author(),
                f.publishedDate(), f.memo(), json.strings(f.tagsJson()), json.strings(f.subjectIdsJson()),
                times.toOffset(r.publishedAt()));
    }
}
