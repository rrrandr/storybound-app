#!/bin/bash
# Poll the gemini proxy every 10 min; exit (one notification) when quota clears (ping != 429).
while :; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/gemini-proxy \
    -H 'Content-Type: application/json' \
    -d '{"model":"gemini-2.5-flash","messages":[{"role":"user","content":"ping"}],"max_tokens":5}' 2>/dev/null)
  echo "$(date -u +%Y-%m-%dT%H:%MZ) quota-ping=$code" >&2
  if [ "$code" != "429" ] && [ -n "$code" ]; then
    echo "QUOTA AVAILABLE (http=$code) — run: node _classifier_determinism.mjs"
    break
  fi
  sleep 600
done
