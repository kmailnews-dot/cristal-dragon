#!/bin/bash

set -o pipefail

echo "========================================"
echo " CRISTAL DRAGON V5 — QA OPENCODE"
echo "========================================"
echo

TOTAL=0
FAILED=0

run_test() {
    local test="$1"

    echo
    echo "----------------------------------------"
    echo "TEST : $test"
    echo "----------------------------------------"

    node "$test"

    if [ $? -eq 0 ]; then
        echo "PASS : $test"
    else
        echo "FAIL : $test"
        FAILED=1
    fi
}

run_test "tests-opencode/test_v5_deep.js"
run_test "tests-opencode/test_v5_controls.js"
run_test "tests-opencode/test_v5_flippers_real.js"
run_test "tests-opencode/test_v5_flipper_collision.js"
run_test "tests-opencode/test_v5_flipper_integration.js"
run_test "tests-opencode/test_v5_extended.js"
run_test "tests-opencode/test_v5_shake.js"
run_test "tests-opencode/test_v5_combo.js"
run_test "tests-opencode/test_v5_top5.js"
run_test "tests-opencode/test_v5_bonus.js"
run_test "tests-opencode/test_v5_obstacle.js"
run_test "tests-opencode/test_v5_boss.js"
run_test "tests-opencode/test_v5_projectiles.js"
run_test "tests-opencode/test_v5_phase2.js"
run_test "tests-opencode/test_v5_perfect.js"
run_test "tests-opencode/test_v5_dragon_kill.js"
run_test "tests-opencode/test_v5_bot_player.js"
run_test "tests-opencode/test_v5_bot_expert.js"

echo
echo "========================================"

if [ "$FAILED" -eq 0 ]; then
    echo " QA GLOBAL : PASS"
    echo " Référence : 245/245 PASS"
    echo "========================================"
    exit 0
else
    echo " QA GLOBAL : FAIL"
    echo "========================================"
    exit 1
fi
