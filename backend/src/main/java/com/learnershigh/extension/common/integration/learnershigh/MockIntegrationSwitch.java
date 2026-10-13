package com.learnershigh.extension.common.integration.learnershigh;

/** Mock 연동을 실패 상태로 바꾸는 스위치. E2E에서 Integration Error 화면을 검증할 때만 쓴다. */
public interface MockIntegrationSwitch {

    void setStudyDataAvailable(boolean available);
}
