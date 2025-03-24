#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <host>"
  echo "Example: $0 http://localhost:3000"
  exit 1
fi

HOST=$1
MAX_USERS=10
declare -A USER_TOKENS
PREF="u$(date +%s)"  # Unique email prefix based on timestamp

### 🔧 Create new users
generate_unique_users() {
  for i in $(seq 1 $MAX_USERS); do
    email="${PREF}_user$i@jwt.com"
    password="password"
    response=$(curl -s -X POST "$HOST/api/auth" \
      -H "Content-Type: application/json" \
      -d "{\"name\":\"User $i\",\"email\":\"$email\",\"password\":\"$password\"}")
    
    if echo "$response" | jq -e '.token' >/dev/null; then
      token=$(echo "$response" | jq -r '.token')
      USER_TOKENS[$email]=$token
      echo "✅ Registered and logged in $email"
    else
      echo "❌ Failed to register $email — response: $response"
    fi
  done
}

### 🔐 Log users in
login_users() {
  local count=$1
  echo "Logging in $count users..."
  local i=1
  for email in "${!USER_TOKENS[@]}"; do
    if [ $i -gt $count ]; then break; fi
    password="password"
    response=$(curl -s -X PUT "$HOST/api/auth" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$email\",\"password\":\"$password\"}")
    token=$(echo "$response" | jq -r '.token')
    if [ "$token" != "null" ]; then
      USER_TOKENS[$email]=$token
      echo "→ Logged in $email"
    else
      echo "× Failed login for $email"
    fi
    ((i++))
  done
}

### 🚪 Log out users
logout_users() {
  local count=$1
  echo "Logging out $count users..."
  local i=1
  for email in "${!USER_TOKENS[@]}"; do
    if [ $i -gt $count ]; then break; fi
    token=${USER_TOKENS[$email]}
    curl -s -X DELETE "$HOST/api/auth" -H "Authorization: Bearer $token" > /dev/null
    echo "← Logged out $email"
    ((i++))
  done
}

### 🧹 Cleanup
cleanup() {
  echo -e "\n🧹 Cleaning up... Logging out all users..."
  for email in "${!USER_TOKENS[@]}"; do
    token=${USER_TOKENS[$email]}
    curl -s -X DELETE "$HOST/api/auth" -H "Authorization: Bearer $token" > /dev/null
    echo "← Logged out $email"
  done
  exit 0
}
trap cleanup SIGINT

### 🚀 Start Script
generate_unique_users

while true; do
  echo "----- New cycle -----"
  random_in=$((RANDOM % MAX_USERS + 1))
  login_users $random_in
  sleep 30

  current_logged_in=${#USER_TOKENS[@]}
  if [ "$current_logged_in" -gt 0 ]; then
    random_out=$((RANDOM % current_logged_in + 1))
    logout_users $random_out
  fi
  sleep 30
done