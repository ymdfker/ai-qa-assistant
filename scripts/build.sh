#!/bin/bash
set -e
echo "=== Building Backend ==="
cd "$(dirname "$0")/../backend" && /Users/huanggang/Downloads/apache-maven-3.9.16/bin/mvn package -DskipTests && cd ..
echo "=== Building Frontend ==="
cd "$(dirname "$0")/../frontend" && npm run build && cd ..
echo "=== Building Electron ==="
cd "$(dirname "$0")/../electron" && npm run build && cd ..
echo "=== Build Complete ==="
