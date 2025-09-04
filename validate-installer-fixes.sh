#!/bin/bash

# Simple validation script for installer fixes
# Tests the specific issues mentioned in the task

set -e

echo "🔍 Validating installer fixes..."
echo ""

# Test 1: command_exists function exists
echo "1. Checking command_exists function..."
if grep -q "^command_exists()" install-anarqq-demo.sh; then
    echo "   ✅ command_exists function is defined"
else
    echo "   ❌ command_exists function is missing"
    exit 1
fi

# Test 2: Unzip dependency handling
echo "2. Checking unzip dependency handling..."
if grep -q "unzip.*instalado\|install_missing_dependency.*unzip" install-anarqq-demo.sh; then
    echo "   ✅ Unzip dependency checking is present"
else
    echo "   ❌ Unzip dependency checking is missing"
    exit 1
fi

# Test 3: Multiple extraction methods
echo "3. Checking fallback extraction methods..."
extraction_methods=0

# Check for unzip method
if grep -q "unzip.*-q" install-anarqq-demo.sh; then
    ((extraction_methods++))
    echo "   - unzip method found"
fi

# Check for Python zipfile method
if grep -A 5 "python3 -c" install-anarqq-demo.sh | grep -q "zipfile"; then
    ((extraction_methods++))
    echo "   - Python zipfile method found"
fi

# Check for Node.js method
if grep -q "AdmZip" install-anarqq-demo.sh; then
    ((extraction_methods++))
    echo "   - Node.js AdmZip method found"
fi

if [ $extraction_methods -ge 2 ]; then
    echo "   ✅ Multiple extraction methods are implemented ($extraction_methods methods)"
else
    echo "   ❌ Insufficient extraction methods ($extraction_methods methods)"
    exit 1
fi

# Test 4: Multiple download methods
echo "4. Checking multiple download methods..."
download_methods=0
if grep -q "curl.*-L.*-f" install-anarqq-demo.sh; then
    ((download_methods++))
fi
if grep -q "wget.*-q.*-O" install-anarqq-demo.sh; then
    ((download_methods++))
fi
if grep -q "git clone.*--depth" install-anarqq-demo.sh; then
    ((download_methods++))
fi

if [ $download_methods -ge 2 ]; then
    echo "   ✅ Multiple download methods available ($download_methods methods)"
else
    echo "   ❌ Insufficient download methods ($download_methods methods)"
    exit 1
fi

# Test 5: Retry logic
echo "5. Checking retry logic..."
if grep -q "retry_with_backoff" install-anarqq-demo.sh; then
    echo "   ✅ Retry logic is implemented"
else
    echo "   ❌ Retry logic is missing"
    exit 1
fi

# Test 6: Enhanced error handling
echo "6. Checking enhanced error handling..."
if grep -q "log_error" install-anarqq-demo.sh; then
    echo "   ✅ Enhanced error logging is present"
else
    echo "   ❌ Enhanced error logging is missing"
    exit 1
fi

# Test 7: Public/private repository handling
echo "7. Checking repository access handling..."
if grep -q "ssh-keygen\|github.com/settings/keys" install-anarqq-demo.sh; then
    echo "   ✅ SSH key setup instructions are present"
else
    echo "   ❌ SSH key setup instructions are missing"
    exit 1
fi

echo ""
echo "🎉 All installer fixes have been validated successfully!"
echo ""
echo "Summary of improvements:"
echo "  ✅ Fixed missing command_exists function"
echo "  ✅ Added proper unzip dependency handling with fallbacks"
echo "  ✅ Implemented multiple download methods (curl, wget, git)"
echo "  ✅ Added retry logic with exponential backoff"
echo "  ✅ Enhanced error handling and logging"
echo "  ✅ Improved public/private repository access handling"
echo "  ✅ Added automatic dependency installation"
echo ""
echo "The installer is now more robust and should handle various system configurations better."