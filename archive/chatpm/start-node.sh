#!/bin/bash

echo "🚀 Starting Data Reporter (Node.js Backend)"
echo "============================================"

# Navigate to backend directory
cd "$(dirname "$0")/backend-node"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp .env.example .env
    echo ""
    echo "📝 IMPORTANT: Please configure your .env file with:"
    echo "   - GOOGLE_CLIENT_ID"
    echo "   - GOOGLE_CLIENT_SECRET"
    echo "   - SESSION_SECRET (generate a random string)"
    echo ""
    echo "Get Google OAuth credentials from:"
    echo "   https://console.cloud.google.com/apis/credentials"
    echo ""
    echo "Authorized redirect URI should be:"
    echo "   http://localhost:5000/auth/google/callback"
    echo ""
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server
echo ""
echo "🔧 Starting backend server on port 5000..."
npm run dev &

# Wait a moment
sleep 2

# Open frontend
echo ""
echo "🌐 Opening frontend..."
open ../frontend/index.html 2>/dev/null || xdg-open ../frontend/index.html 2>/dev/null || echo "Please open frontend/index.html in your browser"

echo ""
echo "✅ Data Reporter is running!"
echo "   Backend: http://localhost:5000"
echo "   Frontend: file://$(pwd)/../frontend/index.html"
echo ""
echo "Press Ctrl+C to stop the server"

# Keep running
wait
