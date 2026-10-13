package com.learnershigh.extension.studentcare.dto;

import com.learnershigh.extension.studentcare.entity.NoteChannel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CareNoteRequest(@NotNull NoteChannel channel, @NotBlank @Size(max = 1000) String content) {
}
