package com.learnershigh.extension.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import java.util.stream.Stream;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;

/** 실제 Backend 코드(test 제외)가 ADR-0005 / ADR-0002 의존 규칙을 지키는지 검증한다. */
class ArchitectureTest {

    private static final String BASE_PACKAGE = "com.learnershigh.extension";

    @TestFactory
    Stream<DynamicTest> productionCodeFollowsArchitectureRules() {
        JavaClasses classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages(BASE_PACKAGE);

        return new ArchitectureRules(BASE_PACKAGE).all().stream()
                .map(rule -> DynamicTest.dynamicTest(rule.getDescription(), () -> rule.check(classes)));
    }
}
