import { CHOI_HAEUN_ID } from './adminStudents.fixture.ts'
import type { AdminConnection, AdminInterviewQuestion } from './types.ts'

/*
 * Cross-subject Connection · Interview Question Canonical Fixture.
 *
 * Connection (api-contract §37, 상태 Enum 미확정 API-OD-04): AI가 후보(candidate)를 제안하고 Admin만 확정 / 거절한다.
 *   - sourceRefs는 Archive 항목(최종 제출 완료 Task / Archive 저장한 Growth Activity)만 가리킨다. (Student schoolConnection 규칙과 같다)
 *   - 최하은 fixture-connection-001 ~ 003은 Student Fixture 값 그대로다.
 *   - 약한 관계를 숫자 맞추기 위해 confirmed로 두지 않았다. (김도현 창업 아이디어 ↔ 센서 측정 = rejected 등)
 *
 * InterviewQuestion (§38): 고3 대상. Published만 Student Interview Bridge에 보인다.
 *   - 최하은 fixture-interview-question-001 ~ 007은 Student Fixture 값 그대로다. 최하은은 고2라 Student 읽기 모델에서는 보이지 않는다.
 *     (Student 화면은 DEV ?fixtureStudentGrade=3 로만 고3 대상 여부를 재현한다 → Gap 보고)
 *   - relatedActivityIds는 실제 Canonical Activity id만 쓴다. Task는 넣지 않는다.
 *   - answer / practiceStatus는 Student가 쓴 값이다. Admin은 읽기만 한다.
 *   - 상담 기록은 질문 근거로 쓰지 않는다.
 */

const sid = (id: string) => `fixture-student-${id}`
const act = (n: number) => `fixture-admin-activity-${String(n).padStart(3, '0')}`
const task = (n: number) => `fixture-admin-task-${String(n).padStart(3, '0')}`

export const adminConnectionsFixture: readonly AdminConnection[] = [
  // 최하은 (Student Fixture 그대로)
  {
    connectionId: 'fixture-connection-001',
    studentId: CHOI_HAEUN_ID,
    sourceRefs: [
      { source: 'growth', sourceId: 'fixture-activity-a11-bioinformatics' },
      { source: 'growth', sourceId: 'fixture-activity-a12-broadcast' },
    ],
    reason: '두 활동 모두 결과를 정확하게 기록하고 다른 사람에게 같은 내용으로 전달하는 과정이 중요했다.',
    reviewState: 'confirmed',
  },
  {
    connectionId: 'fixture-connection-002',
    studentId: CHOI_HAEUN_ID,
    sourceRefs: [
      { source: 'growth', sourceId: 'fixture-activity-a11-bioinformatics' },
      { source: 'task', sourceId: 'fixture-task-08' },
    ],
    reason: '자료를 읽고 근거를 바탕으로 해석을 정리했다는 점이 비슷해 보인다.',
    reviewState: 'candidate',
  },
  {
    connectionId: 'fixture-connection-003',
    studentId: CHOI_HAEUN_ID,
    sourceRefs: [
      { source: 'growth', sourceId: 'fixture-activity-a12-broadcast' },
      { source: 'task', sourceId: 'fixture-task-08' },
    ],
    reason: '둘 다 발표 형식의 결과물이 있다.',
    reviewState: 'rejected',
  },
  // Admin 전용 학생
  {
    connectionId: 'fixture-admin-connection-001',
    studentId: sid('oh-minji'),
    sourceRefs: [{ source: 'growth', sourceId: act(4) }, { source: 'growth', sourceId: act(5) }],
    reason: '사회복지관 체험에서 본 지원 방식과 인권 캠페인에서 다룬 차별 사례가 "도움이 필요한 사람의 입장에서 설계한다"는 점으로 이어진다.',
    reviewState: 'confirmed',
    reviewedAt: '2026-09-20T15:00:00+09:00',
  },
  {
    connectionId: 'fixture-admin-connection-002',
    studentId: sid('oh-minji'),
    sourceRefs: [{ source: 'growth', sourceId: act(4) }, { source: 'task', sourceId: task(35) }],
    reason: '동물실험 윤리 토론문의 "약자 보호" 근거와 사회복지 진로 관심이 연결돼 보인다.',
    reviewState: 'candidate',
  },
  {
    connectionId: 'fixture-admin-connection-003',
    studentId: sid('oh-minji'),
    sourceRefs: [{ source: 'growth', sourceId: act(5) }, { source: 'task', sourceId: task(35) }],
    reason: '두 기록 모두 서로 다른 입장을 정리해 설득하는 활동이다.',
    reviewState: 'candidate',
  },
  {
    connectionId: 'fixture-admin-connection-004',
    studentId: sid('kim-dohyun'),
    sourceRefs: [{ source: 'growth', sourceId: act(7) }, { source: 'task', sourceId: task(37) }],
    reason: '자율 탐구에서 모은 가속도 측정값을 물리 수행평가의 겉보기 무게 해석에 그대로 사용했다.',
    reviewState: 'confirmed',
    reviewedAt: '2026-09-28T11:00:00+09:00',
  },
  {
    connectionId: 'fixture-admin-connection-005',
    studentId: sid('kim-dohyun'),
    sourceRefs: [{ source: 'growth', sourceId: act(6) }, { source: 'growth', sourceId: act(7) }],
    reason: '둘 다 스마트폰을 활용한 활동이다.',
    reviewState: 'rejected',
    reviewedAt: '2026-09-28T11:05:00+09:00',
  },
  {
    connectionId: 'fixture-admin-connection-006',
    studentId: sid('kim-dohyun'),
    sourceRefs: [{ source: 'growth', sourceId: act(6) }, { source: 'task', sourceId: task(37) }],
    reason: '사용자 불편을 측정 가능한 문제로 바꾼 과정이 공통적으로 보인다.',
    reviewState: 'candidate',
  },
  {
    connectionId: 'fixture-admin-connection-007',
    studentId: sid('lee-seoyeon'),
    sourceRefs: [{ source: 'growth', sourceId: act(9) }, { source: 'growth', sourceId: act(10) }],
    reason: '하천 수질 조사 결과를 미술 전시 동선과 설명문으로 다시 전달했다. 같은 데이터를 다른 형식으로 바꾼 경험이다.',
    reviewState: 'candidate',
  },
  {
    connectionId: 'fixture-admin-connection-008',
    studentId: sid('choi-minjun'),
    sourceRefs: [{ source: 'growth', sourceId: act(12) }, { source: 'growth', sourceId: act(13) }],
    reason: '심전도 신호의 잡음 문제와 감염병 모델의 한계 설명이 "수학 모델로 측정값을 해석한다"는 점으로 이어진다.',
    reviewState: 'confirmed',
    reviewedAt: '2026-09-25T17:00:00+09:00',
  },
  {
    connectionId: 'fixture-admin-connection-009',
    studentId: sid('park-seoyeon'),
    sourceRefs: [{ source: 'task', sourceId: task(25) }, { source: 'growth', sourceId: act(18) }],
    reason: '두 기록 모두 현장을 방문했다.',
    reviewState: 'rejected',
    reviewedAt: '2026-09-27T10:00:00+09:00',
  },
]

const A11 = 'fixture-activity-a11-bioinformatics'
const A12 = 'fixture-activity-a12-broadcast'

const q = (questionId: string, studentId: string, question: string, relatedActivityIds: string[], published: boolean, extra: Partial<AdminInterviewQuestion> = {}): AdminInterviewQuestion => ({
  questionId,
  studentId,
  question,
  relatedActivityIds,
  published,
  practiceStatus: 'NOT_STARTED',
  answer: '',
  source: 'ai-draft',
  ...extra,
})

const aq = (n: number) => `fixture-admin-interview-question-${String(n).padStart(3, '0')}`

export const adminInterviewFixture: readonly AdminInterviewQuestion[] = [
  // 최하은 (Student Fixture 그대로)
  q('fixture-interview-question-001', CHOI_HAEUN_ID, '염기서열 비교 실습에서 가장 어려웠던 점은 무엇이었고, 그 문제를 이해하기 위해 어떤 방식으로 접근했나요?', [A11], true),
  q('fixture-interview-question-002', CHOI_HAEUN_ID, '생명과학 지식과 소프트웨어 기술이 함께 필요하다고 느낀 순간을 활동 경험을 바탕으로 설명해보세요.', [A11], true, { practiceStatus: 'PRACTICING' }),
  q('fixture-interview-question-003', CHOI_HAEUN_ID, '행사 순서가 갑자기 변경됐을 때 어떤 방식으로 정보를 정리하고 전달했으며, 그 경험에서 무엇을 배웠나요?', [A12], true),
  q('fixture-interview-question-004', CHOI_HAEUN_ID, '팀원들과 같은 변경사항을 정확하게 공유하기 위해 다음 활동에서는 어떤 방식을 사용하고 싶나요?', [A12], true),
  q('fixture-interview-question-005', CHOI_HAEUN_ID, '두 활동에서 공통적으로 "정보를 정확하게 기록하고 전달하는 방법"이 중요했던 이유를 각 경험을 비교해 설명해보세요.', [A11, A12], true, { connectionId: 'fixture-connection-001' }),
  q('fixture-interview-question-006', CHOI_HAEUN_ID, '전공 체험에서 데이터를 해석한 방식과 독서 에세이에서 근거를 찾은 방식을 비교해보세요.', [A11], false),
  q('fixture-interview-question-007', CHOI_HAEUN_ID, '방송 장비 점검표를 만들 때 가장 먼저 확인한 항목은 무엇이었나요?', [A12], false),
  // 오민지 (고3 · 공개 질문 있음)
  q(aq(1), sid('oh-minji'), '사회복지관 사례 회의를 관찰하면서 사회복지사의 역할에 대해 새로 알게 된 점은 무엇인가요?', [act(4)], true, { practiceStatus: 'PRACTICING', answer: '여러 기관이 한 사람을 함께 돕는다는 점이 가장 인상적이었습니다.' }),
  q(aq(2), sid('oh-minji'), '인권 캠페인 문구를 만들 때 특정인이 드러나지 않게 하기 위해 어떤 기준을 세웠나요?', [act(5)], true),
  q(aq(3), sid('oh-minji'), '진로 체험과 캠페인 활동을 통해 "도움이 필요한 사람의 입장에서 설계한다"는 생각이 어떻게 생겼는지 설명해보세요.', [act(4), act(5)], true, { connectionId: 'fixture-admin-connection-001' }),
  q(aq(4), sid('oh-minji'), '사회복지관 체험 보고서에서 가장 고민한 표현은 무엇이었나요?', [act(4)], false),
  // 김도현 (고3 · 공개 질문 있음)
  q(aq(5), sid('kim-dohyun'), '엘리베이터 가속도를 측정할 때 센서 잡음을 줄이기 위해 어떤 조건을 고정했나요?', [act(7)], true),
  q(aq(6), sid('kim-dohyun'), '자율 탐구에서 모은 측정값을 수행평가에 다시 활용하면서 어떤 점을 보완했나요?', [act(7)], true, { connectionId: 'fixture-admin-connection-004', practiceStatus: 'PRACTICING' }),
  q(aq(7), sid('kim-dohyun'), '창업 아이디어 대회에서 사용자 인터뷰가 아이디어를 어떻게 바꿨나요?', [act(6)], false),
  // 이서연 (고3 · 공개 질문 있음)
  q(aq(8), sid('lee-seoyeon'), '하천 수질 값이 비 온 다음 날 크게 달라졌을 때 결과를 어떻게 해석했나요?', [act(9)], true),
  q(aq(9), sid('lee-seoyeon'), '전시 설명문에서 정보를 줄이면서도 의미를 지키기 위해 어떤 기준으로 내용을 골랐나요?', [act(10)], true),
  q(aq(10), sid('lee-seoyeon'), '환경 동아리 활동에서 측정 일정표를 직접 만든 이유는 무엇인가요?', [act(9)], false, { source: 'admin' }),
  // 최민준 (고3 · Draft만 있음, 공개 질문 없음)
  q(aq(11), sid('choi-minjun'), '심전도 신호에서 잡음과 실제 신호를 구분하기 위해 어떤 방법을 배웠나요?', [act(12)], false),
  q(aq(12), sid('choi-minjun'), '감염병 확산 모델의 한계를 발표할 때 어떤 근거를 함께 제시했나요?', [act(13)], false),
]
