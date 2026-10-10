#!/bin/bash
# QA COMPLETE — tous les tests + bots joueurs
# Durée : ~3 minutes

set -o pipefail

echo "========================================"
echo " CRISTAL DRAGON V5 — QA COMPLETE"
echo "========================================"
echo

FAILED=0

run_test() {
    local test="$1"
    echo "--- $(basename $test) ---"
    node "$test" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "  PASS"
    else
        echo "  FAIL"
        FAILED=1
    fi
}

# Tests unitaires
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

# Bots joueurs (longs)
run_test "tests-opencode/test_v5_bot_player.js"
run_test "tests-opencode/test_v5_bot_expert.js"

echo
echo "========================================"
if [ "$FAILED" -eq 0 ]; then
    echo " QA COMPLETE : PASS"
    echo "========================================"
    exit 0
else
    echo " QA COMPLETE : FAIL"
    echo "========================================"
    exit 1
fi
