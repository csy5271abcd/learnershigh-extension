import type { MentorPlanContent, MentorProfileRecord, MentorRecordContent, MentorRoutineContent, MentorStoryContent } from './types.ts'

/*
 * Mentor Profile · Plan · Routine · Story · Record (Admin Mentor 추천 화면용). 실제 Mentor Content Backend가 아니다.
 * - Student Mentor Hub Canonical Fixture(frontend/student/src/features/mentor-hub/fixtures/mentors · mentorProfile · mentorPlan ·
 *   mentorRoutine · mentorStory · mentorRecord)의 값을 같은 mentorId · contentId로 그대로 옮겼다.
 *   Admin에서 Mentor / Content 내용을 새로 쓰거나 고치지 않는다. (frontend/student를 runtime import하지 않기 위해 값을 옮겼다)
 * - Profile 사진(profileImageUrl)은 Student 화면 확인용 Visual Mapping이라 옮기지 않았다. Admin은 이름 첫 글자로 표시한다.
 * - Story 저장 수 · 저장 여부는 학생 개인 상태라 옮기지 않았다. Story 주제 · Record 영역은 Student 화면 이름 그대로다.
 * - Record는 개인정보 제거 · 검수 완료 문장만 있다. 원본 파일은 없고 내려받을 수 없다.
 * - Activity Case 24개는 adminMentor.fixture.ts(목록) · adminMentorCaseDetails.fixture.ts(상세)가 가진다.
 * - Browser 검증(test-mentor)에서 Student Fixture와 값이 같은지 비교한다.
 */

export const mentorProfilesFixture: readonly MentorProfileRecord[] = [
  {
    "mentorId": "fixture-mentor-01",
    "name": "한지수",
    "university": "이화여대",
    "major": "생명과학과",
    "admissionType": "학생부교과",
    "highSchoolContext": "일반고 · 내신 1.3 · 생명과학I·화학I 3년 1등급",
    "representativeExperience": "내신 1.3 유지, 교내 생명과학 탐구대회 금상, 교외 · 대학 연계 실험캠프",
    "tags": [
      "내신",
      "교과전형",
      "교내대회",
      "생명과학"
    ],
    "verified": true,
    "scoreSummary": {
      "note": "학생부 교과 성적이 합격에 가장 크게 반영됐어요.",
      "schoolGrades": {
        "scaleLabel": "전 과목 · 9등급제",
        "terms": [
          {
            "term": "1-1학기",
            "averageGrade": 1.8
          },
          {
            "term": "1-2학기",
            "averageGrade": 1.6
          },
          {
            "term": "2-1학기",
            "averageGrade": 1.4
          },
          {
            "term": "2-2학기",
            "averageGrade": 1.3
          },
          {
            "term": "3-1학기",
            "averageGrade": 1.1
          }
        ]
      },
      "csat": {
        "basisLabel": "성적통지표 기준",
        "subjects": [
          {
            "area": "국어",
            "subject": "언어와 매체",
            "grade": 2,
            "percentile": 93
          },
          {
            "area": "수학",
            "subject": "확률과 통계",
            "grade": 2,
            "percentile": 90
          },
          {
            "area": "영어",
            "subject": "절대평가",
            "grade": 1,
            "percentile": null
          },
          {
            "area": "탐구",
            "subject": "생명과학I",
            "grade": 1,
            "percentile": 97
          },
          {
            "area": "탐구",
            "subject": "화학I",
            "grade": 2,
            "percentile": 91
          }
        ],
        "minimumRequirement": "수능 최저 3개 합 6 충족"
      }
    },
    "experiences": [
      {
        "title": "내신 1.3 유지",
        "description": "고1 1.8 → 고3 1.3, 과목별 오답노트로 관리했어요."
      },
      {
        "title": "교내 생명과학 탐구대회 금상",
        "description": "항생제 내성 시뮬레이션 실험"
      },
      {
        "title": "교외 · 대학 연계 실험캠프",
        "description": "생명과학 여름캠프 3일 수료"
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-02",
    "name": "한예린",
    "university": "건국대",
    "major": "환경보건과학과",
    "admissionType": "학생부교과",
    "highSchoolContext": "일반고 · 내신 1.6 · 통합과학·화학 우수",
    "representativeExperience": "교내 환경 탐구대회 은상, 환경 동아리 부장",
    "tags": [
      "내신",
      "교과전형",
      "교내대회",
      "환경"
    ],
    "verified": true,
    "scoreSummary": {
      "note": "교과 성적과 환경 탐구 활동을 함께 준비했어요.",
      "schoolGrades": {
        "scaleLabel": "전 과목 · 9등급제",
        "terms": [
          {
            "term": "1-1학기",
            "averageGrade": 2.1
          },
          {
            "term": "1-2학기",
            "averageGrade": 1.8
          },
          {
            "term": "2-1학기",
            "averageGrade": 1.6
          },
          {
            "term": "2-2학기",
            "averageGrade": 1.5
          },
          {
            "term": "3-1학기",
            "averageGrade": 1.4
          }
        ]
      }
    },
    "experiences": [
      {
        "title": "교내 환경 탐구대회 은상",
        "description": "학교 주변 하천 수질과 생물 다양성 비교"
      },
      {
        "title": "환경 동아리 부장",
        "description": "1년 동안 월 1회 하천 관찰 기록을 운영했어요."
      },
      {
        "title": "통합과학 · 화학 우수",
        "description": "실험 보고서 중심으로 개념을 정리했어요."
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-03",
    "name": "박나윤",
    "university": "경희대",
    "major": "식품영양학과",
    "admissionType": "논술",
    "highSchoolContext": "일반고 · 자연계 논술 · 수능 최저 충족",
    "representativeExperience": "경희대 자연계 논술 합격, 수능 최저 충족, 기술·가정 수행평가",
    "tags": [
      "논술",
      "수리논술",
      "수능최저",
      "식품영양"
    ],
    "verified": true,
    "scoreSummary": {
      "note": "논술 실력과 수능 최저를 함께 맞춘 경우예요.",
      "csat": {
        "basisLabel": "성적통지표 기준",
        "subjects": [
          {
            "area": "국어",
            "subject": "화법과 작문",
            "grade": 2,
            "percentile": 92
          },
          {
            "area": "수학",
            "subject": "미적분",
            "grade": 2,
            "percentile": 91
          },
          {
            "area": "영어",
            "subject": "절대평가",
            "grade": 2,
            "percentile": null
          },
          {
            "area": "탐구",
            "subject": "생명과학I",
            "grade": 2,
            "percentile": 89
          },
          {
            "area": "탐구",
            "subject": "화학I",
            "grade": 3,
            "percentile": 80
          }
        ],
        "minimumRequirement": "수능 최저 2개 합 5 충족"
      }
    },
    "experiences": [
      {
        "title": "경희대 자연계 논술 합격",
        "description": "수리논술 기출을 주 2회 시간 재고 풀었어요."
      },
      {
        "title": "수능 최저 충족",
        "description": "국어 · 수학 중심으로 최저 등급을 관리했어요."
      },
      {
        "title": "기술 · 가정 수행평가",
        "description": "가공음료 당류 함량 비교 실험"
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-04",
    "name": "정세진",
    "university": "숙명여대",
    "major": "통계학과",
    "admissionType": "정시",
    "highSchoolContext": "일반고 · 정시 집중",
    "representativeExperience": "수능 수학 백분위 97, 9월 모의고사 이후 실전 루틴 정비",
    "tags": [
      "정시",
      "수능수학"
    ],
    "verified": true,
    "scoreSummary": {
      "note": "수능 성적 중심으로 정시에 합격했어요.",
      "csat": {
        "basisLabel": "성적통지표 기준",
        "subjects": [
          {
            "area": "국어",
            "subject": "언어와 매체",
            "grade": 2,
            "percentile": 94
          },
          {
            "area": "수학",
            "subject": "확률과 통계",
            "grade": 1,
            "percentile": 97
          },
          {
            "area": "영어",
            "subject": "절대평가",
            "grade": 1,
            "percentile": null
          },
          {
            "area": "탐구",
            "subject": "사회 · 문화",
            "grade": 2,
            "percentile": 92
          }
        ]
      }
    },
    "experiences": [
      {
        "title": "수능 수학 백분위 97",
        "description": "9월 모의고사 이후 실전 시간 배분을 다시 짰어요."
      },
      {
        "title": "정시 집중 준비",
        "description": "고3 2학기부터 주간 모의고사 루틴으로 전환했어요."
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-05",
    "name": "최아름",
    "university": "서강대",
    "major": "경제학과",
    "admissionType": "학생부종합",
    "highSchoolContext": "일반고 · 사회탐구 중심",
    "representativeExperience": "교내 사회탐구 보고서 대회 수상, 경제 동아리 활동",
    "tags": [
      "학생부종합",
      "보고서"
    ],
    "verified": true,
    "scoreSummary": null,
    "experiences": [
      {
        "title": "교내 사회탐구 보고서 대회 수상",
        "description": "지역 상권 변화 설문 연구"
      },
      {
        "title": "경제 동아리 활동",
        "description": "경제 기사 요약과 토론을 2년 동안 운영했어요."
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-06",
    "name": "강민호",
    "university": "한양대",
    "major": "기계공학과",
    "admissionType": "학생부교과",
    "highSchoolContext": "일반고 · 내신 1.5",
    "representativeExperience": "내신 1.5, 교내 과학탐구대회 참가",
    "tags": [
      "내신",
      "공부법"
    ],
    "verified": true,
    "scoreSummary": {
      "schoolGrades": {
        "scaleLabel": "전 과목 · 9등급제",
        "terms": [
          {
            "term": "1-1학기",
            "averageGrade": 3
          },
          {
            "term": "1-2학기",
            "averageGrade": 2.4
          },
          {
            "term": "2-1학기",
            "averageGrade": 1.9
          },
          {
            "term": "2-2학기",
            "averageGrade": 1.6
          },
          {
            "term": "3-1학기",
            "averageGrade": 1.5
          }
        ]
      }
    },
    "experiences": [
      {
        "title": "수학 3등급 → 내신 1등급",
        "description": "풀이 과정을 말로 설명하는 방식으로 공부법을 바꿨어요."
      },
      {
        "title": "교내 과학탐구대회 참가",
        "description": "마찰력과 경사면 실험"
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-07",
    "name": "정민혁",
    "university": "한양대",
    "major": "컴퓨터소프트웨어학부",
    "admissionType": "학생부종합",
    "highSchoolContext": "일반고 · 정보 동아리",
    "representativeExperience": "교내 SW 경진대회 수상, 프로그래밍 동아리 운영",
    "tags": [
      "학생부종합",
      "SW"
    ],
    "verified": true,
    "scoreSummary": null,
    "experiences": [
      {
        "title": "교내 SW 경진대회 수상",
        "description": "급식 잔반 기록 앱 프로토타입"
      },
      {
        "title": "프로그래밍 동아리 운영",
        "description": "후배 대상 파이썬 스터디를 1년 운영했어요."
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-08",
    "name": "김하람",
    "university": "홍익대",
    "major": "시각디자인과",
    "admissionType": "실기",
    "highSchoolContext": "일반고 · 미술 실기 병행",
    "representativeExperience": "교외 · 공공디자인 공모전 참여, 실기 포트폴리오 준비",
    "tags": [
      "실기",
      "디자인"
    ],
    "verified": false,
    "scoreSummary": null,
    "experiences": [
      {
        "title": "교외 공공디자인 공모전 참여",
        "description": "버스 정류장 안내 디자인 제안"
      },
      {
        "title": "실기 포트폴리오 준비",
        "description": "주 3회 발상 스케치를 기록했어요."
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-09",
    "name": "이채린",
    "university": "고려대",
    "major": "국어교육과",
    "admissionType": "학생부종합",
    "highSchoolContext": "일반고 · 독서토론 활동",
    "representativeExperience": "독서토론부 부장 2년, 교내 독서 토론대회 참여",
    "tags": [
      "학생부종합",
      "독서"
    ],
    "verified": true,
    "scoreSummary": null,
    "experiences": [
      {
        "title": "독서토론부 부장 2년",
        "description": "월 2회 토론 주제를 선정하고 진행했어요."
      },
      {
        "title": "교내 독서 토론대회 참여",
        "description": "고전 작품을 현대 쟁점과 연결해 발표했어요."
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-10",
    "name": "고민정",
    "university": "성균관대",
    "major": "심리학과",
    "admissionType": "학생부종합",
    "highSchoolContext": "일반고 · 내신 관리",
    "representativeExperience": "중간고사 대비 4주 계획 운영",
    "tags": [
      "학생부종합",
      "Plan"
    ],
    "verified": true,
    "scoreSummary": null,
    "experiences": [
      {
        "title": "중간고사 4주 계획 운영",
        "description": "요일별 과목 배치로 시험 범위를 관리했어요."
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-11",
    "name": "최은채",
    "university": "한국외대",
    "major": "국제통상학과",
    "admissionType": "학생부종합",
    "highSchoolContext": "일반고 · 영어 우수",
    "representativeExperience": "영어 단어·구문 매일 30분 루틴 유지",
    "tags": [
      "학생부종합",
      "Routine"
    ],
    "verified": true,
    "scoreSummary": null,
    "experiences": [
      {
        "title": "영어 단어 · 구문 루틴",
        "description": "아침 · 저녁 30분씩 3년 동안 유지했어요."
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-12",
    "name": "윤하람",
    "university": "성균관대",
    "major": "미디어커뮤니케이션학과",
    "admissionType": "논술",
    "highSchoolContext": "일반고 · 모의고사 국어 1등급 · 논술 6회 응시 후 합격",
    "representativeExperience": "인문 논술 기출 분석 노트, 교외 영상 제작 활동",
    "tags": [
      "논술",
      "수능최저",
      "교외활동",
      "미디어"
    ],
    "verified": true,
    "scoreSummary": null,
    "experiences": [
      {
        "title": "논술 6회 응시 후 합격",
        "description": "응시 후마다 답안을 다시 써보며 구조를 고쳤어요."
      },
      {
        "title": "교외 영상 제작 활동",
        "description": "지역 청소년 미디어 캠프에서 단편 제작"
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-13",
    "name": "오준석",
    "university": "한국외대",
    "major": "영어교육과",
    "admissionType": "학생부교과",
    "highSchoolContext": "일반고 · 영어 내신 3년 1등급 · 교과 평균 1.4",
    "representativeExperience": "영어 내신 3년 1등급 유지, 교내 영어 말하기 대회 수상",
    "tags": [
      "내신",
      "교과전형",
      "교내대회",
      "영어"
    ],
    "verified": true,
    "scoreSummary": null,
    "experiences": [
      {
        "title": "영어 내신 3년 1등급",
        "description": "본문 변형 문제를 직접 만들어 복습했어요."
      },
      {
        "title": "교내 영어 말하기 대회 수상",
        "description": "교육 격차를 주제로 발표"
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-14",
    "name": "박서현",
    "university": "고려대",
    "major": "역사교육과",
    "admissionType": "정시",
    "highSchoolContext": "일반고 · 수능 국·수·탐 백분위 96 이상 · 한국사 1등급",
    "representativeExperience": "국어 비문학 8주 계획으로 지문 구조 분석 연습",
    "tags": [
      "정시",
      "수능",
      "성적향상",
      "사탐"
    ],
    "verified": true,
    "scoreSummary": {
      "note": "수능 국어 · 수학 · 탐구를 고르게 끌어올렸어요.",
      "csat": {
        "basisLabel": "성적통지표 기준",
        "subjects": [
          {
            "area": "국어",
            "subject": "화법과 작문",
            "grade": 1,
            "percentile": 97
          },
          {
            "area": "수학",
            "subject": "확률과 통계",
            "grade": 1,
            "percentile": 96
          },
          {
            "area": "영어",
            "subject": "절대평가",
            "grade": 2,
            "percentile": null
          },
          {
            "area": "탐구",
            "subject": "한국지리",
            "grade": 1,
            "percentile": 98
          }
        ]
      }
    },
    "experiences": [
      {
        "title": "국어 비문학 시간 관리",
        "description": "고3 여름부터 지문 구조를 먼저 잡는 연습을 했어요."
      },
      {
        "title": "한국사 1등급",
        "description": "시대별 흐름표를 주 1회 다시 그렸어요."
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-15",
    "name": "이현서",
    "university": "성균관대",
    "major": "사학과",
    "admissionType": "정시",
    "highSchoolContext": "일반고 · 재수 · 수능 표준점수 +34 상승",
    "representativeExperience": "재수 기간 주간 모의고사 회고로 취약 영역 관리",
    "tags": [
      "정시",
      "재수",
      "성적향상",
      "역사"
    ],
    "verified": true,
    "scoreSummary": null,
    "experiences": [
      {
        "title": "재수 · 표준점수 +34",
        "description": "주간 모의고사 회고로 취약 영역을 관리했어요."
      },
      {
        "title": "역사 탐구 독서",
        "description": "한 달에 한 권 시대사 책을 정리했어요."
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-16",
    "name": "정다인",
    "university": "연세대",
    "major": "정치외교학과",
    "admissionType": "논술",
    "highSchoolContext": "일반고 · 논술 + 수능최저 충족 · 토론 경험",
    "representativeExperience": "교내 토론대회 준우승, 시사 논술 주 1회 첨삭",
    "tags": [
      "논술",
      "토론대회",
      "수능최저",
      "정치외교"
    ],
    "verified": true,
    "scoreSummary": null,
    "experiences": [
      {
        "title": "교내 토론대회 준우승",
        "description": "기후 정책을 주제로 찬반 토론"
      },
      {
        "title": "시사 논술 첨삭",
        "description": "주 1회 시사 주제로 답안을 쓰고 고쳤어요."
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-17",
    "name": "김도연",
    "university": "서울대",
    "major": "지리학과",
    "admissionType": "학생부종합",
    "highSchoolContext": "일반고 · 지리 탐구 동아리 · 지역 조사 프로젝트",
    "representativeExperience": "도시 열섬 현상 지역 조사, 지리 탐구 동아리 운영",
    "tags": [
      "학생부종합",
      "동아리",
      "탐구",
      "지리"
    ],
    "verified": true,
    "scoreSummary": null,
    "experiences": [
      {
        "title": "도시 열섬 지역 조사",
        "description": "학교 주변 온도를 4주 동안 측정했어요."
      },
      {
        "title": "지리 탐구 동아리 운영",
        "description": "지역 답사 계획과 보고서 작성을 맡았어요."
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-18",
    "name": "조민재",
    "university": "연세대",
    "major": "경제학부",
    "admissionType": "정시",
    "highSchoolContext": "일반고 · 수능 수학 1등급 · 경제 선택",
    "representativeExperience": "수학 실전 모의고사 회차별 오답 정리",
    "tags": [
      "정시",
      "수능",
      "수학",
      "경제"
    ],
    "verified": true,
    "scoreSummary": null,
    "experiences": [
      {
        "title": "수학 실전 모의고사 오답 정리",
        "description": "회차별로 틀린 유형을 표로 관리했어요."
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-19",
    "name": "서지호",
    "university": "고려대",
    "major": "경영학과",
    "admissionType": "학생부교과",
    "highSchoolContext": "일반고 · 내신 1.2 · 교내 경제 동아리",
    "representativeExperience": "내신 1.2 유지, 교내 창업 아이디어 대회 수상",
    "tags": [
      "내신",
      "교과전형",
      "교내대회",
      "경영"
    ],
    "verified": true,
    "scoreSummary": null,
    "experiences": [
      {
        "title": "내신 1.2 유지",
        "description": "시험 3주 전부터 과목별 범위표를 운영했어요."
      },
      {
        "title": "교내 창업 아이디어 대회 수상",
        "description": "학교 매점 재고 관리 아이디어"
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-20",
    "name": "김태현",
    "university": "중앙대",
    "major": "심리학과",
    "admissionType": "논술",
    "highSchoolContext": "일반고 · 수리논술 · 수능 최저 충족",
    "representativeExperience": "심리학 독서 기록과 수리논술 주 2회 실전 연습",
    "tags": [
      "논술",
      "수리논술",
      "수능최저",
      "심리"
    ],
    "verified": false,
    "scoreSummary": null,
    "experiences": [
      {
        "title": "수리논술 주 2회 실전",
        "description": "시간을 재고 풀고 풀이를 다시 써봤어요."
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-21",
    "name": "이수빈",
    "university": "서울시립대",
    "major": "도시공학과",
    "admissionType": "학생부종합",
    "highSchoolContext": "일반고 · 수학 실전 모의 주 3회 · 교내 도시 탐구 동아리",
    "representativeExperience": "평일 저녁 수학 실전 모의와 오답 정리를 1년 동안 반복",
    "tags": [
      "학생부종합",
      "수학",
      "Routine",
      "도시"
    ],
    "verified": true,
    "scoreSummary": null,
    "experiences": [
      {
        "title": "수학 실전 모의 주 3회",
        "description": "평일 저녁 같은 시간에 시간을 재고 풀었어요."
      },
      {
        "title": "교내 도시 탐구 동아리",
        "description": "학교 주변 보행로 조사"
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-22",
    "name": "송지후",
    "university": "아주대",
    "major": "소프트웨어학과",
    "admissionType": "정시",
    "highSchoolContext": "일반고 · 물리학Ⅰ 선택 유지 · 교내 코딩 동아리",
    "representativeExperience": "역학 단원 오답을 끝까지 정리해 물리학Ⅰ 선택을 지킨 경험",
    "tags": [
      "정시",
      "물리",
      "과탐",
      "소프트웨어"
    ],
    "verified": true,
    "scoreSummary": null,
    "experiences": [
      {
        "title": "물리학Ⅰ 선택 유지",
        "description": "역학 단원 오답을 유형별로 다시 풀었어요."
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-23",
    "name": "조아라",
    "university": "국민대",
    "major": "시각디자인학과",
    "admissionType": "학생부종합",
    "highSchoolContext": "일반고 · 디자인 진로 · 교내 행사/교외 디자인 활동",
    "representativeExperience": "학교 축제 안내지도 디자인과 교외 디자인 활동",
    "tags": [
      "학생부종합",
      "교내활동",
      "교외활동",
      "디자인"
    ],
    "verified": true,
    "scoreSummary": null,
    "experiences": [
      {
        "title": "교내 축제 안내 디자인",
        "description": "학생 의견 조사로 안내판 순서를 다시 정했어요."
      }
    ]
  },
  {
    "mentorId": "fixture-mentor-24",
    "name": "서예원",
    "university": "이화여대",
    "major": "음악교육과",
    "admissionType": "학생부종합",
    "highSchoolContext": "예고 · 음악교육 진로 · 교내외 공연·봉사·교육 활동",
    "representativeExperience": "영화 음악 분석 발표와 교내외 공연 · 음악 교육 봉사",
    "tags": [
      "학생부종합",
      "봉사",
      "교내대회",
      "음악교육"
    ],
    "verified": true,
    "scoreSummary": null,
    "experiences": [
      {
        "title": "영화 음악 분석 발표",
        "description": "영화 장면 3개의 음악 요소를 비교해 발표했어요."
      },
      {
        "title": "교내외 공연 · 음악 교육 봉사",
        "description": "공연과 음악 교육 봉사를 꾸준히 이어갔어요."
      }
    ]
  }
]

export const mentorPlansFixture: readonly MentorPlanContent[] = [
  {
    "contentId": "fixture-content-plan-01",
    "kind": "plan",
    "title": "국어 문학 내신 4주 정리 Plan",
    "mentorId": "fixture-mentor-01",
    "summary": "작품별 표현법과 주제를 주차별로 나눠 정리하는 계획이에요.",
    "description": "작품을 갈래별로 묶어 주차마다 표현법과 주제를 정리해요.",
    "durationWeeks": 4,
    "daysPerWeek": 2,
    "weeks": [
      {
        "week": 1,
        "items": [
          {
            "itemId": "fixture-content-plan-01-w1-1",
            "day": "화",
            "task": "현대시 작품 표현법 정리",
            "subject": "국어",
            "memo": "시어마다 표시"
          },
          {
            "itemId": "fixture-content-plan-01-w1-2",
            "day": "금",
            "task": "현대시 주제 한 줄 정리",
            "subject": "국어"
          }
        ]
      },
      {
        "week": 2,
        "items": [
          {
            "itemId": "fixture-content-plan-01-w2-1",
            "day": "화",
            "task": "고전시가 작품 표현법 정리",
            "subject": "국어"
          },
          {
            "itemId": "fixture-content-plan-01-w2-2",
            "day": "금",
            "task": "고전시가 주제 한 줄 정리",
            "subject": "국어"
          }
        ]
      },
      {
        "week": 3,
        "items": [
          {
            "itemId": "fixture-content-plan-01-w3-1",
            "day": "화",
            "task": "현대소설 인물 관계 정리",
            "subject": "국어"
          },
          {
            "itemId": "fixture-content-plan-01-w3-2",
            "day": "금",
            "task": "고전소설 인물 관계 정리",
            "subject": "국어"
          }
        ]
      },
      {
        "week": 4,
        "items": [
          {
            "itemId": "fixture-content-plan-01-w4-1",
            "day": "화",
            "task": "갈래별 작품 비교표 만들기",
            "subject": "국어",
            "memo": "표 한 장으로"
          },
          {
            "itemId": "fixture-content-plan-01-w4-2",
            "day": "금",
            "task": "문학 기출 서술형 쓰기",
            "subject": "국어"
          }
        ]
      }
    ]
  },
  {
    "contentId": "fixture-content-plan-02",
    "kind": "plan",
    "title": "고2 중간고사 4주 Plan",
    "mentorId": "fixture-mentor-10",
    "summary": "수학Ⅱ·화학Ⅰ·영어를 요일별로 나눈 4주 계획이에요. 2주차에 화학 수행평가를 배치했어요.",
    "description": "시험 4주 전부터 과목별 분량을 주차로 나눴어요. 2주차는 화학 수행평가가 있어서 학원 없는 날 다음에 배치했어요.",
    "durationWeeks": 4,
    "daysPerWeek": 5,
    "weeks": [
      {
        "week": 1,
        "items": [
          {
            "itemId": "fixture-content-plan-02-w1-1",
            "day": "월",
            "task": "수학Ⅱ 미분 개념 정리",
            "subject": "수학Ⅱ",
            "memo": "교과서 예제부터"
          },
          {
            "itemId": "fixture-content-plan-02-w1-2",
            "day": "화",
            "task": "화학Ⅰ 1단원 개념 정리",
            "subject": "화학Ⅰ",
            "memo": "수업 필기와 함께 보기"
          },
          {
            "itemId": "fixture-content-plan-02-w1-3",
            "day": "수",
            "task": "영어 본문 1~2과 읽기",
            "subject": "영어",
            "memo": "모르는 단어 표시"
          },
          {
            "itemId": "fixture-content-plan-02-w1-4",
            "day": "목",
            "task": "수학Ⅱ 유형 문제 풀이",
            "subject": "수학Ⅱ",
            "memo": "틀린 문제에 별표"
          },
          {
            "itemId": "fixture-content-plan-02-w1-5",
            "day": "금",
            "task": "1주차 범위 점검",
            "subject": "전 과목",
            "memo": "밀린 분량만 보충"
          }
        ]
      },
      {
        "week": 2,
        "items": [
          {
            "itemId": "fixture-content-plan-02-w2-1",
            "day": "월",
            "task": "화학Ⅰ 수행평가 자료 정리",
            "subject": "화학Ⅰ",
            "memo": "학원 없는 날이라 길게 잡기"
          },
          {
            "itemId": "fixture-content-plan-02-w2-2",
            "day": "화",
            "task": "화학Ⅰ 수행평가 보고서 마무리",
            "subject": "화학Ⅰ",
            "memo": "제출 전 채점 기준 확인"
          },
          {
            "itemId": "fixture-content-plan-02-w2-3",
            "day": "수",
            "task": "영어 본문 3~4과 읽기",
            "subject": "영어"
          },
          {
            "itemId": "fixture-content-plan-02-w2-4",
            "day": "목",
            "task": "수학Ⅱ 적분 개념 정리",
            "subject": "수학Ⅱ"
          },
          {
            "itemId": "fixture-content-plan-02-w2-5",
            "day": "금",
            "task": "2주차 범위 점검",
            "subject": "전 과목",
            "memo": "밀린 분량만 보충"
          }
        ]
      },
      {
        "week": 3,
        "items": [
          {
            "itemId": "fixture-content-plan-02-w3-1",
            "day": "월",
            "task": "수학Ⅱ 기출 1회",
            "subject": "수학Ⅱ",
            "memo": "시간 재고 풀기"
          },
          {
            "itemId": "fixture-content-plan-02-w3-2",
            "day": "화",
            "task": "화학Ⅰ 2단원 문제 풀이",
            "subject": "화학Ⅰ"
          },
          {
            "itemId": "fixture-content-plan-02-w3-3",
            "day": "수",
            "task": "영어 본문 문법 포인트 정리",
            "subject": "영어"
          },
          {
            "itemId": "fixture-content-plan-02-w3-4",
            "day": "목",
            "task": "화학Ⅰ 서술형 기출 모으기",
            "subject": "화학Ⅰ"
          },
          {
            "itemId": "fixture-content-plan-02-w3-5",
            "day": "금",
            "task": "오답 노트 정리",
            "subject": "전 과목",
            "memo": "별표 표시까지만"
          }
        ]
      },
      {
        "week": 4,
        "items": [
          {
            "itemId": "fixture-content-plan-02-w4-1",
            "day": "월",
            "task": "수학Ⅱ 실전 모의 1회",
            "subject": "수학Ⅱ",
            "memo": "시험과 같은 시간대에 풀기"
          },
          {
            "itemId": "fixture-content-plan-02-w4-2",
            "day": "화",
            "task": "화학Ⅰ 서술형 대비",
            "subject": "화학Ⅰ",
            "memo": "답안을 직접 써보기"
          },
          {
            "itemId": "fixture-content-plan-02-w4-3",
            "day": "수",
            "task": "영어 본문 암기 점검",
            "subject": "영어",
            "memo": "빈칸으로 만들어 확인하기"
          },
          {
            "itemId": "fixture-content-plan-02-w4-4",
            "day": "목",
            "task": "전 과목 오답 다시 보기",
            "subject": "수학Ⅱ 중심",
            "memo": "별표 친 문제만"
          },
          {
            "itemId": "fixture-content-plan-02-w4-5",
            "day": "금",
            "task": "시험 전날 개념 요약 1장",
            "subject": "화학Ⅰ",
            "memo": "A4 한 장을 넘기지 않기"
          }
        ]
      }
    ]
  },
  {
    "contentId": "fixture-content-plan-03",
    "kind": "plan",
    "title": "수능 국어 비문학 8주 Plan",
    "mentorId": "fixture-mentor-12",
    "summary": "지문 구조 분석과 풀이 시간 단축을 8주로 나눈 계획이에요.",
    "description": "지문 구조 분석과 풀이 시간 단축을 8주로 나눴어요. 앞 4주는 구조, 뒤 4주는 시간을 줄이는 데 써요.",
    "durationWeeks": 8,
    "daysPerWeek": 3,
    "weeks": [
      {
        "week": 1,
        "items": [
          {
            "itemId": "fixture-content-plan-03-w1-1",
            "day": "월",
            "task": "인문 지문 문단 요약",
            "subject": "국어",
            "memo": "문단마다 한 줄"
          },
          {
            "itemId": "fixture-content-plan-03-w1-2",
            "day": "목",
            "task": "과학 지문 문단 요약",
            "subject": "국어"
          }
        ]
      },
      {
        "week": 2,
        "items": [
          {
            "itemId": "fixture-content-plan-03-w2-1",
            "day": "월",
            "task": "사회 지문 구조도 그리기",
            "subject": "국어"
          },
          {
            "itemId": "fixture-content-plan-03-w2-2",
            "day": "목",
            "task": "기술 지문 구조도 그리기",
            "subject": "국어"
          }
        ]
      },
      {
        "week": 3,
        "items": [
          {
            "itemId": "fixture-content-plan-03-w3-1",
            "day": "월",
            "task": "복합 지문 구조 분석",
            "subject": "국어",
            "memo": "연결어에 표시"
          },
          {
            "itemId": "fixture-content-plan-03-w3-2",
            "day": "목",
            "task": "주간 지문 다시 읽기",
            "subject": "국어"
          }
        ]
      },
      {
        "week": 4,
        "items": [
          {
            "itemId": "fixture-content-plan-03-w4-1",
            "day": "월",
            "task": "구조 분석 점검 세트",
            "subject": "국어"
          },
          {
            "itemId": "fixture-content-plan-03-w4-2",
            "day": "목",
            "task": "틀린 지문 구조 다시 그리기",
            "subject": "국어"
          }
        ]
      },
      {
        "week": 5,
        "items": [
          {
            "itemId": "fixture-content-plan-03-w5-1",
            "day": "월",
            "task": "지문 1개 8분 안에 풀기",
            "subject": "국어",
            "memo": "시간 기록하기"
          },
          {
            "itemId": "fixture-content-plan-03-w5-2",
            "day": "목",
            "task": "지문 1개 8분 안에 풀기",
            "subject": "국어"
          }
        ]
      },
      {
        "week": 6,
        "items": [
          {
            "itemId": "fixture-content-plan-03-w6-1",
            "day": "월",
            "task": "지문 2개 15분 세트",
            "subject": "국어"
          },
          {
            "itemId": "fixture-content-plan-03-w6-2",
            "day": "목",
            "task": "오래 걸린 지문 원인 적기",
            "subject": "국어"
          }
        ]
      },
      {
        "week": 7,
        "items": [
          {
            "itemId": "fixture-content-plan-03-w7-1",
            "day": "월",
            "task": "비문학 실전 세트 1회",
            "subject": "국어",
            "memo": "시험 시간대에 풀기"
          },
          {
            "itemId": "fixture-content-plan-03-w7-2",
            "day": "목",
            "task": "실전 세트 오답 정리",
            "subject": "국어"
          }
        ]
      },
      {
        "week": 8,
        "items": [
          {
            "itemId": "fixture-content-plan-03-w8-1",
            "day": "월",
            "task": "비문학 실전 세트 2회",
            "subject": "국어"
          },
          {
            "itemId": "fixture-content-plan-03-w8-2",
            "day": "목",
            "task": "8주 오답 다시 보기",
            "subject": "국어",
            "memo": "별표 친 지문만"
          }
        ]
      }
    ]
  },
  {
    "contentId": "fixture-content-plan-04",
    "kind": "plan",
    "title": "고2 수행평가 준비 3주 Plan",
    "mentorId": "fixture-mentor-09",
    "summary": "주제 선정, 자료 조사, 초안을 3주로 나눈 수행평가 계획이에요.",
    "description": "수행평가 제출 3주 전부터 주제 선정, 자료 조사, 초안을 한 주씩 나눴어요.",
    "durationWeeks": 3,
    "daysPerWeek": 2,
    "weeks": [
      {
        "week": 1,
        "items": [
          {
            "itemId": "fixture-content-plan-04-w1-1",
            "day": "월",
            "task": "주제 후보 3개 적기",
            "subject": "국어",
            "memo": "수업 내용과 연결"
          },
          {
            "itemId": "fixture-content-plan-04-w1-2",
            "day": "목",
            "task": "주제 1개 고르기",
            "subject": "국어"
          }
        ]
      },
      {
        "week": 2,
        "items": [
          {
            "itemId": "fixture-content-plan-04-w2-1",
            "day": "월",
            "task": "자료 3개 찾기",
            "subject": "국어",
            "memo": "출처 함께 적기"
          },
          {
            "itemId": "fixture-content-plan-04-w2-2",
            "day": "목",
            "task": "자료 요약하기",
            "subject": "국어"
          }
        ]
      },
      {
        "week": 3,
        "items": [
          {
            "itemId": "fixture-content-plan-04-w3-1",
            "day": "월",
            "task": "초안 쓰기",
            "subject": "국어"
          },
          {
            "itemId": "fixture-content-plan-04-w3-2",
            "day": "목",
            "task": "평가 기준으로 초안 점검",
            "subject": "국어",
            "memo": "제출 이틀 전까지"
          }
        ]
      }
    ]
  },
  {
    "contentId": "fixture-content-plan-05",
    "kind": "plan",
    "title": "영어 빈칸·순서 유형 4주 Plan",
    "mentorId": "fixture-mentor-13",
    "summary": "모의고사에서 자주 틀리는 빈칸·순서 유형만 4주 동안 집중하는 계획이에요.",
    "description": "모의고사에서 자주 틀리는 빈칸과 순서 유형만 4주 동안 집중해요.",
    "durationWeeks": 4,
    "daysPerWeek": 2,
    "weeks": [
      {
        "week": 1,
        "items": [
          {
            "itemId": "fixture-content-plan-05-w1-1",
            "day": "화",
            "task": "빈칸 유형 10문항",
            "subject": "영어",
            "memo": "근거 문장에 밑줄"
          },
          {
            "itemId": "fixture-content-plan-05-w1-2",
            "day": "금",
            "task": "빈칸 오답 다시 풀기",
            "subject": "영어"
          }
        ]
      },
      {
        "week": 2,
        "items": [
          {
            "itemId": "fixture-content-plan-05-w2-1",
            "day": "화",
            "task": "순서 유형 10문항",
            "subject": "영어",
            "memo": "연결어 표시"
          },
          {
            "itemId": "fixture-content-plan-05-w2-2",
            "day": "금",
            "task": "순서 오답 다시 풀기",
            "subject": "영어"
          }
        ]
      },
      {
        "week": 3,
        "items": [
          {
            "itemId": "fixture-content-plan-05-w3-1",
            "day": "화",
            "task": "빈칸·순서 섞어 15문항",
            "subject": "영어"
          },
          {
            "itemId": "fixture-content-plan-05-w3-2",
            "day": "금",
            "task": "시간 재고 다시 풀기",
            "subject": "영어"
          }
        ]
      },
      {
        "week": 4,
        "items": [
          {
            "itemId": "fixture-content-plan-05-w4-1",
            "day": "화",
            "task": "모의고사 빈칸·순서만 풀기",
            "subject": "영어",
            "memo": "시험 시간대에"
          },
          {
            "itemId": "fixture-content-plan-05-w4-2",
            "day": "금",
            "task": "4주 오답 다시 보기",
            "subject": "영어"
          }
        ]
      }
    ]
  },
  {
    "contentId": "fixture-content-plan-06",
    "kind": "plan",
    "title": "수학Ⅱ 내신 5주 역산 Plan",
    "mentorId": "fixture-mentor-04",
    "summary": "시험일에서 거꾸로 단원별 문제 풀이 분량을 정한 계획이에요.",
    "description": "시험일에서 거꾸로 계산해 단원별 문제 풀이 분량을 정했어요.",
    "durationWeeks": 5,
    "daysPerWeek": 2,
    "weeks": [
      {
        "week": 1,
        "items": [
          {
            "itemId": "fixture-content-plan-06-w1-1",
            "day": "월",
            "task": "함수의 극한 개념 정리",
            "subject": "수학Ⅱ"
          },
          {
            "itemId": "fixture-content-plan-06-w1-2",
            "day": "목",
            "task": "함수의 극한 문제 풀이",
            "subject": "수학Ⅱ"
          }
        ]
      },
      {
        "week": 2,
        "items": [
          {
            "itemId": "fixture-content-plan-06-w2-1",
            "day": "월",
            "task": "미분 개념 정리",
            "subject": "수학Ⅱ"
          },
          {
            "itemId": "fixture-content-plan-06-w2-2",
            "day": "목",
            "task": "미분 문제 풀이",
            "subject": "수학Ⅱ",
            "memo": "틀린 문제에 별표"
          }
        ]
      },
      {
        "week": 3,
        "items": [
          {
            "itemId": "fixture-content-plan-06-w3-1",
            "day": "월",
            "task": "적분 개념 정리",
            "subject": "수학Ⅱ"
          },
          {
            "itemId": "fixture-content-plan-06-w3-2",
            "day": "목",
            "task": "적분 문제 풀이",
            "subject": "수학Ⅱ"
          }
        ]
      },
      {
        "week": 4,
        "items": [
          {
            "itemId": "fixture-content-plan-06-w4-1",
            "day": "월",
            "task": "기출 1회",
            "subject": "수학Ⅱ",
            "memo": "시간 재고 풀기"
          },
          {
            "itemId": "fixture-content-plan-06-w4-2",
            "day": "목",
            "task": "기출 오답 정리",
            "subject": "수학Ⅱ"
          }
        ]
      },
      {
        "week": 5,
        "items": [
          {
            "itemId": "fixture-content-plan-06-w5-1",
            "day": "월",
            "task": "실전 모의 1회",
            "subject": "수학Ⅱ",
            "memo": "시험과 같은 시간대에"
          },
          {
            "itemId": "fixture-content-plan-06-w5-2",
            "day": "목",
            "task": "별표 문제만 다시 풀기",
            "subject": "수학Ⅱ"
          }
        ]
      }
    ]
  },
  {
    "contentId": "fixture-content-plan-07",
    "kind": "plan",
    "title": "모의고사 이후 오답 7일 Plan",
    "mentorId": "fixture-mentor-17",
    "summary": "모의고사 다음 날부터 7일 동안 오답을 정리하는 계획이에요.",
    "description": "모의고사 다음 날부터 7일 동안 과목별로 오답을 정리해요.",
    "durationWeeks": 1,
    "daysPerWeek": 7,
    "weeks": [
      {
        "week": 1,
        "items": [
          {
            "itemId": "fixture-content-plan-07-w1-1",
            "day": "월",
            "task": "국어 오답 원인 적기",
            "subject": "국어",
            "memo": "틀린 이유 한 줄"
          },
          {
            "itemId": "fixture-content-plan-07-w1-2",
            "day": "화",
            "task": "수학 오답 다시 풀기",
            "subject": "수학"
          },
          {
            "itemId": "fixture-content-plan-07-w1-3",
            "day": "수",
            "task": "영어 오답 근거 찾기",
            "subject": "영어"
          },
          {
            "itemId": "fixture-content-plan-07-w1-4",
            "day": "목",
            "task": "탐구 오답 개념 확인",
            "subject": "탐구"
          },
          {
            "itemId": "fixture-content-plan-07-w1-5",
            "day": "금",
            "task": "국어·수학 재풀이",
            "subject": "국어 · 수학"
          },
          {
            "itemId": "fixture-content-plan-07-w1-6",
            "day": "토",
            "task": "영어·탐구 재풀이",
            "subject": "영어 · 탐구"
          },
          {
            "itemId": "fixture-content-plan-07-w1-7",
            "day": "일",
            "task": "다시 틀린 문제만 모으기",
            "subject": "전 과목",
            "memo": "다음 모의고사 전에 보기"
          }
        ]
      }
    ]
  }
]

export const mentorRoutinesFixture: readonly MentorRoutineContent[] = [
  {
    "contentId": "fixture-content-routine-01",
    "kind": "routine",
    "title": "물리Ⅰ·화학Ⅰ 개념 복습 루틴",
    "mentorId": "fixture-mentor-03",
    "summary": "물리 공식 유도와 화학 계산 문제를 번갈아 복습하는 루틴이에요.",
    "description": "물리 공식 유도와 화학 계산 문제를 번갈아 복습하는 루틴이에요.",
    "timelineTitle": "하루 Timeline",
    "applyDays": [
      "월",
      "화",
      "수",
      "목",
      "금",
      "토",
      "일"
    ],
    "timeline": [
      {
        "blockId": "fixture-content-routine-01-block-1",
        "slot": {
          "start": "21:00",
          "end": "21:30"
        },
        "title": "물리 공식 유도",
        "description": "공식을 외우지 않고 직접 유도해요."
      },
      {
        "blockId": "fixture-content-routine-01-block-2",
        "slot": {
          "start": "21:30",
          "end": "22:00"
        },
        "title": "화학 계산 문제",
        "description": "단위를 끝까지 써요."
      }
    ],
    "habits": [
      {
        "habitId": "fixture-content-routine-01-habit-1",
        "title": "공식 한 줄 유도",
        "frequency": "매일",
        "slot": {
          "start": "21:00",
          "end": "21:30"
        },
        "description": "하루 한 공식만 처음부터 유도해요."
      }
    ]
  },
  {
    "contentId": "fixture-content-routine-02",
    "kind": "routine",
    "title": "영어 단어·구문 매일 30분",
    "mentorId": "fixture-mentor-11",
    "summary": "아침·저녁 30분씩 단어와 구문을 반복하는 루틴이에요.",
    "description": "아침·저녁 30분씩 단어와 구문을 반복하는 루틴이에요.",
    "timelineTitle": "하루 Timeline",
    "applyDays": [
      "월",
      "화",
      "수",
      "목",
      "금",
      "토",
      "일"
    ],
    "timeline": [
      {
        "blockId": "fixture-content-routine-02-block-1",
        "slot": {
          "start": "07:00",
          "end": "07:30"
        },
        "title": "아침 단어",
        "description": "등교 전에 단어 30개를 소리 내서 외워요."
      },
      {
        "blockId": "fixture-content-routine-02-block-2",
        "slot": {
          "start": "22:30",
          "end": "23:00"
        },
        "title": "저녁 구문 복습",
        "description": "아침 단어로 문장을 만들어 봐요."
      }
    ],
    "habits": [
      {
        "habitId": "fixture-content-routine-02-habit-1",
        "title": "아침 단어 30개",
        "frequency": "매일",
        "slot": {
          "start": "07:00",
          "end": "07:30"
        },
        "description": "하루 시작을 짧은 암기로 열어요."
      },
      {
        "habitId": "fixture-content-routine-02-habit-2",
        "title": "저녁 구문 5개",
        "frequency": "매일",
        "slot": {
          "start": "22:30",
          "end": "23:00"
        },
        "description": "아침에 본 단어를 문장으로 다시 써요."
      }
    ]
  },
  {
    "contentId": "fixture-content-routine-03",
    "kind": "routine",
    "title": "수능 D-100 하루 공부 루틴",
    "mentorId": "fixture-mentor-18",
    "summary": "기상부터 취침까지 과목별 시간을 고정한 하루 루틴이에요.",
    "description": "기상부터 취침까지 과목별 시간을 고정한 하루 루틴이에요.",
    "timelineTitle": "하루 Timeline",
    "applyDays": [
      "월",
      "화",
      "수",
      "목",
      "금"
    ],
    "timeline": [
      {
        "blockId": "fixture-content-routine-03-block-1",
        "slot": {
          "start": "06:30",
          "end": "07:00"
        },
        "title": "기상 · 영어 단어",
        "description": "단어 30개를 소리 내서 외워요."
      },
      {
        "blockId": "fixture-content-routine-03-block-2",
        "slot": {
          "start": "13:00",
          "end": "15:00"
        },
        "title": "생명과학Ⅰ 개념 · 기출",
        "description": "고난도 3문항을 먼저 풀어요."
      },
      {
        "blockId": "fixture-content-routine-03-block-3",
        "slot": {
          "start": "15:30",
          "end": "18:00"
        },
        "title": "화학Ⅰ 문제 풀이",
        "description": "실전처럼 시간을 재요."
      },
      {
        "blockId": "fixture-content-routine-03-block-4",
        "slot": {
          "start": "19:00",
          "end": "21:30"
        },
        "title": "수학 오답 · 실전 연습",
        "description": "오답은 같은 날 다시 풀어요."
      },
      {
        "blockId": "fixture-content-routine-03-block-5",
        "slot": {
          "start": "22:00",
          "end": "23:00"
        },
        "title": "하루 오답 정리",
        "description": "내일 볼 문제를 표시해요."
      }
    ],
    "habits": [
      {
        "habitId": "fixture-content-routine-03-habit-1",
        "title": "아침 단어 30개",
        "frequency": "매일",
        "slot": {
          "start": "06:30",
          "end": "07:00"
        },
        "description": "하루 시작을 짧은 암기로 열어요."
      },
      {
        "habitId": "fixture-content-routine-03-habit-2",
        "title": "생명과학 고난도 3문항",
        "frequency": "매일",
        "slot": {
          "start": "13:00",
          "end": "13:40"
        },
        "description": "점심 직후 집중력이 좋을 때 풀어요."
      },
      {
        "habitId": "fixture-content-routine-03-habit-3",
        "title": "자기 전 오답 정리",
        "frequency": "매일",
        "slot": {
          "start": "22:00",
          "end": "23:00"
        },
        "description": "내일 볼 문제를 표시해요."
      }
    ]
  },
  {
    "contentId": "fixture-content-routine-04",
    "kind": "routine",
    "title": "주간 수학 실전 모의 루틴",
    "mentorId": "fixture-mentor-21",
    "summary": "평일 저녁에 수학 실전 모의와 오답을 이어서 하는 루틴이에요.",
    "description": "평일 저녁에 수학 실전 모의와 오답을 이어서 하는 루틴이에요.",
    "timelineTitle": "평일 저녁 Timeline",
    "applyDays": [
      "월",
      "화",
      "수",
      "목",
      "금"
    ],
    "timeline": [
      {
        "blockId": "fixture-content-routine-04-block-1",
        "slot": {
          "start": "19:30",
          "end": "21:10"
        },
        "title": "수학 실전 모의 1회",
        "description": "시험과 같은 시간으로 재고 풀어요."
      },
      {
        "blockId": "fixture-content-routine-04-block-2",
        "slot": {
          "start": "21:20",
          "end": "22:00"
        },
        "title": "오답 정리",
        "description": "틀린 이유를 한 줄로 적어요."
      }
    ],
    "habits": [
      {
        "habitId": "fixture-content-routine-04-habit-1",
        "title": "실전 모의 시간 재기",
        "frequency": "평일",
        "slot": {
          "start": "19:30",
          "end": "21:10"
        },
        "description": "문항별로 걸린 시간을 적어요."
      },
      {
        "habitId": "fixture-content-routine-04-habit-2",
        "title": "오답 이유 한 줄",
        "frequency": "평일",
        "slot": {
          "start": "21:20",
          "end": "21:40"
        },
        "description": "같은 실수를 줄이는 데 써요."
      }
    ]
  },
  {
    "contentId": "fixture-content-routine-05",
    "kind": "routine",
    "title": "학교 시험기간 하루 공부 루틴",
    "mentorId": "fixture-mentor-19",
    "summary": "시험기간 하루를 과목별 시간 블록으로 나눈 루틴이에요.",
    "description": "시험기간 하루를 과목별 시간 블록으로 나눈 루틴이에요.",
    "timelineTitle": "하루 Timeline",
    "applyDays": [
      "월",
      "화",
      "수",
      "목",
      "금"
    ],
    "timeline": [
      {
        "blockId": "fixture-content-routine-05-block-1",
        "slot": {
          "start": "16:30",
          "end": "18:00"
        },
        "title": "시험 과목 개념 정리",
        "description": "그날 배운 범위를 먼저 정리해요."
      },
      {
        "blockId": "fixture-content-routine-05-block-2",
        "slot": {
          "start": "18:30",
          "end": "20:00"
        },
        "title": "기출 풀이",
        "description": "학교 기출을 시간 재고 풀어요."
      },
      {
        "blockId": "fixture-content-routine-05-block-3",
        "slot": {
          "start": "20:30",
          "end": "21:30"
        },
        "title": "오답 · 암기 점검",
        "description": "틀린 문제와 암기 과목을 다시 봐요."
      }
    ],
    "habits": [
      {
        "habitId": "fixture-content-routine-05-habit-1",
        "title": "하교 후 개념 정리",
        "frequency": "평일",
        "slot": {
          "start": "16:30",
          "end": "18:00"
        },
        "description": "수업 내용이 기억날 때 정리해요."
      },
      {
        "habitId": "fixture-content-routine-05-habit-2",
        "title": "자기 전 암기 점검",
        "frequency": "평일",
        "slot": {
          "start": "21:00",
          "end": "21:30"
        },
        "description": "빈칸으로 만들어 확인해요."
      }
    ]
  },
  {
    "contentId": "fixture-content-routine-06",
    "kind": "routine",
    "title": "수행평가와 코딩 프로젝트 병행 루틴",
    "mentorId": "fixture-mentor-07",
    "summary": "평일 저녁을 수행평가와 코딩으로 나눈 주간 루틴이에요.",
    "description": "평일 저녁을 수행평가와 코딩으로 나눈 주간 루틴이에요.",
    "timelineTitle": "평일 저녁 Timeline",
    "applyDays": [
      "월",
      "화",
      "수",
      "목",
      "금"
    ],
    "timeline": [
      {
        "blockId": "fixture-content-routine-06-block-1",
        "slot": {
          "start": "19:00",
          "end": "20:00"
        },
        "title": "수행평가 자료 정리",
        "description": "마감이 가까운 과목부터 해요."
      },
      {
        "blockId": "fixture-content-routine-06-block-2",
        "slot": {
          "start": "20:30",
          "end": "22:00"
        },
        "title": "코딩 프로젝트",
        "description": "기능 하나씩 끝내요."
      }
    ],
    "habits": [
      {
        "habitId": "fixture-content-routine-06-habit-1",
        "title": "작업 메모 남기기",
        "frequency": "평일",
        "slot": {
          "start": "21:50",
          "end": "22:00"
        },
        "description": "다음 날 이어서 할 일을 적어요."
      }
    ]
  }
]

export const mentorStoriesFixture: readonly MentorStoryContent[] = [
  {
    "contentId": "fixture-content-story-01",
    "kind": "story",
    "title": "수학 3등급에서 내신 1등급까지",
    "mentorId": "fixture-mentor-06",
    "summary": "개념 노트 대신 풀이 과정을 말로 설명하며 공부법을 바꾼 이야기예요.",
    "topics": [
      "성공",
      "성적 변화",
      "공부법"
    ],
    "readMinutes": 4,
    "publishedDate": "2026-08-24",
    "body": [
      {
        "type": "paragraph",
        "text": "수학 개념 노트를 예쁘게 정리하는 데만 시간을 쓰고, 정작 시험에서는 3등급이었어요."
      },
      {
        "type": "heading",
        "text": "풀이를 말로 설명해 봤어요"
      },
      {
        "type": "paragraph",
        "text": "문제를 풀고 나서 친구에게 설명하듯 풀이 과정을 소리 내어 말했어요. 막히는 지점이 곧 제가 모르는 부분이었어요."
      },
      {
        "type": "quote",
        "text": "노트를 쓰는 시간보다 설명하다 막히는 순간이 더 많이 가르쳐 줬어요."
      }
    ]
  },
  {
    "contentId": "fixture-content-story-04",
    "kind": "story",
    "title": "국어 비문학 시간이 모자랐던 고3 여름",
    "mentorId": "fixture-mentor-14",
    "summary": "지문을 끝까지 읽기 전에 구조부터 잡는 연습으로 바꾼 과정이에요.",
    "topics": [
      "공부법",
      "회복"
    ],
    "readMinutes": 4,
    "publishedDate": "2026-08-31",
    "body": [
      {
        "type": "paragraph",
        "text": "고3 여름, 국어 비문학 지문 하나에 12분씩 걸렸어요. 끝까지 읽고 나서야 문제를 풀기 시작했기 때문이에요."
      },
      {
        "type": "heading",
        "text": "문단마다 한 줄씩 적었어요"
      },
      {
        "type": "paragraph",
        "text": "지문을 읽으면서 문단마다 한 줄 요약을 적고, 그 구조를 보고 문제로 넘어갔어요. 한 달 뒤에는 지문 하나에 8분 안쪽으로 줄었어요."
      }
    ]
  },
  {
    "contentId": "fixture-content-story-02",
    "kind": "story",
    "title": "탐구 주제를 진로 기록으로 이어간 과정",
    "mentorId": "fixture-mentor-01",
    "summary": "교내 탐구대회 주제를 세특과 진로 활동으로 연결한 이야기예요.",
    "topics": [
      "진로 고민",
      "성공"
    ],
    "readMinutes": 3,
    "publishedDate": "2026-07-27",
    "body": [
      {
        "type": "paragraph",
        "text": "교내 탐구대회 주제였던 항생제 내성을 대회가 끝난 뒤에도 이어서 봤어요."
      },
      {
        "type": "paragraph",
        "text": "수업 시간 질문, 독서, 진로 활동을 같은 주제로 묶었더니 세특과 진로 기록이 한 흐름으로 남았어요."
      }
    ]
  },
  {
    "contentId": "fixture-content-story-03",
    "kind": "story",
    "title": "1학년 1.8에서 1.3까지 오답노트 운영기",
    "mentorId": "fixture-mentor-01",
    "summary": "과목별 오답노트를 주간 단위로 다시 보는 방법을 정리했어요.",
    "topics": [
      "성적 변화",
      "공부법"
    ],
    "readMinutes": 3,
    "publishedDate": "2026-07-20",
    "body": [
      {
        "type": "paragraph",
        "text": "1학년 내신 평균이 1.8이었어요. 오답노트는 있었지만 다시 보지 않았어요."
      },
      {
        "type": "heading",
        "text": "주말마다 한 주 오답만 다시 봤어요"
      },
      {
        "type": "paragraph",
        "text": "토요일 오전에 그 주 오답만 다시 풀고, 두 번 틀린 문제에만 표시했어요. 3학년 1학기에 1.3이 됐어요."
      }
    ]
  },
  {
    "contentId": "fixture-content-story-05",
    "kind": "story",
    "title": "생명과학 4등급에서 1등급까지",
    "mentorId": "fixture-mentor-01",
    "summary": "오답 루틴과 시간 배분을 바꾸며 성적을 올린 과정이에요.",
    "topics": [
      "성적 변화",
      "공부법"
    ],
    "readMinutes": 4,
    "publishedDate": "2026-09-21",
    "body": [
      {
        "type": "paragraph",
        "text": "고1 1학기 생명과학 내신이 4등급이었어요. 개념은 안다고 생각했는데 시험에서는 시간이 늘 모자랐어요."
      },
      {
        "type": "heading",
        "text": "오답을 날짜가 아니라 이유로 모았어요"
      },
      {
        "type": "paragraph",
        "text": "틀린 문제를 \"개념\", \"자료 해석\", \"시간\" 세 칸으로 나눠 적었더니 대부분이 자료 해석에서 나온다는 걸 알게 됐어요."
      },
      {
        "type": "paragraph",
        "text": "그 뒤로는 시험 2주 전부터 자료 해석 문항만 하루 5개씩 시간을 재고 풀었고, 고2 2학기에 1등급이 나왔어요."
      }
    ]
  },
  {
    "contentId": "fixture-content-story-06",
    "kind": "story",
    "title": "모의고사 성적이 흔들렸을 때 관리 방법",
    "mentorId": "fixture-mentor-01",
    "summary": "점수가 흔들린 다음 날 무엇을 했는지 정리했어요.",
    "topics": [
      "회복",
      "멘탈 관리"
    ],
    "readMinutes": 5,
    "publishedDate": "2026-09-28",
    "body": [
      {
        "type": "paragraph",
        "text": "고2 6월 모의고사 성적표를 받은 날, 생명과학이 두 등급이나 떨어져 있었어요. 내신 준비에만 집중하느라 모의고사 유형을 거의 안 풀었던 게 그대로 드러났어요."
      },
      {
        "type": "photoMemo",
        "caption": "성적표 받은 날 책상 앞에 붙여둔 메모"
      },
      {
        "type": "paragraph",
        "text": "솔직히 그날은 아무것도 안 했어요. 다음 날 아침에 일어나서 제일 먼저 한 건 틀린 문제를 다시 펴보는 것도 아니고, 그냥 무엇 때문에 시간이 모자랐는지 적어보는 거였어요."
      },
      {
        "type": "heading",
        "text": "시험 다음 날엔 새 공부를 안 했어요"
      },
      {
        "type": "paragraph",
        "text": "그 뒤로 모의고사 다음 날은 무조건 틀린 문항만 봤어요. 단원별이 아니라 \"자료를 잘못 읽음\", \"시간 부족\", \"개념 헷갈림\" 이렇게 이유별로 나눴더니 제가 약한 게 개념이 아니라 자료 해석이라는 걸 알게 됐어요."
      },
      {
        "type": "photoMemo",
        "caption": "석 달 동안 쓴 오답 노트 일부"
      },
      {
        "type": "quote",
        "text": "점수가 흔들린 날보다 그다음 날 무엇을 하는지가 더 중요했어요."
      },
      {
        "type": "paragraph",
        "text": "평일에는 자료 해석 3문항만 고정으로 풀었고, 9월 모의고사에서 원래 등급으로 돌아왔어요. 그래서 교과 전형을 바꾸지 않고 끝까지 갈 수 있었어요."
      }
    ]
  },
  {
    "contentId": "fixture-content-story-07",
    "kind": "story",
    "title": "수시 준비를 중단하고 정시로 전환한 이유",
    "mentorId": "fixture-mentor-15",
    "summary": "전형을 바꾸기로 한 시점과 기준을 적었어요.",
    "topics": [
      "수시/정시 전환",
      "진로 고민"
    ],
    "readMinutes": 4,
    "publishedDate": "2026-09-14",
    "body": [
      {
        "type": "paragraph",
        "text": "고2 겨울방학에 내신과 모의고사 성적을 나란히 놓고 보니, 모의고사 쪽이 꾸준히 더 좋았어요."
      },
      {
        "type": "heading",
        "text": "바꾸기 전에 기준을 먼저 정했어요"
      },
      {
        "type": "paragraph",
        "text": "\"3월 모의고사에서 국어·탐구가 2등급 안에 들면 정시로 간다\"는 기준을 정하고, 그 전까지는 내신도 놓지 않았어요."
      },
      {
        "type": "quote",
        "text": "전형을 바꾼 게 아니라, 제 성적이 더 잘 나오는 쪽을 고른 거였어요."
      }
    ]
  },
  {
    "contentId": "fixture-content-story-08",
    "kind": "story",
    "title": "탐구 주제를 너무 넓게 잡았던 실패",
    "mentorId": "fixture-mentor-05",
    "summary": "주제를 좁히지 못해 다시 시작했던 경험과 바꾼 방법이에요.",
    "topics": [
      "실패",
      "회복"
    ],
    "readMinutes": 3,
    "publishedDate": "2026-09-07",
    "body": [
      {
        "type": "paragraph",
        "text": "첫 탐구 주제는 \"한국 경제의 불평등\"이었어요. 자료를 모을수록 무엇을 확인해야 하는지 더 흐려졌어요."
      },
      {
        "type": "heading",
        "text": "질문 하나로 줄였어요"
      },
      {
        "type": "paragraph",
        "text": "선생님 피드백을 받고 \"우리 동네 편의점 가격이 대형마트와 얼마나 다른가\"로 다시 시작했고, 직접 조사한 자료로 마무리할 수 있었어요."
      }
    ]
  },
  {
    "contentId": "fixture-content-story-09",
    "kind": "story",
    "title": "고2까지 진로를 확정하지 못했던 경험",
    "mentorId": "fixture-mentor-20",
    "summary": "진로가 정해지지 않았을 때 활동을 고른 기준을 적었어요.",
    "topics": [
      "진로 고민"
    ],
    "readMinutes": 3,
    "publishedDate": "2026-08-17",
    "body": [
      {
        "type": "paragraph",
        "text": "고2가 끝날 때까지 하고 싶은 전공이 정해지지 않았어요. 생기부 활동을 고를 때마다 불안했어요."
      },
      {
        "type": "heading",
        "text": "관심이 이어지는 활동만 골랐어요"
      },
      {
        "type": "paragraph",
        "text": "전공 이름 대신 \"사람이 왜 그렇게 행동하는지\"라는 질문이 이어지는 활동을 골랐고, 그 흐름이 나중에 심리학과 지원 이유가 됐어요."
      }
    ]
  },
  {
    "contentId": "fixture-content-story-10",
    "kind": "story",
    "title": "물리를 끝까지 가져간 이유",
    "mentorId": "fixture-mentor-22",
    "summary": "어려웠던 역학 단원을 버티면서 과학탐구 선택을 지킨 이야기예요.",
    "topics": [
      "멘탈 관리",
      "성공"
    ],
    "readMinutes": 3,
    "publishedDate": "2026-08-10",
    "body": [
      {
        "type": "paragraph",
        "text": "역학 단원에서 계속 막히자 물리학Ⅰ을 다른 과목으로 바꿀지 고민했어요."
      },
      {
        "type": "heading",
        "text": "바꾸기 전에 4주만 더 해 보기로 했어요"
      },
      {
        "type": "paragraph",
        "text": "틀린 역학 문제를 유형별로 다시 풀면서, 4주 뒤 모의고사 결과를 보고 결정하기로 했어요. 그 사이 점수가 오르면서 끝까지 가져갔어요."
      }
    ]
  }
]

export const mentorRecordsFixture: readonly MentorRecordContent[] = [
  {
    "contentId": "fixture-content-record-01",
    "kind": "record",
    "title": "환경 탐구를 생명과학 진로로 연결한 세특 기록",
    "mentorId": "fixture-mentor-02",
    "summary": "환경 탐구 활동이 생명과학 진로 기록으로 이어진 흐름을 볼 수 있어요.",
    "grade": 3,
    "areaLabel": "공식 프로젝트/탐구 연계",
    "subjectOrActivity": "환경 탐구 · 생명과학 연계",
    "recordText": "학교 주변 하천의 수질을 계절별로 측정하는 탐구를 이어가며, 수질 지표와 서식 생물의 변화를 함께 기록함. 측정 결과를 생명과학 수업에서 배운 생태계 개념과 연결해 해석하고, 측정 횟수가 적어 계절 차이를 단정하기 어렵다는 한계를 밝힘. 탐구를 바탕으로 환경 보건 분야 진로에 대한 관심을 구체화함.",
    "linkedActivity": {
      "title": "학교 주변 하천의 수질과 생물 관찰",
      "description": "두 지점 현장조사, pH·수온·식생·생물 관찰, 지도, 탐구보고서",
      "caseId": "fixture-content-case-02"
    },
    "relatedContent": [
      {
        "contentId": "fixture-content-case-02",
        "kind": "case",
        "title": "학교 주변 하천의 수질과 생물 관찰"
      }
    ],
    "mentorNote": "한 번의 측정이 아니라 계절별로 이어간 탐구가 진로 기록과 연결됐어요."
  },
  {
    "contentId": "fixture-content-record-02",
    "kind": "record",
    "title": "생명과학Ⅰ · 세부능력 및 특기사항",
    "mentorId": "fixture-mentor-01",
    "summary": "항생제 내성과 자연선택 탐구 포스터가 생명과학Ⅰ 세특으로 이어진 기록이에요.",
    "grade": 2,
    "areaLabel": "교과학습발달상황",
    "subjectOrActivity": "생명과학Ⅰ",
    "recordText": "항생제 내성균 증가 현상을 자연선택의 원리와 연결하여 탐구함. 국내 항생제 내성 관련 통계 자료를 찾아 자료의 변화 양상을 정리하고, 내성 변이를 가진 개체의 생존과 번식이 집단 내 형질 빈도 변화로 이어지는 과정을 도식화하여 발표함. 자료의 수치를 단순 제시하기보다 조사 범위와 해석의 한계를 함께 설명하려는 태도가 돋보임.",
    "linkedActivity": {
      "title": "항생제 내성과 자연선택 탐구 포스터",
      "description": "내성균 자료 조사, 자연선택 과정 정리, A3 포스터, 3분 발표, 후속 미생물 실험",
      "caseId": "fixture-content-case-01"
    },
    "relatedContent": [
      {
        "contentId": "fixture-content-case-01",
        "kind": "case",
        "title": "항생제 내성과 자연선택 탐구 포스터"
      },
      {
        "contentId": "fixture-content-story-06",
        "kind": "story",
        "title": "모의고사 성적이 흔들렸을 때 관리 방법"
      }
    ],
    "mentorNote": "포스터를 만들 때보다 자료의 한계를 설명하려고 다시 조사한 과정이 기록에 남았어요."
  },
  {
    "contentId": "fixture-content-record-03",
    "kind": "record",
    "title": "정보 · 세부능력 및 특기사항",
    "mentorId": "fixture-mentor-07",
    "summary": "급식 잔반 데이터 분석 프로젝트가 정보 세특으로 이어진 기록이에요.",
    "grade": 1,
    "areaLabel": "교과학습발달상황",
    "subjectOrActivity": "정보",
    "recordText": "학교생활에서 발견한 급식 잔반 문제를 데이터 분석 주제로 설정하고, 4주간의 메뉴별 잔반 데이터를 CSV 형태로 정리하여 Python으로 평균과 항목별 차이를 분석함. 분석 결과와 원인에 대한 추측을 구분하여 서술하고 추가 설문의 필요성을 제안하는 등 데이터 해석의 한계를 인식함.",
    "linkedActivity": {
      "title": "학교 급식 잔반 데이터 분석 프로젝트",
      "description": "4주 급식 데이터, CSV, Python 분석, Matplotlib, 보고서, 3분 시연",
      "caseId": "fixture-content-case-21"
    },
    "relatedContent": [
      {
        "contentId": "fixture-content-case-21",
        "kind": "case",
        "title": "학교 급식 잔반 데이터 분석 프로젝트"
      }
    ],
    "mentorNote": "분석 결과와 제 추측을 나눠 쓰려고 했던 부분이 기록에 그대로 남았어요."
  },
  {
    "contentId": "fixture-content-record-04",
    "kind": "record",
    "title": "심리탐구 동아리 · 동아리활동",
    "mentorId": "fixture-mentor-10",
    "summary": "AI 면접의 공정성 토론이 심리탐구 동아리 기록으로 이어진 과정이에요.",
    "grade": 2,
    "areaLabel": "동아리활동",
    "subjectOrActivity": "심리탐구 동아리",
    "recordText": "인간의 판단과 의사결정에 관심을 가지고 모둠 토론과 간단한 행동 관찰 활동에 지속적으로 참여함. AI 면접의 공정성을 주제로 알고리즘 편향과 인간 평가자의 편향을 비교하여 자료를 정리하고, 찬반 의견을 검토한 뒤 조건부 활용 방안을 제안함.",
    "linkedActivity": {
      "title": "AI 면접의 공정성에 관한 윤리 논증문",
      "description": "알고리즘 편향 조사, 찬반 논거 비교, 1,700자 논증문",
      "caseId": "fixture-content-case-15"
    },
    "relatedContent": [
      {
        "contentId": "fixture-content-case-15",
        "kind": "case",
        "title": "AI 면접의 공정성에 관한 윤리 논증문"
      },
      {
        "contentId": "fixture-content-story-09",
        "kind": "story",
        "title": "고2까지 진로를 확정하지 못했던 경험"
      }
    ],
    "mentorNote": "찬성과 반대를 모두 정리한 뒤 조건을 붙여 결론을 낸 과정이 기록됐어요."
  },
  {
    "contentId": "fixture-content-record-05",
    "kind": "record",
    "title": "독서토론 동아리 · 동아리활동",
    "mentorId": "fixture-mentor-09",
    "summary": "광고와 뉴스의 설득 방식 비교가 독서토론 동아리 기록으로 이어진 사례예요.",
    "grade": 2,
    "areaLabel": "동아리활동",
    "subjectOrActivity": "독서토론 동아리",
    "recordText": "다양한 매체의 설득 방식을 주제로 광고와 뉴스 자료를 비교하며 언어 표현이 독자의 판단에 미치는 영향을 분석함. 토론 과정에서 다른 의견의 근거를 정리해 재질문하고 자신의 주장과 구분하여 기록하는 등 비판적 읽기 태도를 보임.",
    "linkedActivity": {
      "title": "배달앱 광고의 언어적 설득 전략 분석",
      "description": "광고 영상 분석, 과장·반복·감정 호소 표현 분류, A4 분석지 2쪽, 4분 발표",
      "caseId": "fixture-content-case-04"
    },
    "relatedContent": [
      {
        "contentId": "fixture-content-case-04",
        "kind": "case",
        "title": "배달앱 광고의 언어적 설득 전략 분석"
      }
    ],
    "mentorNote": "다른 의견의 근거를 다시 물어본 습관이 동아리 기록의 중심이 됐어요."
  },
  {
    "contentId": "fixture-content-record-06",
    "kind": "record",
    "title": "국제통상 · 진로활동",
    "mentorId": "fixture-mentor-11",
    "summary": "관광지 영어 안내문 개선이 국제통상 진로활동 기록으로 이어진 흐름이에요.",
    "grade": 2,
    "areaLabel": "진로활동",
    "subjectOrActivity": "국제통상",
    "recordText": "지역 관광지의 영어 안내문을 조사하면서 직역된 표현과 실제 방문자에게 필요한 정보의 차이를 분석함. 안내 문구를 목적과 독자에 맞게 수정하고, 이후 학교 행사 영어 안내자료 제작으로 활동을 확장하여 언어 사용과 국제적 의사소통에 대한 관심을 구체화함.",
    "linkedActivity": {
      "title": "우리 지역 관광지 영어 안내문 개선",
      "description": "실제 안내판 조사, 한·영 문구 비교, 표현 수정, Before/After, 영어 발표",
      "caseId": "fixture-content-case-07"
    },
    "relatedContent": [
      {
        "contentId": "fixture-content-case-07",
        "kind": "case",
        "title": "우리 지역 관광지 영어 안내문 개선"
      }
    ],
    "mentorNote": "안내문을 고친 뒤 학교 행사 자료로 이어간 흐름이 진로활동에 남았어요."
  },
  {
    "contentId": "fixture-content-record-07",
    "kind": "record",
    "title": "교내 행사 디자인 · 자율활동",
    "mentorId": "fixture-mentor-23",
    "summary": "학교 축제 안내지도 디자인이 교내 행사 기록으로 이어진 과정이에요.",
    "grade": 2,
    "areaLabel": "자율활동",
    "subjectOrActivity": "교내 행사 디자인",
    "recordText": "학교 축제 안내지도 제작 과정에서 행사 위치와 이동 동선을 조사하고 정보 우선순위를 정하여 시각화함. 친구들을 대상으로 길 찾기 테스트를 진행한 뒤 아이콘과 안내 순서를 수정하는 등 사용자 관점에서 디자인을 개선함.",
    "linkedActivity": {
      "title": "학교 축제 안내지도 디자인",
      "description": "학교 지도 단순화, 행사 아이콘, 관람 동선, 사용자 테스트, A3 안내지도",
      "caseId": "fixture-content-case-24"
    },
    "relatedContent": [
      {
        "contentId": "fixture-content-case-24",
        "kind": "case",
        "title": "학교 축제 안내지도 디자인"
      }
    ],
    "mentorNote": "길 찾기 테스트로 아이콘과 순서를 다시 고친 과정이 기록됐어요."
  }
]
