import feedbackUrl from '../assets/activity-case/antibiotic-natural-selection/antibiotic-v1-feedback.sample.pdf?url'
import finalUrl from '../assets/activity-case/antibiotic-natural-selection/antibiotic-poster-final.sample.pptx?url'
import researchUrl from '../assets/activity-case/antibiotic-natural-selection/antibiotic-research.sample.xlsx?url'
import v1Url from '../assets/activity-case/antibiotic-natural-selection/antibiotic-poster-v1.sample.hwp?url'
import v2Url from '../assets/activity-case/antibiotic-natural-selection/antibiotic-poster-v2.sample.hwp?url'
import type { MentorCaseDetail } from './types.ts'

/*
 * Mentor Activity Case 상세 (Admin Case Detail 화면용). 실제 Mentor Content Backend가 아니다.
 * - Student Mentor Hub Canonical Fixture(frontend/student/src/features/mentor-hub/fixtures/activityCases.fixture.ts)의
 *   요약 · 주요 활동 · 단계 · 과정 자료(미리보기 View Model 포함) · Reflection · 후속 활동 · 관련 Content를 같은 contentId로 그대로 옮긴 값이다.
 *   Admin에서 Case 내용을 새로 쓰거나 고치지 않는다. (frontend/student를 runtime import하지 않기 위해 값을 옮겼다)
 * - Mentor 기본 정보(이름 · 대학 · 학과)는 adminMentor.fixture.ts mentorCaseCatalogFixture가 가진다. (같은 mentorId)
 * - 원본 파일은 Case-01 Sample 5개만 있다. (Student assets와 같은 파일을 Admin assets에 복사, File Storage 미정)
 *   나머지 Case 자료는 자료 정보만 있다. (미리보기 · 다운로드 없음)
 * - Mentor Record(원본 비공개)와 다르다: Activity Case 공개 자료는 미리보기 + 원본 다운로드가 가능하다.
 * - Browser 검증(test-mentor-case)에서 Student Fixture와 값이 같은지 비교한다.
 */

export const mentorCaseDetailsFixture: readonly MentorCaseDetail[] = [
  {
    "contentId": "fixture-content-case-01",
    "summary": "탐구계획부터 Staff Feedback, 최종 포스터, 미생물 배양 후속 활동까지 정리한 Activity Case예요.",
    "activities": [
      "내성균 자료 조사",
      "자연선택 과정 정리",
      "A3 포스터",
      "3분 발표",
      "후속 미생물 실험"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "안내문 등록",
        "summary": "진화 단원 연계 포스터",
        "description": "생명과학Ⅰ 진화 단원과 연계한 탐구 포스터 과제였어요. A3 한 장에 탐구 질문, 자료, 결론을 담고 3분 동안 발표해야 했어요.",
        "checklist": [
          "탐구 질문의 명확성 30점",
          "자료 근거 30점",
          "도식 표현 20점",
          "발표 20점"
        ]
      },
      {
        "stageId": "topic",
        "title": "주제 선정",
        "summary": "국내 통계 1개로 범위 축소",
        "description": "처음에는 여러 나라의 항생제 사용량과 내성균 비율을 비교하려고 했어요. 3주 안에 자료를 모으기 어려워 국내 통계 하나로 범위를 줄였어요.",
        "checklist": [],
        "planChange": {
          "before": "항생제 사용량과 내성균 비율 (여러 나라 비교)",
          "after": "국내 통계 1개로 범위 축소"
        }
      },
      {
        "stageId": "research",
        "title": "자료 조사",
        "summary": "질병관리청 통계 + 교과서 모형",
        "description": "질병관리청 통계와 교과서의 자연선택 모형을 함께 사용했어요. 통계는 연도별 변화만 골라 표 하나로 정리했어요.",
        "checklist": [
          "질병관리청 항생제 내성 통계",
          "교과서 자연선택 모형",
          "연도별 내성균 비율 표 1개"
        ]
      },
      {
        "stageId": "draft",
        "title": "초안 V1 제출",
        "summary": "V1 제출",
        "description": "V1 초안은 통계 표가 포스터의 절반을 차지했어요.",
        "checklist": []
      },
      {
        "stageId": "ai-check",
        "title": "AI 사전 점검",
        "summary": "분량·형식 확인",
        "description": "멘토는 제출 전에 분량, 형식, 평가 기준 누락을 스스로 점검했어요. LearnersHigh의 8단계 구조에 맞춰 이 단계로 표시해요.",
        "checklist": [
          "분량·시간 확인",
          "평가 기준 항목 누락 확인",
          "반복 표현 확인"
        ]
      },
      {
        "stageId": "feedback",
        "title": "선생님 피드백",
        "summary": "피드백 받음",
        "description": "V1 초안을 보고 선생님이 남긴 피드백이에요.",
        "checklist": [],
        "feedback": {
          "source": "선생님 피드백",
          "text": "자연선택 4단계를 중앙에 도식화해보세요.",
          "note": "V1 초안에 받은 선생님 피드백 · V2에서 반영"
        }
      },
      {
        "stageId": "revision",
        "title": "Revision",
        "summary": "V2 수정",
        "description": "V1 초안은 통계 표가 포스터의 절반을 차지했어요. Feedback을 받고 자연선택 4단계를 가운데 두고 통계는 근거로만 배치했어요.",
        "checklist": []
      },
      {
        "stageId": "final",
        "title": "최종 제출 / 발표",
        "summary": "최종 포스터 + 3분 발표",
        "description": "V2 포스터는 변이 → 선택 → 생존·번식 → 내성균 증가 순서로 읽히도록 구성했어요. 발표도 도식 순서를 그대로 따라갔어요.",
        "checklist": [
          "A3 포스터 V2 제출",
          "3분 발표 완료"
        ]
      }
    ],
    "materials": [
      {
        "materialId": "research",
        "role": "evidence",
        "title": "탐구 자료 조사",
        "format": "XLSX",
        "description": "질병관리청 통계 + 교과서 모형",
        "stageId": "research",
        "fileName": "항생제_내성과_자연선택_탐구_자료조사.xlsx",
        "preview": {
          "kind": "table",
          "title": "항생제 내성과 자연선택 탐구 · 자료 조사",
          "description": "질병관리청 통계와 교과서의 자연선택 모형을 함께 사용했어요. 통계는 연도별 변화만 골라 표 하나로 정리했어요.",
          "columns": [
            "자료",
            "사용 방법"
          ],
          "rows": [
            [
              "질병관리청 항생제 내성 통계",
              "연도별 변화만 골라 사용"
            ],
            [
              "교과서 자연선택 모형",
              "자연선택 과정 정리"
            ],
            [
              "연도별 내성균 비율 표 1개",
              "통계를 표 하나로 정리"
            ]
          ],
          "footnote": "개발 검증용 Sample 원본 (development fixture) · 실제 Mentor 제출 파일이 아닙니다."
        },
        "original": {
          "url": researchUrl,
          "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "fileSizeBytes": 9387
        }
      },
      {
        "materialId": "v1",
        "role": "draft",
        "title": "탐구 포스터 V1 초안",
        "format": "HWP",
        "description": "처음 제출한 초안이에요.",
        "stageId": "draft",
        "fileName": "항생제_내성과_자연선택_탐구_V1.hwp",
        "preview": {
          "kind": "document",
          "pages": [
            {
              "pageNumber": 1,
              "title": "항생제 내성과 자연선택 탐구 포스터 · V1 초안",
              "paragraphs": [
                "V1 초안은 통계 표가 포스터의 절반을 차지했어요.",
                "자료: 질병관리청 통계 + 교과서 자연선택 모형, 연도별 내성균 비율 표 1개"
              ],
              "footnote": "개발 검증용 Sample 원본 (development fixture) · 실제 Mentor 제출 파일이 아닙니다."
            }
          ]
        },
        "original": {
          "url": v1Url,
          "mimeType": "application/x-hwp",
          "fileSizeBytes": 18944
        }
      },
      {
        "materialId": "feedback",
        "role": "feedback",
        "title": "V1 선생님 피드백",
        "format": "PDF",
        "description": "자연선택 4단계를 중앙에 도식화해보세요.",
        "stageId": "feedback",
        "fileName": "V1_선생님피드백.pdf",
        "preview": {
          "kind": "document",
          "pages": [
            {
              "pageNumber": 1,
              "title": "V1 선생님 피드백",
              "paragraphs": [
                "자연선택 4단계를 중앙에 도식화해보세요.",
                "V1 초안에 받은 선생님 피드백 · V2에서 반영"
              ],
              "footnote": "개발 검증용 Sample 원본 (development fixture) · 실제 Mentor 제출 파일이 아닙니다."
            }
          ]
        },
        "original": {
          "url": feedbackUrl,
          "mimeType": "application/pdf",
          "fileSizeBytes": 49810
        }
      },
      {
        "materialId": "v2",
        "role": "revision",
        "title": "탐구 포스터 V2 수정본",
        "format": "HWP",
        "description": "반영한 피드백: 자연선택 4단계를 중앙에 도식화해보세요.",
        "stageId": "revision",
        "fileName": "항생제_내성과_자연선택_탐구_V2_수정본.hwp",
        "preview": {
          "kind": "document",
          "pages": [
            {
              "pageNumber": 1,
              "title": "항생제 내성과 자연선택 탐구 포스터 · V2 수정본",
              "paragraphs": [
                "Feedback을 받고 자연선택 4단계를 가운데 두고 통계는 근거로만 배치했어요.",
                "변이 → 선택 → 생존·번식 → 내성균 증가",
                "반영한 피드백: 자연선택 4단계를 중앙에 도식화해보세요."
              ],
              "footnote": "개발 검증용 Sample 원본 (development fixture) · 실제 Mentor 제출 파일이 아닙니다."
            }
          ]
        },
        "original": {
          "url": v2Url,
          "mimeType": "application/x-hwp",
          "fileSizeBytes": 20992
        }
      },
      {
        "materialId": "final",
        "role": "final",
        "title": "탐구 포스터 최종본",
        "format": "PPTX",
        "description": "A3 포스터 V2 제출 · 3분 발표 완료",
        "stageId": "final",
        "fileName": "항생제_내성과_자연선택_탐구_최종본.pptx",
        "preview": {
          "kind": "slides",
          "pages": [
            {
              "pageNumber": 1,
              "title": "항생제 내성과 자연선택 탐구 포스터",
              "lead": "최종 포스터 + 3분 발표",
              "body": "V2 포스터는 변이 → 선택 → 생존·번식 → 내성균 증가 순서로 읽히도록 구성했어요. 발표도 도식 순서를 그대로 따라갔어요."
            },
            {
              "pageNumber": 2,
              "title": "문제 제기",
              "bullets": [
                "처음에는 여러 나라의 항생제 사용량과 내성균 비율을 비교하려고 했어요.",
                "3주 안에 자료를 모으기 어려워 국내 통계 하나로 범위를 줄였어요.",
                "왜 이 주제를 골랐는지"
              ]
            }
          ]
        },
        "original": {
          "url": finalUrl,
          "mimeType": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "fileSizeBytes": 38339
        }
      }
    ],
    "reflection": "통계를 그대로 옮기면 내 탐구가 아니라는 점을 배웠어요.",
    "followUp": "동아리 미생물 배양 실험으로 이어갔고, 생명과학Ⅰ 세특과 동아리 기록에 연결됐어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-story-06",
        "kind": "story",
        "title": "모의고사 성적이 흔들렸을 때 관리 방법",
        "summary": "점수가 흔들린 다음 날 무엇을 했는지 정리했어요.",
        "mentorName": "한지수"
      },
      {
        "contentId": "fixture-content-plan-01",
        "kind": "plan",
        "title": "국어 문학 내신 4주 정리 Plan",
        "summary": "작품별 표현법과 주제를 주차별로 나눠 정리하는 계획이에요.",
        "mentorName": "한지수"
      },
      {
        "contentId": "fixture-content-case-10",
        "kind": "case",
        "title": "청소년의 SNS 이용시간과 행복감 설문조사",
        "summary": "58명 설문 · 평균 비교 · 그래프 · 연구보고서 · 조사 한계 분석 과정을 정리한 Activity Case예요.",
        "mentorName": "최아름"
      },
      {
        "contentId": "fixture-content-record-02",
        "kind": "record",
        "title": "생명과학Ⅰ · 세부능력 및 특기사항",
        "summary": "항생제 내성과 자연선택 탐구 포스터가 생명과학Ⅰ 세특으로 이어진 기록이에요.",
        "mentorName": "한지수"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-02",
    "summary": "두 지점 현장조사 · pH·수온·식생·생물 관찰 · 지도 · 탐구보고서 과정을 정리한 Activity Case예요.",
    "activities": [
      "두 지점 현장조사",
      "pH·수온·식생·생물 관찰",
      "지도",
      "탐구보고서"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "환경 탐구 과제",
        "description": "주변 환경 하나를 정해 직접 관찰하고 탐구보고서를 쓰는 과제였어요.",
        "checklist": []
      },
      {
        "stageId": "plan",
        "title": "조사 계획",
        "summary": "두 지점 선정",
        "description": "하천 상류와 하류 쪽 두 지점을 정하고 측정 항목을 미리 정했어요.",
        "checklist": [
          "pH",
          "수온",
          "식생",
          "관찰 생물"
        ]
      },
      {
        "stageId": "field",
        "title": "현장 조사",
        "summary": "pH · 수온 · 식생 · 생물",
        "description": "두 지점에서 pH와 수온을 재고 주변 식생과 관찰한 생물을 기록했어요.",
        "checklist": []
      },
      {
        "stageId": "map",
        "title": "지도 정리",
        "summary": "조사 지점 지도",
        "description": "조사 지점과 관찰 결과를 지도에 함께 표시했어요.",
        "checklist": []
      },
      {
        "stageId": "report",
        "title": "탐구보고서",
        "summary": "보고서 제출",
        "description": "두 지점의 차이를 정리하고, 한 번의 측정으로는 단정하기 어렵다는 한계를 적었어요.",
        "checklist": []
      }
    ],
    "materials": [
      {
        "materialId": "field-sheet",
        "role": "evidence",
        "title": "현장 관찰 기록표",
        "format": "XLSX",
        "description": "두 지점 측정 · 관찰 기록",
        "stageId": "field"
      },
      {
        "materialId": "map",
        "role": "evidence",
        "title": "조사 지점 지도",
        "format": "PDF",
        "description": "지점별 결과 표시",
        "stageId": "map"
      },
      {
        "materialId": "report",
        "role": "final",
        "title": "하천 수질과 생물 관찰 탐구보고서",
        "format": "HWP",
        "description": "탐구보고서",
        "stageId": "report"
      }
    ],
    "reflection": "한 번 측정한 값으로는 단정하기 어렵다는 걸 알고 계절별로 다시 재기로 했어요.",
    "followUp": "계절별 측정으로 이어가 환경 탐구 세특 기록과 연결됐어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-record-01",
        "kind": "record",
        "title": "환경 탐구를 생명과학 진로로 연결한 세특 기록",
        "summary": "환경 탐구 활동이 생명과학 진로 기록으로 이어진 흐름을 볼 수 있어요.",
        "mentorName": "한예린"
      },
      {
        "contentId": "fixture-content-case-03",
        "kind": "case",
        "title": "가공음료의 당류 함량 비교와 하루 섭취량 분석",
        "summary": "음료 12종 영양정보 조사 · 당류 비교표·막대그래프 · 식생활 개선안 과정을 정리한 Activity Case예요.",
        "mentorName": "박나윤"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-03",
    "summary": "음료 12종 영양정보 조사 · 당류 비교표·막대그래프 · 식생활 개선안 과정을 정리한 Activity Case예요.",
    "activities": [
      "음료 12종 영양정보 조사",
      "당류 비교표·막대그래프",
      "식생활 개선안"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "식생활 탐구 과제",
        "description": "자주 먹는 식품의 영양 정보를 조사하고 식생활 개선안을 제안하는 과제였어요.",
        "checklist": []
      },
      {
        "stageId": "collect",
        "title": "영양정보 조사",
        "summary": "음료 12종",
        "description": "친구들이 자주 마시는 가공음료 12종의 영양정보 표시를 기록했어요.",
        "checklist": []
      },
      {
        "stageId": "compare",
        "title": "당류 비교",
        "summary": "비교표 · 막대그래프",
        "description": "당류 함량을 비교표와 막대그래프로 정리하고 하루 섭취 기준과 비교했어요.",
        "checklist": []
      },
      {
        "stageId": "propose",
        "title": "식생활 개선안",
        "summary": "개선안 제안",
        "description": "하루 섭취량을 기준으로 음료를 고르는 방법을 개선안으로 정리했어요.",
        "checklist": []
      }
    ],
    "materials": [
      {
        "materialId": "nutrition",
        "role": "evidence",
        "title": "음료 영양정보 조사표",
        "format": "XLSX",
        "description": "12종 당류 함량",
        "stageId": "collect"
      },
      {
        "materialId": "chart",
        "role": "evidence",
        "title": "당류 비교 막대그래프",
        "format": "PDF",
        "description": "비교표 · 막대그래프",
        "stageId": "compare"
      },
      {
        "materialId": "proposal",
        "role": "final",
        "title": "식생활 개선안",
        "format": "HWP",
        "description": "하루 섭취량 기준 개선안",
        "stageId": "propose"
      }
    ],
    "reflection": "하루 섭취 기준과 비교하니 숫자가 훨씬 와닿았어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-routine-01",
        "kind": "routine",
        "title": "물리Ⅰ·화학Ⅰ 개념 복습 루틴",
        "summary": "물리 공식 유도와 화학 계산 문제를 번갈아 복습하는 루틴이에요.",
        "mentorName": "박나윤"
      },
      {
        "contentId": "fixture-content-case-02",
        "kind": "case",
        "title": "학교 주변 하천의 수질과 생물 관찰",
        "summary": "두 지점 현장조사 · pH·수온·식생·생물 관찰 · 지도 · 탐구보고서 과정을 정리한 Activity Case예요.",
        "mentorName": "한예린"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-04",
    "summary": "광고 영상 분석 · 표현 분류 · A4 분석지 2쪽 · 4분 발표 과정을 정리한 Activity Case예요.",
    "activities": [
      "광고 영상 분석",
      "과장·반복·감정 호소 표현 분류",
      "A4 분석지 2쪽",
      "4분 발표"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "국어 매체 단원 수행평가",
        "description": "광고 한 편을 골라 언어적 설득 전략을 분석하고 4분 동안 발표하는 국어 수행평가였어요.",
        "checklist": [
          "분석할 광고 1편 선정",
          "A4 분석지 2쪽",
          "4분 발표"
        ]
      },
      {
        "stageId": "topic",
        "title": "광고 선정",
        "summary": "배달앱 광고 1편",
        "description": "자주 보던 배달앱 광고 3편을 비교한 뒤, 표현이 가장 다양하게 쓰인 한 편을 골랐어요.",
        "checklist": [],
        "planChange": {
          "before": "광고 전반의 설득 전략",
          "after": "배달앱 광고 1편의 언어 표현"
        }
      },
      {
        "stageId": "classify",
        "title": "표현 분류",
        "summary": "과장 · 반복 · 감정 호소",
        "description": "광고 문구를 받아 적고 과장, 반복, 감정 호소 표현으로 나눠 표로 정리했어요. 두 유형에 걸치는 문장은 이유를 메모로 남겼어요.",
        "checklist": [
          "광고 문구 받아 적기",
          "표현 유형 3가지로 분류",
          "애매한 문장은 근거 메모"
        ]
      },
      {
        "stageId": "write",
        "title": "분석지 작성",
        "summary": "A4 분석지 2쪽",
        "description": "분류 결과를 바탕으로 각 표현이 보는 사람의 판단에 어떤 영향을 주는지 분석지 2쪽에 정리했어요.",
        "checklist": []
      },
      {
        "stageId": "present",
        "title": "발표",
        "summary": "4분 발표",
        "description": "분석지 순서대로 광고 문구를 보여주며 4분 동안 발표했어요.",
        "checklist": [
          "문구 중심 발표 자료",
          "4분 시간 맞추기"
        ]
      }
    ],
    "materials": [
      {
        "materialId": "classify-table",
        "role": "evidence",
        "title": "광고 문구 분류표",
        "format": "XLSX",
        "description": "과장 · 반복 · 감정 호소 표현 분류",
        "stageId": "classify"
      },
      {
        "materialId": "analysis-sheet",
        "role": "final",
        "title": "배달앱 광고 분석지",
        "format": "HWP",
        "description": "A4 2쪽 분석지",
        "stageId": "write"
      },
      {
        "materialId": "slides",
        "role": "final",
        "title": "발표 자료",
        "format": "PPTX",
        "description": "4분 발표에 쓴 자료",
        "stageId": "present"
      }
    ],
    "reflection": "같은 문장도 어떤 장면과 함께 나오느냐에 따라 설득 방식이 달라진다는 걸 알게 됐어요.",
    "followUp": "독서토론 동아리에서 광고와 뉴스의 설득 방식을 비교하는 토론으로 이어갔어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-record-05",
        "kind": "record",
        "title": "독서토론 동아리 · 동아리활동",
        "summary": "광고와 뉴스의 설득 방식 비교가 독서토론 동아리 기록으로 이어진 사례예요.",
        "mentorName": "이채린"
      },
      {
        "contentId": "fixture-content-plan-04",
        "kind": "plan",
        "title": "고2 수행평가 준비 3주 Plan",
        "summary": "주제 선정, 자료 조사, 초안을 3주로 나눈 수행평가 계획이에요.",
        "mentorName": "이채린"
      },
      {
        "contentId": "fixture-content-case-05",
        "kind": "case",
        "title": "유튜브 뉴스 썸네일의 표현 방식 분석",
        "summary": "뉴스 영상 12개 비교 · 제목·썸네일 표현 분류 · 분석표 · 보고서 과정을 정리한 Activity Case예요.",
        "mentorName": "윤하람"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-05",
    "summary": "뉴스 영상 12개 비교 · 제목·썸네일 표현 분류 · 분석표 · 보고서 과정을 정리한 Activity Case예요.",
    "activities": [
      "뉴스 영상 12개 비교",
      "제목·썸네일 표현 분류",
      "분석표",
      "보고서"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "언어와 매체 탐구 보고서",
        "description": "매체 언어의 특징을 하나 골라 자료를 비교하고 보고서로 쓰는 과제였어요.",
        "checklist": []
      },
      {
        "stageId": "collect",
        "title": "자료 수집",
        "summary": "뉴스 영상 12개",
        "description": "같은 사건을 다룬 유튜브 뉴스 영상 12개를 모아 제목과 썸네일 문구를 기록했어요.",
        "checklist": [
          "같은 사건을 다룬 영상 12개",
          "제목 · 썸네일 문구 기록",
          "채널 이름은 분석에서 빼기"
        ]
      },
      {
        "stageId": "classify",
        "title": "표현 분류",
        "summary": "분석표 작성",
        "description": "의문형, 강조 부호, 감정어, 숫자 강조 네 가지 기준으로 표현을 나눠 분석표를 만들었어요.",
        "checklist": []
      },
      {
        "stageId": "report",
        "title": "보고서 작성",
        "summary": "분석 보고서",
        "description": "같은 사건이라도 표현에 따라 시청자가 받는 인상이 달라질 수 있다는 점을 분류 결과와 함께 보고서로 정리했어요.",
        "checklist": []
      }
    ],
    "materials": [
      {
        "materialId": "video-list",
        "role": "evidence",
        "title": "뉴스 영상 목록",
        "format": "XLSX",
        "description": "영상 12개의 제목 · 썸네일 문구",
        "stageId": "collect"
      },
      {
        "materialId": "analysis-table",
        "role": "evidence",
        "title": "썸네일 표현 분석표",
        "format": "XLSX",
        "description": "표현 기준 4가지로 분류",
        "stageId": "classify"
      },
      {
        "materialId": "report",
        "role": "final",
        "title": "뉴스 썸네일 표현 분석 보고서",
        "format": "PDF",
        "description": "분석 보고서",
        "stageId": "report"
      }
    ],
    "reflection": "분류 기준을 먼저 정해두니 영상이 늘어나도 비교가 흔들리지 않았어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-plan-03",
        "kind": "plan",
        "title": "수능 국어 비문학 8주 Plan",
        "summary": "지문 구조 분석과 풀이 시간 단축을 8주로 나눈 계획이에요.",
        "mentorName": "윤하람"
      },
      {
        "contentId": "fixture-content-case-04",
        "kind": "case",
        "title": "배달앱 광고의 언어적 설득 전략 분석",
        "summary": "광고 영상 분석 · 표현 분류 · A4 분석지 2쪽 · 4분 발표 과정을 정리한 Activity Case예요.",
        "mentorName": "이채린"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-06",
    "summary": "기사 조사 · 영어 원고 · 시각자료 1장 · 발표시간 조정 · 3분 Speech 과정을 정리한 Activity Case예요.",
    "activities": [
      "기사 조사",
      "영어 원고",
      "시각자료 1장",
      "발표시간 조정",
      "3분 Speech"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "3분 영어 Speech",
        "description": "사회 이슈 하나를 골라 3분 동안 영어로 의견을 말하는 수행평가였어요.",
        "checklist": [
          "3분 내외",
          "시각자료 1장",
          "원고 제출"
        ]
      },
      {
        "stageId": "research",
        "title": "기사 조사",
        "summary": "청소년 스마트폰 사용",
        "description": "청소년 스마트폰 사용 시간에 관한 영어 기사 두 편을 읽고 근거로 쓸 문장을 골랐어요.",
        "checklist": []
      },
      {
        "stageId": "script",
        "title": "원고 작성",
        "summary": "영어 원고",
        "description": "주장 → 근거 → 제안 순서로 영어 원고를 썼어요.",
        "checklist": []
      },
      {
        "stageId": "timing",
        "title": "시간 조정",
        "summary": "3분에 맞추기",
        "description": "처음 연습에서 3분을 훌쩍 넘겨 근거 하나를 빼고 문장을 짧게 바꿨어요.",
        "checklist": [],
        "planChange": {
          "before": "근거 3개 · 약 4분",
          "after": "근거 2개 · 3분"
        }
      },
      {
        "stageId": "speech",
        "title": "발표",
        "summary": "3분 Speech",
        "description": "시각자료 한 장을 띄우고 원고를 보지 않고 3분 동안 발표했어요.",
        "checklist": []
      }
    ],
    "materials": [
      {
        "materialId": "script",
        "role": "draft",
        "title": "영어 Speech 원고",
        "format": "DOCX",
        "description": "주장 · 근거 · 제안 순서 원고",
        "stageId": "script"
      },
      {
        "materialId": "final-script",
        "role": "final",
        "title": "영어 Speech 최종 원고",
        "format": "DOCX",
        "description": "3분에 맞춘 원고",
        "stageId": "timing"
      },
      {
        "materialId": "visual",
        "role": "final",
        "title": "시각자료 1장",
        "format": "PPTX",
        "description": "발표 중 띄운 자료",
        "stageId": "speech"
      }
    ],
    "reflection": "시간을 맞추려고 줄인 문장이 오히려 더 잘 들렸어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-plan-05",
        "kind": "plan",
        "title": "영어 빈칸·순서 유형 4주 Plan",
        "summary": "모의고사에서 자주 틀리는 빈칸·순서 유형만 4주 동안 집중하는 계획이에요.",
        "mentorName": "오준석"
      },
      {
        "contentId": "fixture-content-case-07",
        "kind": "case",
        "title": "우리 지역 관광지 영어 안내문 개선",
        "summary": "안내판 조사 · 한·영 문구 비교 · 표현 수정 · Before/After · 영어 발표 과정을 정리한 Activity Case예요.",
        "mentorName": "최은채"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-07",
    "summary": "안내판 조사 · 한·영 문구 비교 · 표현 수정 · Before/After · 영어 발표 과정을 정리한 Activity Case예요.",
    "activities": [
      "실제 안내판 조사",
      "한·영 문구 비교",
      "표현 수정",
      "Before/After",
      "영어 발표"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "영어 실생활 프로젝트",
        "description": "생활 속 영어 표현을 조사하고 더 나은 표현을 제안하는 영어 프로젝트였어요.",
        "checklist": []
      },
      {
        "stageId": "survey",
        "title": "안내판 조사",
        "summary": "관광지 두 곳",
        "description": "우리 지역 관광지 두 곳의 영어 안내판 문구를 직접 보고 기록했어요.",
        "checklist": [
          "영어 문구 기록",
          "한국어 원문 함께 기록"
        ]
      },
      {
        "stageId": "compare",
        "title": "한·영 비교",
        "summary": "직역 표현 찾기",
        "description": "한국어 원문과 영어 문구를 나란히 놓고, 직역 때문에 방문자에게 필요한 정보가 빠진 부분을 찾았어요.",
        "checklist": []
      },
      {
        "stageId": "revise",
        "title": "표현 수정",
        "summary": "Before / After",
        "description": "안내문의 목적과 읽는 사람을 기준으로 문구를 고치고 Before / After 표로 정리했어요.",
        "checklist": []
      },
      {
        "stageId": "present",
        "title": "영어 발표",
        "summary": "개선안 발표",
        "description": "문구를 왜 그렇게 고쳤는지 영어로 발표했어요.",
        "checklist": []
      }
    ],
    "materials": [
      {
        "materialId": "survey-sheet",
        "role": "evidence",
        "title": "안내판 문구 기록표",
        "format": "XLSX",
        "description": "관광지 두 곳의 한 · 영 문구",
        "stageId": "survey"
      },
      {
        "materialId": "before-after",
        "role": "final",
        "title": "Before / After 비교표",
        "format": "PDF",
        "description": "수정 전후 문구",
        "stageId": "revise"
      },
      {
        "materialId": "slides",
        "role": "final",
        "title": "영어 발표 자료",
        "format": "PPTX",
        "description": "개선안 발표",
        "stageId": "present"
      }
    ],
    "reflection": "정확한 번역보다 읽는 사람이 무엇을 알고 싶은지가 먼저라는 걸 배웠어요.",
    "followUp": "학교 행사 영어 안내자료 제작으로 활동을 넓혔어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-record-06",
        "kind": "record",
        "title": "국제통상 · 진로활동",
        "summary": "관광지 영어 안내문 개선이 국제통상 진로활동 기록으로 이어진 흐름이에요.",
        "mentorName": "최은채"
      },
      {
        "contentId": "fixture-content-routine-02",
        "kind": "routine",
        "title": "영어 단어·구문 매일 30분",
        "summary": "아침·저녁 30분씩 단어와 구문을 반복하는 루틴이에요.",
        "mentorName": "최은채"
      },
      {
        "contentId": "fixture-content-case-06",
        "kind": "case",
        "title": "청소년 스마트폰 사용에 대한 3분 영어 Speech",
        "summary": "기사 조사 · 영어 원고 · 시각자료 1장 · 발표시간 조정 · 3분 Speech 과정을 정리한 Activity Case예요.",
        "mentorName": "오준석"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-08",
    "summary": "독립신문·헌의 6조 사료 분석 · 비교표 · A4 3쪽 보고서 과정을 정리한 Activity Case예요.",
    "activities": [
      "독립신문·헌의 6조 등 사료 분석",
      "비교표",
      "A4 3쪽 보고서"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "한국사 사료 탐구",
        "description": "근대 개혁 운동과 관련된 사료를 두 개 이상 비교해 보고서를 쓰는 과제였어요.",
        "checklist": [
          "사료 2개 이상",
          "비교표",
          "A4 3쪽"
        ]
      },
      {
        "stageId": "select",
        "title": "사료 선정",
        "summary": "독립신문 · 헌의 6조",
        "description": "교과서에 나온 독립신문 기사와 헌의 6조를 중심 사료로 골랐어요.",
        "checklist": []
      },
      {
        "stageId": "analyze",
        "title": "사료 분석",
        "summary": "주장 · 대상 · 배경",
        "description": "각 사료가 누구에게 무엇을 주장했는지, 어떤 배경에서 나왔는지 나눠 읽었어요.",
        "checklist": []
      },
      {
        "stageId": "compare",
        "title": "비교표 작성",
        "summary": "공통점 · 차이점",
        "description": "두 사료의 공통 요구와 표현 차이를 비교표로 정리했어요.",
        "checklist": []
      },
      {
        "stageId": "report",
        "title": "보고서",
        "summary": "A4 3쪽",
        "description": "비교표를 근거로 독립협회와 만민공동회의 활동 방향을 정리한 보고서를 냈어요.",
        "checklist": []
      }
    ],
    "materials": [
      {
        "materialId": "reading-note",
        "role": "evidence",
        "title": "사료 읽기 메모",
        "format": "HWP",
        "description": "사료별 주장 · 대상 · 배경",
        "stageId": "analyze"
      },
      {
        "materialId": "compare-table",
        "role": "evidence",
        "title": "사료 비교표",
        "format": "HWP",
        "description": "공통점 · 차이점 정리",
        "stageId": "compare"
      },
      {
        "materialId": "report",
        "role": "final",
        "title": "사료 비교 분석 보고서",
        "format": "HWP",
        "description": "A4 3쪽 보고서",
        "stageId": "report"
      }
    ],
    "reflection": "사료를 요약하기보다 누가 누구에게 쓴 글인지 먼저 보니 해석이 분명해졌어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-story-04",
        "kind": "story",
        "title": "국어 비문학 시간이 모자랐던 고3 여름",
        "summary": "지문을 끝까지 읽기 전에 구조부터 잡는 연습으로 바꾼 과정이에요.",
        "mentorName": "박서현"
      },
      {
        "contentId": "fixture-content-case-09",
        "kind": "case",
        "title": "산업혁명 시기 노동환경과 사회 변화 조사",
        "summary": "공장·노동 자료 조사 · 아동노동·도시화 분석 · 사료 분석표 · 보고서 과정을 정리한 Activity Case예요.",
        "mentorName": "이현서"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-09",
    "summary": "공장·노동 자료 조사 · 아동노동·도시화 분석 · 사료 분석표 · 보고서 과정을 정리한 Activity Case예요.",
    "activities": [
      "공장·노동 자료 조사",
      "아동노동·도시화 분석",
      "사료 분석표",
      "보고서"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "세계사 주제 탐구",
        "description": "세계사 단원에서 주제를 하나 정해 자료를 조사하고 보고서를 쓰는 과제였어요.",
        "checklist": []
      },
      {
        "stageId": "research",
        "title": "자료 조사",
        "summary": "공장 · 노동 자료",
        "description": "산업혁명 시기 공장 노동 시간과 임금에 관한 자료를 교과서와 도서관 자료에서 찾았어요.",
        "checklist": []
      },
      {
        "stageId": "analyze",
        "title": "주제 분석",
        "summary": "아동노동 · 도시화",
        "description": "자료를 아동노동과 도시화 두 주제로 나눠 변화의 원인과 결과를 정리했어요.",
        "checklist": []
      },
      {
        "stageId": "table",
        "title": "사료 분석표",
        "summary": "자료별 관점 정리",
        "description": "자료마다 누가, 어떤 입장에서 남긴 기록인지 분석표로 정리했어요.",
        "checklist": []
      },
      {
        "stageId": "report",
        "title": "보고서",
        "summary": "조사 보고서",
        "description": "분석표를 근거로 노동환경 변화가 사회에 미친 영향을 보고서로 썼어요.",
        "checklist": []
      }
    ],
    "materials": [
      {
        "materialId": "source-table",
        "role": "evidence",
        "title": "사료 분석표",
        "format": "XLSX",
        "description": "자료별 작성자 · 입장",
        "stageId": "table"
      },
      {
        "materialId": "report",
        "role": "final",
        "title": "산업혁명 노동환경 조사 보고서",
        "format": "PDF",
        "description": "조사 보고서",
        "stageId": "report"
      }
    ],
    "reflection": "숫자 자료와 당시 사람들의 기록을 함께 보니 변화가 더 구체적으로 보였어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-story-07",
        "kind": "story",
        "title": "수시 준비를 중단하고 정시로 전환한 이유",
        "summary": "전형을 바꾸기로 한 시점과 기준을 적었어요.",
        "mentorName": "이현서"
      },
      {
        "contentId": "fixture-content-case-08",
        "kind": "case",
        "title": "독립협회와 만민공동회 관련 사료 비교 분석",
        "summary": "독립신문·헌의 6조 사료 분석 · 비교표 · A4 3쪽 보고서 과정을 정리한 Activity Case예요.",
        "mentorName": "박서현"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-10",
    "summary": "58명 설문 · 평균 비교 · 그래프 · 연구보고서 · 조사 한계 분석 과정을 정리한 Activity Case예요.",
    "activities": [
      "58명 설문",
      "평균 비교",
      "그래프",
      "연구보고서",
      "조사 한계 분석"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "사회문화 연구 과제",
        "description": "사회 현상 하나를 정해 직접 자료를 모으고 연구보고서를 쓰는 과제였어요.",
        "checklist": []
      },
      {
        "stageId": "design",
        "title": "설문 설계",
        "summary": "이용시간 · 행복감 문항",
        "description": "이용시간과 행복감을 묻는 문항을 나누고, 응답한 사람을 알 수 있는 질문은 넣지 않았어요.",
        "checklist": [
          "이용시간 구간 문항",
          "행복감 5점 척도",
          "응답자를 알 수 있는 질문 빼기"
        ]
      },
      {
        "stageId": "collect",
        "title": "설문 조사",
        "summary": "58명 응답",
        "description": "같은 학년 학생 58명의 응답을 익명으로 모았어요.",
        "checklist": []
      },
      {
        "stageId": "analyze",
        "title": "결과 분석",
        "summary": "평균 비교 · 그래프",
        "description": "이용시간 구간별 행복감 평균을 비교하고 막대그래프로 나타냈어요.",
        "checklist": []
      },
      {
        "stageId": "report",
        "title": "연구보고서",
        "summary": "조사 한계 분석",
        "description": "결과와 함께 응답자가 한 학년뿐이라는 점, 스스로 답한 응답이라는 한계를 보고서에 적었어요.",
        "checklist": []
      }
    ],
    "materials": [
      {
        "materialId": "questionnaire",
        "role": "evidence",
        "title": "설문 문항지",
        "format": "PDF",
        "description": "이용시간 · 행복감 문항",
        "stageId": "design"
      },
      {
        "materialId": "tally",
        "role": "evidence",
        "title": "응답 집계표",
        "format": "XLSX",
        "description": "58명 응답 집계",
        "stageId": "analyze"
      },
      {
        "materialId": "report",
        "role": "final",
        "title": "연구보고서",
        "format": "HWP",
        "description": "조사 한계 분석 포함",
        "stageId": "report"
      }
    ],
    "reflection": "결과보다 조사 한계를 쓰는 부분에서 더 많이 고민했어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-story-08",
        "kind": "story",
        "title": "탐구 주제를 너무 넓게 잡았던 실패",
        "summary": "주제를 좁히지 못해 다시 시작했던 경험과 바꾼 방법이에요.",
        "mentorName": "최아름"
      },
      {
        "contentId": "fixture-content-case-19",
        "kind": "case",
        "title": "스마트폰 사용시간과 수면시간의 관계 조사",
        "summary": "52명 설문 · CSV · 산점도 · 상관계수 · 통계 보고서 과정을 정리한 Activity Case예요.",
        "mentorName": "정세진"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-11",
    "summary": "난민협약 조사 · 입론서 · 예상 반론 · 토론 · 후속 정책 비교 과정을 정리한 Activity Case예요.",
    "activities": [
      "난민협약 조사",
      "입론서",
      "예상 반론",
      "토론",
      "후속 정책 비교"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "모둠 토론 수행평가",
        "description": "국제 문제 하나를 정해 찬반으로 나눠 토론하는 수행평가였어요.",
        "checklist": []
      },
      {
        "stageId": "research",
        "title": "자료 조사",
        "summary": "난민협약 · 기후 난민",
        "description": "난민협약의 난민 정의를 찾아보고, 기후 변화로 이주한 사람들이 왜 보호 대상에서 빠지는지 조사했어요.",
        "checklist": []
      },
      {
        "stageId": "opening",
        "title": "입론 작성",
        "summary": "찬성 측 입론서",
        "description": "보호가 필요한 이유를 근거 세 가지로 나눠 입론서를 썼어요.",
        "checklist": []
      },
      {
        "stageId": "rebuttal",
        "title": "반론 준비",
        "summary": "예상 반론 3개",
        "description": "상대 측이 낼 만한 반론 세 가지를 정리하고 각각 답할 근거를 붙였어요.",
        "checklist": []
      },
      {
        "stageId": "debate",
        "title": "토론",
        "summary": "모둠 토론",
        "description": "입론 → 반론 → 최종 발언 순서로 토론했어요.",
        "checklist": []
      }
    ],
    "materials": [
      {
        "materialId": "opening",
        "role": "evidence",
        "title": "입론서",
        "format": "HWP",
        "description": "찬성 측 근거 3가지",
        "stageId": "opening"
      },
      {
        "materialId": "rebuttal",
        "role": "evidence",
        "title": "예상 반론 정리",
        "format": "HWP",
        "description": "반론 3개와 답변 근거",
        "stageId": "rebuttal"
      }
    ],
    "reflection": "반론을 미리 써보니 내 입론에서 약한 근거가 먼저 보였어요.",
    "followUp": "토론 뒤 여러 나라의 기후 이주 관련 정책을 비교해 정리했어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-case-16",
        "kind": "case",
        "title": "SNS 추천 알고리즘과 정보 편향에 관한 윤리 토론",
        "summary": "Filter Bubble 조사 · 표현의 자유·플랫폼 책임 비교 · 토론 개요서 과정을 정리한 Activity Case예요.",
        "mentorName": "김태현"
      },
      {
        "contentId": "fixture-content-case-15",
        "kind": "case",
        "title": "AI 면접의 공정성에 관한 윤리 논증문",
        "summary": "알고리즘 편향 조사 · 찬반 논거 비교 · 1,700자 논증문 과정을 정리한 Activity Case예요.",
        "mentorName": "고민정"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-12",
    "summary": "버스정류장·배차간격 조사 · 생활권 지도 · 접근성 분석 · 개선안 과정을 정리한 Activity Case예요.",
    "activities": [
      "버스정류장·배차간격 조사",
      "생활권 지도",
      "접근성 분석",
      "개선안"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "지역 조사 보고서",
        "description": "우리 지역의 문제 하나를 직접 조사하고 개선안을 제안하는 과제였어요.",
        "checklist": []
      },
      {
        "stageId": "field",
        "title": "현장 조사",
        "summary": "정류장 · 배차간격",
        "description": "생활권 안의 버스정류장 위치와 노선별 배차간격을 조사했어요.",
        "checklist": []
      },
      {
        "stageId": "map",
        "title": "지도 작성",
        "summary": "생활권 지도",
        "description": "조사한 정류장을 생활권 지도에 표시하고 걸어서 갈 수 있는 범위를 그렸어요.",
        "checklist": []
      },
      {
        "stageId": "analyze",
        "title": "접근성 분석",
        "summary": "취약 구역 찾기",
        "description": "정류장까지 거리와 배차간격을 함께 보고 접근성이 낮은 구역을 찾았어요.",
        "checklist": []
      },
      {
        "stageId": "propose",
        "title": "개선안",
        "summary": "노선 · 정류장 제안",
        "description": "접근성이 낮은 구역에 필요한 노선 조정과 정류장 위치를 개선안으로 정리했어요.",
        "checklist": []
      }
    ],
    "materials": [
      {
        "materialId": "field-sheet",
        "role": "evidence",
        "title": "정류장 · 배차간격 조사표",
        "format": "XLSX",
        "description": "정류장 위치와 노선별 배차간격",
        "stageId": "field"
      },
      {
        "materialId": "map",
        "role": "evidence",
        "title": "생활권 지도",
        "format": "PDF",
        "description": "정류장과 도보 범위 표시",
        "stageId": "map"
      },
      {
        "materialId": "report",
        "role": "final",
        "title": "대중교통 접근성 조사 보고서",
        "format": "HWP",
        "description": "분석과 개선안",
        "stageId": "propose"
      }
    ],
    "reflection": "지도에 직접 그려보니 숫자로만 볼 때 놓친 구역이 보였어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-plan-07",
        "kind": "plan",
        "title": "모의고사 이후 오답 7일 Plan",
        "summary": "모의고사 다음 날부터 7일 동안 오답을 정리하는 계획이에요.",
        "mentorName": "김도연"
      },
      {
        "contentId": "fixture-content-case-20",
        "kind": "case",
        "title": "학교 주변 보행 안전지도 제작",
        "summary": "통학로 조사 · 신호시간·차량량 기록 · 위험도 점수화 · 안전지도 과정을 정리한 Activity Case예요.",
        "mentorName": "이수빈"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-13",
    "summary": "편의점 3곳·상품 15개 가격조사 · 32명 설문 · 그래프 · 경제 보고서 과정을 정리한 Activity Case예요.",
    "activities": [
      "편의점 3곳·상품 15개 가격조사",
      "32명 설문",
      "그래프",
      "경제 보고서"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "경제 개념 적용 보고서",
        "description": "배운 경제 개념을 생활 속 사례에 적용해 보고서로 쓰는 과제였어요.",
        "checklist": []
      },
      {
        "stageId": "price",
        "title": "가격 조사",
        "summary": "편의점 3곳 · 상품 15개",
        "description": "편의점 3곳에서 같은 상품 15개의 가격과 행사 여부를 기록했어요.",
        "checklist": []
      },
      {
        "stageId": "survey",
        "title": "소비자 설문",
        "summary": "32명 응답",
        "description": "상품을 고를 때 가격, 행사, 브랜드 중 무엇을 먼저 보는지 32명에게 물었어요.",
        "checklist": []
      },
      {
        "stageId": "analyze",
        "title": "분석",
        "summary": "그래프 정리",
        "description": "가격 차이와 설문 결과를 그래프로 나란히 놓고 비교했어요.",
        "checklist": []
      },
      {
        "stageId": "report",
        "title": "경제 보고서",
        "summary": "보고서 제출",
        "description": "가격만으로 설명되지 않는 소비자 선택을 수요 개념과 연결해 보고서로 정리했어요.",
        "checklist": []
      }
    ],
    "materials": [
      {
        "materialId": "price-sheet",
        "role": "evidence",
        "title": "가격 조사표",
        "format": "XLSX",
        "description": "3곳 · 상품 15개 가격",
        "stageId": "price"
      },
      {
        "materialId": "report",
        "role": "final",
        "title": "편의점 가격과 소비자 선택 보고서",
        "format": "HWP",
        "description": "경제 보고서",
        "stageId": "report"
      }
    ],
    "reflection": "가장 싼 상품이 가장 많이 팔리지는 않는다는 결과가 수요 개념을 다시 보게 했어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-routine-03",
        "kind": "routine",
        "title": "수능 D-100 하루 공부 루틴",
        "summary": "기상부터 취침까지 과목별 시간을 고정한 하루 루틴이에요.",
        "mentorName": "조민재"
      },
      {
        "contentId": "fixture-content-case-14",
        "kind": "case",
        "title": "교내 매점 판매 데이터를 활용한 상품 수요 분석",
        "summary": "가격·판매량·행사 여부 비교 · Spreadsheet · 그래프 · 분석보고서 과정을 정리한 Activity Case예요.",
        "mentorName": "서지호"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-14",
    "summary": "가격·판매량·행사 여부 비교 · Spreadsheet · 그래프 · 분석보고서 과정을 정리한 Activity Case예요.",
    "activities": [
      "가격·판매량·행사 여부 비교",
      "Spreadsheet",
      "그래프",
      "분석보고서"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "경제 · 수학 융합 과제",
        "description": "경제 개념을 실제 데이터로 확인하는 융합 과제였어요.",
        "checklist": []
      },
      {
        "stageId": "data",
        "title": "데이터 정리",
        "summary": "판매 기록 정리",
        "description": "교내 매점 상품별 판매 기록을 Spreadsheet로 정리했어요.",
        "checklist": []
      },
      {
        "stageId": "compare",
        "title": "비교 분석",
        "summary": "가격 · 판매량 · 행사",
        "description": "가격, 판매량, 행사 여부를 함께 놓고 행사 기간에 판매량이 어떻게 달라졌는지 비교했어요.",
        "checklist": []
      },
      {
        "stageId": "graph",
        "title": "그래프",
        "summary": "상품별 그래프",
        "description": "상품별 판매량 변화를 그래프로 나타냈어요.",
        "checklist": []
      },
      {
        "stageId": "report",
        "title": "분석보고서",
        "summary": "보고서 제출",
        "description": "그래프를 근거로 가격과 행사가 수요에 미친 영향을 분석보고서로 정리했어요.",
        "checklist": []
      }
    ],
    "materials": [
      {
        "materialId": "spreadsheet",
        "role": "evidence",
        "title": "판매 데이터 Spreadsheet",
        "format": "XLSX",
        "description": "가격 · 판매량 · 행사 여부",
        "stageId": "data"
      },
      {
        "materialId": "graph",
        "role": "evidence",
        "title": "상품별 판매량 그래프",
        "format": "PDF",
        "description": "판매량 변화 그래프",
        "stageId": "graph"
      },
      {
        "materialId": "report",
        "role": "final",
        "title": "상품 수요 분석보고서",
        "format": "HWP",
        "description": "분석보고서",
        "stageId": "report"
      }
    ],
    "reflection": "그래프를 그리기 전에 비교 기준을 정해두는 게 분석의 절반이었어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-routine-05",
        "kind": "routine",
        "title": "학교 시험기간 하루 공부 루틴",
        "summary": "시험기간 하루를 과목별 시간 블록으로 나눈 루틴이에요.",
        "mentorName": "서지호"
      },
      {
        "contentId": "fixture-content-case-13",
        "kind": "case",
        "title": "편의점 상품 가격과 소비자 선택 조사",
        "summary": "편의점 3곳·상품 15개 가격조사 · 32명 설문 · 그래프 · 경제 보고서 과정을 정리한 Activity Case예요.",
        "mentorName": "조민재"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-15",
    "summary": "알고리즘 편향 조사 · 찬반 논거 비교 · 1,700자 논증문 과정을 정리한 Activity Case예요.",
    "activities": [
      "알고리즘 편향 조사",
      "찬반 논거 비교",
      "1,700자 논증문"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "윤리 논증문 수행평가",
        "description": "현대 윤리 쟁점 하나에 대해 자신의 입장을 논증하는 1,700자 글을 쓰는 과제였어요.",
        "checklist": [
          "쟁점 1개",
          "찬반 검토",
          "1,700자 내외"
        ]
      },
      {
        "stageId": "research",
        "title": "자료 조사",
        "summary": "알고리즘 편향",
        "description": "알고리즘 편향과 사람 평가자의 편향을 다룬 자료를 찾아 비교했어요.",
        "checklist": []
      },
      {
        "stageId": "arguments",
        "title": "찬반 논거 비교",
        "summary": "찬성 · 반대 논거",
        "description": "찬성과 반대 논거를 세 가지씩 표로 정리하고 각 근거의 한계를 적었어요.",
        "checklist": []
      },
      {
        "stageId": "write",
        "title": "논증문 작성",
        "summary": "1,700자 논증문",
        "description": "찬반을 검토한 뒤 조건을 붙여 활용 방안을 제안하는 방향으로 논증문을 썼어요.",
        "checklist": []
      }
    ],
    "materials": [
      {
        "materialId": "arguments",
        "role": "evidence",
        "title": "찬반 논거 비교표",
        "format": "HWP",
        "description": "찬성 · 반대 논거와 한계",
        "stageId": "arguments"
      },
      {
        "materialId": "essay",
        "role": "final",
        "title": "AI 면접 공정성 논증문",
        "format": "HWP",
        "description": "1,700자 논증문",
        "stageId": "write"
      }
    ],
    "reflection": "한쪽 입장을 고르기보다 어떤 조건에서 괜찮은지 따지는 게 더 설득력 있었어요.",
    "followUp": "심리탐구 동아리에서 같은 주제로 토론을 이어갔어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-record-04",
        "kind": "record",
        "title": "심리탐구 동아리 · 동아리활동",
        "summary": "AI 면접의 공정성 토론이 심리탐구 동아리 기록으로 이어진 과정이에요.",
        "mentorName": "고민정"
      },
      {
        "contentId": "fixture-content-plan-02",
        "kind": "plan",
        "title": "고2 중간고사 4주 Plan",
        "summary": "수학Ⅱ·화학Ⅰ·영어를 요일별로 나눈 4주 계획이에요. 2주차에 화학 수행평가를 배치했어요.",
        "mentorName": "고민정"
      },
      {
        "contentId": "fixture-content-case-16",
        "kind": "case",
        "title": "SNS 추천 알고리즘과 정보 편향에 관한 윤리 토론",
        "summary": "Filter Bubble 조사 · 표현의 자유·플랫폼 책임 비교 · 토론 개요서 과정을 정리한 Activity Case예요.",
        "mentorName": "김태현"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-16",
    "summary": "Filter Bubble 조사 · 표현의 자유·플랫폼 책임 비교 · 토론 개요서 과정을 정리한 Activity Case예요.",
    "activities": [
      "Filter Bubble 조사",
      "표현의 자유·플랫폼 책임 비교",
      "토론 개요서"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "윤리 토론 수행평가",
        "description": "정보 사회의 윤리 쟁점을 골라 토론 개요서를 쓰고 토론하는 과제였어요.",
        "checklist": []
      },
      {
        "stageId": "research",
        "title": "Filter Bubble 조사",
        "summary": "추천 알고리즘 자료",
        "description": "추천 알고리즘이 비슷한 정보만 보여주는 Filter Bubble 현상을 다룬 자료를 찾았어요.",
        "checklist": []
      },
      {
        "stageId": "compare",
        "title": "쟁점 비교",
        "summary": "표현의 자유 · 플랫폼 책임",
        "description": "표현의 자유와 플랫폼 책임이 부딪히는 지점을 나눠 비교했어요.",
        "checklist": []
      },
      {
        "stageId": "outline",
        "title": "토론 개요서",
        "summary": "주장 · 근거 · 반론",
        "description": "주장, 근거, 예상 반론을 한 장의 개요서로 정리했어요.",
        "checklist": []
      },
      {
        "stageId": "debate",
        "title": "토론",
        "summary": "모둠 토론",
        "description": "개요서를 바탕으로 토론에 참여했어요.",
        "checklist": []
      }
    ],
    "materials": [
      {
        "materialId": "outline",
        "role": "final",
        "title": "토론 개요서",
        "format": "HWP",
        "description": "주장 · 근거 · 예상 반론",
        "stageId": "outline"
      }
    ],
    "reflection": "추천을 막자는 주장과 그대로 두자는 주장 사이에 사용자에게 선택권을 주는 방법도 있다는 걸 토론에서 들었어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-story-09",
        "kind": "story",
        "title": "고2까지 진로를 확정하지 못했던 경험",
        "summary": "진로가 정해지지 않았을 때 활동을 고른 기준을 적었어요.",
        "mentorName": "김태현"
      },
      {
        "contentId": "fixture-content-case-15",
        "kind": "case",
        "title": "AI 면접의 공정성에 관한 윤리 논증문",
        "summary": "알고리즘 편향 조사 · 찬반 논거 비교 · 1,700자 논증문 과정을 정리한 Activity Case예요.",
        "mentorName": "고민정"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-17",
    "summary": "영화 장면 3개 비교 · 빠르기·악기·음량 분석 · 비교표 · 5분 발표 과정을 정리한 Activity Case예요.",
    "activities": [
      "영화 장면 3개 비교",
      "빠르기·악기·음량 분석",
      "비교표",
      "5분 발표"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "음악 감상 발표",
        "description": "음악이 쓰인 매체 하나를 골라 음악 요소를 분석하고 5분 동안 발표하는 과제였어요.",
        "checklist": []
      },
      {
        "stageId": "select",
        "title": "장면 선정",
        "summary": "영화 장면 3개",
        "description": "분위기가 서로 다른 영화 장면 3개를 골랐어요.",
        "checklist": []
      },
      {
        "stageId": "analyze",
        "title": "음악 분석",
        "summary": "빠르기 · 악기 · 음량",
        "description": "장면마다 음악의 빠르기, 쓰인 악기, 음량 변화를 들으며 기록했어요.",
        "checklist": []
      },
      {
        "stageId": "table",
        "title": "비교표",
        "summary": "장면별 비교",
        "description": "세 장면의 음악 요소를 한 표에 놓고 분위기와 연결했어요.",
        "checklist": []
      },
      {
        "stageId": "present",
        "title": "발표",
        "summary": "5분 발표",
        "description": "비교표 순서대로 장면과 음악 요소를 설명하며 5분 동안 발표했어요.",
        "checklist": []
      }
    ],
    "materials": [
      {
        "materialId": "compare-table",
        "role": "evidence",
        "title": "장면별 음악 비교표",
        "format": "HWP",
        "description": "빠르기 · 악기 · 음량 비교",
        "stageId": "table"
      },
      {
        "materialId": "slides",
        "role": "final",
        "title": "발표 자료",
        "format": "PPTX",
        "description": "5분 발표 자료",
        "stageId": "present"
      }
    ],
    "reflection": "같은 장면에 음악만 바꿔 상상해보니 분위기를 만드는 요소가 분명하게 보였어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-case-04",
        "kind": "case",
        "title": "배달앱 광고의 언어적 설득 전략 분석",
        "summary": "광고 영상 분석 · 표현 분류 · A4 분석지 2쪽 · 4분 발표 과정을 정리한 Activity Case예요.",
        "mentorName": "이채린"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-18",
    "summary": "속도별 제동거리 데이터 · 함수 모델 비교 · 그래프 · 탐구보고서 과정을 정리한 Activity Case예요.",
    "activities": [
      "속도별 제동거리 데이터",
      "함수 모델 비교",
      "그래프",
      "탐구보고서"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "수학 탐구 보고서",
        "description": "생활 속 현상을 함수로 나타내고 탐구보고서를 쓰는 과제였어요.",
        "checklist": []
      },
      {
        "stageId": "data",
        "title": "데이터 수집",
        "summary": "속도별 제동거리",
        "description": "공개된 자료에서 속도별 제동거리 데이터를 모아 표로 정리했어요.",
        "checklist": []
      },
      {
        "stageId": "model",
        "title": "함수 모델 비교",
        "summary": "일차 · 이차 함수",
        "description": "일차함수와 이차함수 모델을 각각 맞춰보고 오차를 비교했어요.",
        "checklist": [],
        "planChange": {
          "before": "일차함수 하나로 설명",
          "after": "일차 · 이차 함수 모델 비교"
        }
      },
      {
        "stageId": "graph",
        "title": "그래프",
        "summary": "데이터와 모델 그래프",
        "description": "데이터와 두 모델을 한 그래프에 그려 차이를 보여줬어요.",
        "checklist": []
      },
      {
        "stageId": "report",
        "title": "탐구보고서",
        "summary": "보고서 제출",
        "description": "이차함수 모델이 더 잘 맞는 이유를 속도와 에너지 관계로 설명했어요.",
        "checklist": []
      }
    ],
    "materials": [
      {
        "materialId": "data",
        "role": "evidence",
        "title": "속도별 제동거리 데이터",
        "format": "XLSX",
        "description": "속도 · 제동거리 표",
        "stageId": "data"
      },
      {
        "materialId": "report",
        "role": "final",
        "title": "제동거리 탐구보고서",
        "format": "HWP",
        "description": "함수 모델 비교와 그래프",
        "stageId": "report"
      }
    ],
    "reflection": "데이터에 맞는 함수를 고르면서 수식이 무엇을 뜻하는지 다시 생각하게 됐어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-story-01",
        "kind": "story",
        "title": "수학 3등급에서 내신 1등급까지",
        "summary": "개념 노트 대신 풀이 과정을 말로 설명하며 공부법을 바꾼 이야기예요.",
        "mentorName": "강민호"
      },
      {
        "contentId": "fixture-content-case-19",
        "kind": "case",
        "title": "스마트폰 사용시간과 수면시간의 관계 조사",
        "summary": "52명 설문 · CSV · 산점도 · 상관계수 · 통계 보고서 과정을 정리한 Activity Case예요.",
        "mentorName": "정세진"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-19",
    "summary": "52명 설문 · CSV · 산점도 · 상관계수 · 통계 보고서 과정을 정리한 Activity Case예요.",
    "activities": [
      "52명 설문",
      "CSV",
      "산점도",
      "상관계수",
      "통계 보고서"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "통계 탐구 과제",
        "description": "두 변수의 관계를 직접 조사한 자료로 분석하는 과제였어요.",
        "checklist": []
      },
      {
        "stageId": "design",
        "title": "설문 설계",
        "summary": "사용시간 · 수면시간",
        "description": "하루 스마트폰 사용시간과 수면시간을 숫자로 답하게 문항을 만들었어요.",
        "checklist": []
      },
      {
        "stageId": "collect",
        "title": "자료 수집",
        "summary": "52명 응답",
        "description": "52명의 응답을 익명으로 모아 CSV로 정리했어요.",
        "checklist": []
      },
      {
        "stageId": "analyze",
        "title": "분석",
        "summary": "산점도 · 상관계수",
        "description": "산점도를 그리고 상관계수를 계산했어요.",
        "checklist": []
      },
      {
        "stageId": "report",
        "title": "통계 보고서",
        "summary": "해석과 한계",
        "description": "상관관계가 있다는 결과와 함께 원인이라고 단정할 수 없는 이유를 보고서에 적었어요.",
        "checklist": []
      }
    ],
    "materials": [
      {
        "materialId": "csv",
        "role": "evidence",
        "title": "설문 응답 데이터",
        "format": "CSV",
        "description": "52명 익명 응답",
        "stageId": "collect"
      },
      {
        "materialId": "report",
        "role": "final",
        "title": "스마트폰 사용과 수면 통계 보고서",
        "format": "PDF",
        "description": "산점도 · 상관계수 · 해석",
        "stageId": "report"
      }
    ],
    "reflection": "상관관계가 있다고 해서 원인이라고 쓸 수는 없다는 걸 보고서에 꼭 적었어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-plan-06",
        "kind": "plan",
        "title": "수학Ⅱ 내신 5주 역산 Plan",
        "summary": "시험일에서 거꾸로 단원별 문제 풀이 분량을 정한 계획이에요.",
        "mentorName": "정세진"
      },
      {
        "contentId": "fixture-content-case-10",
        "kind": "case",
        "title": "청소년의 SNS 이용시간과 행복감 설문조사",
        "summary": "58명 설문 · 평균 비교 · 그래프 · 연구보고서 · 조사 한계 분석 과정을 정리한 Activity Case예요.",
        "mentorName": "최아름"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-20",
    "summary": "통학로 조사 · 신호시간·차량량 기록 · 위험도 점수화 · 안전지도 과정을 정리한 Activity Case예요.",
    "activities": [
      "통학로 조사",
      "신호시간·차량량 기록",
      "위험도 점수화",
      "안전지도"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "수학 · 지리 융합 프로젝트",
        "description": "수학으로 생활 공간의 문제를 분석하고 결과물을 만드는 융합 프로젝트였어요.",
        "checklist": []
      },
      {
        "stageId": "survey",
        "title": "통학로 조사",
        "summary": "주요 통학로",
        "description": "학생들이 많이 다니는 통학로를 정하고 직접 걸으며 위험해 보이는 곳을 표시했어요.",
        "checklist": []
      },
      {
        "stageId": "record",
        "title": "현장 기록",
        "summary": "신호시간 · 차량량",
        "description": "횡단보도 신호시간과 정해진 시간 동안 지나가는 차량 수를 기록했어요.",
        "checklist": []
      },
      {
        "stageId": "score",
        "title": "위험도 점수화",
        "summary": "점수 기준 정하기",
        "description": "신호시간, 차량량, 보도 폭을 기준으로 위험도 점수를 매기는 방법을 정했어요.",
        "checklist": []
      },
      {
        "stageId": "map",
        "title": "안전지도",
        "summary": "안전지도 완성",
        "description": "구간별 위험도 점수를 색으로 나눠 안전지도를 만들었어요.",
        "checklist": []
      }
    ],
    "materials": [
      {
        "materialId": "record-sheet",
        "role": "evidence",
        "title": "신호시간 · 차량량 기록표",
        "format": "XLSX",
        "description": "구간별 현장 기록",
        "stageId": "record"
      },
      {
        "materialId": "safety-map",
        "role": "final",
        "title": "학교 주변 보행 안전지도",
        "format": "PDF",
        "description": "위험도 점수별 색 구분",
        "stageId": "map"
      }
    ],
    "reflection": "위험도를 숫자로 정하는 기준을 친구들과 맞추는 데 시간이 가장 오래 걸렸어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-routine-04",
        "kind": "routine",
        "title": "주간 수학 실전 모의 루틴",
        "summary": "평일 저녁에 수학 실전 모의와 오답을 이어서 하는 루틴이에요.",
        "mentorName": "이수빈"
      },
      {
        "contentId": "fixture-content-case-12",
        "kind": "case",
        "title": "우리 지역의 대중교통 접근성 조사",
        "summary": "버스정류장·배차간격 조사 · 생활권 지도 · 접근성 분석 · 개선안 과정을 정리한 Activity Case예요.",
        "mentorName": "김도연"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-21",
    "summary": "4주 급식 데이터 · CSV · Python 분석 · Matplotlib · 보고서 · 3분 시연 과정을 정리한 Activity Case예요.",
    "activities": [
      "4주 급식 데이터",
      "CSV",
      "Python 분석",
      "Matplotlib",
      "보고서",
      "3분 시연"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "정보 데이터 프로젝트",
        "description": "학교생활에서 데이터를 모아 분석하고 결과를 시연하는 정보 프로젝트였어요.",
        "checklist": []
      },
      {
        "stageId": "collect",
        "title": "데이터 수집",
        "summary": "4주 메뉴별 잔반",
        "description": "4주 동안 메뉴별 잔반 데이터를 CSV로 정리했어요.",
        "checklist": []
      },
      {
        "stageId": "analyze",
        "title": "Python 분석",
        "summary": "평균 · 항목별 차이",
        "description": "Python으로 메뉴별 평균과 항목별 차이를 계산했어요.",
        "checklist": []
      },
      {
        "stageId": "graph",
        "title": "시각화",
        "summary": "Matplotlib 그래프",
        "description": "Matplotlib으로 메뉴별 잔반량 그래프를 그렸어요.",
        "checklist": []
      },
      {
        "stageId": "report",
        "title": "보고서 · 시연",
        "summary": "3분 시연",
        "description": "분석 결과와 원인에 대한 추측을 나눠 보고서에 쓰고 3분 동안 시연했어요.",
        "checklist": []
      }
    ],
    "materials": [
      {
        "materialId": "csv",
        "role": "evidence",
        "title": "급식 잔반 데이터",
        "format": "CSV",
        "description": "4주 메뉴별 잔반",
        "stageId": "collect"
      },
      {
        "materialId": "code",
        "role": "evidence",
        "title": "분석 코드",
        "format": "PY",
        "description": "평균 · 항목별 차이 계산",
        "stageId": "analyze"
      },
      {
        "materialId": "report",
        "role": "final",
        "title": "급식 잔반 데이터 분석 보고서",
        "format": "PDF",
        "description": "분석 결과와 추측 구분",
        "stageId": "report"
      }
    ],
    "reflection": "분석 결과와 원인에 대한 추측을 나눠 써야 데이터가 말하는 범위가 분명해졌어요.",
    "followUp": "추가 설문이 필요하다는 제안을 보고서 마지막에 남겼어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-record-03",
        "kind": "record",
        "title": "정보 · 세부능력 및 특기사항",
        "summary": "급식 잔반 데이터 분석 프로젝트가 정보 세특으로 이어진 기록이에요.",
        "mentorName": "정민혁"
      },
      {
        "contentId": "fixture-content-routine-06",
        "kind": "routine",
        "title": "수행평가와 코딩 프로젝트 병행 루틴",
        "summary": "평일 저녁을 수행평가와 코딩으로 나눈 주간 루틴이에요.",
        "mentorName": "정민혁"
      },
      {
        "contentId": "fixture-content-case-22",
        "kind": "case",
        "title": "학교 도서관 대출 데이터 시각화 프로젝트",
        "summary": "익명 대출 CSV · Pandas 분석 · 월별·분야별 그래프 · .ipynb · 보고서 과정을 정리한 Activity Case예요.",
        "mentorName": "송지후"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-22",
    "summary": "익명 대출 CSV · Pandas 분석 · 월별·분야별 그래프 · .ipynb · 보고서 과정을 정리한 Activity Case예요.",
    "activities": [
      "익명 대출 CSV",
      "Pandas 분석",
      "월별·분야별 그래프",
      ".ipynb",
      "보고서"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "정보 자율 프로젝트",
        "description": "학교 안의 데이터를 골라 시각화하고 의미를 해석하는 자율 프로젝트였어요.",
        "checklist": []
      },
      {
        "stageId": "data",
        "title": "데이터 준비",
        "summary": "익명 대출 CSV",
        "description": "빌린 사람 정보를 지운 도서관 대출 기록 CSV로 분석을 시작했어요.",
        "checklist": []
      },
      {
        "stageId": "analyze",
        "title": "Pandas 분석",
        "summary": "월별 · 분야별 집계",
        "description": "Pandas로 월별, 분야별 대출 수를 집계했어요.",
        "checklist": []
      },
      {
        "stageId": "graph",
        "title": "시각화",
        "summary": "월별 · 분야별 그래프",
        "description": "시험 기간과 방학에 대출이 어떻게 달라지는지 그래프로 나타냈어요.",
        "checklist": []
      },
      {
        "stageId": "report",
        "title": "보고서",
        "summary": "보고서 제출",
        "description": "그래프 해석과 도서관 운영에 대한 제안을 보고서로 정리했어요.",
        "checklist": []
      }
    ],
    "materials": [
      {
        "materialId": "csv",
        "role": "evidence",
        "title": "익명 대출 데이터",
        "format": "CSV",
        "description": "빌린 사람 정보 없는 대출 기록",
        "stageId": "data"
      },
      {
        "materialId": "notebook",
        "role": "evidence",
        "title": "분석 Notebook",
        "format": "IPYNB",
        "description": "Pandas 집계 · 그래프",
        "stageId": "graph"
      },
      {
        "materialId": "report",
        "role": "final",
        "title": "도서관 대출 데이터 시각화 보고서",
        "format": "PDF",
        "description": "해석과 제안",
        "stageId": "report"
      }
    ],
    "reflection": "개인 정보가 없는 데이터로도 충분히 의미 있는 질문을 할 수 있었어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-story-10",
        "kind": "story",
        "title": "물리를 끝까지 가져간 이유",
        "summary": "어려웠던 역학 단원을 버티면서 과학탐구 선택을 지킨 이야기예요.",
        "mentorName": "송지후"
      },
      {
        "contentId": "fixture-content-case-21",
        "kind": "case",
        "title": "학교 급식 잔반 데이터 분석 프로젝트",
        "summary": "4주 급식 데이터 · CSV · Python 분석 · Matplotlib · 보고서 · 3분 시연 과정을 정리한 Activity Case예요.",
        "mentorName": "정민혁"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-23",
    "summary": "기존 표지 분석 · 스케치 3안 · 친구 8명 테스트 · 최종 픽토그램 과정을 정리한 Activity Case예요.",
    "activities": [
      "기존 표지 분석",
      "스케치 3안",
      "친구 8명 테스트",
      "최종 픽토그램"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "시각 디자인 프로젝트",
        "description": "생활 속 시각 정보를 개선하는 디자인 프로젝트였어요.",
        "checklist": []
      },
      {
        "stageId": "research",
        "title": "문제 조사",
        "summary": "기존 표지 분석",
        "description": "학교 안전시설 표지를 찾아 무엇을 뜻하는지 바로 알기 어려운 표지를 골랐어요.",
        "checklist": []
      },
      {
        "stageId": "sketch",
        "title": "스케치",
        "summary": "스케치 3안",
        "description": "같은 의미를 다르게 표현한 스케치 3안을 그렸어요.",
        "checklist": []
      },
      {
        "stageId": "test",
        "title": "사용자 테스트",
        "summary": "친구 8명",
        "description": "친구 8명에게 3안을 보여주고 무엇으로 보이는지 물었어요.",
        "checklist": []
      },
      {
        "stageId": "final",
        "title": "최종안",
        "summary": "최종 픽토그램",
        "description": "테스트에서 가장 헷갈림이 적었던 안을 다듬어 최종 픽토그램을 만들었어요.",
        "checklist": []
      }
    ],
    "materials": [
      {
        "materialId": "sketches",
        "role": "draft",
        "title": "스케치 3안",
        "format": "PDF",
        "description": "같은 의미의 표현 3가지",
        "stageId": "sketch"
      },
      {
        "materialId": "test",
        "role": "evidence",
        "title": "사용자 테스트 기록",
        "format": "XLSX",
        "description": "친구 8명 응답",
        "stageId": "test"
      },
      {
        "materialId": "final",
        "role": "final",
        "title": "최종 픽토그램",
        "format": "PDF",
        "description": "최종안",
        "stageId": "final"
      }
    ],
    "reflection": "내가 보기엔 분명한 그림도 처음 보는 사람에게는 다르게 읽힐 수 있었어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-case-24",
        "kind": "case",
        "title": "학교 축제 안내지도 디자인",
        "summary": "학교 지도 단순화 · 행사 아이콘 · 관람 동선 · 사용자 테스트 · A3 안내지도 과정을 정리한 Activity Case예요.",
        "mentorName": "조아라"
      }
    ]
  },
  {
    "contentId": "fixture-content-case-24",
    "summary": "학교 지도 단순화 · 행사 아이콘 · 관람 동선 · 사용자 테스트 · A3 안내지도 과정을 정리한 Activity Case예요.",
    "activities": [
      "학교 지도 단순화",
      "행사 아이콘",
      "관람 동선",
      "사용자 테스트",
      "A3 안내지도"
    ],
    "stages": [
      {
        "stageId": "guide",
        "title": "활동 안내",
        "summary": "교내 행사 디자인",
        "description": "학교 축제에서 쓸 안내지도를 만드는 활동이었어요.",
        "checklist": []
      },
      {
        "stageId": "research",
        "title": "정보 조사",
        "summary": "행사 위치 · 이동 동선",
        "description": "행사 위치와 이동 동선을 조사하고 어떤 정보를 먼저 보여줄지 우선순위를 정했어요.",
        "checklist": []
      },
      {
        "stageId": "draft",
        "title": "지도 초안",
        "summary": "지도 단순화 · 아이콘",
        "description": "학교 지도를 단순하게 다시 그리고 행사별 아이콘을 만들었어요.",
        "checklist": []
      },
      {
        "stageId": "test",
        "title": "길 찾기 테스트",
        "summary": "아이콘 · 안내 순서 수정",
        "description": "친구들에게 초안으로 길을 찾아보게 한 뒤 아이콘과 안내 순서를 고쳤어요.",
        "checklist": [],
        "planChange": {
          "before": "행사 이름 순서로 안내",
          "after": "관람 동선 순서로 안내"
        }
      },
      {
        "stageId": "final",
        "title": "안내지도 완성",
        "summary": "A3 안내지도",
        "description": "수정한 내용을 반영해 A3 안내지도를 완성했어요.",
        "checklist": []
      }
    ],
    "materials": [
      {
        "materialId": "draft",
        "role": "draft",
        "title": "안내지도 초안",
        "format": "PDF",
        "description": "지도 단순화 · 행사 아이콘",
        "stageId": "draft"
      },
      {
        "materialId": "final",
        "role": "final",
        "title": "A3 안내지도",
        "format": "PDF",
        "description": "사용자 테스트 반영",
        "stageId": "final"
      }
    ],
    "reflection": "친구들이 길을 헤매는 걸 직접 보니 어떤 정보를 먼저 보여줘야 할지 알게 됐어요.",
    "relatedContent": [
      {
        "contentId": "fixture-content-record-07",
        "kind": "record",
        "title": "교내 행사 디자인 · 자율활동",
        "summary": "학교 축제 안내지도 디자인이 교내 행사 기록으로 이어진 과정이에요.",
        "mentorName": "조아라"
      },
      {
        "contentId": "fixture-content-case-23",
        "kind": "case",
        "title": "학교 안전시설 픽토그램 개선 프로젝트",
        "summary": "기존 표지 분석 · 스케치 3안 · 친구 8명 테스트 · 최종 픽토그램 과정을 정리한 Activity Case예요.",
        "mentorName": "김하람"
      }
    ]
  }
]
