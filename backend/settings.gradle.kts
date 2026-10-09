plugins {
    // Java 21 toolchain이 로컬에 없으면 Gradle이 자동으로 내려받는다. (Gradle 공식 toolchain resolver)
    id("org.gradle.toolchains.foojay-resolver-convention") version "1.0.0"
}

rootProject.name = "learnershigh-extension-backend"
