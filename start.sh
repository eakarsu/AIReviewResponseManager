#!/bin/bash

# AI Review Response Manager - Startup Script
# This script sets up and runs the complete application

set -e

echo "=========================================="
echo "  AI Review Response Manager"
echo "  Auto-draft replies to Google/Yelp reviews"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Function to check if a port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Function to kill process on a port
kill_port() {
    local port=$1
    if check_port $port; then
        echo -e "${YELLOW}Killing process on port $port...${NC}"
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Function to check if PostgreSQL is running
check_postgres() {
    pg_isready -h localhost -p 5432 > /dev/null 2>&1
    return $?
}

# Function to wait for PostgreSQL to be ready
wait_for_postgres() {
    local max_attempts=30
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        if check_postgres; then
            return 0
        fi
        echo "Waiting for PostgreSQL... (attempt $attempt/$max_attempts)"
        sleep 1
        attempt=$((attempt + 1))
    done
    return 1
}

echo -e "${BLUE}Step 1: Cleaning up ports...${NC}"
# Clean up ports (avoiding port 5000 as requested)
kill_port 3000  # Frontend
kill_port 3001  # Backend
echo -e "${GREEN}Ports cleaned up!${NC}"
echo ""

echo -e "${BLUE}Step 2: Checking PostgreSQL...${NC}"
if check_postgres; then
    echo -e "${GREEN}PostgreSQL is running!${NC}"
else
    echo -e "${YELLOW}PostgreSQL is not running. Attempting to start...${NC}"

    # Try to start PostgreSQL (macOS with Homebrew)
    if command -v brew &> /dev/null; then
        brew services start postgresql@14 2>/dev/null || \
        brew services start postgresql@15 2>/dev/null || \
        brew services start postgresql 2>/dev/null || \
        pg_ctl -D /usr/local/var/postgres start 2>/dev/null || \
        pg_ctl -D /opt/homebrew/var/postgres start 2>/dev/null || true
    fi

    # Wait for PostgreSQL
    if wait_for_postgres; then
        echo -e "${GREEN}PostgreSQL started successfully!${NC}"
    else
        echo -e "${RED}Could not start PostgreSQL. Please start it manually:${NC}"
        echo "  - macOS: brew services start postgresql"
        echo "  - Linux: sudo systemctl start postgresql"
        echo "  - Docker: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres123 postgres:14"
        exit 1
    fi
fi
echo ""

echo -e "${BLUE}Step 3: Creating database (if not exists)...${NC}"
# Create database if it doesn't exist
createdb review_manager 2>/dev/null || echo "Database already exists or using existing connection"
echo -e "${GREEN}Database ready!${NC}"
echo ""

echo -e "${BLUE}Step 4: Installing backend dependencies...${NC}"
cd "$SCRIPT_DIR/backend"
npm install --silent
echo -e "${GREEN}Backend dependencies installed!${NC}"
echo ""

echo -e "${BLUE}Step 5: Installing frontend dependencies...${NC}"
cd "$SCRIPT_DIR/frontend"
npm install --silent
echo -e "${GREEN}Frontend dependencies installed!${NC}"
echo ""

echo -e "${BLUE}Step 6: Seeding database with sample data...${NC}"
cd "$SCRIPT_DIR/backend"
npm run seed
echo -e "${GREEN}Database seeded with 15+ items for each feature!${NC}"
echo ""

echo -e "${BLUE}Step 7: Installing nodemon for hot reload (if needed)...${NC}"
# Check if nodemon is installed globally or install it locally
if ! command -v nodemon &> /dev/null; then
    cd "$SCRIPT_DIR/backend"
    npm install nodemon --save-dev --silent 2>/dev/null || true
fi
echo -e "${GREEN}Hot reload ready!${NC}"
echo ""

echo -e "${BLUE}Step 8: Starting servers with hot reload...${NC}"
echo ""

# Kill ports again right before starting (in case seed or install grabbed them)
kill_port 3000
kill_port 3001
sleep 1

# Start backend with nodemon for hot reload
cd "$SCRIPT_DIR/backend"
if command -v nodemon &> /dev/null; then
    nodemon src/index.js &
else
    npx nodemon src/index.js &
fi
BACKEND_PID=$!
echo "Backend started with hot reload (PID: $BACKEND_PID)"

# Wait a moment for backend to initialize
sleep 2

# Start frontend (React already has hot reload built-in)
cd "$SCRIPT_DIR/frontend"
echo "Starting frontend with hot reload..."
npm start &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo ""
echo -e "${GREEN}=========================================="
echo "  Application Started Successfully!"
echo "==========================================${NC}"
echo ""
echo -e "${BLUE}Access the application:${NC}"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:3001"
echo ""
echo -e "${BLUE}Demo Login Credentials:${NC}"
echo "  Email:    admin@reviewmanager.com"
echo "  Password: admin123"
echo ""
echo -e "${YELLOW}Note: Click 'Fill Demo Credentials' button on login page${NC}"
echo ""
echo -e "${GREEN}Hot Reload Enabled:${NC}"
echo "  - Backend: Auto-restarts on file changes (nodemon)"
echo "  - Frontend: Auto-refreshes on file changes (React)"
echo ""
echo -e "${BLUE}To stop the application:${NC}"
echo "  Press Ctrl+C or run: kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Wait for both processes
wait $FRONTEND_PID
