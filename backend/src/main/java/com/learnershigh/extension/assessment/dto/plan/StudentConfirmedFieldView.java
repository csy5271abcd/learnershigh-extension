package com.learnershigh.extension.assessment.dto.plan;

/**
 * §10-1 학생 상세의 관리자 확정값 (A3.5, 2026-11-14 DRAFT). 관리자가 PUT .../review로 확정한 값만 담는다 — AI 후보는 없다.
 * value=null은 "원문에 없음을 관리자가 확인"이다(0으로 바꾸지 않는다). pdfPageNumber는 PDF 근거 쪽(원문 Viewer 이동용).
 * HWP·HWPX 근거 위치(documentLocator)는 학생에게 보내지 않는다(M-5).
 */
public record StudentConfirmedFieldView(String subjectId, String fieldPath, Object value, Integer pdfPageNumber) {
}
