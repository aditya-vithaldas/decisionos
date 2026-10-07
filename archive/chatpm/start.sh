#!/bin/bash

echo "==================================="
echo "  Data Reporter - Starting Up"
echo "==================================="

# Navigate to project directory
cd "$(dirname "$0")"

# Check if Python virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv backend/venv
fi

# Activate virtual environment and install dependencies
echo "Installing Python dependencies..."
source backend/venv/bin/activate
pip install -q -r backend/requirements.txt

# Create sample database
echo "Creating sample database..."
python backend/create_sample_db.py

# Start the Flask backend in the background
echo "Starting Flask backend on port 5000..."
cd backend
python app.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

# Open the frontend in the default browser
echo "Opening frontend in browser..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    open frontend/index.html
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open frontend/index.html
fi

echo ""
echo "==================================="
echo "  Data Reporter is running!"
echo "==================================="
echo ""
echo "Backend API: http://localhost:5000"
echo "Frontend: Open frontend/index.html in your browser"
echo ""
echo "Sample SQLite connection string:"
echo "sqlite:///$(pwd)/backend/sample.db"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Wait for user to stop
trap "kill $BACKEND_PID 2>/dev/null; exit" INT
wait $BACKEND_PID
