#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <host>"
  echo "Example: $0 http://localhost:3000"
  exit 1
fi

HOST=${1%/}  # Remove trailing slash if any
RAND_ID=$RANDOM$RANDOM
EMAIL="pizza_$RAND_ID@jwt.com"
PASSWORD="pass$RAND_ID"
NAME="PizzaFan$RAND_ID"
TOKEN=""

echo "🆕 Creating random user: $EMAIL"

# Register the new user
REGISTER_RESPONSE=$(curl -s -X POST "$HOST/api/auth" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$NAME\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

# Extract token from registration
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token')

if [[ "$TOKEN" == "null" || -z "$TOKEN" ]]; then
  echo "❌ Registration or login failed for $EMAIL"
  echo "Response: $REGISTER_RESPONSE"
  exit 1
fi

echo "✅ Registered and logged in as $EMAIL"

# 🔓 Setup cleanup on Ctrl+C
cleanup() {
  echo -e "\n👋 Logging out $EMAIL..."
  curl -s -X DELETE "$HOST/api/auth" \
    -H "Authorization: Bearer $TOKEN" > /dev/null
  echo "✅ Logged out. Goodbye!"
  exit 0
}
trap cleanup SIGINT

# 🔁 Infinite pizza ordering loop
i=1
while true; do
  echo "🍕 Order #$i from $EMAIL"
  curl -s -X POST "$HOST/api/order" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "franchiseId": 1,
      "storeId": 1,
      "items": [
        {
          "menuId": 1,
          "description": "Veggie",
          "price": 0.05
        }
      ]
    }' > /dev/null
  ((i++))
  sleep 1
done