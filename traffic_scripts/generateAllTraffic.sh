#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <host>"
  echo "Example: $0 http://localhost:3000"
  exit 1
fi

HOST=$1
MAX_USERS=10
declare -A USER_TOKENS
PIDS=()

### ---------------------- Shared Cleanup ----------------------
cleanup() {
  echo -e "\n🧹 Cleaning up..."

  echo "→ Logging out all active simulated users..."
  for email in "${!USER_TOKENS[@]}"; do
    token=${USER_TOKENS[$email]}
    curl -s -X DELETE "$HOST/api/auth" -H "Authorization: Bearer $token" > /dev/null
    echo "← Logged out $email"
  done

  echo "→ Killing background traffic generators..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null
  done

  echo "✅ Cleanup complete!"
  exit 0
}
trap cleanup SIGINT

### ---------------------- Generate Users ----------------------
generate_users() {
  for i in $(seq 1 $MAX_USERS); do
    email="user$i@jwt.com"
    password="password"
    # Check if user already exists (login attempt)
    response=$(curl -s -X PUT "$HOST/api/auth" -H "Content-Type: application/json" \
      -d "{\"email\":\"$email\",\"password\":\"$password\"}")
    token=$(echo "$response" | jq -r '.token')
    if [ "$token" == "null" ] || [ -z "$token" ]; then
      # Try to create the user only if login failed
      curl -s -X POST "$HOST/api/auth" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"User $i\",\"email\":\"$email\",\"password\":\"$password\"}" > /dev/null
      echo "Created user $email."
    else
      echo "User $email already exists."
    fi
  done
}

### ---------------------- Login/Logout Users ----------------------
login_users() {
  local count=$1
  echo "Logging in $count users..."
  for i in $(seq 1 $count); do
    email="user$i@jwt.com"
    password="password"
    response=$(curl -s -X PUT "$HOST/api/auth" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$email\",\"password\":\"$password\"}")
    token=$(echo "$response" | jq -r '.token')
    if [ "$token" != "null" ] && [ -n "$token" ]; then
      USER_TOKENS[$email]=$token
      echo "→ Logged in $email"
    fi
  done
}

logout_users() {
  local count=$1
  echo "Logging out $count users..."
  local i=1
  for email in "${!USER_TOKENS[@]}"; do
    if [ $i -gt $count ]; then break; fi
    token=${USER_TOKENS[$email]}
    curl -s -X DELETE "$HOST/api/auth" \
      -H "Authorization: Bearer $token" > /dev/null
    unset USER_TOKENS[$email]
    echo "← Logged out $email"
    ((i++))
  done
}

### ---------------------- Auth Flooders ----------------------
valid_auth_flood() {
  while true; do
    response=$(curl -s -X PUT "$HOST/api/auth" -d '{"email":"d@jwt.com", "password":"diner"}' -H 'Content-Type: application/json')
    token=$(echo "$response" | jq -r '.token')
    if [[ $token != "null" ]] && [[ -n $token ]]; then
      echo "[VALID LOGIN] Diner"
      sleep 1
      curl -s -X DELETE "$HOST/api/auth" -H "Authorization: Bearer $token" > /dev/null
      echo "[LOGOUT] Diner"
    fi
    sleep 1
  done
}

invalid_auth_flood() {
  while true; do
    curl -s -X PUT "$HOST/api/auth" \
      -d '{"email":"baduser@jwt.com", "password":"wrongpass"}' \
      -H 'Content-Type: application/json' > /dev/null
    echo "[INVALID LOGIN]"
    sleep 1
  done
}

franchise_login_cycle() {
  while true; do
    response=$(curl -s -X PUT "$HOST/api/auth" -d '{"email":"f@jwt.com", "password":"franchisee"}' -H 'Content-Type: application/json')
    token=$(echo "$response" | jq -r '.token')
    if [[ $token != "null" ]] && [[ -n $token ]]; then
      echo "[FRANCHISE LOGIN]"
      sleep 4
      curl -s -X DELETE "$HOST/api/auth" -H "Authorization: Bearer $token" > /dev/null
      echo "[FRANCHISE LOGOUT]"
    fi
    sleep 4
  done
}

### ---------------------- Menu and Pizza Ordering ----------------------
menu_and_order_traffic() {
  while true; do
    curl -s "$HOST/api/order/menu" > /dev/null
    echo "[MENU REQUEST]"
    sleep 3
  done
}

pizza_ordering_cycle() {
  while true; do
    response=$(curl -s -X PUT "$HOST/api/auth" -d '{"email":"d@jwt.com", "password":"diner"}' -H 'Content-Type: application/json')
    token=$(echo "$response" | jq -r '.token')
    if [[ $token != "null" ]] && [[ -n $token ]]; then
      echo "[ORDER LOGIN]"
      curl -s -X POST "$HOST/api/order" -H 'Content-Type: application/json' \
        -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.05 }]}' \
        -H "Authorization: Bearer $token" > /dev/null
      echo "[PIZZA ORDERED]"
      sleep 20
      curl -s -X DELETE "$HOST/api/auth" -H "Authorization: Bearer $token" > /dev/null
      echo "[ORDER LOGOUT]"
    fi
    sleep 30
  done
}

### ---------------------- Start All Threads ----------------------
generate_users

valid_auth_flood & PIDS+=($!)
invalid_auth_flood & PIDS+=($!)
franchise_login_cycle & PIDS+=($!)
menu_and_order_traffic & PIDS+=($!)
pizza_ordering_cycle & PIDS+=($!)

# Active user login/logout variation cycle
(
  while true; do
    echo "----- User variation cycle -----"
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
) &
PIDS+=($!)

### ---------------------- Wait ----------------------
wait "${PIDS[@]}"
