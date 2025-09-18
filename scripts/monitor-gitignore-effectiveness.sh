#!/bin/bash

# ========================================
# AnarQ-Q Ecosystem Gitignore Effectiveness Monitor
# ========================================
# This script monitors the effectiveness of the .gitignore configuration
# and provides alerts for files that might need attention.

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORT_DIR="$PROJECT_ROOT/analysis-results"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REPORT_FILE="$REPORT_DIR/gitignore-effectiveness-report-$TIMESTAMP.md"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Thresholds
MAX_UNTRACKED_FILES=50
MAX_LARGE_FILE_SIZE_KB=1024
MAX_REPO_SIZE_INCREASE_PERCENT=20

# Ensure report directory exists
mkdir -p "$REPORT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}AnarQ-Q Gitignore Effectiveness Monitor${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Timestamp: $(date)"
echo "Report will be saved to: $REPORT_FILE"
echo ""

# Initialize report file
cat > "$REPORT_FILE" << EOF
# Gitignore Effectiveness Report

**Generated:** $(date)  
**Repository:** $(basename "$PROJECT_ROOT")  
**Git Branch:** $(git branch --show-current 2>/dev/null || echo "unknown")

## Executive Summary

EOF

# Function to log to both console and report
log_both() {
    echo -e "$1"
    echo "$1" | sed 's/\x1b\[[0-9;]*m//g' >> "$REPORT_FILE"
}

# Function to append to report only
log_report() {
    echo "$1" >> "$REPORT_FILE"
}

# ========================================
# 1. Repository Size Analysis
# ========================================

echo -e "${BLUE}1. Repository Size Analysis${NC}"
log_report ""
log_report "## Repository Size Analysis"
log_report ""

# Get current repository size
REPO_SIZE_KB=$(git count-objects -v | grep "size-pack" | awk '{print $2}' || echo "0")
REPO_SIZE_MB=$((REPO_SIZE_KB / 1024))
OBJECT_COUNT=$(git count-objects -v | grep "count" | head -1 | awk '{print $2}' || echo "0")

log_both "Repository size: ${REPO_SIZE_MB} MB (${REPO_SIZE_KB} KB)"
log_both "Object count: ${OBJECT_COUNT}"

# Check size history if available
SIZE_HISTORY_FILE="$PROJECT_ROOT/.git/size-history.csv"
if [ -f "$SIZE_HISTORY_FILE" ]; then
    PREV_SIZE=$(tail -2 "$SIZE_HISTORY_FILE" | head -1 | cut -d',' -f2 2>/dev/null || echo "$REPO_SIZE_KB")
    SIZE_CHANGE_PERCENT=$(( (REPO_SIZE_KB - PREV_SIZE) * 100 / PREV_SIZE )) 2>/dev/null || SIZE_CHANGE_PERCENT=0
    
    if [ $SIZE_CHANGE_PERCENT -gt $MAX_REPO_SIZE_INCREASE_PERCENT ]; then
        log_both "${RED}⚠️  WARNING: Repository size increased by ${SIZE_CHANGE_PERCENT}%${NC}"
        log_both "Previous size: $((PREV_SIZE / 1024)) MB, Current size: ${REPO_SIZE_MB} MB"
    elif [ $SIZE_CHANGE_PERCENT -lt -10 ]; then
        log_both "${GREEN}✅ Repository size decreased by ${SIZE_CHANGE_PERCENT#-}%${NC}"
    else
        log_both "${GREEN}✅ Repository size change: ${SIZE_CHANGE_PERCENT}%${NC}"
    fi
else
    log_both "${YELLOW}ℹ️  No size history available. Creating baseline...${NC}"
    echo "$(date +%Y-%m-%d),$REPO_SIZE_KB" > "$SIZE_HISTORY_FILE"
fi

# Update size history
echo "$(date +%Y-%m-%d),$REPO_SIZE_KB" >> "$SIZE_HISTORY_FILE"

# ========================================
# 2. Untracked Files Analysis
# ========================================

echo ""
echo -e "${BLUE}2. Untracked Files Analysis${NC}"
log_report ""
log_report "## Untracked Files Analysis"
log_report ""

# Get untracked files
UNTRACKED_FILES=$(git status --porcelain | grep "^??" | wc -l)
log_both "Untracked files count: $UNTRACKED_FILES"

if [ $UNTRACKED_FILES -gt $MAX_UNTRACKED_FILES ]; then
    log_both "${RED}⚠️  WARNING: High number of untracked files ($UNTRACKED_FILES > $MAX_UNTRACKED_FILES)${NC}"
elif [ $UNTRACKED_FILES -gt 10 ]; then
    log_both "${YELLOW}⚠️  NOTICE: Moderate number of untracked files ($UNTRACKED_FILES)${NC}"
else
    log_both "${GREEN}✅ Untracked files count is acceptable${NC}"
fi

# Show sample of untracked files
if [ $UNTRACKED_FILES -gt 0 ]; then
    log_report ""
    log_report "### Sample Untracked Files"
    log_report ""
    log_report '```'
    git status --porcelain | grep "^??" | head -20 | cut -c4- >> "$REPORT_FILE"
    log_report '```'
    
    echo "Sample untracked files:"
    git status --porcelain | grep "^??" | head -10 | cut -c4-
fi

# ========================================
# 3. Large Files Detection
# ========================================

echo ""
echo -e "${BLUE}3. Large Files Detection${NC}"
log_report ""
log_report "## Large Files Detection"
log_report ""

# Find large files in the repository
echo "Scanning for large files..."
LARGE_FILES_TEMP=$(mktemp)
git ls-files | xargs ls -l 2>/dev/null | awk -v threshold=$((MAX_LARGE_FILE_SIZE_KB * 1024)) '$5 > threshold {print $5, $9}' | sort -nr > "$LARGE_FILES_TEMP"

LARGE_FILES_COUNT=$(wc -l < "$LARGE_FILES_TEMP")
log_both "Large files (>${MAX_LARGE_FILE_SIZE_KB}KB) count: $LARGE_FILES_COUNT"

if [ $LARGE_FILES_COUNT -gt 0 ]; then
    log_both "${YELLOW}⚠️  Found $LARGE_FILES_COUNT large files${NC}"
    log_report ""
    log_report "### Large Files List"
    log_report ""
    log_report "| Size (KB) | File Path |"
    log_report "|-----------|-----------|"
    
    echo "Top 10 largest files:"
    head -10 "$LARGE_FILES_TEMP" | while read size file; do
        size_kb=$((size / 1024))
        echo "  $size_kb KB - $file"
        log_report "| $size_kb | $file |"
    done
else
    log_both "${GREEN}✅ No large files detected${NC}"
fi

rm -f "$LARGE_FILES_TEMP"

# ========================================
# 4. Ignored Files Analysis
# ========================================

echo ""
echo -e "${BLUE}4. Ignored Files Analysis${NC}"
log_report ""
log_report "## Ignored Files Analysis"
log_report ""

# Check for potentially essential files being ignored
IGNORED_ESSENTIAL_TEMP=$(mktemp)
git ls-files --others --ignored --exclude-standard | \
grep -E "\.(js|mjs|ts|tsx|json|md|sh|sol|py)$" | \
grep -v node_modules | \
grep -v ".git/" > "$IGNORED_ESSENTIAL_TEMP" || true

IGNORED_ESSENTIAL_COUNT=$(wc -l < "$IGNORED_ESSENTIAL_TEMP")
log_both "Potentially essential ignored files: $IGNORED_ESSENTIAL_COUNT"

if [ $IGNORED_ESSENTIAL_COUNT -gt 0 ]; then
    log_both "${RED}⚠️  WARNING: Found $IGNORED_ESSENTIAL_COUNT potentially essential files being ignored${NC}"
    log_report ""
    log_report "### Potentially Essential Ignored Files"
    log_report ""
    log_report '```'
    head -20 "$IGNORED_ESSENTIAL_TEMP" >> "$REPORT_FILE"
    log_report '```'
    
    echo "Sample potentially essential ignored files:"
    head -10 "$IGNORED_ESSENTIAL_TEMP"
    echo ""
    echo -e "${YELLOW}Consider adding negation patterns for essential files${NC}"
else
    log_both "${GREEN}✅ No potentially essential files being ignored${NC}"
fi

rm -f "$IGNORED_ESSENTIAL_TEMP"

# ========================================
# 5. Pattern Effectiveness Analysis
# ========================================

echo ""
echo -e "${BLUE}5. Pattern Effectiveness Analysis${NC}"
log_report ""
log_report "## Pattern Effectiveness Analysis"
log_report ""

# Analyze common file patterns in untracked files
if [ $UNTRACKED_FILES -gt 0 ]; then
    echo "Analyzing untracked file patterns..."
    PATTERN_ANALYSIS_TEMP=$(mktemp)
    
    git status --porcelain | grep "^??" | cut -c4- | while read file; do
        # Extract file extension
        ext="${file##*.}"
        if [ "$ext" != "$file" ]; then
            echo ".$ext"
        fi
        
        # Extract directory patterns
        dir=$(dirname "$file")
        if [ "$dir" != "." ]; then
            echo "$dir/"
        fi
        
        # Extract filename patterns
        basename=$(basename "$file")
        case "$basename" in
            *.log) echo "*.log" ;;
            *.tmp) echo "*.tmp" ;;
            *.backup) echo "*.backup" ;;
            test-*) echo "test-*" ;;
            *-test-*) echo "*-test-*" ;;
            *-temp-*) echo "*-temp-*" ;;
        esac
    done | sort | uniq -c | sort -nr > "$PATTERN_ANALYSIS_TEMP"
    
    PATTERN_COUNT=$(wc -l < "$PATTERN_ANALYSIS_TEMP")
    if [ $PATTERN_COUNT -gt 0 ]; then
        log_both "Common patterns in untracked files:"
        log_report ""
        log_report "### Suggested Gitignore Patterns"
        log_report ""
        log_report "| Count | Pattern | Suggested Rule |"
        log_report "|-------|---------|----------------|"
        
        head -10 "$PATTERN_ANALYSIS_TEMP" | while read count pattern; do
            echo "  $count × $pattern"
            log_report "| $count | $pattern | $pattern |"
        done
    fi
    
    rm -f "$PATTERN_ANALYSIS_TEMP"
fi

# ========================================
# 6. Ecosystem-Specific Checks
# ========================================

echo ""
echo -e "${BLUE}6. Ecosystem-Specific Checks${NC}"
log_report ""
log_report "## Ecosystem-Specific Checks"
log_report ""

# Check for AnarQ-Q specific patterns
echo "Checking AnarQ-Q ecosystem patterns..."

# Check for installer logs
INSTALLER_LOGS=$(find . -maxdepth 1 -name "anarqq-*.log" -o -name "*-installer-*.log" 2>/dev/null | wc -l)
if [ $INSTALLER_LOGS -gt 0 ]; then
    log_both "${YELLOW}⚠️  Found $INSTALLER_LOGS installer log files${NC}"
    log_both "These should be ignored by gitignore patterns"
else
    log_both "${GREEN}✅ No installer logs found in root directory${NC}"
fi

# Check for test artifacts
TEST_ARTIFACTS=$(find . -maxdepth 1 -name "test-*" -type d 2>/dev/null | wc -l)
if [ $TEST_ARTIFACTS -gt 0 ]; then
    log_both "${YELLOW}⚠️  Found $TEST_ARTIFACTS test artifact directories${NC}"
else
    log_both "${GREEN}✅ No test artifact directories in root${NC}"
fi

# Check for distribution files
DIST_FILES=$(find . -maxdepth 1 \( -name "*.tar.gz" -o -name "*.zip" \) 2>/dev/null | wc -l)
if [ $DIST_FILES -gt 0 ]; then
    log_both "${YELLOW}⚠️  Found $DIST_FILES distribution files in root${NC}"
else
    log_both "${GREEN}✅ No distribution files in root directory${NC}"
fi

# ========================================
# 7. Essential Files Validation
# ========================================

echo ""
echo -e "${BLUE}7. Essential Files Validation${NC}"
log_report ""
log_report "## Essential Files Validation"
log_report ""

# Check that essential files are not ignored
ESSENTIAL_FILES=(
    "package.json"
    "install-anarqq.sh"
    "install-anarqq-demo.sh"
    "README.md"
    "modules/"
    "src/"
    "libs/"
)

MISSING_ESSENTIAL=0
log_report "### Essential Files Status"
log_report ""
log_report "| File/Directory | Status | Notes |"
log_report "|----------------|--------|-------|"

for file in "${ESSENTIAL_FILES[@]}"; do
    if [ -e "$file" ]; then
        if git check-ignore "$file" >/dev/null 2>&1; then
            log_both "${RED}❌ CRITICAL: $file is being ignored${NC}"
            log_report "| $file | ❌ IGNORED | Critical - needs negation pattern |"
            MISSING_ESSENTIAL=$((MISSING_ESSENTIAL + 1))
        else
            log_both "${GREEN}✅ $file is properly tracked${NC}"
            log_report "| $file | ✅ TRACKED | OK |"
        fi
    else
        log_both "${YELLOW}⚠️  $file does not exist${NC}"
        log_report "| $file | ⚠️ MISSING | File/directory not found |"
    fi
done

if [ $MISSING_ESSENTIAL -gt 0 ]; then
    log_both ""
    log_both "${RED}🚨 CRITICAL: $MISSING_ESSENTIAL essential files are being ignored!${NC}"
    log_both "This requires immediate attention - add negation patterns to .gitignore"
fi

# ========================================
# 8. Recommendations
# ========================================

echo ""
echo -e "${BLUE}8. Recommendations${NC}"
log_report ""
log_report "## Recommendations"
log_report ""

RECOMMENDATIONS=()

if [ $UNTRACKED_FILES -gt $MAX_UNTRACKED_FILES ]; then
    RECOMMENDATIONS+=("Add gitignore patterns for the $UNTRACKED_FILES untracked files")
fi

if [ $LARGE_FILES_COUNT -gt 5 ]; then
    RECOMMENDATIONS+=("Review $LARGE_FILES_COUNT large files - consider if they should be ignored or use Git LFS")
fi

if [ $IGNORED_ESSENTIAL_COUNT -gt 0 ]; then
    RECOMMENDATIONS+=("Add negation patterns for $IGNORED_ESSENTIAL_COUNT potentially essential ignored files")
fi

if [ $MISSING_ESSENTIAL -gt 0 ]; then
    RECOMMENDATIONS+=("URGENT: Fix gitignore patterns for $MISSING_ESSENTIAL essential files being ignored")
fi

if [ ${#RECOMMENDATIONS[@]} -eq 0 ]; then
    log_both "${GREEN}✅ No immediate recommendations - gitignore is working effectively${NC}"
    log_report "- Gitignore configuration is working effectively"
    log_report "- Continue regular monitoring"
else
    log_both "${YELLOW}📋 Recommendations:${NC}"
    for i in "${!RECOMMENDATIONS[@]}"; do
        log_both "  $((i+1)). ${RECOMMENDATIONS[$i]}"
        log_report "$((i+1)). ${RECOMMENDATIONS[$i]}"
    done
fi

# ========================================
# 9. Summary and Next Steps
# ========================================

echo ""
echo -e "${BLUE}9. Summary${NC}"
log_report ""
log_report "## Summary"
log_report ""

OVERALL_STATUS="GOOD"
if [ $MISSING_ESSENTIAL -gt 0 ]; then
    OVERALL_STATUS="CRITICAL"
elif [ $UNTRACKED_FILES -gt $MAX_UNTRACKED_FILES ] || [ $IGNORED_ESSENTIAL_COUNT -gt 0 ]; then
    OVERALL_STATUS="NEEDS_ATTENTION"
fi

case $OVERALL_STATUS in
    "CRITICAL")
        log_both "${RED}🚨 OVERALL STATUS: CRITICAL - Immediate action required${NC}"
        log_report "**Overall Status:** 🚨 CRITICAL"
        ;;
    "NEEDS_ATTENTION")
        log_both "${YELLOW}⚠️  OVERALL STATUS: NEEDS ATTENTION${NC}"
        log_report "**Overall Status:** ⚠️ NEEDS ATTENTION"
        ;;
    *)
        log_both "${GREEN}✅ OVERALL STATUS: GOOD${NC}"
        log_report "**Overall Status:** ✅ GOOD"
        ;;
esac

log_report ""
log_report "### Next Steps"
log_report ""
log_report "1. Review this report and address any critical issues"
log_report "2. Update .gitignore patterns based on recommendations"
log_report "3. Run validation scripts after making changes"
log_report "4. Schedule next monitoring run"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Report saved to: $REPORT_FILE${NC}"
echo -e "${BLUE}========================================${NC}"

# Exit with appropriate code
case $OVERALL_STATUS in
    "CRITICAL") exit 2 ;;
    "NEEDS_ATTENTION") exit 1 ;;
    *) exit 0 ;;
esac