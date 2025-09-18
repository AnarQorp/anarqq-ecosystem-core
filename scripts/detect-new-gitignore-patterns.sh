#!/bin/bash

# ========================================
# AnarQ-Q Ecosystem New Gitignore Pattern Detector
# ========================================
# This script analyzes untracked files and suggests new gitignore patterns
# based on common file types and naming conventions in the ecosystem.

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SUGGESTIONS_FILE="$PROJECT_ROOT/analysis-results/gitignore-pattern-suggestions.md"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Minimum occurrences for a pattern to be suggested
MIN_PATTERN_OCCURRENCES=2

# Ensure analysis directory exists
mkdir -p "$(dirname "$SUGGESTIONS_FILE")"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}AnarQ-Q New Gitignore Pattern Detector${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Timestamp: $(date)"
echo ""

# Initialize suggestions file
cat > "$SUGGESTIONS_FILE" << EOF
# Gitignore Pattern Suggestions

**Generated:** $(date)  
**Repository:** $(basename "$PROJECT_ROOT")  
**Analysis Type:** Untracked Files Pattern Detection

## Summary

This report analyzes untracked files in the repository and suggests gitignore patterns
to improve repository cleanliness and reduce noise in git status.

EOF

# Function to log to both console and file
log_both() {
    echo -e "$1"
    echo "$1" | sed 's/\x1b\[[0-9;]*m//g' >> "$SUGGESTIONS_FILE"
}

# Function to append to file only
log_file() {
    echo "$1" >> "$SUGGESTIONS_FILE"
}

# Get untracked files
UNTRACKED_TEMP=$(mktemp)
git status --porcelain | grep "^??" | cut -c4- > "$UNTRACKED_TEMP"
UNTRACKED_COUNT=$(wc -l < "$UNTRACKED_TEMP")

log_both "Found $UNTRACKED_COUNT untracked files to analyze"
log_file ""

if [ $UNTRACKED_COUNT -eq 0 ]; then
    log_both "${GREEN}✅ No untracked files found - gitignore is working well!${NC}"
    log_file ""
    log_file "## Conclusion"
    log_file ""
    log_file "No untracked files detected. The current gitignore configuration appears to be comprehensive and effective."
    rm -f "$UNTRACKED_TEMP"
    exit 0
fi

# ========================================
# 1. File Extension Analysis
# ========================================

echo ""
echo -e "${BLUE}1. File Extension Analysis${NC}"
log_file ""
log_file "## File Extension Analysis"
log_file ""

EXTENSION_TEMP=$(mktemp)
while read file; do
    ext="${file##*.}"
    if [ "$ext" != "$file" ] && [ ${#ext} -le 10 ]; then
        echo ".$ext"
    fi
done < "$UNTRACKED_TEMP" | sort | uniq -c | sort -nr > "$EXTENSION_TEMP"

EXTENSION_COUNT=$(wc -l < "$EXTENSION_TEMP")
if [ $EXTENSION_COUNT -gt 0 ]; then
    log_both "File extensions found in untracked files:"
    log_file ""
    log_file "| Count | Extension | Suggested Pattern | Priority |"
    log_file "|-------|-----------|-------------------|----------|"
    
    while read count ext; do
        priority="Low"
        suggested_pattern="*$ext"
        
        # Determine priority based on extension type and count
        if [ $count -ge 10 ]; then
            priority="High"
        elif [ $count -ge 5 ]; then
            priority="Medium"
        fi
        
        # Special handling for common temporary/generated extensions
        case "$ext" in
            .log|.tmp|.temp|.bak|.backup|.cache)
                priority="High"
                ;;
            .map|.tsbuildinfo|.pid|.lock)
                priority="High"
                ;;
            .gz|.zip|.tar|.tgz)
                priority="Medium"
                suggested_pattern="*$ext"
                ;;
        esac
        
        echo "  $count × $ext (Priority: $priority)"
        log_file "| $count | $ext | $suggested_pattern | $priority |"
        
        # Add to high priority suggestions
        if [ "$priority" = "High" ] && [ $count -ge $MIN_PATTERN_OCCURRENCES ]; then
            echo "$suggested_pattern" >> "$EXTENSION_TEMP.high_priority"
        fi
    done < "$EXTENSION_TEMP"
else
    log_both "${GREEN}No significant file extension patterns found${NC}"
fi

rm -f "$EXTENSION_TEMP"

# ========================================
# 2. Directory Pattern Analysis
# ========================================

echo ""
echo -e "${BLUE}2. Directory Pattern Analysis${NC}"
log_file ""
log_file "## Directory Pattern Analysis"
log_file ""

DIRECTORY_TEMP=$(mktemp)
while read file; do
    dir=$(dirname "$file")
    if [ "$dir" != "." ]; then
        echo "$dir/"
        
        # Also check for parent directories
        parent_dir=$(dirname "$dir")
        while [ "$parent_dir" != "." ] && [ "$parent_dir" != "/" ]; do
            echo "$parent_dir/"
            parent_dir=$(dirname "$parent_dir")
        done
    fi
done < "$UNTRACKED_TEMP" | sort | uniq -c | sort -nr > "$DIRECTORY_TEMP"

DIRECTORY_COUNT=$(wc -l < "$DIRECTORY_TEMP")
if [ $DIRECTORY_COUNT -gt 0 ]; then
    log_both "Directory patterns found:"
    log_file ""
    log_file "| Count | Directory | Suggested Pattern | Priority |"
    log_file "|-------|-----------|-------------------|----------|"
    
    head -20 "$DIRECTORY_TEMP" | while read count dir; do
        priority="Low"
        suggested_pattern="$dir"
        
        # Determine priority
        if [ $count -ge 10 ]; then
            priority="High"
        elif [ $count -ge 5 ]; then
            priority="Medium"
        fi
        
        # Special handling for common temporary directories
        case "$dir" in
            */tmp/|*/temp/|*/cache/|*/logs/)
                priority="High"
                ;;
            */test-*/|*/build/|*/dist/|*/.git/)
                priority="High"
                ;;
            */node_modules/|*/.cache/)
                priority="High"
                ;;
        esac
        
        echo "  $count × $dir (Priority: $priority)"
        log_file "| $count | $dir | $suggested_pattern | $priority |"
        
        if [ "$priority" = "High" ] && [ $count -ge $MIN_PATTERN_OCCURRENCES ]; then
            echo "$suggested_pattern" >> "$DIRECTORY_TEMP.high_priority"
        fi
    done
else
    log_both "${GREEN}No significant directory patterns found${NC}"
fi

rm -f "$DIRECTORY_TEMP"

# ========================================
# 3. Filename Pattern Analysis
# ========================================

echo ""
echo -e "${BLUE}3. Filename Pattern Analysis${NC}"
log_file ""
log_file "## Filename Pattern Analysis"
log_file ""

FILENAME_TEMP=$(mktemp)
while read file; do
    basename=$(basename "$file")
    
    # Extract various patterns
    case "$basename" in
        *.log) echo "*.log" ;;
        *.tmp) echo "*.tmp" ;;
        *.backup) echo "*.backup" ;;
        *.bak) echo "*.bak" ;;
        test-*) echo "test-*" ;;
        *-test-*) echo "*-test-*" ;;
        *-temp-*) echo "*-temp-*" ;;
        *-backup-*) echo "*-backup-*" ;;
        anarqq-*) echo "anarqq-*" ;;
        *-installer-*) echo "*-installer-*" ;;
        *-report.*) echo "*-report.*" ;;
        *-summary.*) echo "*-summary.*" ;;
        *-analysis.*) echo "*-analysis.*" ;;
        comprehensive-*) echo "comprehensive-*" ;;
        enhanced-*) echo "enhanced-*" ;;
        validation-*) echo "validation-*" ;;
        monitoring-*) echo "monitoring-*" ;;
        *.old) echo "*.old" ;;
        *.orig) echo "*.orig" ;;
        *~) echo "*~" ;;
        .#*) echo ".#*" ;;
        #*#) echo "#*#" ;;
    esac
    
    # Check for numbered files
    if echo "$basename" | grep -q '\.[0-9]\+$'; then
        echo "${basename%.*}.[0-9]*"
    fi
    
    # Check for timestamped files
    if echo "$basename" | grep -q '[0-9]\{8\}-[0-9]\{6\}'; then
        echo "*-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9]*"
    fi
    
done < "$UNTRACKED_TEMP" | sort | uniq -c | sort -nr > "$FILENAME_TEMP"

FILENAME_COUNT=$(wc -l < "$FILENAME_TEMP")
if [ $FILENAME_COUNT -gt 0 ]; then
    log_both "Filename patterns found:"
    log_file ""
    log_file "| Count | Pattern | Suggested Rule | Priority |"
    log_file "|-------|---------|----------------|----------|"
    
    head -20 "$FILENAME_TEMP" | while read count pattern; do
        priority="Low"
        
        # Determine priority
        if [ $count -ge 10 ]; then
            priority="High"
        elif [ $count -ge 5 ]; then
            priority="Medium"
        fi
        
        # Special handling for ecosystem-specific patterns
        case "$pattern" in
            "anarqq-*"|"*-installer-*"|"test-*"|"*-test-*")
                priority="High"
                ;;
            "*-report.*"|"*-summary.*"|"comprehensive-*")
                priority="High"
                ;;
            "*.log"|"*.tmp"|"*.backup"|"*.bak")
                priority="High"
                ;;
        esac
        
        echo "  $count × $pattern (Priority: $priority)"
        log_file "| $count | $pattern | $pattern | $priority |"
        
        if [ "$priority" = "High" ] && [ $count -ge $MIN_PATTERN_OCCURRENCES ]; then
            echo "$pattern" >> "$FILENAME_TEMP.high_priority"
        fi
    done
else
    log_both "${GREEN}No significant filename patterns found${NC}"
fi

rm -f "$FILENAME_TEMP"

# ========================================
# 4. Size-Based Analysis
# ========================================

echo ""
echo -e "${BLUE}4. Size-Based Analysis${NC}"
log_file ""
log_file "## Size-Based Analysis"
log_file ""

LARGE_FILES_TEMP=$(mktemp)
while read file; do
    if [ -f "$file" ]; then
        size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo "0")
        size_kb=$((size / 1024))
        if [ $size_kb -gt 100 ]; then  # Files larger than 100KB
            echo "$size_kb $file"
        fi
    fi
done < "$UNTRACKED_TEMP" | sort -nr > "$LARGE_FILES_TEMP"

LARGE_FILES_COUNT=$(wc -l < "$LARGE_FILES_TEMP")
if [ $LARGE_FILES_COUNT -gt 0 ]; then
    log_both "Large untracked files (>100KB):"
    log_file ""
    log_file "| Size (KB) | File | Suggested Action |"
    log_file "|-----------|------|------------------|"
    
    head -10 "$LARGE_FILES_TEMP" | while read size file; do
        action="Review - consider ignoring if temporary"
        
        # Suggest specific actions based on file type
        case "$file" in
            *.log|*.tmp|*.cache) action="Add to gitignore - temporary file" ;;
            *.tar.gz|*.zip|*.tgz) action="Add to gitignore - distribution file" ;;
            *.map|*.bundle.js) action="Add to gitignore - build artifact" ;;
            *) action="Review - determine if essential or temporary" ;;
        esac
        
        echo "  ${size}KB - $file"
        log_file "| $size | $file | $action |"
    done
else
    log_both "${GREEN}No large untracked files found${NC}"
fi

rm -f "$LARGE_FILES_TEMP"

# ========================================
# 5. Ecosystem-Specific Pattern Detection
# ========================================

echo ""
echo -e "${BLUE}5. Ecosystem-Specific Pattern Detection${NC}"
log_file ""
log_file "## Ecosystem-Specific Pattern Detection"
log_file ""

ECOSYSTEM_PATTERNS_TEMP=$(mktemp)

# Check for AnarQ-Q specific patterns
grep -E "(anarqq|installer|test-|comprehensive|enhanced|validation|monitoring)" "$UNTRACKED_TEMP" > "$ECOSYSTEM_PATTERNS_TEMP" || true

ECOSYSTEM_COUNT=$(wc -l < "$ECOSYSTEM_PATTERNS_TEMP")
if [ $ECOSYSTEM_COUNT -gt 0 ]; then
    log_both "AnarQ-Q ecosystem-specific files found:"
    log_file ""
    log_file "| File | Suggested Pattern | Rationale |"
    log_file "|------|-------------------|-----------|"
    
    while read file; do
        pattern=""
        rationale=""
        
        case "$file" in
            anarqq-*.log)
                pattern="anarqq-*.log"
                rationale="Installer log files"
                ;;
            *-installer-*.log)
                pattern="*-installer-*.log"
                rationale="General installer logs"
                ;;
            test-*)
                pattern="test-*"
                rationale="Test artifacts and temporary directories"
                ;;
            comprehensive-*-report.*)
                pattern="comprehensive-*-report.*"
                rationale="Auto-generated analysis reports"
                ;;
            enhanced-*-report.*)
                pattern="enhanced-*-report.*"
                rationale="Enhanced monitoring reports"
                ;;
            validation-*.*)
                pattern="validation-*.*"
                rationale="Validation result files"
                ;;
            monitoring-*.*)
                pattern="monitoring-*.*"
                rationale="Monitoring output files"
                ;;
            *-implementation-summary.md)
                pattern="*-implementation-summary.md"
                rationale="Auto-generated implementation summaries"
                ;;
        esac
        
        if [ -n "$pattern" ]; then
            echo "  $file → $pattern"
            log_file "| $file | $pattern | $rationale |"
            echo "$pattern" >> "$ECOSYSTEM_PATTERNS_TEMP.suggestions"
        fi
    done < "$ECOSYSTEM_PATTERNS_TEMP"
else
    log_both "${GREEN}No ecosystem-specific patterns detected${NC}"
fi

rm -f "$ECOSYSTEM_PATTERNS_TEMP"

# ========================================
# 6. Generate Consolidated Recommendations
# ========================================

echo ""
echo -e "${BLUE}6. Consolidated Recommendations${NC}"
log_file ""
log_file "## Consolidated Recommendations"
log_file ""

# Collect all high priority suggestions
ALL_SUGGESTIONS_TEMP=$(mktemp)
for file in *.high_priority "$ECOSYSTEM_PATTERNS_TEMP.suggestions"; do
    if [ -f "$file" ]; then
        cat "$file" >> "$ALL_SUGGESTIONS_TEMP"
        rm -f "$file"
    fi
done

if [ -f "$ALL_SUGGESTIONS_TEMP" ] && [ -s "$ALL_SUGGESTIONS_TEMP" ]; then
    # Remove duplicates and sort
    sort "$ALL_SUGGESTIONS_TEMP" | uniq > "$ALL_SUGGESTIONS_TEMP.unique"
    
    SUGGESTION_COUNT=$(wc -l < "$ALL_SUGGESTIONS_TEMP.unique")
    log_both "High priority gitignore patterns to add ($SUGGESTION_COUNT patterns):"
    log_file ""
    log_file "### Recommended Gitignore Additions"
    log_file ""
    log_file '```gitignore'
    log_file "# Auto-suggested patterns - $(date)"
    
    while read pattern; do
        echo "  $pattern"
        log_file "$pattern"
    done < "$ALL_SUGGESTIONS_TEMP.unique"
    
    log_file '```'
    log_file ""
    log_file "### Implementation Steps"
    log_file ""
    log_file "1. Review the suggested patterns above"
    log_file "2. Add appropriate patterns to the relevant section of .gitignore"
    log_file "3. Test the patterns with \`git status\`"
    log_file "4. Run validation scripts to ensure essential files aren't ignored"
    log_file "5. Commit the updated .gitignore"
    
    # Generate a ready-to-use gitignore snippet
    SNIPPET_FILE="$PROJECT_ROOT/analysis-results/suggested-gitignore-additions.txt"
    cat > "$SNIPPET_FILE" << EOF
# Suggested gitignore additions - $(date)
# Review and add to appropriate sections of .gitignore

EOF
    cat "$ALL_SUGGESTIONS_TEMP.unique" >> "$SNIPPET_FILE"
    
    echo ""
    echo -e "${GREEN}Gitignore snippet saved to: $SNIPPET_FILE${NC}"
    
    rm -f "$ALL_SUGGESTIONS_TEMP.unique"
else
    log_both "${GREEN}✅ No high priority patterns detected - current gitignore appears comprehensive${NC}"
fi

rm -f "$ALL_SUGGESTIONS_TEMP"

# ========================================
# 7. Summary and Next Steps
# ========================================

echo ""
echo -e "${BLUE}7. Summary${NC}"
log_file ""
log_file "## Summary and Next Steps"
log_file ""

if [ $UNTRACKED_COUNT -gt 50 ]; then
    log_both "${RED}⚠️  High number of untracked files ($UNTRACKED_COUNT) - gitignore needs attention${NC}"
    log_file "**Status:** ⚠️ Needs Attention - High number of untracked files"
elif [ $UNTRACKED_COUNT -gt 20 ]; then
    log_both "${YELLOW}⚠️  Moderate number of untracked files ($UNTRACKED_COUNT) - consider adding patterns${NC}"
    log_file "**Status:** ⚠️ Moderate - Consider adding patterns"
else
    log_both "${GREEN}✅ Reasonable number of untracked files ($UNTRACKED_COUNT)${NC}"
    log_file "**Status:** ✅ Good - Reasonable number of untracked files"
fi

log_file ""
log_file "### Recommended Actions"
log_file ""
log_file "1. **Review Suggestions**: Examine the patterns suggested in this report"
log_file "2. **Update Gitignore**: Add appropriate patterns to .gitignore"
log_file "3. **Test Changes**: Verify patterns work correctly with \`git status\`"
log_file "4. **Validate**: Run \`./scripts/validate-essential-files.sh\`"
log_file "5. **Monitor**: Schedule regular pattern detection runs"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Analysis complete. Report saved to: $SUGGESTIONS_FILE${NC}"
echo -e "${BLUE}========================================${NC}"

# Clean up
rm -f "$UNTRACKED_TEMP"

# Exit with appropriate code based on findings
if [ $UNTRACKED_COUNT -gt 50 ]; then
    exit 2  # Critical - needs immediate attention
elif [ $UNTRACKED_COUNT -gt 20 ]; then
    exit 1  # Warning - should be addressed
else
    exit 0  # OK
fi