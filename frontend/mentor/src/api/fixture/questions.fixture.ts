// 현재 Mentor(한지수)가 받은 질문 Fixture. 실제 질문 / 답변이 아니다. (모든 내용 가상)
//
// Privacy (domain.md §36, api-contract §26-1):
// 질문자는 anonymousStudentContext(grade / interestField)만 둔다. 실명 / 학교 / 기관 / 연락처 / Student ID /
// 학습관리 데이터 Field 자체를 만들지 않는다.
//
// TEMPORARY FIXTURE DUPLICATION:
// fixture-mq-01 / 07 / 08은 Student Mentor Hub Q&A Fixture(frontend/student/.../mentorQuestion.fixture.ts)의
// 한지수 질문과 같은 questionId / 질문 / 답변 / 관련 Content를 쓴다. 나머지는 다른 익명 Student의 질문이다.
//
// 상태(pending / overdue / answered)는 Fixture 값으로 명시한다. 72시간 판정 / Scheduler를 흉내 내지 않는다.
// 시간은 화면 표시용으로 Fixture를 처음 읽은 시점 기준 "N시간 전"이 되게 만든다.

import type { MentorContentRef, MentorQuestion } from '../types.ts'

const loadedAt = Date.now()
const hoursAgo = (hours: number) => new Date(loadedAt - hours * 3_600_000).toISOString()

const ref = {
  mockExamStory: { contentId: 'fixture-content-story-06', type: 'STORY', title: '모의고사 성적이 흔들렸을 때 관리 방법' },
  careerRecordStory: { contentId: 'fixture-content-story-02', type: 'STORY', title: '탐구 주제를 진로 기록으로 이어간 과정' },
  wrongNoteStory: { contentId: 'fixture-content-story-03', type: 'STORY', title: '1학년 1.8에서 1.3까지 오답노트 운영기' },
  antibioticRecord: { contentId: 'fixture-content-record-02', type: 'RECORD', title: '생명과학Ⅰ · 세부능력 및 특기사항' },
  antibioticCase: { contentId: 'fixture-content-case-01', type: 'CASE', title: '항생제 내성과 자연선택 탐구 포스터' },
} satisfies Record<string, MentorContentRef>

export function createQuestionFixtures(): MentorQuestion[] {
  return [
    {
      questionId: 'fixture-mq-08',
      status: 'pending',
      category: 'STUDY_METHOD',
      question: '생명과학 자료 해석 문항은 하루에 몇 개씩 풀었나요?',
      detail: null,
      anonymousStudentContext: { grade: '고2', interestField: '생명과학' },
      submittedAt: hoursAgo(5),
      answer: null,
      relatedContent: [],
    },
    {
      questionId: 'fixture-mq-23',
      status: 'pending',
      category: 'ADMISSION_STRATEGY',
      question: '교과 전형이랑 종합 전형 중에 언제 정하셨어요?',
      detail: '지금 내신이 1점대 후반인데 동아리 활동도 꽤 했어요. 둘 다 준비하면 어중간해질까 봐 걱정이에요.',
      anonymousStudentContext: { grade: '고2', interestField: '약학' },
      submittedAt: hoursAgo(2),
      answer: null,
      relatedContent: [],
    },
    {
      questionId: 'fixture-mq-24',
      status: 'pending',
      category: 'STUDY_METHOD',
      question: '시험 기간만 되면 계획이 사흘 만에 무너져요',
      detail: '하루 계획을 빽빽하게 세우는데 하나가 밀리면 나머지도 다 밀려요. 계획을 어느 정도로 잡으셨는지 궁금해요.',
      anonymousStudentContext: { grade: '고1', interestField: '보건' },
      submittedAt: hoursAgo(20),
      answer: null,
      relatedContent: [],
    },
    {
      questionId: 'fixture-mq-21',
      status: 'overdue',
      category: 'SCHOOL_GRADE',
      question: '수행평가 보고서 분량이 매번 넘쳐요',
      detail: '조사한 내용을 다 넣고 싶어서 A4 2장 제한을 자꾸 넘겨요. 무엇을 빼야 할지 모르겠어요.',
      // grade가 비어 온 경우 (Shared grade Contract 미확정) 관심 분야만 표시한다.
      anonymousStudentContext: { grade: null, interestField: '간호학' },
      submittedAt: hoursAgo(80),
      answer: null,
      relatedContent: [],
    },
    {
      questionId: 'fixture-mq-22',
      status: 'overdue',
      category: 'STUDY_METHOD',
      question: '오답노트를 만들기만 하고 다시 안 봐요',
      detail: null,
      anonymousStudentContext: { grade: '고1', interestField: '의생명' },
      submittedAt: hoursAgo(100),
      answer: null,
      relatedContent: [],
    },
    {
      questionId: 'fixture-mq-01',
      status: 'answered',
      category: 'MENTAL',
      question: '모의고사를 망치고 나서 공부가 손에 안 잡혀요',
      detail: '6월 모의고사 성적이 두 등급 떨어졌어요. 그 뒤로 일주일째 집중이 안 돼요.',
      anonymousStudentContext: { grade: '고2', interestField: '화학공학' },
      submittedAt: hoursAgo(30),
      answer: {
        text: '저도 생명과학이 두 등급 떨어졌던 적이 있어요. 성적표를 받은 날은 틀린 문제를 유형별로만 나눠두고 쉬었어요. 다음 날부터 가장 많이 틀린 유형 하나만 일주일 동안 잡았더니, 할 일이 작아지면서 다시 공부가 시작됐어요.',
        answeredAt: hoursAgo(8),
      },
      relatedContent: [ref.mockExamStory],
    },
    {
      questionId: 'fixture-mq-07',
      status: 'answered',
      category: 'ADMISSION_STRATEGY',
      question: '탐구 포스터 주제를 좁힐 때 무엇부터 봤나요?',
      detail: null,
      anonymousStudentContext: { grade: '고2', interestField: '생명공학' },
      submittedAt: hoursAgo(120),
      answer: {
        text: '교과서에서 배운 개념 하나로 시작해서, 학교 실험실에서 직접 확인할 수 있는 범위까지만 줄였어요. 주제가 작아질수록 결과를 설명하기 쉬웠어요.',
        answeredAt: hoursAgo(96),
      },
      relatedContent: [ref.careerRecordStory, ref.antibioticRecord, ref.antibioticCase],
    },
    {
      questionId: 'fixture-mq-25',
      status: 'answered',
      category: 'CSAT',
      question: '수능 최저 때문에 탐구 공부는 언제부터 시작하셨어요?',
      detail: null,
      // 관심 분야가 비어 온 경우 학년만 표시한다.
      anonymousStudentContext: { grade: '고2', interestField: null },
      submittedAt: hoursAgo(170),
      answer: {
        text: '내신 과목과 겹치는 생명과학은 고2 겨울방학부터 모의고사 유형으로 바꿨고, 화학은 고3 3월부터 시작했어요. 저는 3개 합 6이 목표라 영어를 먼저 안정시키고 탐구를 맞췄어요.',
        answeredAt: hoursAgo(150),
      },
      relatedContent: [ref.wrongNoteStory],
    },
  ]
}
