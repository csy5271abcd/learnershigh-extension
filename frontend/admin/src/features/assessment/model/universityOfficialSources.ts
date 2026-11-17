// 대학 공식 자료실 (요청 ④, 2026-10-29 사용자 제공 주소).
// 세 URL을 구분한다: ① 대학 공식 자료실(이 파일, 목록 페이지) ② 개별 자료의 공식 원본 URL(AdminUniversityResource.sourceUrl, 확인 전 null)
// ③ 로컬 PDF URL(개발 서버 /__dev 경로). 자료실 주소를 개별 PDF 직접 다운로드 주소로 쓰지 않는다.
export interface UniversityOfficialSource {
  /** Manifest의 university 값과 같다 */
  university: string
  label: string
  url: string
}

export const universityOfficialSources: UniversityOfficialSource[] = [
  { university: '서울대학교', label: '서울대학교 입학본부 — 기출문제 및 예시문항', url: 'https://admission.snu.ac.kr/materials/downloads/samples' },
  { university: 'KAIST', label: 'KAIST 입학처 — 면접기출문제', url: 'https://admission.kaist.ac.kr/undergraduate/admission/sub02' },
]

export const officialSourceOf = (university: string) => universityOfficialSources.find((source) => source.university === university)
