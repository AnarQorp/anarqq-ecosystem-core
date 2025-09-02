#!/bin/bash

# Pre-commit hook for documentation validation
# This script runs documentation validation checks before allowing commits

set -e

echo "🔍 Running pre-commit documentation validation..."

# Check if any documentation files are being committed
DOCS_CHANGED=$(git diff --cached --name-only | grep -E '^docs/|^modules/.*/.*\.md$|^scripts/.*docs.*' || true)

if [ -z "$DOCS_CHANGED" ]; then
    echo "✅ No documentation changes detected, skipping validation"
    exit 0
fi

echo "📚 Documentation changes detected:"
echo "$DOCS_CHANGED" | sed 's/^/  - /'
echo ""

# Run validation checks
VALIDATION_FAILED=false

echo "📋 Running completeness check..."
if ! npm run docs:index:completeness > /dev/null 2>&1; then
    echo "❌ Completeness check failed"
    VALIDATION_FAILED=true
else
    echo "✅ Completeness check passed"
fi

echo "🔗 Running link validation..."
if ! npm run docs:index:links > /dev/null 2>&1; then
    echo "❌ Link validation failed"
    VALIDATION_FAILED=true
else
    echo "✅ Link validation passed"
fi

echo "👥 Running role coverage check..."
if ! npm run docs:index:roles > /dev/null 2>&1; then
    echo "❌ Role coverage check failed"
    VALIDATION_FAILED=true
else
    echo "✅ Role coverage check passed"
fi

echo "🔄 Running migration sync check..."
if ! npm run docs:index:migration > /dev/null 2>&1; then
    echo "❌ Migration sync check failed"
    VALIDATION_FAILED=true
else
    echo "✅ Migration sync check passed"
fi

if [ "$VALIDATION_FAILED" = true ]; then
    echo ""
    echo "❌ Documentation validation failed!"
    echo ""
    echo "To see detailed errors, run:"
    echo "  npm run docs:index:validate"
    echo ""
    echo "To fix issues automatically (where possible), run:"
    echo "  npm run docs:index:update"
    echo ""
    echo "Commit aborted. Please fix the validation errors and try again."
    exit 1
fi

echo ""
echo "✅ All documentation validation checks passed!"
echo "🚀 Proceeding with commit..."

exit 0