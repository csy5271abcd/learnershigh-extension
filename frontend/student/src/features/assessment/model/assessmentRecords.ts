import { listFeedbackRequests, listNoteRevisions, listNotes } from '../api/assessmentDetailApi.ts'

// 학교 수행평가 목록 "기록" 열 (Mockup SA-LIST-01, 2026-10-28 사용자 요청).
// §12 목록에는 기록 정보가 없어(MM-11) 기존 계약 조회로 화면에서 계산한다. 서버 집계 계약은 정하지 않는다 (MM-55, P-23).
// - 수정 이력 = 이 과제 탐구 노트의 NoteRevision 수 (§21, 상세 "수정 이력"과 같은 대상). 결과물 ArtifactVersion 수는 합치지 않는다.
// - 피드백 = 이 노트의 Revision을 가리키는 FeedbackRequest(§31)의 답변 도착·대기 건수. 답변이 하나라도 있으면 강조한다.
//   (학생의 답변 확인(읽음) 상태는 계약에 없어 "새 답변" 여부는 판단하지 않는다, MM-43·MM-55)
// 하나라도 조회에 실패하면 전체를 오류로 돌려준다 (기록 없음·피드백 없음으로 위장하지 않는다).

export interface AssessmentRecordSummary {
  /** NoteRevision 수. 노트가 없으면 0 */
  revisionCount: number
  /** 답변이 도착한 피드백 요청 수 */
  deliveredCount: number
  /** 답변을 기다리는 피드백 요청 수 */
  pendingCount: number
}

const feedbackPageSize = 100

export async function loadAssessmentRecords(assessmentIds: string[]): Promise<Record<string, AssessmentRecordSummary>> {
  const [noteLists, feedbackPage] = await Promise.all([
    Promise.all(assessmentIds.map((id) => listNotes('SCHOOL_ASSESSMENT', id))),
    listFeedbackRequests({ page: 0, size: feedbackPageSize }),
  ])
  const result: Record<string, AssessmentRecordSummary> = {}
  await Promise.all(
    assessmentIds.map(async (assessmentId, index) => {
      const note = noteLists[index].items[0]
      if (!note) {
        result[assessmentId] = { revisionCount: 0, deliveredCount: 0, pendingCount: 0 }
        return
      }
      const revisions = (await listNoteRevisions(note.noteId)).items
      const revisionIds = new Set(revisions.map((revision) => revision.revisionId))
      const requests = feedbackPage.items.filter((request) => revisionIds.has(request.snapshot.noteRevisionId))
      result[assessmentId] = {
        revisionCount: revisions.length,
        deliveredCount: requests.filter((request) => request.status === 'DELIVERED').length,
        pendingCount: requests.filter((request) => request.status === 'PENDING').length,
      }
    }),
  )
  return result
}
