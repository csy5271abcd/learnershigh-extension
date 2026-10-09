package com.learnershigh.extension.architecture;

import static org.assertj.core.api.Assertions.assertThat;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.EvaluationResult;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Stream;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;

/**
 * {@link ArchitectureRules}가 실제로 위반을 잡아내는지 test fixture로 검증한다.
 *
 * <p>fixture의 {@code alpha}, {@code beta}는 Product Domain이 아니라 규칙 검증용 가상 패키지다.
 */
class ArchitectureRulesTest {

    private static final String FIXTURE = "com.learnershigh.extension.architecture.fixture";
    private static final String COMPLIANT = FIXTURE + ".compliant";
    private static final String VIOLATING = FIXTURE + ".violating";

    @TestFactory
    Stream<DynamicTest> compliantStructurePassesEveryRule() {
        JavaClasses classes = new ClassFileImporter().importPackages(COMPLIANT);

        return new ArchitectureRules(COMPLIANT).all().stream()
                .map(rule -> DynamicTest.dynamicTest(rule.getDescription(), () -> rule.check(classes)));
    }

    @TestFactory
    Stream<DynamicTest> violatingStructureIsDetectedByEachRule() {
        JavaClasses classes = new ClassFileImporter().importPackages(VIOLATING);
        ArchitectureRules rules = new ArchitectureRules(VIOLATING);

        // Rule → 위반으로 보고되어야 하는 fixture Class
        Map<Function<ArchitectureRules, ArchRule>, String> expectations = Map.of(
                ArchitectureRules::controllerDoesNotAccessRepositoryOrEntity, "AlphaController",
                ArchitectureRules::entityDoesNotDependOnOtherLayers, "AlphaRecord",
                ArchitectureRules::repositoryDoesNotDependOnControllerServiceOrDto, "AlphaRepository",
                ArchitectureRules::noServiceImplClasses, "AlphaServiceImpl",
                ArchitectureRules::noCrossDomainRepositoryOrEntityAccess, "BetaService",
                ArchitectureRules::existingClientsResideInIntegrationPackage, "ExistingGammaClient",
                ArchitectureRules::existingClientImplementationsAreNotUsedOutsideIntegrationPackage, "BetaService");

        return expectations.entrySet().stream().map(expectation -> {
            ArchRule rule = expectation.getKey().apply(rules);
            String offendingClass = expectation.getValue();

            return DynamicTest.dynamicTest(rule.getDescription(), () -> {
                EvaluationResult result = rule.evaluate(classes);

                assertThat(result.hasViolation()).isTrue();
                assertThat(result.getFailureReport().toString()).contains(offendingClass);
            });
        });
    }
}
