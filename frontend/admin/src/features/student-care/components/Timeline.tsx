import { CHANNEL_LABEL, EVENT_LABEL, monthDay } from '../model/format.ts'
import type { CareEvent } from '../model/types.ts'

/** 케어 기록 Timeline. 순서는 호출하는 쪽이 정한다. */
export function Timeline({ events, label }: { events: CareEvent[]; label: string }) {
  return (
    <ol className="sc-timeline" aria-label={label}>
      {events.map((event) => (
        <li key={event.eventId} className={`sc-timeline__item sc-timeline__item--${event.type.toLowerCase()}`}>
          <p className="sc-timeline__meta">
            {EVENT_LABEL[event.type]}
            {event.noteChannel && ` · ${CHANNEL_LABEL[event.noteChannel]}`} · {monthDay(event.occurredOn)}
          </p>
          <p className="sc-timeline__content">{event.content}</p>
        </li>
      ))}
    </ol>
  )
}
