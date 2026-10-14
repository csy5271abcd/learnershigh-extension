package com.learnershigh.extension.common.error;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * 실제 HTTP 요청을 Socket으로 그대로 보낸다. Request target을 다시 Encoding / 검증하지 않으므로
 * {@code %zz}, {@code %2F}처럼 HTTP Client가 막거나 고치는 요청도 Tomcat까지 그대로 간다(Test 전용).
 */
final class RawHttp {

    private RawHttp() {
    }

    record Response(int status, Map<String, String> headers, String body) {

        String contentType() {
            return headers.getOrDefault("content-type", "");
        }
    }

    static Response send(int port, String method, String target, String accept) throws IOException {
        return send(port, method, target, accept, null);
    }

    static Response send(int port, String method, String target, String accept, String jsonBody) throws IOException {
        return send(port, method, target, accept, jsonBody, jsonBody == null ? null : "application/json");
    }

    static Response send(int port, String method, String target, String accept, String requestBody,
            String contentType) throws IOException {
        String jsonBody = requestBody;
        try (Socket socket = new Socket("localhost", port)) {
            socket.setSoTimeout(30_000);
            StringBuilder request = new StringBuilder()
                    .append(method).append(' ').append(target).append(" HTTP/1.1\r\n")
                    .append("Host: localhost:").append(port).append("\r\n")
                    .append("Connection: close\r\n");
            if (accept != null) {
                request.append("Accept: ").append(accept).append("\r\n");
            }
            byte[] body = jsonBody == null ? new byte[0] : jsonBody.getBytes(StandardCharsets.UTF_8);
            if (contentType != null) {
                request.append("Content-Type: ").append(contentType).append("\r\n");
            }
            request.append("Content-Length: ").append(body.length).append("\r\n\r\n");
            OutputStream out = socket.getOutputStream();
            out.write(request.toString().getBytes(StandardCharsets.ISO_8859_1));
            out.write(body);
            out.flush();
            return parse(socket.getInputStream().readAllBytes());
        }
    }

    private static Response parse(byte[] raw) throws IOException {
        String text = new String(raw, StandardCharsets.ISO_8859_1);
        int headerEnd = text.indexOf("\r\n\r\n");
        String[] lines = text.substring(0, headerEnd).split("\r\n");
        int status = Integer.parseInt(lines[0].split(" ")[1]);
        Map<String, String> headers = new LinkedHashMap<>();
        for (int i = 1; i < lines.length; i++) {
            int colon = lines[i].indexOf(':');
            headers.put(lines[i].substring(0, colon).trim().toLowerCase(Locale.ROOT), lines[i].substring(colon + 1).trim());
        }
        byte[] bodyBytes = java.util.Arrays.copyOfRange(raw, headerEnd + 4, raw.length);
        if ("chunked".equalsIgnoreCase(headers.get("transfer-encoding"))) {
            bodyBytes = dechunk(bodyBytes);
        }
        return new Response(status, headers, new String(bodyBytes, StandardCharsets.UTF_8));
    }

    private static byte[] dechunk(byte[] chunked) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        InputStream in = new java.io.ByteArrayInputStream(chunked);
        while (true) {
            StringBuilder size = new StringBuilder();
            int c;
            while ((c = in.read()) != '\r') {
                if (c < 0) {
                    return out.toByteArray();
                }
                size.append((char) c);
            }
            in.read(); // \n
            int length = Integer.parseInt(size.toString().split(";")[0].trim(), 16);
            if (length == 0) {
                return out.toByteArray();
            }
            out.write(in.readNBytes(length));
            in.read(); // \r
            in.read(); // \n
        }
    }
}
