package com.learnershigh.extension.common.integration.learnershigh.phapi;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * phapi 응답의 {@code {id, name}} 중첩 객체 (brand / room / group).
 * PHP {@code intval(null)}이라 연결이 없으면 id는 0, name은 null로 온다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PhapiRef(long id, String name) {
}
