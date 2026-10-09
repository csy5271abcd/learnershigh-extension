package com.learnershigh.extension.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.domain.Dependency;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import java.util.List;

/**
 * ADR-0005 (Domain-packaged Layered MVC) / ADR-0002 (Integration Boundary) 의존 규칙.
 *
 * <p>사람 이름 / ext 패키지 금지는 {@code scripts/verify.ps1}이 Directory 기준으로 검증하므로 여기서 다루지 않는다.
 *
 * <p>규칙은 base package를 인자로 받아 실제 코드와 test fixture에 같은 방식으로 적용한다.
 * 아직 해당 Layer의 Class가 없어도 실패하지 않도록 {@code allowEmptyShould(true)}를 사용한다.
 */
final class ArchitectureRules {

    private static final String EXISTING_INTEGRATION_PACKAGE = "common.integration.learnershigh";

    private final String basePackage;

    ArchitectureRules(String basePackage) {
        this.basePackage = basePackage;
    }

    List<ArchRule> all() {
        return List.of(
                controllerDoesNotAccessRepositoryOrEntity(),
                entityDoesNotDependOnOtherLayers(),
                repositoryDoesNotDependOnControllerServiceOrDto(),
                noServiceImplClasses(),
                noCrossDomainRepositoryOrEntityAccess(),
                existingClientsResideInIntegrationPackage(),
                existingClientImplementationsAreNotUsedOutsideIntegrationPackage());
    }

    ArchRule controllerDoesNotAccessRepositoryOrEntity() {
        return noClasses().that().resideInAPackage(basePackage + "..controller..")
                .should().dependOnClassesThat().resideInAnyPackage("..repository..", "..entity..")
                .allowEmptyShould(true)
                .because("Controller는 Service만 호출하고 Entity / Repository를 보지 않는다 (ADR-0005)");
    }

    ArchRule entityDoesNotDependOnOtherLayers() {
        return noClasses().that().resideInAPackage(basePackage + "..entity..")
                .should().dependOnClassesThat()
                .resideInAnyPackage("..controller..", "..service..", "..dto..", "..repository..")
                .allowEmptyShould(true)
                .because("Entity는 같은 Domain의 entity에만 의존한다 (ADR-0005)");
    }

    ArchRule repositoryDoesNotDependOnControllerServiceOrDto() {
        return noClasses().that().resideInAPackage(basePackage + "..repository..")
                .should().dependOnClassesThat().resideInAnyPackage("..controller..", "..service..", "..dto..")
                .allowEmptyShould(true)
                .because("Repository는 entity에만 의존한다 (ADR-0005)");
    }

    ArchRule noServiceImplClasses() {
        return noClasses().that().resideInAPackage(basePackage + "..")
                .should().haveSimpleNameEndingWith("ServiceImpl")
                .allowEmptyShould(true)
                .because("Interface는 외부 경계에만 둔다. XxxServiceImpl 패턴을 쓰지 않는다 (ADR-0005)");
    }

    ArchRule noCrossDomainRepositoryOrEntityAccess() {
        return classes().that().resideInAPackage(basePackage + "..")
                .should(new NotAccessOtherDomainRepositoryOrEntity(basePackage))
                .allowEmptyShould(true)
                .because("다른 Domain은 공개 Service로만 접근한다 (ADR-0005)");
    }

    ArchRule existingClientsResideInIntegrationPackage() {
        return classes().that().resideInAPackage(basePackage + "..")
                .and().haveNameMatching(".*\\.(Real|Mock)?Existing\\w*Client")
                .should().resideInAPackage(basePackage + "." + EXISTING_INTEGRATION_PACKAGE + "..")
                .allowEmptyShould(true)
                .because("Existing LearnersHigh 연동 코드는 common/integration/learnershigh/에만 둔다 (ADR-0002)");
    }

    ArchRule existingClientImplementationsAreNotUsedOutsideIntegrationPackage() {
        return noClasses().that().resideInAPackage(basePackage + "..")
                .and().resideOutsideOfPackage(basePackage + "." + EXISTING_INTEGRATION_PACKAGE + "..")
                .should().dependOnClassesThat().haveNameMatching(".*\\.(Real|Mock)Existing\\w*Client")
                .allowEmptyShould(true)
                .because("Domain은 ExistingXxxClient Interface에만 의존한다 (ADR-0002)");
    }

    /** {@code <base>.<domain>.repository|entity} 를 다른 Domain에서 참조하면 위반이다. */
    private static final class NotAccessOtherDomainRepositoryOrEntity extends ArchCondition<JavaClass> {

        private final String basePackage;

        NotAccessOtherDomainRepositoryOrEntity(String basePackage) {
            super("not depend on repository / entity of another domain");
            this.basePackage = basePackage;
        }

        @Override
        public void check(JavaClass origin, ConditionEvents events) {
            String originDomain = domainOf(origin.getPackageName());

            for (Dependency dependency : origin.getDirectDependenciesFromSelf()) {
                String targetPackage = dependency.getTargetClass().getPackageName();
                String targetDomain = domainOf(targetPackage);

                if (targetDomain.isEmpty() || targetDomain.equals(originDomain)) {
                    continue;
                }

                String targetLayer = layerOf(targetPackage);

                if (targetLayer.equals("repository") || targetLayer.equals("entity")) {
                    events.add(SimpleConditionEvent.violated(dependency, dependency.getDescription()));
                }
            }
        }

        private String domainOf(String packageName) {
            String relative = relativePackage(packageName);
            int dot = relative.indexOf('.');
            return dot < 0 ? relative : relative.substring(0, dot);
        }

        private String layerOf(String packageName) {
            String[] segments = relativePackage(packageName).split("\\.");
            return segments.length < 2 ? "" : segments[1];
        }

        private String relativePackage(String packageName) {
            if (!packageName.startsWith(basePackage + ".")) {
                return "";
            }
            return packageName.substring(basePackage.length() + 1);
        }
    }
}
