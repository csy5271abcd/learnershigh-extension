package com.learnershigh.extension.assessment.service.record;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * §20-1 노트 PDF 내보내기 글꼴 (A28-51). 저장소에 글꼴 파일을 두지 않고 서버 OS 에 설치된 한글 TrueType 글꼴을 쓴다.
 * 설정 {@code assessment.export.pdf-font-path} 가 있으면 그것만, 없으면 Windows 맑은 고딕 → Linux Nanum·Noto 순서로 찾는다.
 */
@Component
public class ExportFontLocator {

    static final List<String> CANDIDATES = List.of(
            "C:/Windows/Fonts/malgun.ttf",
            "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
            "/usr/share/fonts/nanum/NanumGothic.ttf",
            "/usr/share/fonts/truetype/noto/NotoSansKR-Regular.ttf",
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
            "/System/Library/Fonts/AppleSDGothicNeo.ttc");

    private final String configured;

    public ExportFontLocator(@Value("${assessment.export.pdf-font-path:}") String configured) {
        this.configured = configured == null ? "" : configured.strip();
    }

    public Optional<Path> find() {
        List<String> order = new ArrayList<>();
        if (!configured.isEmpty()) {
            order.add(configured);
        } else {
            order.addAll(CANDIDATES);
        }
        return order.stream().map(Path::of).filter(Files::isRegularFile).findFirst();
    }
}
