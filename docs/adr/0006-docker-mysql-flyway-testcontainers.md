# ADR-0006: Docker for Local MySQL, Flyway Migration, Testcontainers Integration Test

- Status: Proposed
- Date: 2026-10-09

## Context

Scaffold 시점에 다음 항목이 미확정이었다.

```text
- Migration Tool
- MySQL Integration Test 실행 방식
- 로컬 개발 DB 실행 방식
```

필요한 것:

```text
- 두 개발자가 같은 MySQL Version / 설정으로 개발한다.
- Schema 변경은 Migration으로만 관리한다. (.claude/rules/database.md)
- Repository / Migration은 실제 MySQL로 검증한다. (.claude/rules/testing.md)
- 일반 Unit Test는 DB / Docker 없이 돈다. (.claude/rules/backend.md §21)
- 시연 환경(추후 배포)도 같은 MySQL Image를 쓸 수 있어야 한다.
```

---

## Decision

### 1. 로컬 MySQL: Docker Compose

Repository root `docker-compose.yml`로 `mysql:8.4`를 실행한다.

```text
docker compose up -d
→ localhost:3306 / DB learnershigh_extension
```

접속 정보 기본값은 `.env.example`에 있다. 실제 `.env`는 커밋하지 않는다.

### 2. Migration: Flyway

```text
spring-boot-starter-flyway + flyway-mysql
파일 위치 : /database/migrations/*.sql (Build 시 classpath:db/migration으로 포함)
파일 이름 : V<yyyyMMddHHmm>__<description>.sql (UTC 작성 시각)
```

시각 기반 Version을 쓰므로 개인별 번호 범위(V100~, V200~)를 두지 않는다.
`ddl-auto: none`은 유지한다. Hibernate가 Schema를 만들지 않는다.

### 3. Integration Test: Testcontainers

```text
@Tag("integration") + @Import(MySqlContainerConfig.class)
→ Test 실행 시 mysql:8.4 Container를 띄우고 @ServiceConnection으로 DataSource 연결
```

| Gradle Task | 대상 | Docker |
|---|---|---|
| `build` (`test`) | 일반 Unit / ArchUnit Test | 필요 없음 |
| `integrationTest` | `@Tag("integration")` Test | 필요 |

`scripts/verify-backend.ps1`은 Docker가 있으면 `integrationTest`도 실행한다.
`-Strict`(CI)에서는 Docker가 없으면 실패한다.

### 4. CI

Backend Job을 `ubuntu-latest`로 옮긴다. Windows Runner는 Linux Container를 실행할 수 없다.
Harness / Frontend Job은 `windows-latest`를 유지한다.

---

## Consequences

장점:

```text
- 로컬 / CI / 시연 환경이 같은 MySQL Image를 쓴다.
- Migration 충돌 없이 두 사람이 병렬로 Schema를 추가할 수 있다.
- Repository / Migration이 실제 MySQL에서 검증된다.
```

제약:

```text
- 로컬에서 Backend 실행 / integrationTest를 하려면 Docker Desktop이 필요하다.
- integrationTest는 Container 기동 시간만큼 느리다.
- CI Backend Job이 Windows가 아니라 Linux에서 돈다.
```

---

## Alternatives Considered

### H2 / In-memory DB

MySQL과 Dialect / 동작이 달라 Integration Test 신뢰도가 낮다.

### CI `services: mysql` + 로컬 수동 설치

CI만 해결되고 로컬 환경이 사람마다 달라진다.

### Liquibase

XML / YAML Changelog 관리 비용이 크다. 현재 규모에서는 SQL 기반 Flyway가 충분하다.

---

## Not Decided Here

```text
- E2E Test 도구 / 실행 방식 (첫 Cross-Surface Flow 구현 후)
- 시연 / 배포 환경 (Backend / Frontend Container Image, Server)
- Seed 적용 방식
```

---

## Related Documents

```text
docker-compose.yml
.env.example
database/migrations/README.md
backend/build.gradle.kts
scripts/verify-backend.ps1
.github/workflows/ci.yml
.claude/rules/database.md
.claude/rules/testing.md
```
