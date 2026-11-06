#!/usr/bin/env bash
# 과업 시험 전후 로컬 학생 케어 DB 상태를 저장·복원한다. 로컬 개발 컨테이너 전용(운영 DB에 쓰지 말 것).
# 사용: scripts/research/care-db-state.sh save <name> | restore <name>
# 대상 테이블: 상담·이력·설정(care_*). demo_care_* 원본 기록은 시험 중 바뀌지 않으므로 대상이 아니다.
set -euo pipefail
cmd=$1; name=$2
dir="$(dirname "$0")/../../docs/design/ops-redesign/db-state"
mkdir -p "$dir"
tables="care_case care_case_baseline care_event care_settings care_student_lock"
c=learnershigh-care-api-mysql
if [ "$cmd" = save ]; then
  docker exec $c sh -c "MYSQL_PWD=care_local_demo mysqldump -u care_local --no-tablespaces --default-character-set=utf8mb4 --skip-dump-date student_care_local $tables" > "$dir/$name.sql"
  sha256sum "$dir/$name.sql"
elif [ "$cmd" = restore ]; then
  docker cp "$dir/$name.sql" $c:/tmp/restore.sql
  docker exec $c sh -c "MYSQL_PWD=care_local_demo mysql -u care_local --default-character-set=utf8mb4 student_care_local < /tmp/restore.sql"
  echo "restored $name"
fi
