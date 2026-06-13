#!/bin/bash

# Redirect stderr to stdout
exec 2>&1

set -e

# Get the script directory (.zscripts)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Next.js project path — derive from script location instead of hardcoding
NEXTJS_PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Check if Next.js project directory exists
if [ ! -d "$NEXTJS_PROJECT_DIR" ]; then
    echo "Error: Next.js project directory not found: $NEXTJS_PROJECT_DIR"
    exit 1
fi

echo "Starting build of Next.js app and mini-services..."
echo "Project directory: $NEXTJS_PROJECT_DIR"

# Switch to Next.js project directory
cd "$NEXTJS_PROJECT_DIR" || exit 1

# Set environment variables
export NEXT_TELEMETRY_DISABLED=1

BUILD_DIR="/tmp/build_fullstack_$BUILD_ID"
echo "Cleaning and creating build directory: $BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Install dependencies
echo "Installing dependencies..."
bun install

# Build Next.js app
echo "Building Next.js app..."
bun run build

# Build mini-services
# Check if mini-services directory exists
if [ -d "$NEXTJS_PROJECT_DIR/mini-services" ]; then
    echo "Building mini-services..."
    # Use scripts from the .zscripts directory
    sh "$SCRIPT_DIR/mini-services-install.sh"
    sh "$SCRIPT_DIR/mini-services-build.sh"

    # Copy mini-services start script to build directory
    echo "  - Copying mini-services-start.sh to $BUILD_DIR"
    cp "$SCRIPT_DIR/mini-services-start.sh" "$BUILD_DIR/mini-services-start.sh"
    chmod +x "$BUILD_DIR/mini-services-start.sh"
else
    echo "No mini-services directory found, skipping"
fi

# Collect build artifacts into the build directory
echo "Collecting build artifacts to $BUILD_DIR..."

# Copy Next.js standalone build output
if [ -d ".next/standalone" ]; then
    echo "  - Copying .next/standalone"
    cp -r .next/standalone "$BUILD_DIR/next-service-dist/"
fi

# Copy Next.js static files
if [ -d ".next/static" ]; then
    echo "  - Copying .next/static"
    mkdir -p "$BUILD_DIR/next-service-dist/.next"
    cp -r .next/static "$BUILD_DIR/next-service-dist/.next/"
fi

# Copy public directory
if [ -d "public" ]; then
    echo "  - Copying public"
    cp -r public "$BUILD_DIR/next-service-dist/"
fi

# Initialize the database for production.
# Production does NOT depend on a pre-existing dev database.
# Instead, we create a fresh DB and run migrations via db:push.
echo "Initializing production database..."
mkdir -p "$BUILD_DIR/db"
DATABASE_URL="file:$BUILD_DIR/db/custom.db" bun run db:push
echo "Production database ready"
ls -lah "$BUILD_DIR/db"

# Copy Caddyfile if present
if [ -f "Caddyfile" ]; then
    echo "  - Copying Caddyfile"
    cp Caddyfile "$BUILD_DIR/"
else
    echo "No Caddyfile found, skipping"
fi

# Copy start.sh script
echo "  - Copying start.sh to $BUILD_DIR"
cp "$SCRIPT_DIR/start.sh" "$BUILD_DIR/start.sh"
chmod +x "$BUILD_DIR/start.sh"

# Package into $BUILD_DIR.tar.gz
PACKAGE_FILE="${BUILD_DIR}.tar.gz"
echo ""
echo "Packaging build artifacts to $PACKAGE_FILE..."
cd "$BUILD_DIR" || exit 1
tar -czf "$PACKAGE_FILE" .
cd - > /dev/null || exit 1

echo ""
echo "Build complete. All artifacts packaged to $PACKAGE_FILE"
echo "Package size:"
ls -lh "$PACKAGE_FILE"
