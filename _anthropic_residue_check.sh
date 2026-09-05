#!/bin/sh
# Executable-residue check. Fails loudly if the file set is empty (no silent green).
set -e
FILES=$(ls public/*.js public/*.html api/*.js 2>/dev/null)
[ -n "$FILES" ] || { echo "HARNESS INVALID: no files matched"; exit 3; }
echo "scanned files: $(echo "$FILES" | wc -w | tr -d ' ')"
fail=0
chk() { n=$(grep -n "$2" $FILES 2>/dev/null | grep -vE ':[0-9]+: *(//|\*)' | wc -l | tr -d ' ')
        if [ "$n" = "0" ]; then echo "  OK   $1 = 0"; else echo "  FAIL $1 = $n"; grep -n "$2" $FILES | grep -vE ':[0-9]+: *(//|\*)' | head -4; fail=1; fi; }
chk "executable /api/anthropic-proxy" "anthropic-proxy"
chk "claude-* model literal"          "['\"]claude-"
chk "haiku-fire-counter include"      "haiku-fire-counter"
chk "ALLOW_PAID_ANTHROPIC flag"       "__ALLOW_PAID_ANTHROPIC_AUTHOR__"
exit $fail
