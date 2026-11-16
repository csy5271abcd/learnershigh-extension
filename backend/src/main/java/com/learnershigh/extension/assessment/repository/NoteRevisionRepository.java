package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.NoteRevision;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteRevisionRepository extends JpaRepository<NoteRevision, String> {

    List<NoteRevision> findByNoteIdOrderByRevisionNumberAsc(String noteId);

    Optional<NoteRevision> findByIdAndNoteId(String id, String noteId);

    List<NoteRevision> findByIdIn(Collection<String> ids);
}
