#!/bin/bash

# Maintainability Check Script
# Run this locally before committing

set -e

echo "🔍 Running maintainability check..."
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Run the calculator
node .github/scripts/calculate-maintainability.js

# Display the report
echo ""
echo "📊 Full report:"
echo ""
cat maintainability-report.md

echo ""
echo "✅ Maintainability check complete!"

