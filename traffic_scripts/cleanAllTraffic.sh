#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <host>"
  exit 1
fi

HOST=$1
MAX_USERS=10

echo "🔄 Cleaning up all simulated users..."

# Log out user1 - user10
for i in $(seq 1 $MAX_USERS); do
  email="user$i@jwt.com"
  password="password"
  response=$(curl -s -X PUT "$HOST/api/auth" -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\", \"password\":\"$password\"}")
  token=$(echo "$response" | jq -r '.token')
  if [ "$token" != "null" ]; then
    curl -s -X DELETE "$HOST/api/auth" -H "Authorization: Bearer $token" > /dev/null
    echo "← Logged out $email"
  fi
done

# Log out diner (d@jwt.com)
response=$(curl -s -X PUT "$HOST/api/auth" -H "Content-Type: application/json" \
  -d '{"email":"d@jwt.com", "password":"diner"}')
token=$(echo "$response" | jq -r '.token')
if [ "$token" != "null" ]; then
  curl -s -X DELETE "$HOST/api/auth" -H "Authorization: Bearer $token" > /dev/null
  echo "← Logged out d@jwt.com"
fi

# Log out franchisee (f@jwt.com)
response=$(curl -s -X PUT "$HOST/api/auth" -H "Content-Type: application/json" \
  -d '{"email":"f@jwt.com", "password":"franchisee"}')
token=$(echo "$response" | jq -r '.token')
if [ "$token" != "null" ]; then
  curl -s -X DELETE "$HOST/api/auth" -H "Authorization: Bearer $token" > /dev/null
  echo "← Logged out f@jwt.com"
fi

echo "✅ Cleanup complete."