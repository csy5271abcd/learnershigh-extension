
// A26: tools/mockExamPassagesPlugin.ts 가상 모듈(개발 서버 전용 모의고사 원문 지문, materialId → 텍스트)
declare module 'virtual:lh-mock-exam-passages' {
  /** 원문이 어디서 왔는지: 설정 파일 / 저장소 Git 제외 파일 / 없음 */
  export const passagesSource: 'CONFIGURED_FILE' | 'REPO_LOCAL_FILE' | 'NONE'
  const passages: Record<string, string>
  export default passages
}
