# Database Migrations

Flyway Migration 파일 위치다. ([ADR-0006](../../docs/adr/0006-docker-mysql-flyway-testcontainers.md), Proposed)

Backend Build 시 이 폴더의 `*.sql`이 `classpath:db/migration`으로 포함되고,
Application 시작 시 Flyway가 순서대로 적용한다.

## 파일 이름

```text
V<yyyyMMddHHmm>__<snake_case_description>.sql

예: V202610091530__create_task_table.sql
```

- Version은 작성 시각(UTC)을 쓴다. 두 사람이 병렬로 만들어도 번호가 겹치지 않는다.
- 이미 main에 들어간 Migration 파일은 수정하지 않는다. 바꿀 내용은 새 Migration으로 추가한다.
- 빈 placeholder Migration을 만들지 않는다.

## 규칙

`.claude/rules/database.md`를 따른다.
