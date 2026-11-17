import type { MockExamMaterial } from '../types.ts'

// 모의고사 지문 기반 심화 탐구 60선 (영어 30 + 국어 30) — 자동 생성 파일, 직접 고치지 않는다.
// 원본(읽기 전용): references/mock-exam/LearnersHigh_Mock_Exam_60_Research_Materials.md
// 원본 SHA-256: 391523c31db5a4f1286e0c92009419112fb69b640bfc0aece868f48365cfa0e5
// 생성: Scratchpad 변환 스크립트 gen_mock_exam60.py (목차 표·본문 제목·출처·ID·원문 중복·방법 3개·Q1~Q3 검증 통과)
// - 원문 지문(research.passage)은 재배포 권한이 확인되지 않아 이 파일에 넣지 않는다(빈 문자열).
//   로컬 개발 환경에서만 Git 제외 파일 mockExamPassages.local.json(materialId → 원문, 원본 글자 그대로)을 mockStore가 덧붙인다.
//   파일이 없으면 상세 화면은 "원문 미포함" 안내를 보여준다 (assessment-frontend-mock.md §5).
// - 추천 계열·주제·해설·방법·질문은 원본의 LearnersHigh 제안이며 출제기관 공식 해설이 아니다.
// - 원문 재배포 권한은 확인되지 않았다. 공개 배포 전 검토가 필요하다 (P-24, API-OD-A11).
// - idea.goal은 원본에 별도 목표가 없어 탐구 주제 문장을 쓴다. 평가원 모의평가는 원본에 학년 표기가 없어 grade=null.

export const mockExamResearchSourceHash = '391523c31db5a4f1286e0c92009419112fb69b640bfc0aece868f48365cfa0e5'

export const fixtureMockExamResearch: MockExamMaterial[] = [
  {
    "materialId": "EN-01",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2026,
      "examMonth": 10,
      "grade": 3,
      "questionNumber": "20번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "자신의 편견을 발견하고 검증하는 질문법",
      "coreMaterial": "선입견과 비판적 사고",
      "relatedFields": [
        "심리학",
        "교육학",
        "철학"
      ],
      "topicReason": "지문은 사람의 선입견이 관찰과 판단을 왜곡할 수 있으며 자신의 입장을 의도적으로 검증해야 한다고 강조한다. 이를 실제 판단 실험으로 발전시킬 수 있다.",
      "goal": "자신의 편견을 발견하고 검증하는 질문법",
      "methods": [
        {
          "label": "방법 1",
          "text": "같은 사진에 서로 다른 사전 설명을 붙인 익명 설문 두 종류 제작"
        },
        {
          "label": "방법 2",
          "text": "설문 결과를 비율로 비교하고 설명에 따른 판단 차이 시각화"
        },
        {
          "label": "방법 3",
          "text": "확증편향과 반증 질문에 관한 입문 문헌을 읽고 한계 정리"
        }
      ],
      "extensionQuestions": [
        "사전 정보가 전혀 없을 때에도 편향이 생기는가?",
        "설문 문항의 순서가 응답 결과를 바꾸는가?",
        "학교 토론에 적용할 수 있는 편향 점검 규칙은 무엇인가?"
      ]
    },
    "research": {
      "examLabel": "2026년-10월-고3-모의고사",
      "examTitle": "2026년 10월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "20번",
      "pdfPage": "PDF 2쪽",
      "originalFileName": "2026년-10월-고3-모의고사-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-02",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2026,
      "examMonth": 10,
      "grade": 3,
      "questionNumber": "22번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "디지털 아카이브는 미래의 역사 기록을 어떻게 바꾸는가?",
      "coreMaterial": "디지털 기술과 역사 자료의 보존",
      "relatedFields": [
        "문헌정보학",
        "컴퓨터공학",
        "역사학"
      ],
      "topicReason": "디지털 저장·복구 기술의 발전에도 문화 자료가 소실되거나 변형될 수 있다는 관점을 다룬다. 기록 매체의 지속성과 접근성을 비교하는 연구로 확장할 수 있다.",
      "goal": "디지털 아카이브는 미래의 역사 기록을 어떻게 바꾸는가?",
      "methods": [
        {
          "label": "방법 1",
          "text": "종이·하드디스크·클라우드 기록의 보존 조건 비교표 만들기"
        },
        {
          "label": "방법 2",
          "text": "학교의 오래된 사진이나 기록을 예시로 메타데이터 목록 설계"
        },
        {
          "label": "방법 3",
          "text": "디지털 아카이브 기관의 공개 보존 정책 조사"
        }
      ],
      "extensionQuestions": [
        "파일 형식이 사라지면 내용도 잃게 되는가?",
        "원본 보존과 누구나 접근할 수 있는 공개는 어떻게 다른가?",
        "AI로 훼손 자료를 복원할 때 어디까지 원본으로 볼 수 있는가?"
      ]
    },
    "research": {
      "examLabel": "2026년-10월-고3-모의고사",
      "examTitle": "2026년 10월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "22번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2026년-10월-고3-모의고사-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-03",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2026,
      "examMonth": 10,
      "grade": 3,
      "questionNumber": "23번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "가상공간 속 시선과 거리는 친밀감을 어떻게 표현하는가?",
      "coreMaterial": "온라인 아바타의 비언어적 의사소통",
      "relatedFields": [
        "심리학",
        "HCI",
        "미디어학"
      ],
      "topicReason": "지문은 아바타를 통한 온라인 상호작용에서도 거리와 시선 같은 비언어적 신호가 작동할 수 있음을 설명한다. 물리적 공간과 가상공간의 소통 규칙을 비교할 수 있다.",
      "goal": "가상공간 속 시선과 거리는 친밀감을 어떻게 표현하는가?",
      "methods": [
        {
          "label": "방법 1",
          "text": "VR·온라인 게임 화면에서 아바타의 거리·시선 변화 관찰"
        },
        {
          "label": "방법 2",
          "text": "공간 배치가 서로 다른 가상 회의 화면을 그림으로 재구성"
        },
        {
          "label": "방법 3",
          "text": "개인 공간과 친밀감에 대한 소통 이론을 읽고 비교"
        }
      ],
      "extensionQuestions": [
        "음성 없이 아바타 동작만으로 친밀감을 전달할 수 있는가?",
        "문화권마다 가상공간에서 선호하는 거리가 다른가?",
        "온라인 수업에서 비언어적 신호가 부족할 때 어떻게 보완할까?"
      ]
    },
    "research": {
      "examLabel": "2026년-10월-고3-모의고사",
      "examTitle": "2026년 10월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "23번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2026년-10월-고3-모의고사-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-04",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2026,
      "examMonth": 10,
      "grade": 3,
      "questionNumber": "24번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "윤리적 경영은 기업의 이익과 항상 충돌할까?",
      "coreMaterial": "기업 윤리와 이해관계자",
      "relatedFields": [
        "경영학",
        "경제학",
        "법학"
      ],
      "topicReason": "기업이 윤리적 결정을 내릴 때 이익과 상충하지 않는 경우도 있음을 다룬다. 윤리와 비용의 관계를 기업 사례에 적용해 비판적으로 분석할 수 있다.",
      "goal": "윤리적 경영은 기업의 이익과 항상 충돌할까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "기업의 환경·노동 정책 두 가지를 골라 비용·편익 요소 목록화"
        },
        {
          "label": "방법 2",
          "text": "기업 공개 보고서와 외부 평가자료를 비교해 주장의 근거 검토"
        },
        {
          "label": "방법 3",
          "text": "이해관계자별 기대와 잠재적 갈등을 표로 작성"
        }
      ],
      "extensionQuestions": [
        "단기 이익과 장기 신뢰가 충돌하면 어떻게 판단해야 할까?",
        "윤리적 선택이 이익과 연결되지 않아도 정당화될 수 있는가?",
        "기업이 공개한 윤리 성과의 신뢰도를 어떻게 검증할까?"
      ]
    },
    "research": {
      "examLabel": "2026년-10월-고3-모의고사",
      "examTitle": "2026년 10월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "24번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2026년-10월-고3-모의고사-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-05",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2026,
      "examMonth": 6,
      "grade": 2,
      "questionNumber": "20번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "뛰어난 개인들이 모여도 좋은 팀이 되지 못하는 이유는?",
      "coreMaterial": "조직과 부분·전체의 관계",
      "relatedFields": [
        "경영학",
        "사회학",
        "산업공학"
      ],
      "topicReason": "구성원 개개인의 우수성이 조직 전체의 우수성을 자동 보장하지 않는다는 문제의식이 담겨 있다. 개인 역량과 팀의 협업 구조를 분리해 살필 수 있다.",
      "goal": "뛰어난 개인들이 모여도 좋은 팀이 되지 못하는 이유는?",
      "methods": [
        {
          "label": "방법 1",
          "text": "팀 과제에서 역할 분담·소통·일정 관리 과정 기록"
        },
        {
          "label": "방법 2",
          "text": "개인 성과 지표와 팀 산출물 평가 지표의 차이 정리"
        },
        {
          "label": "방법 3",
          "text": "협업 방식이 다른 두 팀 사례를 비교해 개선안 제시"
        }
      ],
      "extensionQuestions": [
        "팀원이 모두 뛰어나도 갈등이 발생하는 이유는?",
        "협업 문제를 개인 역량의 문제와 어떻게 구별할까?",
        "팀 성공을 가장 잘 보여 주는 지표는 무엇인가?"
      ]
    },
    "research": {
      "examLabel": "2026년-6월-고2-모의고사",
      "examTitle": "2026년 6월 고2 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "20번",
      "pdfPage": "PDF 2쪽",
      "originalFileName": "2026년-6월-고2-모의고사-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-06",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2026,
      "examMonth": 6,
      "grade": 2,
      "questionNumber": "22번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "사람들은 왜 매우 낮은 확률을 실제보다 크게 느낄까?",
      "coreMaterial": "낮은 확률의 과대평가",
      "relatedFields": [
        "통계학",
        "심리학",
        "경제학"
      ],
      "topicReason": "객관적 확률과 사람들이 의사결정에 사용하는 주관적 확률의 차이를 다룬다. 같은 위험도 표현 방식에 따라 판단이 달라지는지 탐구하기 좋다.",
      "goal": "사람들은 왜 매우 낮은 확률을 실제보다 크게 느낄까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "동일 확률을 백분율·빈도·그림으로 제시한 설문 제작"
        },
        {
          "label": "방법 2",
          "text": "선택 결과를 표로 정리하고 표본 수와 한계 함께 표시"
        },
        {
          "label": "방법 3",
          "text": "확률 가중과 위험 소통 방식에 관한 자료 읽기"
        }
      ],
      "extensionQuestions": [
        "1%와 1명 중 100명이라는 표현은 같은 느낌을 주는가?",
        "사건의 심각성이 확률 인식에 영향을 미칠까?",
        "복권과 안전 위험에 같은 판단 규칙을 적용할 수 있을까?"
      ]
    },
    "research": {
      "examLabel": "2026년-6월-고2-모의고사",
      "examTitle": "2026년 6월 고2 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "22번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2026년-6월-고2-모의고사-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-07",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2026,
      "examMonth": 6,
      "grade": 2,
      "questionNumber": "23번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "물건을 생산하는 것만큼 유통 과정이 중요한 이유는?",
      "coreMaterial": "국제 무역의 거래 비용",
      "relatedFields": [
        "경제학",
        "물류학",
        "무역학"
      ],
      "topicReason": "지문은 무역에서 상품 생산 외에도 운송과 거래 과정에 비용이 발생한다는 점을 설명한다. 공급망과 소비자 가격 사이의 연결을 분석할 수 있다.",
      "goal": "물건을 생산하는 것만큼 유통 과정이 중요한 이유는?",
      "methods": [
        {
          "label": "방법 1",
          "text": "하나의 상품이 수입되어 판매되기까지 단계별 경로 그리기"
        },
        {
          "label": "방법 2",
          "text": "운송·통관·보관 등 비용 항목을 공개 자료로 조사"
        },
        {
          "label": "방법 3",
          "text": "국내 생산품과 수입품의 유통 경로를 구조적으로 비교"
        }
      ],
      "extensionQuestions": [
        "운송비 감소가 소비자 가격에 얼마나 반영될까?",
        "통관 절차의 간소화는 모든 기업에 같은 이익일까?",
        "공급망이 길어질수록 어떤 위험이 증가할까?"
      ]
    },
    "research": {
      "examLabel": "2026년-6월-고2-모의고사",
      "examTitle": "2026년 6월 고2 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "23번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2026년-6월-고2-모의고사-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-08",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2026,
      "examMonth": 6,
      "grade": 2,
      "questionNumber": "24번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "우리가 바라보는 별빛은 왜 과거의 모습일까?",
      "coreMaterial": "별빛과 우주 관측의 시간차",
      "relatedFields": [
        "천문학",
        "물리학",
        "우주과학"
      ],
      "topicReason": "별에서 출발한 빛이 지구에 도달하기까지 시간이 필요하기 때문에 천체 관측은 과거의 모습을 보는 행위임을 설명한다.",
      "goal": "우리가 바라보는 별빛은 왜 과거의 모습일까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "태양·주요 별·은하까지 거리를 조사해 광행시간 표 작성"
        },
        {
          "label": "방법 2",
          "text": "거리와 빛 도달시간의 관계를 수치와 그림으로 표현"
        },
        {
          "label": "방법 3",
          "text": "우주망원경 공개 설명 자료에서 실제 관측 사례 찾기"
        }
      ],
      "extensionQuestions": [
        "같은 하늘에서 보는 별은 모두 같은 시점의 모습일까?",
        "멀리 있는 은하일수록 왜 더 이른 우주를 관측할 수 있을까?",
        "빛 외의 관측 수단도 과거의 정보를 전달할까?"
      ]
    },
    "research": {
      "examLabel": "2026년-6월-고2-모의고사",
      "examTitle": "2026년 6월 고2 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "24번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2026년-6월-고2-모의고사-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-09",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2026,
      "examMonth": 7,
      "grade": 3,
      "questionNumber": "22번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "어떤 한계를 해결하면 새로운 한계가 등장하는 이유는?",
      "coreMaterial": "성장 과정의 제약 요인",
      "relatedFields": [
        "산업공학",
        "경영학",
        "생명과학"
      ],
      "topicReason": "성장하는 체계에는 여러 제약 조건이 있으며 하나를 해결하면 다른 제약이 부각될 수 있다고 설명한다. 성장과 한계를 고정된 원인 대신 동적 관계로 볼 수 있다.",
      "goal": "어떤 한계를 해결하면 새로운 한계가 등장하는 이유는?",
      "methods": [
        {
          "label": "방법 1",
          "text": "식물 생장과 기업 생산을 각각 사례로 선택해 제약 조건 목록화"
        },
        {
          "label": "방법 2",
          "text": "제약 하나를 개선했을 때 다음 제약이 등장하는 흐름도 작성"
        },
        {
          "label": "방법 3",
          "text": "제약 이론과 시스템 사고에 관한 자료 비교"
        }
      ],
      "extensionQuestions": [
        "제약을 없앤 뒤 성장률이 그대로 유지되지 않는 이유는?",
        "제약을 동시에 여러 개 해결하면 어떤 문제가 생길까?",
        "학교 행사 운영에도 이 개념을 적용할 수 있을까?"
      ]
    },
    "research": {
      "examLabel": "2026년-7월-고3-모의고사",
      "examTitle": "2026년 7월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "22번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2026년-7월-고3-모의고사-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-10",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2026,
      "examMonth": 7,
      "grade": 3,
      "questionNumber": "23번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "언어가 현실을 완벽하게 재현하기 어려운 이유는?",
      "coreMaterial": "언어와 현실의 표현",
      "relatedFields": [
        "언어학",
        "철학",
        "인공지능"
      ],
      "topicReason": "언어가 대상을 정확히 묘사하려 해도 언어의 범주와 인간의 이해 능력 사이에 긴장이 발생함을 다룬다. 분류·명명의 장단점을 탐구할 수 있다.",
      "goal": "언어가 현실을 완벽하게 재현하기 어려운 이유는?",
      "methods": [
        {
          "label": "방법 1",
          "text": "하나의 사물을 여러 사람이 묘사한 문장을 모아 비교"
        },
        {
          "label": "방법 2",
          "text": "상세한 묘사와 간결한 묘사에서 의미가 달라지는 부분 분석"
        },
        {
          "label": "방법 3",
          "text": "언어의 추상성과 분류에 관한 사례 문헌 정리"
        }
      ],
      "extensionQuestions": [
        "정확한 표현이 언제나 이해하기 쉬운 표현일까?",
        "AI 이미지 설명도 같은 언어의 한계를 겪을까?",
        "분류 체계가 바뀌면 우리가 보는 세계도 달라질까?"
      ]
    },
    "research": {
      "examLabel": "2026년-7월-고3-모의고사",
      "examTitle": "2026년 7월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "23번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2026년-7월-고3-모의고사-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-11",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2026,
      "examMonth": 7,
      "grade": 3,
      "questionNumber": "24번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "자연환경과 인공환경은 집중력에 어떤 차이를 만들까?",
      "coreMaterial": "도시환경과 인간의 주의력",
      "relatedFields": [
        "환경심리학",
        "도시공학",
        "건축학"
      ],
      "topicReason": "사람의 감각과 인지가 자연환경에 적응해 왔다는 관점에서 도시의 인공적 자극과 정신적 부담을 설명한다. 생활공간을 비교 대상으로 삼을 수 있다.",
      "goal": "자연환경과 인공환경은 집중력에 어떤 차이를 만들까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "녹지·복도·교실의 소음·시야·조명 차이를 관찰해 기록"
        },
        {
          "label": "방법 2",
          "text": "환경별 집중감에 대한 자발적 익명 자기보고 비교"
        },
        {
          "label": "방법 3",
          "text": "환경심리 연구에서 주의 회복 개념을 조사"
        }
      ],
      "extensionQuestions": [
        "자연의 어떤 요소가 주의 회복에 도움을 줄까?",
        "실내 식물을 배치하는 것만으로 효과가 생길까?",
        "개인차와 시간대 차이는 어떻게 통제할까?"
      ]
    },
    "research": {
      "examLabel": "2026년-7월-고3-모의고사",
      "examTitle": "2026년 7월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "24번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2026년-7월-고3-모의고사-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-12",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2026,
      "examMonth": 9,
      "grade": 2,
      "questionNumber": "22번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "스마트폰을 보며 식사하면 무엇을 놓치게 될까?",
      "coreMaterial": "디지털 기기와 식사 중 멀티태스킹",
      "relatedFields": [
        "심리학",
        "보건학",
        "미디어학"
      ],
      "topicReason": "지문은 정보에 계속 반응하는 디지털 사용 습관이 일상 경험을 방해할 수 있음을 제시한다. 식사라는 반복되는 행동을 대상으로 작은 관찰이 가능하다.",
      "goal": "스마트폰을 보며 식사하면 무엇을 놓치게 될까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "스마트폰 사용 유무에 따라 식사 중 주의가 머무는 대상 기록"
        },
        {
          "label": "방법 2",
          "text": "자발적인 하루 관찰 일지에서 알림 횟수와 체감 차이 비교"
        },
        {
          "label": "방법 3",
          "text": "멀티태스킹과 선택적 주의에 관한 연구 요약"
        }
      ],
      "extensionQuestions": [
        "스마트폰 없이 먹으면 음식 맛을 더 잘 기억할까?",
        "알림을 끄는 것과 기기를 치우는 것은 효과가 다를까?",
        "무조건 사용을 제한하는 대신 어떤 자기 조절 규칙을 만들까?"
      ]
    },
    "research": {
      "examLabel": "2026년-9월-고2-모의고사",
      "examTitle": "2026년 9월 고2 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "22번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2026년-9월-고2-모의고사-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-13",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2026,
      "examMonth": 9,
      "grade": 2,
      "questionNumber": "23번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "음악은 반복과 변화로 어떻게 감정을 유도하는가?",
      "coreMaterial": "음악에서 긴장과 해소",
      "relatedFields": [
        "음악학",
        "심리학",
        "음향공학"
      ],
      "topicReason": "음악이 긴장과 해소를 통해 청자의 기대를 변화시키는 과정을 설명한다. 음악 이론과 감정 반응을 연결할 수 있다.",
      "goal": "음악은 반복과 변화로 어떻게 감정을 유도하는가?",
      "methods": [
        {
          "label": "방법 1",
          "text": "저작권 문제가 없는 짧은 악곡에서 반복·변화 구간 표시"
        },
        {
          "label": "방법 2",
          "text": "리듬이나 화성 변화가 있는 구간의 청취 느낌 기록"
        },
        {
          "label": "방법 3",
          "text": "음악 심리학의 기대와 정서 연구 읽기"
        }
      ],
      "extensionQuestions": [
        "긴장이 없는 음악도 감동을 줄 수 있을까?",
        "반복과 예상 밖 변화 중 무엇이 주의를 끌까?",
        "음악적 학습 경험에 따라 긴장감을 다르게 느낄까?"
      ]
    },
    "research": {
      "examLabel": "2026년-9월-고2-모의고사",
      "examTitle": "2026년 9월 고2 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "23번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2026년-9월-고2-모의고사-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-14",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2026,
      "examMonth": 9,
      "grade": 2,
      "questionNumber": "24번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "디지털 시대에 집중력을 배우는 교육은 어떻게 설계할까?",
      "coreMaterial": "주의력 리터러시",
      "relatedFields": [
        "교육학",
        "심리학",
        "미디어학"
      ],
      "topicReason": "학생이 온라인 피드와 뉴스 사이트의 설계가 자신의 주의를 어떻게 유도하는지 파악해야 한다는 주장을 다룬다. 미디어 사용 교육안을 설계할 수 있다.",
      "goal": "디지털 시대에 집중력을 배우는 교육은 어떻게 설계할까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "피드 화면의 알림·배치·자동재생 요소를 체크리스트로 분류"
        },
        {
          "label": "방법 2",
          "text": "학교에서 사용할 주의력 리터러시 안내자료 시안 제작"
        },
        {
          "label": "방법 3",
          "text": "간단한 사용성 질문지로 안내자료의 이해도 조사"
        }
      ],
      "extensionQuestions": [
        "추천 피드의 구조가 이용자의 선택을 얼마나 유도할까?",
        "앱 개발자에게 어떤 주의력 보호 책임이 있을까?",
        "주의력을 지키는 교육과 개인의 선택 자유는 양립할까?"
      ]
    },
    "research": {
      "examLabel": "2026년-9월-고2-모의고사",
      "examTitle": "2026년 9월 고2 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "24번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2026년-9월-고2-모의고사-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-15",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2026,
      "examMonth": 3,
      "grade": 2,
      "questionNumber": "20번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "새로운 일에 몰입할수록 주변 관계가 중요한 이유는?",
      "coreMaterial": "새로운 환경에서 사회적 연결",
      "relatedFields": [
        "사회심리학",
        "교육학",
        "조직행동"
      ],
      "topicReason": "새로운 분야에 적응하기 위해 기존의 인간관계를 단절하는 것이 도움이 되지 않을 수 있음을 보여 준다. 사회적 자원과 적응의 관계를 탐색할 수 있다.",
      "goal": "새로운 일에 몰입할수록 주변 관계가 중요한 이유는?",
      "methods": [
        {
          "label": "방법 1",
          "text": "신입생 적응 프로그램의 멘토링·협업 장치 조사"
        },
        {
          "label": "방법 2",
          "text": "학교 동아리의 초기 정착 경험을 익명 인터뷰로 수집"
        },
        {
          "label": "방법 3",
          "text": "사회적 지지와 학습 적응의 관련 자료 비교"
        }
      ],
      "extensionQuestions": [
        "새로운 환경에 적응할 때 어떤 관계가 가장 도움이 될까?",
        "독립적인 학습과 협업을 어떻게 조화시킬까?",
        "온라인 커뮤니티도 같은 지원 역할을 할까?"
      ]
    },
    "research": {
      "examLabel": "2026년-고2-3월-모의고사",
      "examTitle": "2026년 3월 고2 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "20번",
      "pdfPage": "PDF 2쪽",
      "originalFileName": "2026년-고2-3월-모의고사-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-16",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2026,
      "examMonth": 3,
      "grade": 2,
      "questionNumber": "22번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "통근객과 장거리 여행객의 이동 동선을 분리해야 하는 이유는?",
      "coreMaterial": "기차역 이용자 동선 설계",
      "relatedFields": [
        "도시공학",
        "교통공학",
        "건축학"
      ],
      "topicReason": "통근객과 장거리 여행객은 목적·이동 속도·수하물 등이 다르며 혼잡을 줄이기 위해 동선을 분리할 필요가 있음을 설명한다.",
      "goal": "통근객과 장거리 여행객의 이동 동선을 분리해야 하는 이유는?",
      "methods": [
        {
          "label": "방법 1",
          "text": "가까운 기차역·버스터미널의 환승 동선과 안내표지 관찰"
        },
        {
          "label": "방법 2",
          "text": "혼잡 구간을 지도에 표시하고 사용자 유형별 경로 작성"
        },
        {
          "label": "방법 3",
          "text": "국내외 역의 층별·출입구별 동선 분리 사례 비교"
        }
      ],
      "extensionQuestions": [
        "역의 동선 분리를 위한 별도 플랫폼이 항상 효과적일까?",
        "휠체어·유아차 이용자의 경로도 함께 고려한다면?",
        "실시간 안내와 스마트 표지가 혼잡을 줄일 수 있을까?"
      ]
    },
    "research": {
      "examLabel": "2026년-고2-3월-모의고사",
      "examTitle": "2026년 3월 고2 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "22번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2026년-고2-3월-모의고사-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-17",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2026,
      "examMonth": 3,
      "grade": 2,
      "questionNumber": "23번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "공연 조명은 장면과 이야기를 어떻게 전달할까?",
      "coreMaterial": "공연 조명과 관객의 인식",
      "relatedFields": [
        "무대예술",
        "영상학",
        "디자인"
      ],
      "topicReason": "무대의 조명 변화가 이야기의 전환과 인물의 행동에 따라 설계될 수 있음을 설명한다. 공연·영상의 시각 언어를 분석할 수 있다.",
      "goal": "공연 조명은 장면과 이야기를 어떻게 전달할까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "같은 장면을 서로 다른 색·각도·밝기로 조명한 사례 비교"
        },
        {
          "label": "방법 2",
          "text": "학교 발표무대의 간단한 조명 큐 시나리오 설계"
        },
        {
          "label": "방법 3",
          "text": "연극 조명과 영화 조명의 연출 목적 비교 조사"
        }
      ],
      "extensionQuestions": [
        "조명만으로 장소와 시간의 변화를 표현할 수 있을까?",
        "관객의 주의를 특정 인물에게 유도하는 방법은?",
        "색 선택이 문화권에 따라 다른 의미를 줄까?"
      ]
    },
    "research": {
      "examLabel": "2026년-고2-3월-모의고사",
      "examTitle": "2026년 3월 고2 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "23번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2026년-고2-3월-모의고사-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-18",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2026,
      "examMonth": 3,
      "grade": 2,
      "questionNumber": "24번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "같은 음악이 공간에 따라 다르게 들리는 이유는?",
      "coreMaterial": "공간의 음향 특성",
      "relatedFields": [
        "물리학",
        "음향공학",
        "건축학"
      ],
      "topicReason": "공간의 구조가 소리의 반사·잔향에 영향을 주기 때문에 같은 음원이 다른 방식으로 들릴 수 있음을 설명한다.",
      "goal": "같은 음악이 공간에 따라 다르게 들리는 이유는?",
      "methods": [
        {
          "label": "방법 1",
          "text": "교실·복도·큰 강당에서 같은 짧은 소리의 잔향 차이 관찰"
        },
        {
          "label": "방법 2",
          "text": "동일한 장치·거리로 녹음해 소리 지속 시간 비교"
        },
        {
          "label": "방법 3",
          "text": "흡음재·반사재·실내 음향 설계 자료 조사"
        }
      ],
      "extensionQuestions": [
        "벽 재료가 변하면 잔향 시간도 바뀔까?",
        "교실의 말소리 명료도를 높이려면 무엇을 바꿔야 할까?",
        "헤드폰 청취와 스피커 청취의 차이는 무엇인가?"
      ]
    },
    "research": {
      "examLabel": "2026년-고2-3월-모의고사",
      "examTitle": "2026년 3월 고2 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "24번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2026년-고2-3월-모의고사-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-19",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2026,
      "examMonth": 3,
      "grade": 3,
      "questionNumber": "20번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "과학적 지식은 문화와 완전히 분리될 수 있을까?",
      "coreMaterial": "과학과 문화의 관계",
      "relatedFields": [
        "과학철학",
        "사회학",
        "과학사"
      ],
      "topicReason": "과학이 인간의 문화적 활동이면서도 신뢰할 수 있는 지식을 추구할 수 있는지 질문한다. 과학철학의 논증 구조를 분석할 수 있다.",
      "goal": "과학적 지식은 문화와 완전히 분리될 수 있을까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "동일 과학 사례에 대한 시대별 해석 비교"
        },
        {
          "label": "방법 2",
          "text": "과학적 주장에 필요한 관찰·재현·반증 근거 체크리스트 작성"
        },
        {
          "label": "방법 3",
          "text": "과학과 예술·종교의 지식 생산 방식 비교 문헌 조사"
        }
      ],
      "extensionQuestions": [
        "과학자의 문화적 배경은 연구 질문에 영향을 줄까?",
        "객관성은 연구자의 가치관 부재를 뜻할까?",
        "연구 결과가 수정되는 것은 과학의 약점일까?"
      ]
    },
    "research": {
      "examLabel": "2026년-고3-3월-모의고사",
      "examTitle": "2026년 3월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "20번",
      "pdfPage": "PDF 2쪽",
      "originalFileName": "2026년-고3-3월-모의고사-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-20",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2026,
      "examMonth": 3,
      "grade": 3,
      "questionNumber": "22번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "좋은 질문이 문제 해결의 방향을 결정하는 이유는?",
      "coreMaterial": "문제 해결과 질문 설계",
      "relatedFields": [
        "교육학",
        "디자인학",
        "철학"
      ],
      "topicReason": "질문 문장과 실제로 해결해야 하는 문제의 차이를 드러낸다. 문제 정의를 구체화하면 해결 방법의 범위도 달라진다.",
      "goal": "좋은 질문이 문제 해결의 방향을 결정하는 이유는?",
      "methods": [
        {
          "label": "방법 1",
          "text": "일상의 추상적인 불편을 질문·문제·요구사항으로 다시 쓰기"
        },
        {
          "label": "방법 2",
          "text": "문제 정의에 따라 가능한 해결 방안이 달라지는 사례 비교"
        },
        {
          "label": "방법 3",
          "text": "디자인 씽킹의 문제 정의 단계 자료 조사"
        }
      ],
      "extensionQuestions": [
        "같은 상황에 여러 개의 좋은 질문이 존재할 수 있을까?",
        "질문을 잘못 정의하면 해결책이 왜 빗나갈까?",
        "AI에게 질문을 명확히 주는 것과 같은 원리일까?"
      ]
    },
    "research": {
      "examLabel": "2026년-고3-3월-모의고사",
      "examTitle": "2026년 3월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "22번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2026년-고3-3월-모의고사-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-21",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2026,
      "examMonth": 3,
      "grade": 3,
      "questionNumber": "23번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "인공지능 시대에 중요해지는 인간의 역량은 무엇인가?",
      "coreMaterial": "인공지능과 미래 직업 변화",
      "relatedFields": [
        "컴퓨터공학",
        "경영학",
        "교육학"
      ],
      "topicReason": "인공지능의 자동화가 일자리와 업무 구조에 동시에 영향을 준다는 관점을 제시한다. 직업의 소멸보다 구체적인 과업 변화에 집중할 수 있다.",
      "goal": "인공지능 시대에 중요해지는 인간의 역량은 무엇인가?",
      "methods": [
        {
          "label": "방법 1",
          "text": "관심 직업 3개의 업무를 반복·판단·대인 활동으로 분류"
        },
        {
          "label": "방법 2",
          "text": "AI 도구가 보조할 수 있는 업무와 책임이 남는 업무 비교"
        },
        {
          "label": "방법 3",
          "text": "산업별 직무 변화에 대한 공식 연구와 사례 조사"
        }
      ],
      "extensionQuestions": [
        "업무가 자동화되어도 직업 자체는 유지될 수 있을까?",
        "AI 활용 능력과 비판적 판단 능력은 어떤 관계일까?",
        "조직이 직원의 재교육을 지원해야 할 이유는?"
      ]
    },
    "research": {
      "examLabel": "2026년-고3-3월-모의고사",
      "examTitle": "2026년 3월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "23번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2026년-고3-3월-모의고사-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-22",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2026,
      "examMonth": 3,
      "grade": 3,
      "questionNumber": "24번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "번역은 익숙한 사물을 새롭게 보게 할 수 있을까?",
      "coreMaterial": "번역과 낯설게 보기",
      "relatedFields": [
        "언어학",
        "번역학",
        "문학"
      ],
      "topicReason": "번역은 원문의 의미를 전달하면서 익숙한 표현을 낯설게 드러낼 수 있다는 관점을 다룬다. 언어 선택이 독자의 인식에 미치는 영향을 분석할 수 있다.",
      "goal": "번역은 익숙한 사물을 새롭게 보게 할 수 있을까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "같은 짧은 문장의 번역본 두 개를 비교하고 표현 차이 표시"
        },
        {
          "label": "방법 2",
          "text": "직역·의역이 전달하는 문화적 느낌을 표로 비교"
        },
        {
          "label": "방법 3",
          "text": "문학 번역의 낯설게 하기와 번역 윤리 자료 조사"
        }
      ],
      "extensionQuestions": [
        "번역은 원문의 의미를 얼마나 변형해도 되는가?",
        "낯선 표현이 항상 더 좋은 번역일까?",
        "기계 번역은 문화적 뉘앙스를 얼마나 반영하는가?"
      ]
    },
    "research": {
      "examLabel": "2026년-고3-3월-모의고사",
      "examTitle": "2026년 3월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "24번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2026년-고3-3월-모의고사-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-23",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2027,
      "examMonth": 6,
      "grade": null,
      "questionNumber": "20번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "운동 수행에서 몸의 기술만큼 마음가짐이 중요한 이유는?",
      "coreMaterial": "운동 교육과 마음가짐",
      "relatedFields": [
        "체육교육",
        "심리학",
        "스포츠과학"
      ],
      "topicReason": "신체 활동 지도에서 참가자의 심리와 경험을 중요하게 보아야 한다는 문제를 제시한다. 운동 학습의 과정을 다양한 요소로 나누어 분석할 수 있다.",
      "goal": "운동 수행에서 몸의 기술만큼 마음가짐이 중요한 이유는?",
      "methods": [
        {
          "label": "방법 1",
          "text": "학교 체육 활동을 관찰하며 설명·피드백·참여 방식 기록"
        },
        {
          "label": "방법 2",
          "text": "참가자 중심 지도와 기술 중심 지도의 특징 비교표 제작"
        },
        {
          "label": "방법 3",
          "text": "스포츠 심리학에서 동기와 자기 효능감 자료 조사"
        }
      ],
      "extensionQuestions": [
        "같은 운동도 개인의 자신감에 따라 성과가 달라질까?",
        "실수를 허용하는 피드백이 학습을 바꿀까?",
        "몸과 마음을 분리해서 훈련하는 방식에는 어떤 한계가 있을까?"
      ]
    },
    "research": {
      "examLabel": "2027학년도-6월-모의평가",
      "examTitle": "2027학년도 6월 모의평가",
      "examKind": "CSAT_MOCK",
      "questionLabel": "20번",
      "pdfPage": "PDF 2쪽",
      "originalFileName": "2027학년도-6월-모의평가-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-24",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2027,
      "examMonth": 6,
      "grade": null,
      "questionNumber": "21번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "동물의 복잡한 행동으로 의식의 존재를 판단할 수 있을까?",
      "coreMaterial": "동물 인지와 의식",
      "relatedFields": [
        "생명과학",
        "인지과학",
        "철학"
      ],
      "topicReason": "동물의 행동 능력을 관찰하며 의식이 인간만의 특성인지 질문한 과학사적 논의를 다룬다. 증거로부터 의식을 추론하는 방법의 한계를 분석할 수 있다.",
      "goal": "동물의 복잡한 행동으로 의식의 존재를 판단할 수 있을까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "동물의 문제 해결 실험과 행동 사례 조사"
        },
        {
          "label": "방법 2",
          "text": "행동 증거·신경계 증거·철학적 논증의 차이 정리"
        },
        {
          "label": "방법 3",
          "text": "동물 의식에 관한 연구사의 주요 관점 비교"
        }
      ],
      "extensionQuestions": [
        "복잡한 행동만으로 의식을 증명할 수 있을까?",
        "동물과 인간의 신경계 차이를 어떻게 해석해야 할까?",
        "AI의 행동에도 같은 기준을 적용할 수 있을까?"
      ]
    },
    "research": {
      "examLabel": "2027학년도-6월-모의평가",
      "examTitle": "2027학년도 6월 모의평가",
      "examKind": "CSAT_MOCK",
      "questionLabel": "21번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2027학년도-6월-모의평가-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-25",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2027,
      "examMonth": 6,
      "grade": null,
      "questionNumber": "22번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "사람들은 자동차 앞모습에서 왜 표정을 읽어낼까?",
      "coreMaterial": "자동차 디자인의 의인화",
      "relatedFields": [
        "산업디자인",
        "심리학",
        "마케팅"
      ],
      "topicReason": "사람들이 자동차의 앞부분을 얼굴과 유사하게 인식한다는 내용을 바탕으로 디자인과 감정의 관계를 탐구할 수 있다.",
      "goal": "사람들은 자동차 앞모습에서 왜 표정을 읽어낼까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "자동차 전면 디자인 사진에서 눈·입처럼 보이는 부분 분류"
        },
        {
          "label": "방법 2",
          "text": "차량 이미지에 대한 느낌을 익명 평가하고 디자인 요소 비교"
        },
        {
          "label": "방법 3",
          "text": "의인화와 시각적 패턴 인식에 대한 자료 조사"
        }
      ],
      "extensionQuestions": [
        "헤드램프의 크기와 위치가 인상에 영향을 줄까?",
        "사람이 아닌 물체에도 표정을 읽는 이유는?",
        "제품 디자인에서 감정 유도는 어디까지 허용될까?"
      ]
    },
    "research": {
      "examLabel": "2027학년도-6월-모의평가",
      "examTitle": "2027학년도 6월 모의평가",
      "examKind": "CSAT_MOCK",
      "questionLabel": "22번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2027학년도-6월-모의평가-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-26",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2027,
      "examMonth": 6,
      "grade": null,
      "questionNumber": "23번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "동물의 크기는 행동과 반응 속도에 어떤 영향을 줄까?",
      "coreMaterial": "동물 크기와 행동 반응",
      "relatedFields": [
        "생명과학",
        "생태학",
        "물리학"
      ],
      "topicReason": "몸집이 작은 동물과 큰 동물의 반응 시간·대사·행동 전략 차이에 대한 지문이다. 생물학과 물리적 스케일의 관계를 다룰 수 있다.",
      "goal": "동물의 크기는 행동과 반응 속도에 어떤 영향을 줄까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "서로 다른 몸집의 동물 4~5종의 이동·반응 사례 조사"
        },
        {
          "label": "방법 2",
          "text": "크기·수명·대사 관련 공개 자료를 표로 비교"
        },
        {
          "label": "방법 3",
          "text": "몸집과 시간 감각에 관한 생리학 문헌 검토"
        }
      ],
      "extensionQuestions": [
        "작은 동물은 왜 빠른 반응이 중요한가?",
        "반응 속도에는 몸집 외에 어떤 요인이 작용할까?",
        "생물의 크기 차이를 로봇 설계에 응용할 수 있을까?"
      ]
    },
    "research": {
      "examLabel": "2027학년도-6월-모의평가",
      "examTitle": "2027학년도 6월 모의평가",
      "examKind": "CSAT_MOCK",
      "questionLabel": "23번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2027학년도-6월-모의평가-영어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-27",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2027,
      "examMonth": 9,
      "grade": null,
      "questionNumber": "20번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "기술 발전이 빨라질수록 평생학습은 왜 중요해질까?",
      "coreMaterial": "평생학습과 기술 변화",
      "relatedFields": [
        "교육학",
        "컴퓨터공학",
        "사회학"
      ],
      "topicReason": "기술 변화에 따라 한 번 배운 지식만으로는 대응하기 어려워진다는 점을 다룬다. 변화하는 학습 역량과 교육 체계의 관계로 확장할 수 있다.",
      "goal": "기술 발전이 빨라질수록 평생학습은 왜 중요해질까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "관심 직무에 필요한 기술의 변화를 직무 공고에서 조사"
        },
        {
          "label": "방법 2",
          "text": "정규교육·온라인 교육·직장 재교육 프로그램 비교"
        },
        {
          "label": "방법 3",
          "text": "개인의 1년 학습 로드맵과 학습 평가 지표 설계"
        }
      ],
      "extensionQuestions": [
        "기술이 바뀌어도 오래 유지되는 핵심 역량은 무엇인가?",
        "누구나 평생학습에 접근할 수 있도록 하려면?",
        "기업·학교·개인의 학습 책임을 어떻게 나눌까?"
      ]
    },
    "research": {
      "examLabel": "2027학년도-9월-모의평가",
      "examTitle": "2027학년도 9월 모의평가",
      "examKind": "CSAT_MOCK",
      "questionLabel": "20번",
      "pdfPage": "PDF 2쪽",
      "originalFileName": "2027학년도-9월-모의평가-영어-문제 (1).pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-28",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2027,
      "examMonth": 9,
      "grade": null,
      "questionNumber": "21번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "검색 결과와 자동완성은 사회의 관심사를 그대로 보여줄까?",
      "coreMaterial": "검색 자동완성과 개인화",
      "relatedFields": [
        "컴퓨터공학",
        "정보사회학",
        "미디어학"
      ],
      "topicReason": "검색 엔진의 추천과 자동완성이 사용자 행동을 반영하면서 개인화될 수 있다는 내용이다. 검색 결과를 사회적 관심의 완전한 거울로 볼 수 있는지 비판적으로 검토할 수 있다.",
      "goal": "검색 결과와 자동완성은 사회의 관심사를 그대로 보여줄까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "동일 검색어를 다른 검색환경에서 입력해 제안어 기록"
        },
        {
          "label": "방법 2",
          "text": "검색 서비스가 공개한 개인화·추천 정책 확인"
        },
        {
          "label": "방법 3",
          "text": "표본·지역·시간 차이에 따른 제안어 비교와 한계 설명"
        }
      ],
      "extensionQuestions": [
        "검색 자동완성은 모든 이용자를 공정하게 대표할까?",
        "개인화는 편리함과 정보 편향을 동시에 만들까?",
        "검색 서비스는 유해한 추천을 어떻게 관리해야 할까?"
      ]
    },
    "research": {
      "examLabel": "2027학년도-9월-모의평가",
      "examTitle": "2027학년도 9월 모의평가",
      "examKind": "CSAT_MOCK",
      "questionLabel": "21번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2027학년도-9월-모의평가-영어-문제 (1).pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-29",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2027,
      "examMonth": 9,
      "grade": null,
      "questionNumber": "23번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "도파민은 즐거움보다 목표를 향한 노력과 어떤 관련이 있을까?",
      "coreMaterial": "도파민과 동기 부여",
      "relatedFields": [
        "생명과학",
        "뇌과학",
        "심리학"
      ],
      "topicReason": "도파민을 단순한 즐거움 물질이 아니라 기대·노력·목표 지향 행동과 연관된 과정으로 설명한다. 학습 동기를 설계하는 관점으로 확장할 수 있다.",
      "goal": "도파민은 즐거움보다 목표를 향한 노력과 어떤 관련이 있을까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "학습 목표를 작은 단계로 나눈 일정표와 진행 피드백 설계"
        },
        {
          "label": "방법 2",
          "text": "보상 기대와 즉각적 즐거움의 차이를 개념도 작성"
        },
        {
          "label": "방법 3",
          "text": "도파민·보상 예측·습관에 관한 신경과학 입문 자료 조사"
        }
      ],
      "extensionQuestions": [
        "보상이 예상될 때와 예상치 못할 때 반응은 다를까?",
        "작은 목표를 세우는 방식이 학습 지속성에 도움이 될까?",
        "도파민의 역할을 모든 동기 현상에 적용할 수 있을까?"
      ]
    },
    "research": {
      "examLabel": "2027학년도-9월-모의평가",
      "examTitle": "2027학년도 9월 모의평가",
      "examKind": "CSAT_MOCK",
      "questionLabel": "23번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2027학년도-9월-모의평가-영어-문제 (1).pdf",
      "passage": ""
    }
  },
  {
    "materialId": "EN-30",
    "subjectId": "mock_eng",
    "source": {
      "academicYear": 2027,
      "examMonth": 9,
      "grade": null,
      "questionNumber": "24번",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "고령화 사회에서 노년기에 대한 생각은 어떻게 달라지고 있을까?",
      "coreMaterial": "고령화와 사회 인식 변화",
      "relatedFields": [
        "사회학",
        "보건학",
        "인구학"
      ],
      "topicReason": "노년과 나이에 관한 사회적 기대가 변화할 수 있다는 지문이다. 개인의 실제 능력과 사회가 부여하는 연령 규범을 구별할 수 있다.",
      "goal": "고령화 사회에서 노년기에 대한 생각은 어떻게 달라지고 있을까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "광고·뉴스에서 노년층을 묘사하는 표현 수집"
        },
        {
          "label": "방법 2",
          "text": "시기별 고령자 고용·평생학습 관련 정책 변화 조사"
        },
        {
          "label": "방법 3",
          "text": "연령대에 대한 고정관념을 묻는 익명 설문 구성"
        }
      ],
      "extensionQuestions": [
        "나이에 따른 사회적 기대는 어떤 근거로 만들어질까?",
        "고령화 사회에서 고용·교육 제도는 어떻게 바뀌어야 할까?",
        "연령주의를 줄이면서 필요한 보호정책은 유지할 수 있을까?"
      ]
    },
    "research": {
      "examLabel": "2027학년도-9월-모의평가",
      "examTitle": "2027학년도 9월 모의평가",
      "examKind": "CSAT_MOCK",
      "questionLabel": "24번",
      "pdfPage": "PDF 3쪽",
      "originalFileName": "2027학년도-9월-모의평가-영어-문제 (1).pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-01",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2026,
      "examMonth": 10,
      "grade": 3,
      "questionNumber": "1~3번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "글을 읽을 때 이해했다는 착각을 어떻게 줄일 수 있을까?",
      "coreMaterial": "유창성 착각과 능동적 독서",
      "relatedFields": [
        "교육학",
        "인지과학",
        "심리학"
      ],
      "topicReason": "유창하게 읽는 경험이 진정한 이해를 보장하지 않는다는 점과 인출·교차 읽기 전략을 설명한다. 학습법을 직접 비교하기 좋은 글이다.",
      "goal": "글을 읽을 때 이해했다는 착각을 어떻게 줄일 수 있을까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "같은 길이의 설명글을 읽은 뒤 복습 방식 두 가지 비교"
        },
        {
          "label": "방법 2",
          "text": "바로 이해했다고 느낀 정도와 나중에 기억한 내용 기록"
        },
        {
          "label": "방법 3",
          "text": "인출 연습과 교차 읽기의 조건 및 한계 조사"
        }
      ],
      "extensionQuestions": [
        "읽기 직후의 자신감과 실제 기억량은 일치할까?",
        "내용을 백지에 적는 방법과 다시 읽기는 어떻게 다를까?",
        "복잡한 지문일수록 어떤 전략이 도움이 될까?"
      ]
    },
    "research": {
      "examLabel": "2026년-10월-고3-모의고사",
      "examTitle": "2026년 10월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "1~3번 지문",
      "pdfPage": "PDF 1쪽",
      "originalFileName": "2026년-10월-고3-모의고사-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-02",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2026,
      "examMonth": 10,
      "grade": 3,
      "questionNumber": "4~9번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "철학적 개념으로 음악의 즉흥성과 창조성을 설명할 수 있을까?",
      "coreMaterial": "탈영토화와 재즈 즉흥 연주",
      "relatedFields": [
        "철학",
        "음악학",
        "문화연구"
      ],
      "topicReason": "들뢰즈·가타리의 탈영토화 개념과 재즈 즉흥 연주의 특징을 연결한다. 철학 개념이 예술의 창조 과정을 설명할 때의 장단점을 검토할 수 있다.",
      "goal": "철학적 개념으로 음악의 즉흥성과 창조성을 설명할 수 있을까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "재즈 즉흥 연주에서 원래 선율과 변형된 부분 비교"
        },
        {
          "label": "방법 2",
          "text": "(가)의 철학 개념과 (나)의 음악 사례를 대응표로 정리"
        },
        {
          "label": "방법 3",
          "text": "즉흥성의 창의적 효과와 한계를 예술 이론으로 비교"
        }
      ],
      "extensionQuestions": [
        "즉흥 연주에도 지켜야 할 최소한의 규칙이 있을까?",
        "재해석이 언제 새로운 창조로 인정될까?",
        "즉흥성이라는 개념을 다른 예술에도 적용할 수 있을까?"
      ]
    },
    "research": {
      "examLabel": "2026년-10월-고3-모의고사",
      "examTitle": "2026년 10월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "4~9번 지문",
      "pdfPage": "PDF 2쪽",
      "originalFileName": "2026년-10월-고3-모의고사-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-03",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2026,
      "examMonth": 10,
      "grade": 3,
      "questionNumber": "10~13번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "드론은 외부 바람 속에서 어떻게 자세를 안정시킬까?",
      "coreMaterial": "드론 자세 제어와 센서 융합",
      "relatedFields": [
        "로봇공학",
        "전자공학",
        "제어공학"
      ],
      "topicReason": "드론의 기울기를 측정하는 센서와 자세 제어 장치의 작동을 소개한다. 센서가 가진 오차를 보완하는 제어 원리를 탐구할 수 있다.",
      "goal": "드론은 외부 바람 속에서 어떻게 자세를 안정시킬까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "센서별로 측정할 수 있는 값과 오차 종류를 도식화"
        },
        {
          "label": "방법 2",
          "text": "무료 시뮬레이션에서 제어값 변화에 따른 안정성 비교"
        },
        {
          "label": "방법 3",
          "text": "드론의 정지 비행 제어 과정을 입력-측정-보정 흐름도로 표현"
        }
      ],
      "extensionQuestions": [
        "두 센서의 정보를 결합하는 이유는 무엇인가?",
        "보정이 지나치면 어떤 문제가 생길까?",
        "드론 외에 균형 제어가 필요한 장치는 무엇인가?"
      ]
    },
    "research": {
      "examLabel": "2026년-10월-고3-모의고사",
      "examTitle": "2026년 10월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "10~13번 지문",
      "pdfPage": "PDF 4쪽",
      "originalFileName": "2026년-10월-고3-모의고사-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-04",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2026,
      "examMonth": 10,
      "grade": 3,
      "questionNumber": "14~17번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "기금은 장기 운용 과정에서 실질 가치를 어떻게 지킬까?",
      "coreMaterial": "기금 운용과 자산 가치",
      "relatedFields": [
        "경제학",
        "금융공학",
        "행정학"
      ],
      "topicReason": "장기간 지급 의무가 있는 기금이 수익·위험·유동성을 고려해 자산을 배분하는 상황을 설명한다. 자산 운용의 선택 조건을 비교할 수 있다.",
      "goal": "기금은 장기 운용 과정에서 실질 가치를 어떻게 지킬까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "가상 기금의 지급 일정과 운용 목표 설정"
        },
        {
          "label": "방법 2",
          "text": "안전자산과 위험자산 비중에 따른 장단점 표 작성"
        },
        {
          "label": "방법 3",
          "text": "공적 기금의 공개 운용 원칙과 물가 자료 조사"
        }
      ],
      "extensionQuestions": [
        "단기 지급 의무가 커지면 투자 전략은 달라질까?",
        "물가 상승은 명목 자산의 실질 가치에 어떤 영향을 줄까?",
        "대규모 기금의 거래가 시장에 영향을 줄 수 있는 이유는?"
      ]
    },
    "research": {
      "examLabel": "2026년-10월-고3-모의고사",
      "examTitle": "2026년 10월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "14~17번 지문",
      "pdfPage": "PDF 5쪽",
      "originalFileName": "2026년-10월-고3-모의고사-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-05",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2026,
      "examMonth": 6,
      "grade": 2,
      "questionNumber": "1~3번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "왜 기역·디귿·시옷은 다른 자음 이름과 규칙이 다를까?",
      "coreMaterial": "한글 자음자 이름의 역사",
      "relatedFields": [
        "국어국문학",
        "역사학",
        "언어학"
      ],
      "topicReason": "한글 자음의 명칭이 정해진 역사적 과정과 한자의 음·뜻을 활용한 표기를 설명한다. 언어 규칙의 예외가 형성되는 과정을 탐구할 수 있다.",
      "goal": "왜 기역·디귿·시옷은 다른 자음 이름과 규칙이 다를까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "자음 이름을 규칙형과 예외형으로 구분해 표 작성"
        },
        {
          "label": "방법 2",
          "text": "훈몽자회의 명칭 방식과 현대 명칭 비교"
        },
        {
          "label": "방법 3",
          "text": "구개음화 등 발음 변화 관련 국어사 자료 조사"
        }
      ],
      "extensionQuestions": [
        "당시에 같은 소릿값의 한자가 없었다면 어떤 대안을 썼을까?",
        "표준어는 언어 사용을 얼마나 바꿀 수 있을까?",
        "표기와 발음이 달라진 사례는 또 무엇이 있을까?"
      ]
    },
    "research": {
      "examLabel": "2026년-6월-고2-모의고사",
      "examTitle": "2026년 6월 고2 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "1~3번 지문",
      "pdfPage": "PDF 1쪽",
      "originalFileName": "2026년-6월-고2-모의고사-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-06",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2026,
      "examMonth": 6,
      "grade": 2,
      "questionNumber": "11~15번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "국가마다 법이 다를 때 무역 계약의 분쟁은 어떻게 해결할까?",
      "coreMaterial": "국제 물품 매매계약과 준거법",
      "relatedFields": [
        "법학",
        "무역학",
        "경제학"
      ],
      "topicReason": "서로 다른 국가의 법률과 국제 거래 관행을 고려해야 하는 무역 계약의 성격을 다룬다. 계약 조건에 따른 책임 분담을 비교할 수 있다.",
      "goal": "국가마다 법이 다를 때 무역 계약의 분쟁은 어떻게 해결할까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "가상의 수출입 상황을 정해 역할별 비용·위험 배분표 만들기"
        },
        {
          "label": "방법 2",
          "text": "여러 정형 거래 조건을 단계별로 비교"
        },
        {
          "label": "방법 3",
          "text": "국제 물품 매매계약의 공개 해설과 사례 조사"
        }
      ],
      "extensionQuestions": [
        "준거법이 달라지면 분쟁 결과도 달라질까?",
        "거래 조건 선택은 상품 가격에 어떤 영향을 줄까?",
        "거래 중 분쟁을 줄이기 위한 계약 문구는 무엇인가?"
      ]
    },
    "research": {
      "examLabel": "2026년-6월-고2-모의고사",
      "examTitle": "2026년 6월 고2 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "11~15번 지문",
      "pdfPage": "PDF 4, 5쪽",
      "originalFileName": "2026년-6월-고2-모의고사-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-07",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2026,
      "examMonth": 6,
      "grade": 2,
      "questionNumber": "16~19번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "식물은 옥신 등의 호르몬으로 성장을 어떻게 조절할까?",
      "coreMaterial": "식물 호르몬과 생장",
      "relatedFields": [
        "생명과학",
        "농학",
        "환경과학"
      ],
      "topicReason": "식물의 생장과 잎의 탈리 과정에서 호르몬이 어떤 역할을 하는지 설명한다. 식물이 환경에 반응하는 과정을 관찰과 개념도로 연결할 수 있다.",
      "goal": "식물은 옥신 등의 호르몬으로 성장을 어떻게 조절할까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "식물의 빛 방향과 성장 방향을 일정 기간 관찰"
        },
        {
          "label": "방법 2",
          "text": "옥신과 에틸렌이 관여하는 과정 개념도 작성"
        },
        {
          "label": "방법 3",
          "text": "식물 생장 호르몬에 관한 공신력 있는 자료 비교"
        }
      ],
      "extensionQuestions": [
        "옥신의 양과 위치가 성장 반응에 어떤 영향을 줄까?",
        "식물의 노화는 어떤 환경 요인과 관련될까?",
        "호르몬 작용의 예를 농업에서 어떻게 활용할까?"
      ]
    },
    "research": {
      "examLabel": "2026년-6월-고2-모의고사",
      "examTitle": "2026년 6월 고2 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "16~19번 지문",
      "pdfPage": "PDF 6쪽",
      "originalFileName": "2026년-6월-고2-모의고사-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-08",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2026,
      "examMonth": 6,
      "grade": 2,
      "questionNumber": "20~23번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "사람은 문자·사진 등 서로 다른 매체로 세상을 어떻게 재구성할까?",
      "coreMaterial": "매체 철학과 정보의 코드화",
      "relatedFields": [
        "미디어학",
        "철학",
        "정보학"
      ],
      "topicReason": "플루서의 매체 철학을 통해 인간의 세계 인식이 기호와 기술 장치에 의해 표현된다는 점을 설명한다. 사진과 디지털 이미지를 비교할 수 있다.",
      "goal": "사람은 문자·사진 등 서로 다른 매체로 세상을 어떻게 재구성할까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "같은 대상을 문자·사진·그림으로 기록해 표현 차이 비교"
        },
        {
          "label": "방법 2",
          "text": "사진 촬영에서 자동 설정과 사용자 선택을 구분"
        },
        {
          "label": "방법 3",
          "text": "매체 철학과 이미지의 의미 해석에 대한 자료 조사"
        }
      ],
      "extensionQuestions": [
        "기계가 만든 이미지는 누구의 해석을 담고 있을까?",
        "사진은 현실을 있는 그대로 복제하는가?",
        "생성형 AI 이미지에도 플루서의 관점을 적용할 수 있을까?"
      ]
    },
    "research": {
      "examLabel": "2026년-6월-고2-모의고사",
      "examTitle": "2026년 6월 고2 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "20~23번 지문",
      "pdfPage": "PDF 7, 8쪽",
      "originalFileName": "2026년-6월-고2-모의고사-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-09",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2026,
      "examMonth": 7,
      "grade": 3,
      "questionNumber": "1~3번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "서로 다른 저자의 관점을 종합해 탐구 질문을 해결하는 방법은?",
      "coreMaterial": "여러 책을 비교하는 통합적 독서",
      "relatedFields": [
        "교육학",
        "문헌정보학",
        "철학"
      ],
      "topicReason": "두 권 이상의 글을 비교해 주제에 대한 쟁점을 도출하는 통합적 독서 전략을 제시한다. 탐구 보고서의 문헌 검토 단계에 활용할 수 있다.",
      "goal": "서로 다른 저자의 관점을 종합해 탐구 질문을 해결하는 방법은?",
      "methods": [
        {
          "label": "방법 1",
          "text": "같은 주제를 다룬 서로 다른 관점의 글 2~3편 선정"
        },
        {
          "label": "방법 2",
          "text": "핵심 용어 정의를 공통 기준으로 재작성"
        },
        {
          "label": "방법 3",
          "text": "쟁점별 주장·근거·차이점을 비교표로 정리"
        }
      ],
      "extensionQuestions": [
        "다른 저자의 핵심 용어를 하나로 묶을 때 생기는 문제는?",
        "서로 합의하는 견해도 쟁점이 될 수 있을까?",
        "중립적 비교와 자기 주장 제시는 어떻게 구별할까?"
      ]
    },
    "research": {
      "examLabel": "2026년-7월-고3-모의고사",
      "examTitle": "2026년 7월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "1~3번 지문",
      "pdfPage": "PDF 1쪽",
      "originalFileName": "2026년-7월-고3-모의고사-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-10",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2026,
      "examMonth": 7,
      "grade": 3,
      "questionNumber": "4~9번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "사회 구조는 개인을 결정할까, 개인이 사회 구조를 만들까?",
      "coreMaterial": "구조와 행위의 사회학",
      "relatedFields": [
        "사회학",
        "정치학",
        "철학"
      ],
      "topicReason": "기든스의 구조화 이론과 벡의 위험사회 논의를 통해 사회 구조와 개인 행동이 서로 영향을 주는 양상을 설명한다.",
      "goal": "사회 구조는 개인을 결정할까, 개인이 사회 구조를 만들까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "일상의 제도와 개인 행동이 맞물리는 사례 조사"
        },
        {
          "label": "방법 2",
          "text": "제도·행위·피드백 흐름을 화살표로 정리"
        },
        {
          "label": "방법 3",
          "text": "현대 사회 위험에 대한 다른 사회학적 해석 비교"
        }
      ],
      "extensionQuestions": [
        "개인의 선택은 사회적 제약과 독립적일 수 있을까?",
        "새로운 위험이 생길 때 시민 참여는 어떤 역할을 할까?",
        "디지털 플랫폼도 사회 구조로 볼 수 있을까?"
      ]
    },
    "research": {
      "examLabel": "2026년-7월-고3-모의고사",
      "examTitle": "2026년 7월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "4~9번 지문",
      "pdfPage": "PDF 2쪽",
      "originalFileName": "2026년-7월-고3-모의고사-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-11",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2026,
      "examMonth": 7,
      "grade": 3,
      "questionNumber": "10~13번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "굽은 도로가 기울어져 있는 이유는 무엇인가?",
      "coreMaterial": "곡선 도로와 안전 설계",
      "relatedFields": [
        "토목공학",
        "물리학",
        "교통공학"
      ],
      "topicReason": "도로의 배수·횡단 경사·편경사·정지 시거 등 안전 설계 요소를 설명한다. 물리 법칙과 교통 시설 설계를 연결할 수 있다.",
      "goal": "굽은 도로가 기울어져 있는 이유는 무엇인가?",
      "methods": [
        {
          "label": "방법 1",
          "text": "가까운 도로에서 경사·배수구·시야 확보 요소 관찰"
        },
        {
          "label": "방법 2",
          "text": "속도와 곡률 변화가 원심력에 주는 영향 계산 예시 작성"
        },
        {
          "label": "방법 3",
          "text": "도로 안전 설계 기준의 공개 자료와 모형 비교"
        }
      ],
      "extensionQuestions": [
        "곡선 도로의 편경사는 어느 정도가 적절할까?",
        "빗길·결빙에서 노면 설계 기준은 달라질까?",
        "운전자 반응시간이 정지 시거에 미치는 영향은?"
      ]
    },
    "research": {
      "examLabel": "2026년-7월-고3-모의고사",
      "examTitle": "2026년 7월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "10~13번 지문",
      "pdfPage": "PDF 3, 4쪽",
      "originalFileName": "2026년-7월-고3-모의고사-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-12",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2026,
      "examMonth": 7,
      "grade": 3,
      "questionNumber": "14~17번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "ETF는 어떤 방식으로 여러 자산에 분산 투자할까?",
      "coreMaterial": "ETF와 투자 위험 관리",
      "relatedFields": [
        "경제학",
        "금융학",
        "통계학"
      ],
      "topicReason": "ETF의 구조와 거래 방식이 일반적인 펀드와 어떻게 다른지를 설명한다. 분산 투자의 이점과 운용상의 한계를 함께 검토할 수 있다.",
      "goal": "ETF는 어떤 방식으로 여러 자산에 분산 투자할까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "가상의 ETF 구성 종목과 지수 추종 원리 도식화"
        },
        {
          "label": "방법 2",
          "text": "ETF와 일반 펀드의 거래·비용·위험 항목 비교"
        },
        {
          "label": "방법 3",
          "text": "운용사 공개 설명서에서 추적 오차와 기초자산 개념 확인"
        }
      ],
      "extensionQuestions": [
        "ETF에 투자하면 개별 주식 위험이 모두 사라질까?",
        "기초 지수와 실제 수익률이 다른 이유는?",
        "유동성이 낮은 ETF에서는 어떤 문제가 생길까?"
      ]
    },
    "research": {
      "examLabel": "2026년-7월-고3-모의고사",
      "examTitle": "2026년 7월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "14~17번 지문",
      "pdfPage": "PDF 5쪽",
      "originalFileName": "2026년-7월-고3-모의고사-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-13",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2026,
      "examMonth": 9,
      "grade": 2,
      "questionNumber": "11~16번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "공익을 위한 기본권 제한은 어디까지 정당화될까?",
      "coreMaterial": "헌법과 기본권 제한 심사",
      "relatedFields": [
        "법학",
        "정치외교학",
        "사회학"
      ],
      "topicReason": "헌법상 기본권과 사적 영역의 경업금지 약정이 충돌하는 상황 등을 다룬다. 서로 다른 가치의 균형을 판단하는 법적 논리를 분석할 수 있다.",
      "goal": "공익을 위한 기본권 제한은 어디까지 정당화될까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "가상 근로계약의 경업금지 조항을 사례로 쟁점표 작성"
        },
        {
          "label": "방법 2",
          "text": "근로자의 직업 선택 자유와 기업의 이익을 대조"
        },
        {
          "label": "방법 3",
          "text": "관련 헌법 원리와 공개 판례 해설 조사"
        }
      ],
      "extensionQuestions": [
        "기본권은 사인 간의 계약에도 영향을 미칠까?",
        "경업금지 범위의 적절성은 무엇으로 판단할까?",
        "계약의 자유와 기본권 보호가 충돌할 때 기준은?"
      ]
    },
    "research": {
      "examLabel": "2026년-9월-고2-모의고사",
      "examTitle": "2026년 9월 고2 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "11~16번 지문",
      "pdfPage": "PDF 4, 5쪽",
      "originalFileName": "2026년-9월-고2-모의고사-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-14",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2026,
      "examMonth": 9,
      "grade": 2,
      "questionNumber": "17~20번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "심전도 파형은 심장 근육의 전기 활동을 어떻게 보여줄까?",
      "coreMaterial": "심전도와 심장의 전기 활동",
      "relatedFields": [
        "의공학",
        "생명과학",
        "전자공학"
      ],
      "topicReason": "심장 근육에서 발생하는 전기 신호가 심전도 파형에 반영되는 원리를 설명한다. 생명 현상과 전기 신호 분석을 연결할 수 있다.",
      "goal": "심전도 파형은 심장 근육의 전기 활동을 어떻게 보여줄까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "공개 교육용 심전도 파형에 P·QRS·T 구간 표시"
        },
        {
          "label": "방법 2",
          "text": "박동 주기와 파형의 시간·크기 차이 설명"
        },
        {
          "label": "방법 3",
          "text": "심장 전도계 구조와 측정 원리 자료 조사"
        }
      ],
      "extensionQuestions": [
        "전극을 놓는 위치에 따라 파형이 달라질까?",
        "심장의 기계적 수축과 전기 신호는 어떤 순서로 일어날까?",
        "웨어러블 기기가 측정할 수 있는 정보의 한계는?"
      ]
    },
    "research": {
      "examLabel": "2026년-9월-고2-모의고사",
      "examTitle": "2026년 9월 고2 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "17~20번 지문",
      "pdfPage": "PDF 6쪽",
      "originalFileName": "2026년-9월-고2-모의고사-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-15",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2026,
      "examMonth": 9,
      "grade": 2,
      "questionNumber": "21~23번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "사회 속 개인의 정체성은 어떻게 형성되는가?",
      "coreMaterial": "주체 개념과 현대 철학",
      "relatedFields": [
        "철학",
        "사회학",
        "심리학"
      ],
      "topicReason": "현대 철학에서 주체에 대한 비판과 새로운 주체 개념을 논의하는 글이다. 사람의 정체성이 형성되는 조건을 탐구할 수 있다.",
      "goal": "사회 속 개인의 정체성은 어떻게 형성되는가?",
      "methods": [
        {
          "label": "방법 1",
          "text": "본문에 등장한 철학자별 주체 개념 비교표 작성"
        },
        {
          "label": "방법 2",
          "text": "소셜 미디어 속 역할과 실제 삶의 정체성 사례 분석"
        },
        {
          "label": "방법 3",
          "text": "현대 사회의 주체성에 관한 입문 문헌 읽기"
        }
      ],
      "extensionQuestions": [
        "개인은 사회 구조의 영향을 벗어나 스스로를 규정할 수 있을까?",
        "온라인의 여러 정체성은 하나의 주체로 통합되는가?",
        "주체를 새롭게 정의해야 하는 이유는 무엇일까?"
      ]
    },
    "research": {
      "examLabel": "2026년-9월-고2-모의고사",
      "examTitle": "2026년 9월 고2 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "21~23번 지문",
      "pdfPage": "PDF 7쪽",
      "originalFileName": "2026년-9월-고2-모의고사-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-16",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2026,
      "examMonth": 3,
      "grade": 2,
      "questionNumber": "11~13번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "판매자와 구매자 중 배송 중 손해는 누가 부담해야 할까?",
      "coreMaterial": "물품 매매계약과 위험 이전",
      "relatedFields": [
        "법학",
        "유통학",
        "경제학"
      ],
      "topicReason": "물품 매매계약에서 예상치 못한 파손이 발생할 때 위험을 누가 부담하는지 설명한다. 계약의 조건과 물품 인도의 시점을 사례에 적용할 수 있다.",
      "goal": "판매자와 구매자 중 배송 중 손해는 누가 부담해야 할까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "배송 중 파손 상황을 몇 가지 가정하고 위험 이전 시점 표시"
        },
        {
          "label": "방법 2",
          "text": "운송을 포함한 계약과 그렇지 않은 계약 비교"
        },
        {
          "label": "방법 3",
          "text": "소비자 거래와 기업 간 거래의 약정 방식 조사"
        }
      ],
      "extensionQuestions": [
        "물품이 특정되지 않았다면 위험 이전 판단은 달라질까?",
        "배송 지연 상황에서는 어떤 조건이 중요한가?",
        "공정한 계약 조건은 누가 어떻게 정해야 할까?"
      ]
    },
    "research": {
      "examLabel": "2026년-고2-3월-모의고사",
      "examTitle": "2026년 3월 고2 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "11~13번 지문",
      "pdfPage": "PDF 4쪽",
      "originalFileName": "2026년-고2-3월-모의고사-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-17",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2026,
      "examMonth": 3,
      "grade": 2,
      "questionNumber": "14~17번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "접촉과 분리만으로 미세한 전기를 생산할 수 있을까?",
      "coreMaterial": "마찰 전기 나노 발전기",
      "relatedFields": [
        "재료공학",
        "전자공학",
        "물리학"
      ],
      "topicReason": "전자 친화도가 서로 다른 물질의 접촉과 분리에서 전하가 이동하는 현상을 설명한다. 미세 에너지 생산 기술과 연결할 수 있다.",
      "goal": "접촉과 분리만으로 미세한 전기를 생산할 수 있을까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "물질 조합과 접촉 면적이 전하 생성에 미치는 영향 조사"
        },
        {
          "label": "방법 2",
          "text": "마찰 전기 발전기의 구조를 안전한 모형으로 표현"
        },
        {
          "label": "방법 3",
          "text": "웨어러블 에너지 수확 장치의 공개 기술 사례 비교"
        }
      ],
      "extensionQuestions": [
        "나노 패턴을 만들면 접촉 면적이 왜 달라질까?",
        "발전량을 높이려면 무엇을 조절해야 할까?",
        "에너지 수확 기술이 대형 발전을 대신할 수 있을까?"
      ]
    },
    "research": {
      "examLabel": "2026년-고2-3월-모의고사",
      "examTitle": "2026년 3월 고2 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "14~17번 지문",
      "pdfPage": "PDF 5, 6쪽",
      "originalFileName": "2026년-고2-3월-모의고사-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-18",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2026,
      "examMonth": 3,
      "grade": 2,
      "questionNumber": "18~23번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "환경 보호의 기준을 개별 생명과 생태계 중 어디에 둘까?",
      "coreMaterial": "생명 중심 윤리와 생태 중심 윤리",
      "relatedFields": [
        "환경윤리",
        "생명과학",
        "철학"
      ],
      "topicReason": "개별 생명체를 보호하는 생명 중심 윤리와 생태계 전체를 중시하는 생태 중심 윤리의 차이를 다룬다. 보전 정책의 가치 충돌을 검토할 수 있다.",
      "goal": "환경 보호의 기준을 개별 생명과 생태계 중 어디에 둘까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "외래종 관리·보호구역 관리의 가상 사례 선정"
        },
        {
          "label": "방법 2",
          "text": "개체의 권리와 생태계 안정성에 대한 논증 비교"
        },
        {
          "label": "방법 3",
          "text": "테일러와 레오폴드의 윤리학 핵심 주장 조사"
        }
      ],
      "extensionQuestions": [
        "한 개체의 희생이 생태계 보전에 정당화될 수 있을까?",
        "인간의 필요와 생태계 보호가 충돌하면 어떤 기준이 필요한가?",
        "윤리적 입장별로 같은 정책을 어떻게 평가할까?"
      ]
    },
    "research": {
      "examLabel": "2026년-고2-3월-모의고사",
      "examTitle": "2026년 3월 고2 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "18~23번 지문",
      "pdfPage": "PDF 6, 7쪽",
      "originalFileName": "2026년-고2-3월-모의고사-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-19",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2026,
      "examMonth": 3,
      "grade": 3,
      "questionNumber": "1~3번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "메모의 형식을 바꾸면 글의 이해와 기억도 달라질까?",
      "coreMaterial": "효과적인 학습 메모와 도해 조직자",
      "relatedFields": [
        "교육학",
        "인지과학",
        "디자인학"
      ],
      "topicReason": "학습 독서에서 메모의 구조와 도해 조직자가 이해에 도움을 줄 수 있음을 설명한다. 정보를 시각적으로 재구성하는 효과를 탐구할 수 있다.",
      "goal": "메모의 형식을 바꾸면 글의 이해와 기억도 달라질까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "같은 비문학 지문을 글 요약과 도식 요약으로 각각 정리"
        },
        {
          "label": "방법 2",
          "text": "핵심 개념 연결의 차이와 복습 편의성 비교"
        },
        {
          "label": "방법 3",
          "text": "벤다이어그램·연표·순서도의 적합한 사용 조건 조사"
        }
      ],
      "extensionQuestions": [
        "어떤 텍스트 구조에 어떤 도식이 효과적일까?",
        "메모의 양이 많으면 이해도도 높아질까?",
        "디지털 마인드맵과 종이 메모의 차이는 무엇인가?"
      ]
    },
    "research": {
      "examLabel": "2026년-고3-3월-모의고사",
      "examTitle": "2026년 3월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "1~3번 지문",
      "pdfPage": "PDF 1쪽",
      "originalFileName": "2026년-고3-3월-모의고사-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-20",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2026,
      "examMonth": 3,
      "grade": 3,
      "questionNumber": "4~9번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "구속 영장의 심사와 사후 통제는 어떤 차이가 있을까?",
      "coreMaterial": "형사 절차와 인권 보장",
      "relatedFields": [
        "법학",
        "정치학",
        "사회학"
      ],
      "topicReason": "구속 등 강제 처분에 대한 법원의 사전·사후 통제를 통해 신체의 자유를 보장하는 절차를 설명한다. 국가 권한과 기본권 보호를 비교할 수 있다.",
      "goal": "구속 영장의 심사와 사후 통제는 어떤 차이가 있을까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "형사 절차에서 각 심사 시점과 목적을 흐름도로 구성"
        },
        {
          "label": "방법 2",
          "text": "가상의 절차 사례에서 체포·구속·심사 구분"
        },
        {
          "label": "방법 3",
          "text": "형사소송법과 공개 법원 해설 자료 조사"
        }
      ],
      "extensionQuestions": [
        "영장이 발부되었어도 사후 심사가 필요한 이유는?",
        "신속한 수사와 인권 보호는 어떻게 조화될까?",
        "사법적 통제의 독립성이 중요한 이유는 무엇일까?"
      ]
    },
    "research": {
      "examLabel": "2026년-고3-3월-모의고사",
      "examTitle": "2026년 3월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "4~9번 지문",
      "pdfPage": "PDF 2쪽",
      "originalFileName": "2026년-고3-3월-모의고사-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-21",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2026,
      "examMonth": 3,
      "grade": 3,
      "questionNumber": "10~13번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "도파민은 뇌의 운동 시작과 억제 경로를 어떻게 조절할까?",
      "coreMaterial": "도파민과 운동 조절 회로",
      "relatedFields": [
        "뇌과학",
        "생명과학",
        "의학"
      ],
      "topicReason": "도파민의 신경 전달과 기저핵의 직접·간접 경로가 운동을 조절하는 과정을 설명한다. 신경 회로를 단계별로 모형화할 수 있다.",
      "goal": "도파민은 뇌의 운동 시작과 억제 경로를 어떻게 조절할까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "수용체별 경로와 흥분·억제 신호를 화살표로 그리기"
        },
        {
          "label": "방법 2",
          "text": "도파민이 감소했을 때 예상되는 경로 변화 개념도 작성"
        },
        {
          "label": "방법 3",
          "text": "운동 질환의 신경학적 기전에 관한 교육 자료 비교"
        }
      ],
      "extensionQuestions": [
        "직접 경로와 간접 경로는 어떤 상호 작용을 할까?",
        "도파민의 작용은 항상 한 방향으로만 나타날까?",
        "운동 조절 시스템을 로봇의 제어와 비교할 수 있을까?"
      ]
    },
    "research": {
      "examLabel": "2026년-고3-3월-모의고사",
      "examTitle": "2026년 3월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "10~13번 지문",
      "pdfPage": "PDF 3, 4쪽",
      "originalFileName": "2026년-고3-3월-모의고사-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-22",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2026,
      "examMonth": 3,
      "grade": 3,
      "questionNumber": "14~17번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "타인의 인정은 개인의 정체성 형성에 왜 중요할까?",
      "coreMaterial": "인정과 정체성의 철학",
      "relatedFields": [
        "철학",
        "사회학",
        "심리학"
      ],
      "topicReason": "호네트와 버틀러의 인정·정체성·규범에 관한 견해를 비교한다. 타인과의 관계에서 자기 이해가 형성되는 방식을 분석할 수 있다.",
      "goal": "타인의 인정은 개인의 정체성 형성에 왜 중요할까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "두 철학자의 정체성 형성 과정을 비교표로 만들기"
        },
        {
          "label": "방법 2",
          "text": "학교 공동체의 인정·배제 상황을 익명 가상 사례로 구성"
        },
        {
          "label": "방법 3",
          "text": "인정 이론과 수행성에 관한 입문 자료 조사"
        }
      ],
      "extensionQuestions": [
        "인정받지 못한 개인은 자신을 어떻게 이해할까?",
        "사회적 규범은 정체성의 기회일까 제약일까?",
        "서로 다른 가치를 가진 집단의 상호 인정은 가능할까?"
      ]
    },
    "research": {
      "examLabel": "2026년-고3-3월-모의고사",
      "examTitle": "2026년 3월 고3 모의고사",
      "examKind": "ACADEMIC_ACHIEVEMENT",
      "questionLabel": "14~17번 지문",
      "pdfPage": "PDF 5쪽",
      "originalFileName": "2026년-고3-3월-모의고사-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-23",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2027,
      "examMonth": 6,
      "grade": null,
      "questionNumber": "1~3번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "읽기 전 질문을 만들면 기억과 이해에 어떤 변화가 생길까?",
      "coreMaterial": "SQ3R 학습 독서 전략",
      "relatedFields": [
        "교육학",
        "인지과학",
        "문헌정보학"
      ],
      "topicReason": "읽기 전 훑어보기와 질문 만들기, 읽은 후 암송·재검토까지 이어지는 SQ3R 전략을 다룬다. 독서의 단계별 기능을 검토할 수 있다.",
      "goal": "읽기 전 질문을 만들면 기억과 이해에 어떤 변화가 생길까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "동일 지문을 SQ3R과 일반 읽기로 학습한 뒤 기억 항목 비교"
        },
        {
          "label": "방법 2",
          "text": "스스로 만든 질문과 제공받은 질문의 차이 기록"
        },
        {
          "label": "방법 3",
          "text": "읽기 전략별 집중과 이해를 구분한 체크리스트 설계"
        }
      ],
      "extensionQuestions": [
        "질문을 직접 만드는 것이 독서 태도에 왜 중요할까?",
        "훑어보기는 속도와 이해도에 어떤 영향을 줄까?",
        "분야가 다른 글에도 같은 독서 전략이 적용될까?"
      ]
    },
    "research": {
      "examLabel": "2027학년도-6월-모의평가",
      "examTitle": "2027학년도 6월 모의평가",
      "examKind": "CSAT_MOCK",
      "questionLabel": "1~3번 지문",
      "pdfPage": "PDF 1쪽",
      "originalFileName": "2027학년도-6월-모의평가-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-24",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2027,
      "examMonth": 6,
      "grade": null,
      "questionNumber": "4~9번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "조선 시대 신분의 변화는 어떤 사회·경제적 요인으로 설명할까?",
      "coreMaterial": "조선 신분제와 사회 변화",
      "relatedFields": [
        "역사학",
        "사회학",
        "정치학"
      ],
      "topicReason": "조선 시대 신분제의 역사적 변화와 근대의 사회적 평등 운동을 다룬다. 법적 지위와 실제 사회적 차별이 다른 방식으로 변화하는지 조사할 수 있다.",
      "goal": "조선 시대 신분의 변화는 어떤 사회·경제적 요인으로 설명할까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "지문 속 역사적 사건을 시기별 연표로 정리"
        },
        {
          "label": "방법 2",
          "text": "법제 변화와 생활상의 차별 변화 비교"
        },
        {
          "label": "방법 3",
          "text": "공개 사료와 역사 연구 해설을 통해 사례 교차 확인"
        }
      ],
      "extensionQuestions": [
        "법적으로 신분이 사라져도 차별이 지속되는 이유는?",
        "사회운동은 제도 변화를 어떤 방식으로 촉진할까?",
        "역사 연구에서 어느 자료를 근거로 삼아야 할까?"
      ]
    },
    "research": {
      "examLabel": "2027학년도-6월-모의평가",
      "examTitle": "2027학년도 6월 모의평가",
      "examKind": "CSAT_MOCK",
      "questionLabel": "4~9번 지문",
      "pdfPage": "PDF 2쪽",
      "originalFileName": "2027학년도-6월-모의평가-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-25",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2027,
      "examMonth": 6,
      "grade": null,
      "questionNumber": "10~13번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "판매자와 구매자의 정보 차이는 시장에 어떤 문제를 만드는가?",
      "coreMaterial": "정보 비대칭과 시장 거래",
      "relatedFields": [
        "경제학",
        "경영학",
        "정보학"
      ],
      "topicReason": "거래 당사자 간 정보의 격차가 경제적 선택에 영향을 준다는 정보 비대칭 문제를 설명한다. 온라인 거래와 AI 추천 서비스에도 적용할 수 있다.",
      "goal": "판매자와 구매자의 정보 차이는 시장에 어떤 문제를 만드는가?",
      "methods": [
        {
          "label": "방법 1",
          "text": "중고거래나 온라인 쇼핑의 정보 비대칭 상황을 가상으로 설정"
        },
        {
          "label": "방법 2",
          "text": "정보 공개 전후 구매 판단 조건을 비교표로 구성"
        },
        {
          "label": "방법 3",
          "text": "후기·보증·검증 제도의 장단점 조사"
        }
      ],
      "extensionQuestions": [
        "판매자가 가진 정보를 구매자가 확인하려면 무엇이 필요할까?",
        "플랫폼 리뷰는 정보 격차를 완전히 해결할까?",
        "AI 추천은 정보 비대칭을 줄이거나 키울 수 있을까?"
      ]
    },
    "research": {
      "examLabel": "2027학년도-6월-모의평가",
      "examTitle": "2027학년도 6월 모의평가",
      "examKind": "CSAT_MOCK",
      "questionLabel": "10~13번 지문",
      "pdfPage": "PDF 4쪽",
      "originalFileName": "2027학년도-6월-모의평가-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-26",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2027,
      "examMonth": 6,
      "grade": null,
      "questionNumber": "14~17번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "물방울의 표면장력은 인쇄 기술에 어떻게 활용될까?",
      "coreMaterial": "표면장력과 잉크젯 프린터",
      "relatedFields": [
        "물리학",
        "화학공학",
        "기계공학"
      ],
      "topicReason": "액체의 표면장력과 방울의 물리적 안정성을 잉크젯 프린터 기술에 연결한다. 기초 물리 원리가 산업 기술로 구현되는 사례다.",
      "goal": "물방울의 표면장력은 인쇄 기술에 어떻게 활용될까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "물·비눗물 방울의 모양과 표면 변화를 안전하게 관찰"
        },
        {
          "label": "방법 2",
          "text": "표면장력·점도·밀도 등 변수를 개념도로 정리"
        },
        {
          "label": "방법 3",
          "text": "잉크젯 프린터의 액적 형성·분사 구조 조사"
        }
      ],
      "extensionQuestions": [
        "방울 크기와 표면장력은 어떤 관계에 있을까?",
        "액적이 너무 크거나 작으면 인쇄 결과가 어떻게 달라질까?",
        "잉크 성분의 변화가 분사 안정성에 영향을 줄까?"
      ]
    },
    "research": {
      "examLabel": "2027학년도-6월-모의평가",
      "examTitle": "2027학년도 6월 모의평가",
      "examKind": "CSAT_MOCK",
      "questionLabel": "14~17번 지문",
      "pdfPage": "PDF 5쪽",
      "originalFileName": "2027학년도-6월-모의평가-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-27",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2027,
      "examMonth": 9,
      "grade": null,
      "questionNumber": "1~3번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "다른 사람의 삶을 읽는 경험이 진로 결정에 어떤 도움을 줄까?",
      "coreMaterial": "전기류를 활용한 진로 탐색",
      "relatedFields": [
        "교육학",
        "심리학",
        "문헌정보학"
      ],
      "topicReason": "실제 인물의 생애를 비판적으로 읽고 자신의 진로와 연결하는 독서 방법을 설명한다. 진로 탐구와 자기 성찰을 기록할 수 있다.",
      "goal": "다른 사람의 삶을 읽는 경험이 진로 결정에 어떤 도움을 줄까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "관심 분야 인물의 전기·자서전 한 권 선정"
        },
        {
          "label": "방법 2",
          "text": "성공뿐 아니라 실패와 전환의 사건을 연표로 정리"
        },
        {
          "label": "방법 3",
          "text": "인물과 자신을 비교하는 대립 척도표를 작성해 성찰"
        }
      ],
      "extensionQuestions": [
        "인물의 업적과 선택을 평가할 때 시대 배경은 왜 필요한가?",
        "인물의 성공 과정을 그대로 따라 하는 것이 타당할까?",
        "인물의 실패 경험에서 어떤 진로 정보를 얻을 수 있을까?"
      ]
    },
    "research": {
      "examLabel": "2027학년도-9월-모의평가",
      "examTitle": "2027학년도 9월 모의평가",
      "examKind": "CSAT_MOCK",
      "questionLabel": "1~3번 지문",
      "pdfPage": "PDF 1쪽",
      "originalFileName": "2027학년도-9월-모의평가-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-28",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2027,
      "examMonth": 9,
      "grade": null,
      "questionNumber": "4~9번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "인간과 동물의 도덕적 가치를 판단하는 기준은 무엇일까?",
      "coreMaterial": "종 차별주의와 도덕적 지위",
      "relatedFields": [
        "철학",
        "생명윤리",
        "법학"
      ],
      "topicReason": "종 차별주의·동물의 도덕적 지위·AI의 도덕적 행위자 가능성을 연결한 윤리적 논의다. 도덕적 고려의 기준을 비교할 수 있다.",
      "goal": "인간과 동물의 도덕적 가치를 판단하는 기준은 무엇일까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "인간·동물·AI에 적용되는 도덕적 기준을 표로 구분"
        },
        {
          "label": "방법 2",
          "text": "논증의 전제와 결론을 도식화해 찬반 논거 비교"
        },
        {
          "label": "방법 3",
          "text": "생명윤리와 AI 윤리에 관한 입문 문헌 조사"
        }
      ],
      "extensionQuestions": [
        "지능은 도덕적 지위의 충분조건일까?",
        "행동만으로 도덕적 행위자임을 판단할 수 있을까?",
        "동물과 AI에 같은 기준을 적용하는 것이 타당할까?"
      ]
    },
    "research": {
      "examLabel": "2027학년도-9월-모의평가",
      "examTitle": "2027학년도 9월 모의평가",
      "examKind": "CSAT_MOCK",
      "questionLabel": "4~9번 지문",
      "pdfPage": "PDF 2쪽",
      "originalFileName": "2027학년도-9월-모의평가-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-29",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2027,
      "examMonth": 9,
      "grade": null,
      "questionNumber": "10~13번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "휴대전화 충전기는 교류 전원을 어떻게 직류로 바꿀까?",
      "coreMaterial": "전원 어댑터의 전력 변환",
      "relatedFields": [
        "전기전자공학",
        "물리학",
        "컴퓨터공학"
      ],
      "topicReason": "교류를 전자기기의 직류 전원으로 바꾸는 선형 방식과 스위칭 방식을 설명한다. 전력 변환의 원리와 효율을 비교할 수 있다.",
      "goal": "휴대전화 충전기는 교류 전원을 어떻게 직류로 바꿀까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "어댑터의 블록도를 그리고 정류·평활·전압 제어 단계 표시"
        },
        {
          "label": "방법 2",
          "text": "충전기 제품의 공개 전력·크기·효율 사양 비교"
        },
        {
          "label": "방법 3",
          "text": "전원 노이즈와 스위칭 동작에 관한 공학 자료 조사"
        }
      ],
      "extensionQuestions": [
        "스위칭 방식이 소형화에 유리한 이유는?",
        "노이즈는 왜 발생하고 어떻게 완화할까?",
        "전기 기기마다 요구하는 전압이 다른 이유는?"
      ]
    },
    "research": {
      "examLabel": "2027학년도-9월-모의평가",
      "examTitle": "2027학년도 9월 모의평가",
      "examKind": "CSAT_MOCK",
      "questionLabel": "10~13번 지문",
      "pdfPage": "PDF 4쪽",
      "originalFileName": "2027학년도-9월-모의평가-국어-문제.pdf",
      "passage": ""
    }
  },
  {
    "materialId": "KO-30",
    "subjectId": "mock_kor",
    "source": {
      "academicYear": 2027,
      "examMonth": 9,
      "grade": null,
      "questionNumber": "14~17번 지문",
      "sourceUrl": null
    },
    "idea": {
      "topicTitle": "오피니언 리더는 온라인 정보의 확산과 신뢰 형성에 어떤 영향을 미칠까?",
      "coreMaterial": "오피니언 리더와 정보의 2단계 유통",
      "relatedFields": [
        "미디어커뮤니케이션학",
        "사회학",
        "언론정보학"
      ],
      "topicReason": "지문은 미디어의 정보가 오피니언 리더를 거쳐 일반 이용자에게 전해지는 커뮤니케이션 2단계 유통 이론을 소개하고, 실제 정보 전달은 1단계 또는 다단계로도 이루어진다는 비판론을 다룬다. 이를 바탕으로 온라인 공동체에서 정보 전달 경로와 영향력을 분석할 수 있다.",
      "goal": "오피니언 리더는 온라인 정보의 확산과 신뢰 형성에 어떤 영향을 미칠까?",
      "methods": [
        {
          "label": "방법 1",
          "text": "학교생활과 관련된 공개 정보가 학생들에게 전달되는 경로를 익명 설문으로 조사한다."
        },
        {
          "label": "방법 2",
          "text": "직접 전달·친구를 통한 전달·여러 사람을 거친 전달 사례를 구분해 흐름도를 만든다."
        },
        {
          "label": "방법 3",
          "text": "커뮤니케이션 2단계 유통 이론과 다단계 유통 비판을 비교하여 실제 사례에 적합한 설명을 평가한다."
        }
      ],
      "extensionQuestions": [
        "정보 전달자가 특정 분야에서만 신뢰를 얻는 이유는 무엇일까?",
        "SNS에서는 오피니언 리더를 거치지 않는 정보 전달이 얼마나 흔할까?",
        "정보의 전달 단계를 거칠수록 내용의 정확성은 어떻게 달라질까?"
      ]
    },
    "research": {
      "examLabel": "2027학년도-9월-모의평가",
      "examTitle": "2027학년도 9월 모의평가",
      "examKind": "CSAT_MOCK",
      "questionLabel": "14~17번 지문",
      "pdfPage": "PDF 5쪽",
      "originalFileName": "2027학년도-9월-모의평가-국어-문제.pdf",
      "passage": ""
    }
  }
]
