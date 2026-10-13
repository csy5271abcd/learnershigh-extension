package com.learnershigh.extension.common.error;

import org.apache.catalina.Host;
import org.apache.catalina.core.StandardHost;
import org.springframework.boot.tomcat.servlet.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.stereotype.Component;

/** Embedded Tomcat Host의 ErrorReportValve를 {@link JsonErrorReportValve}로 바꾼다(Host 시작 전에 설정). */
@Component
public class TomcatErrorReportCustomizer implements WebServerFactoryCustomizer<TomcatServletWebServerFactory> {

    @Override
    public void customize(TomcatServletWebServerFactory factory) {
        factory.addContextCustomizers(context -> {
            if (context.getParent() instanceof Host host && host instanceof StandardHost standardHost) {
                standardHost.setErrorReportValveClass(JsonErrorReportValve.class.getName());
            }
        });
    }
}
