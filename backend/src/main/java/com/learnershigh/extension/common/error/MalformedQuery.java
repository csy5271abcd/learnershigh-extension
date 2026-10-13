package com.learnershigh.extension.common.error;

import org.apache.tomcat.util.http.InvalidParameterException;

/**
 * Query 문자열을 Servlet Container가 해석하지 못한 경우(잘못된 퍼센트 인코딩 {@code %zz}, 깨진 UTF-8 등).
 * Tomcat은 파라미터를 처음 읽을 때 {@link InvalidParameterException}을 던진다. 클라이언트 입력 오류이므로 400이다.
 */
final class MalformedQuery {

    private MalformedQuery() {
    }

    static boolean isCause(Throwable exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof InvalidParameterException) {
                return true;
            }
        }
        return false;
    }
}
