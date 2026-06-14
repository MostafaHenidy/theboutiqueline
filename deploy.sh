#!/bin/bash
# =====================================================
# TBL Deploy Script — Frontend Build + Upload
# Usage: ./deploy.sh
# =====================================================

set -e

SERVER="root@77.237.232.181"
PORT=22
REMOTE_PATH="/home/adminanmkavps/web/theboutiqueline.anmka.com/public_html/"
FRONTEND_DIR="$(dirname "$0")/frontend"

echo ""
echo "🏗️  Building frontend..."
cd "$FRONTEND_DIR"
npm run build

echo ""
echo "📦 Uploading to server..."
DIST_DIR="$(dirname "$0")/../dist"
rsync -avz --delete "$DIST_DIR/" \
  -e "ssh -p $PORT -o StrictHostKeyChecking=no" \
  "$SERVER:$REMOTE_PATH"

echo ""
echo "✅ Deploy complete!"
echo "🌐 https://theboutiqueline.com"
