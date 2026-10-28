// 평가계획서 PDF 임시 기준 (Mock 전용). 실제 크기·형식·페이지 제한은 API-OD-A03에서 정한다.
// 50MB·300페이지는 Mockup SA-LIST-02 안내 문구를 옮긴 시연 값이다. 페이지 수는 PDF를 읽지 않아 확인하지 않는다.
// 브라우저의 확장자·MIME 확인은 악성 파일 검사가 아니다.
export const mockPdfPolicy = {
  maxBytes: 50 * 1024 * 1024,
  maxPagesLabel: '300페이지',
  /** Mock 업로드·분석 상태를 다시 확인하는 간격 (실제 비동기 작업 주기 아님) */
  pollIntervalMs: 900,
} as const
