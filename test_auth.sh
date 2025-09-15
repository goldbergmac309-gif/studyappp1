#!/usr/bin/env bash
set -euo pipefail

# Generate unique email each run
EMAIL="alex.$(date +%s)@test.com"
PASS="Password1234!"

echo "Signup: $EMAIL"
curl -sS -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  --data '{"email":"'"$EMAIL"'","password":"'"$PASS"'"}' >/dev/null

echo
echo "Login..."
LOGIN=$(curl -sS -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  --data '{"email":"'"$EMAIL"'","password":"'"$PASS"'"}')

# Extract accessToken from login response
TOKEN=$(echo "$LOGIN" | node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>{try{process.stdout.write(JSON.parse(s).accessToken||'')}catch(e){}})")

if [ -z "$TOKEN" ]; then
  echo "❌ No token returned from login. Check your API response."
  echo "Login response was: $LOGIN"
  exit 1
fi

echo "✅ Got token (chars: ${#TOKEN})"
echo "$TOKEN" > token.txt

echo
echo "Create subject..."
curl -sS -i -X POST http://localhost:3000/subjects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"name":"Demo Subject"}'

echo
echo "List subjects..."
curl -sS -i -H "Authorization: Bearer $TOKEN" http://localhost:3000/subjects
echo

