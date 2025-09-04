#!/bin/bash

echo "🔍 Simple validation of installer fixes..."
echo ""

# Test all the key improvements
tests_passed=0
total_tests=7

# Test 1: command_exists function
if grep -q "^command_exists()" install-anarqq-demo.sh; then
    echo "✅ 1. command_exists function is defined"
    ((tests_passed++))
else
    echo "❌ 1. command_exists function is missing"
fi

# Test 2: Unzip dependency handling
if grep -q "install_missing_dependency.*unzip" install-anarqq-demo.sh; then
    echo "✅ 2. Unzip dependency handling is present"
    ((tests_passed++))
else
    echo "❌ 2. Unzip dependency handling is missing"
fi

# Test 3: Multiple download methods
download_count=0
grep -q "curl.*-L.*-f" install-anarqq-demo.sh && ((download_count++))
grep -q "wget.*-q.*-O" install-anarqq-demo.sh && ((download_count++))
grep -q "git clone.*--depth" install-anarqq-demo.sh && ((download_count++))

if [ $download_count -ge 2 ]; then
    echo "✅ 3. Multiple download methods ($download_count methods)"
    ((tests_passed++))
else
    echo "❌ 3. Insufficient download methods ($download_count methods)"
fi

# Test 4: Retry logic
if grep -q "retry_with_backoff" install-anarqq-demo.sh; then
    echo "✅ 4. Retry logic is implemented"
    ((tests_passed++))
else
    echo "❌ 4. Retry logic is missing"
fi

# Test 5: Enhanced error handling
if grep -q "log_error" install-anarqq-demo.sh; then
    echo "✅ 5. Enhanced error logging is present"
    ((tests_passed++))
else
    echo "❌ 5. Enhanced error logging is missing"
fi

# Test 6: SSH key instructions
if grep -q "ssh-keygen" install-anarqq-demo.sh; then
    echo "✅ 6. SSH key setup instructions are present"
    ((tests_passed++))
else
    echo "❌ 6. SSH key setup instructions are missing"
fi

# Test 7: Multiple extraction methods
extraction_count=0
grep -q "unzip.*-q" install-anarqq-demo.sh && ((extraction_count++))
grep -A 5 "python3 -c" install-anarqq-demo.sh | grep -q "zipfile" && ((extraction_count++))
grep -q "AdmZip" install-anarqq-demo.sh && ((extraction_count++))

if [ $extraction_count -ge 2 ]; then
    echo "✅ 7. Multiple extraction methods ($extraction_count methods)"
    ((tests_passed++))
else
    echo "❌ 7. Insufficient extraction methods ($extraction_count methods)"
fi

echo ""
echo "Results: $tests_passed/$total_tests tests passed"

if [ $tests_passed -eq $total_tests ]; then
    echo "🎉 All installer improvements have been successfully implemented!"
    exit 0
else
    echo "⚠️  Some improvements may need attention"
    exit 1
fi