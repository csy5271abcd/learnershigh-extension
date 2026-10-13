package com.learnershigh.extension.studentcare.dto;

import com.learnershigh.extension.studentcare.entity.CareEvent;
import com.learnershigh.extension.studentcare.entity.CareEventType;
import com.learnershigh.extension.studentcare.entity.NoteChannel;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;

public record CareEventResponse(
        String eventId,
        String caseId,
        CareEventType type,
        LocalDate occurredOn,
        OffsetDateTime createdAt,
        String content,
        NoteChannel noteChannel) {

    public static CareEventResponse from(CareEvent event, ZoneId zone) {
        return new CareEventResponse(event.id(), event.caseId(), event.type(), event.occurredOn(),
                event.createdAt().atZone(zone).toOffsetDateTime(), event.content(), event.noteChannel());
    }
}
