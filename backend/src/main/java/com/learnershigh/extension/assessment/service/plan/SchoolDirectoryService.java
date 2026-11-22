package com.learnershigh.extension.assessment.service.plan;

import com.learnershigh.extension.assessment.dto.plan.SchoolDirectorySearchResponse;
import com.learnershigh.extension.assessment.dto.plan.SchoolDirectorySelectionResponse;
import com.learnershigh.extension.assessment.entity.SchoolInfoSchoolMapping;
import com.learnershigh.extension.assessment.exception.AssessmentErrorCode;
import com.learnershigh.extension.assessment.integration.auth.AdminActor;
import com.learnershigh.extension.assessment.integration.schoolinfo.SchoolInfoClient;
import com.learnershigh.extension.assessment.repository.SchoolInfoSchoolMappingRepository;
import com.learnershigh.extension.common.error.BusinessException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/**
 * §38-15 (A27-UX 부록 O, 사용자 승인 '학교 Master 검색 연결'): Assessment 전용 읽기 전용 학교 검색.
 * 공식 학교알리미 검색·상세(기존 {@link SchoolInfoClient})만 쓴다. 전역 학교 Master·학생 등록을 만들지 않는다.
 * <ul>
 *   <li>검색 결과를 다 읽지 못하면(SEARCH_TRUNCATED·상세 실패·후보 상한 초과) complete=false, 그 검색의 후보는 고를 수 없다.</li>
 *   <li>주소가 없거나 같은 이름 학교끼리 주소가 같으면 고를 수 없다(구별 근거 없음).</li>
 *   <li>같은 검색어 10분 캐시, 관리자당 1분 20회 외부 검색 상한.</li>
 * </ul>
 */
@Service
public class SchoolDirectoryService {

    static final Duration CACHE_TTL = Duration.ofMinutes(10);
    static final int MAX_DESCRIBE = 15;
    static final int RATE_PER_MINUTE = 20;

    private final SchoolInfoClient client;
    private final SchoolInfoSyncService sync;
    private final SchoolInfoSchoolMappingRepository mappings;
    private final PlanAccess access;
    private final Clock clock;

    private record Entry(SchoolInfoClient.SchoolDetail detail, boolean selectable, String reason, Instant expiresAt) {
    }

    private record CachedSearch(List<String> candidateIds, boolean complete, String incompleteReason, Instant expiresAt) {
    }

    private final Map<String, Entry> candidates = new ConcurrentHashMap<>();
    private final Map<String, CachedSearch> searches = new ConcurrentHashMap<>();
    private final Map<String, Deque<Instant>> rate = new HashMap<>();

    public SchoolDirectoryService(SchoolInfoClient client, SchoolInfoSyncService sync, SchoolInfoSchoolMappingRepository mappings,
            PlanAccess access, Clock clock) {
        this.client = client;
        this.sync = sync;
        this.mappings = mappings;
        this.access = access;
        this.clock = clock;
    }

    public SchoolDirectorySearchResponse search(AdminActor admin, String rawQuery) {
        access.requireOperator(admin);
        String query = rawQuery == null ? "" : rawQuery.strip();
        if (query.length() < 2 || query.length() > 40) {
            throw new BusinessException(AssessmentErrorCode.SCHOOL_DIRECTORY_QUERY_INVALID);
        }
        Instant now = clock.instant();
        String key = SchoolInfoSyncService.norm(query);
        CachedSearch cached = searches.get(key);
        if (cached != null && cached.expiresAt().isAfter(now) && cached.candidateIds().stream().allMatch(candidates::containsKey)) {
            return view(query, cached);
        }
        takeRate(admin.adminId(), now);
        SchoolInfoClient.Search found = client.search(query);
        if ("DOWNLOAD_FAILED".equals(found.error())) {
            throw new BusinessException(AssessmentErrorCode.SCHOOL_DIRECTORY_UNAVAILABLE);
        }
        boolean complete = found.error() == null;
        String reason = found.error();
        List<String> ids = found.schoolinfoIds();
        if (ids.size() > MAX_DESCRIBE) {
            complete = false;
            reason = "TOO_MANY_RESULTS";
            ids = ids.subList(0, MAX_DESCRIBE);
        }
        List<SchoolInfoClient.SchoolDetail> details = new ArrayList<>();
        for (String id : ids) {
            SchoolInfoClient.SchoolDetail d = client.describe(id);
            if (d.error() != null || d.schoolName() == null) {
                complete = false;
                reason = reason == null ? "DETAIL_FAILED" : reason;
                continue;
            }
            details.add(d);
        }
        // 같은 정식 이름끼리 주소가 같으면 구별 근거가 없다
        Map<String, Integer> sameNameAddress = new HashMap<>();
        for (SchoolInfoClient.SchoolDetail d : details) {
            if (d.address() != null) {
                sameNameAddress.merge(addressKey(d), 1, Integer::sum);
            }
        }
        List<String> issued = new ArrayList<>();
        Instant expires = now.plus(CACHE_TTL);
        for (SchoolInfoClient.SchoolDetail d : details) {
            String why = d.address() == null || d.address().isBlank() ? "ADDRESS_MISSING"
                    : sameNameAddress.get(addressKey(d)) > 1 ? "ADDRESS_DUPLICATE"
                    : !complete ? "SEARCH_INCOMPLETE" : null;
            String id = "dir_" + UUID.randomUUID();
            candidates.put(id, new Entry(d, why == null, why, expires));
            issued.add(id);
        }
        CachedSearch result = new CachedSearch(List.copyOf(issued), complete, reason, expires);
        searches.put(key, result);
        candidates.entrySet().removeIf(e -> e.getValue().expiresAt().isBefore(now));
        return view(query, result);
    }

    public record Selected(SchoolDirectorySelectionResponse body, boolean running) {
    }

    /** 검색 결과 후보 하나를 고른다 → 학교 키(기존 키 재사용 또는 si_) → 그 학교 하나만 3개 학년도 자동 확인. 학적·학생은 바꾸지 않는다. */
    public Selected select(AdminActor admin, String candidateId) {
        access.requireOperator(admin);
        Entry entry = candidates.get(candidateId);
        if (entry == null || !entry.selectable() || entry.expiresAt().isBefore(clock.instant())) {
            throw new BusinessException(AssessmentErrorCode.SCHOOL_DIRECTORY_CANDIDATE_INVALID);
        }
        SchoolInfoClient.SchoolDetail d = entry.detail();
        String schoolId = sync.directoryKey(d, admin.adminId());
        SchoolInfoSyncService.Ensured e = sync.ensureDirectorySchool(admin, schoolId);
        return new Selected(new SchoolDirectorySelectionResponse(schoolId, d.schoolName(), d.sido(), d.sigungu(), d.address(),
                d.schoolinfoId(), e.body()), e.running());
    }

    private static String addressKey(SchoolInfoClient.SchoolDetail d) {
        return SchoolInfoSyncService.norm(d.schoolName()) + "|" + SchoolInfoSyncService.norm(d.address());
    }

    private SchoolDirectorySearchResponse view(String query, CachedSearch search) {
        List<SchoolDirectorySearchResponse.Item> items = new ArrayList<>();
        for (String id : search.candidateIds()) {
            Entry e = candidates.get(id);
            if (e == null) {
                continue;
            }
            SchoolInfoClient.SchoolDetail d = e.detail();
            String existing = mappings.findBySchoolinfoSchoolIdAndStatus(d.schoolinfoId(), SchoolInfoSchoolMapping.ACTIVE).stream()
                    .map(SchoolInfoSchoolMapping::schoolId).sorted().findFirst().orElse(null);
            items.add(new SchoolDirectorySearchResponse.Item(id, d.schoolName(), d.sido(), d.sigungu(), d.address(), d.schoolinfoId(),
                    existing, e.selectable(), e.reason()));
        }
        return new SchoolDirectorySearchResponse(query, search.complete(), search.incompleteReason(), items);
    }

    private void takeRate(String adminId, Instant now) {
        synchronized (rate) {
            Deque<Instant> q = rate.computeIfAbsent(adminId, k -> new ArrayDeque<>());
            while (!q.isEmpty() && q.peekFirst().isBefore(now.minus(Duration.ofMinutes(1)))) {
                q.pollFirst();
            }
            if (q.size() >= RATE_PER_MINUTE) {
                throw new BusinessException(AssessmentErrorCode.SCHOOL_DIRECTORY_RATE_LIMITED);
            }
            q.addLast(now);
        }
    }
}
