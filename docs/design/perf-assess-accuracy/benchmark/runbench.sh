#!/bin/bash
# 사용: runbench.sh <tag>  — 두 묶음 다시 뽑고 채점
S=${SCRATCH:?set SCRATCH to a work folder}
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/../../../../backend"
J="$(cygpath -w /d/univ/capstone/perf-assess-corpus/fresh-1123-flat)|$(cygpath -w $S/b1123_$1.jsonl);$(cygpath -w /d/univ/capstone/perf-assess-corpus/fresh-1124-flat)|$(cygpath -w $S/b1124_$1.jsonl)"
EXTRACTOR=simple DUMP_SECTION=1 ACCURACY_JOBS="$J" ACCURACY_CACHE="$(cygpath -w $S/cacheall)" ./gradlew test --tests '*AccuracyDumpTest*' --rerun -q 2>&1 | grep -v HotSpot | tail -3
cd "$HERE"
PYTHONIOENCODING=utf-8 python bench.py 1123 "$(cygpath -w $S/b1123_$1.jsonl)" > $S/bench_$1.txt
PYTHONIOENCODING=utf-8 python bench.py 1124 "$(cygpath -w $S/b1124_$1.jsonl)" >> $S/bench_$1.txt
cat $S/bench_$1.txt
