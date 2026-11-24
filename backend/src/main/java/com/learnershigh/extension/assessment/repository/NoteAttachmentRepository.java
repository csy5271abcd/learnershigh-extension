package com.learnershigh.extension.assessment.repository;

import com.learnershigh.extension.assessment.entity.NoteAttachment;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoteAttachmentRepository extends JpaRepository<NoteAttachment, String> {

    Optional<NoteAttachment> findByIdAndStudentId(String id, String studentId);

    List<NoteAttachment> findByIdInAndStudentId(Collection<String> ids, String studentId);
}
