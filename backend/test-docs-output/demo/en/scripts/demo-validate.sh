#!/bin/bash
# Demo Validation Script

set -e

echo "Running demo validation..."

# Validate setup
echo "Validating setup..."
npm run demo:verify-setup

# Validate results
echo "Validating results..."
npm run demo:validate-results

# Generate report
echo "Generating report..."
npm run demo:generate-report

echo "Validation completed ✓"
