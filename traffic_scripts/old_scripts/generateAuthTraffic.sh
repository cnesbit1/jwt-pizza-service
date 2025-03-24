#!/bin/bash

# Check for host argument
if [ -z "$1" ]; then
  echo "Usage: $0 <host>"
  echo "Example: $0 http://localhost:3000"
  exit 1
fi

host=$1
pids=()

# Cleanup on Ctrl+C
cleanup() {
  echo "Stopping auth simulation..."
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null
  done
  exit 0
}
trap cleanup SIGINT

# ----- Functions for Auth Traffic ----- #

# Heavy valid login/logout
valid_auth_flood() {
  while true; do
    response=$(curl -s -X PUT "$host/api/auth" -d '{"email":"d@jwt.com", "password":"diner"}' -H 'Content-Type: application/json')
    token=$(echo "$response" | jq -r '.token')
    if [[ $token != "null" ]]; then
      echo "[VALID LOGIN] Diner"
      sleep 1
      curl -s -X DELETE "$host/api/auth" -H "Authorization: Bearer $token" > /dev/null
      echo "[LOGOUT] Diner"
    else
      echo "[VALID LOGIN FAILED]"
    fi
    sleep 1
  done
}

# Rapid failed login attempts
invalid_auth_flood() {
  while true; do
    curl -s -X PUT "$host/api/auth" \
      -d '{"email":"baduser@jwt.com", "password":"wrongpass"}' \
      -H 'Content-Type: application/json' > /dev/null
    echo "[INVALID LOGIN] Bad credentials"
    sleep 1
  done
}

# Occasional franchise login/logout
franchise_login_cycle() {
  while true; do
    response=$(curl -s -X PUT "$host/api/auth" -d '{"email":"f@jwt.com", "password":"franchisee"}' -H 'Content-Type: application/json')
    token=$(echo "$response" | jq -r '.token')
    if [[ $token != "null" ]]; then
      echo "[FRANCHISE LOGIN]"
      sleep 4
      curl -s -X DELETE "$host/api/auth" -H "Authorization: Bearer $token" > /dev/null
      echo "[FRANCHISE LOGOUT]"
    fi
    sleep 4
  done
}

# ----- Start Threads ----- #

valid_auth_flood &
pids+=($!)

invalid_auth_flood &
pids+=($!)

franchise_login_cycle &
pids+=($!)

# ----- Wait for All ----- #
wait "${pids[@]}"