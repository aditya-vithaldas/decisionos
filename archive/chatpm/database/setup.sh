#!/bin/bash

echo "==================================="
echo "  PostgreSQL Database Setup"
echo "==================================="

cd "$(dirname "$0")"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start PostgreSQL container
echo "Starting PostgreSQL container..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Check connection
for i in {1..30}; do
    if docker exec datareporter_postgres pg_isready -U datareporter > /dev/null 2>&1; then
        echo "PostgreSQL is ready!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 1
done

echo ""
echo "==================================="
echo "  PostgreSQL is running!"
echo "==================================="
echo ""
echo "Connection details:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: ecommerce"
echo "  Username: datareporter"
echo "  Password: datareporter123"
echo ""
echo "Connection string for Data Reporter:"
echo "  postgresql://datareporter:datareporter123@localhost:5432/ecommerce"
echo ""
echo "To stop: docker-compose down"
echo "To view logs: docker-compose logs -f"
