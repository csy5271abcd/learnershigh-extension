package com.learnershigh.extension.assessment.integration.roster;

import static org.assertj.core.api.Assertions.assertThat;

import com.learnershigh.extension.assessment.integration.auth.MockHeaderAssessmentActorProvider;
import com.learnershigh.extension.assessment.integration.context.MockAcademicContextProvider;
import com.learnershigh.extension.assessment.integration.context.SubjectCatalog;
import com.learnershigh.extension.common.integration.learnershigh.MockExistingStudentClient;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.mock.web.MockHttpServletRequest;

/** 플래그 조건(@ConditionalOnExpression)과 Bean 주입을 실제 Spring Context로 확인한다 (DB 없음). */
class DemoRosterWiringTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(SubjectCatalog.class, DemoRoster.class, AssessmentStudentDirectory.class,
                    MockExistingStudentClient.class, MockHeaderAssessmentActorProvider.class, MockAcademicContextProvider.class);

    private static MockHttpServletRequest admin(String id) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(MockHeaderAssessmentActorProvider.ADMIN_HEADER, id);
        return request;
    }

    @Test
    void 기본값_OFF면_DemoRoster_Bean이_없고_시연_관리자도_없다() {
        runner.withPropertyValues("learnershigh.integration.mode=mock").run(context -> {
            assertThat(context).hasNotFailed().doesNotHaveBean(DemoRoster.class);
            assertThat(context.getBean(MockHeaderAssessmentActorProvider.class).currentAdmin(admin("adm_demo_a01"))).isEmpty();
        });
    }

    @Test
    void mock_모드와_플래그가_모두_켜져야_명단이_등록된다() {
        runner.withPropertyValues("learnershigh.integration.mode=mock", "assessment.demo-roster.enabled=true").run(context -> {
            assertThat(context).hasNotFailed().hasSingleBean(DemoRoster.class);
            assertThat(context.getBean(MockHeaderAssessmentActorProvider.class).currentAdmin(admin("adm_demo_c01")))
                    .get().extracting(a -> a.branchIds()).asInstanceOf(org.assertj.core.api.InstanceOfAssertFactories.ITERABLE)
                    .containsExactly("br_demo_c");
            assertThat(context.getBean(MockAcademicContextProvider.class).find("stu_demo_060", 2026, 2)).isPresent();
        });
    }

    @Test
    void mock_모드가_아니면_플래그가_켜져도_명단이_없다() {
        new ApplicationContextRunner().withUserConfiguration(SubjectCatalog.class, DemoRoster.class)
                .withPropertyValues("learnershigh.integration.mode=real", "assessment.demo-roster.enabled=true")
                .run(context -> assertThat(context).hasNotFailed().doesNotHaveBean(DemoRoster.class));
    }
}
