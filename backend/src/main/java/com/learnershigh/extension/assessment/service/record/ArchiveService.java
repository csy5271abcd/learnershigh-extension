package com.learnershigh.extension.assessment.service.record;

import com.learnershigh.extension.assessment.dto.PageResponse;
import com.learnershigh.extension.assessment.dto.record.ResourceDtos.ArchiveItem;
import com.learnershigh.extension.assessment.dto.record.ResourceDtos.FavoriteRequest;
import com.learnershigh.extension.assessment.entity.AssessmentNote;
import com.learnershigh.extension.assessment.entity.Favorite;
import com.learnershigh.extension.assessment.entity.SchoolAssessment;
import com.learnershigh.extension.assessment.entity.SchoolAssessmentStatus;
import com.learnershigh.extension.assessment.integration.auth.StudentActor;
import com.learnershigh.extension.assessment.repository.FavoriteRepository;
import com.learnershigh.extension.assessment.repository.SchoolAssessmentRepository;
import com.learnershigh.extension.assessment.service.AssessmentTimes;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * §30 보관함·중요 표시 (학교 수행평가 대상). 중요 표시는 있으면 중요, 없으면 아님이라 같은 요청 반복은 결과가 같다.
 * 휴지통(trash)은 TrashService(소프트 삭제 항목: 수행평가·결과물·자료·성장 기록).
 */
@Service
@Transactional
public class ArchiveService {

    private final FavoriteRepository favorites;
    private final SchoolAssessmentRepository assessments;
    private final StudentRecordAccess access;
    private final NoteQueryService noteQuery;
    private final AssessmentTimes times;
    private final TrashService trash;

    public ArchiveService(FavoriteRepository favorites, SchoolAssessmentRepository assessments,
            StudentRecordAccess access, NoteQueryService noteQuery, AssessmentTimes times, TrashService trash) {
        this.trash = trash;
        this.favorites = favorites;
        this.assessments = assessments;
        this.access = access;
        this.noteQuery = noteQuery;
        this.times = times;
    }

    public FavoriteRequest setFavorite(StudentActor student, FavoriteRequest request) {
        if (request.favorite() == null) {
            throw RecordJson.invalid("favorite", "required");
        }
        if (request.sourceId() == null || request.sourceId().isBlank()) {
            throw RecordJson.invalid("sourceId", "required");
        }
        access.ownedAssessment(student.studentId(), request.sourceType(), request.sourceId());
        Favorite.Key key = new Favorite.Key(student.studentId(), request.sourceType(), request.sourceId());
        boolean exists = favorites.existsById(key);
        if (request.favorite() && !exists) {
            favorites.saveAndFlush(Favorite.of(student.studentId(), request.sourceType(), request.sourceId(),
                    times.now()));
        } else if (!request.favorite() && exists) {
            favorites.deleteById(key);
            favorites.flush();
        }
        return request;
    }

    @Transactional(readOnly = true)
    public PageResponse<ArchiveItem> list(StudentActor student, String tab, Integer academicYear, String query,
            int page, int size) {
        if ("trash".equals(tab)) {
            return trash.list(student, page, size);
        }
        Set<String> favoriteIds = favorites.findByStudentId(student.studentId()).stream().map(Favorite::sourceId)
                .collect(Collectors.toSet());
        String needle = query == null ? "" : query.strip().toLowerCase(Locale.ROOT);
        List<ArchiveItem> items = assessments.findByStudentIdAndDeletedAtIsNullOrderByUpdatedAtDesc(student.studentId()).stream()
                .filter(a -> switch (tab) {
                    case "favorites" -> favoriteIds.contains(a.id());
                    case "completed" -> a.status() == SchoolAssessmentStatus.COMPLETED;
                    case "previous-semesters" -> academicYear != null && a.academicYear() < academicYear;
                    default -> academicYear == null || a.academicYear() == academicYear;
                })
                .filter(a -> needle.isEmpty() || a.title().toLowerCase(Locale.ROOT).contains(needle))
                .map(a -> item(student, a, favoriteIds.contains(a.id())))
                .toList();
        return PageResponse.slice(items, page, size);
    }

    private ArchiveItem item(StudentActor student, SchoolAssessment a, boolean favorite) {
        return new ArchiveItem(AssessmentNote.SOURCE_SCHOOL_ASSESSMENT, a.id(), a.title(), a.subjectId(),
                a.academicYear(), a.semester(), a.status().name(), times.toOffset(a.updatedAt()),
                noteQuery.latestBlockCount(student.studentId(), AssessmentNote.SOURCE_SCHOOL_ASSESSMENT, a.id()),
                favorite, null, null);
    }
}
