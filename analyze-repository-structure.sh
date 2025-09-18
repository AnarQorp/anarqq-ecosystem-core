#!/bin/bash

# Repository Structure Analysis Script
# This script analyzes the current repository structure and creates a baseline
# for the gitignore cleanup implementation

echo "=== AnarQ-Q Repository Structure Analysis ==="
echo "Date: $(date)"
echo "Repository: $(pwd)"
echo ""

# Create output directory for analysis results
mkdir -p analysis-results

# 1. Overall repository statistics
echo "1. REPOSITORY STATISTICS"
echo "========================"
total_files=$(find . -type f | wc -l)
total_dirs=$(find . -type d | wc -l)
repo_size=$(du -sh . | cut -f1)
echo "Total files: $total_files"
echo "Total directories: $total_dirs"
echo "Repository size: $repo_size"
echo ""

# 2. File type analysis
echo "2. FILE TYPE ANALYSIS"
echo "===================="
echo "Top file extensions by count:"
find . -type f -name "*.*" | sed 's/.*\.//' | sort | uniq -c | sort -nr | head -20
echo ""

# 3. Large files analysis
echo "3. LARGE FILES ANALYSIS (>1MB)"
echo "==============================="
find . -type f -size +1M -exec ls -lh {} \; | awk '{print $5 " " $9}' | sort -hr
echo ""

# 4. Ecosystem-specific file patterns
echo "4. ECOSYSTEM-SPECIFIC PATTERNS"
echo "==============================="
echo "Installation logs:"
find . -name "*.log" -type f | head -10
echo ""
echo "Test artifacts:"
find . -name "test-*" -type f | head -10
echo ""
echo "Distribution files:"
find . -name "*.tar.gz" -o -name "*.zip" | head -10
echo ""
echo "Rollback files:"
find . -path "*/.rollback/*" -type f | head -10
echo ""

# 5. Current .gitignore effectiveness
echo "5. CURRENT .GITIGNORE EFFECTIVENESS"
echo "==================================="
echo "Files that should be ignored but aren't:"
echo "Log files in repository:"
git ls-files | grep -E '\.(log)$' | wc -l
echo "Temporary test directories:"
git ls-files | grep -E '^test-.*/' | wc -l
echo "Distribution files:"
git ls-files | grep -E '\.(tar\.gz|zip)$' | wc -l
echo ""

# 6. Essential vs non-essential file categorization
echo "6. FILE CATEGORIZATION"
echo "====================="
echo "ESSENTIAL FILES (Core ecosystem):"
echo "- Source files (.js, .mjs, .ts, .tsx, .sol):"
find . -name "*.js" -o -name "*.mjs" -o -name "*.ts" -o -name "*.tsx" -o -name "*.sol" | wc -l
echo "- Configuration files:"
find . -name "package.json" -o -name "tsconfig*.json" -o -name "*.config.*" | wc -l
echo "- Main installation scripts:"
find . -name "install-anarqq.sh" -o -name "install-anarqq-demo.*" | wc -l
echo "- Core documentation:"
find . -name "README*.md" | wc -l
echo ""

echo "NON-ESSENTIAL FILES (Should be ignored):"
echo "- Log files:"
find . -name "*.log" | wc -l
echo "- Test result directories:"
find . -name "test-*" -type d | wc -l
echo "- Implementation summaries:"
find . -name "*-implementation-summary.md" | wc -l
echo "- Rollback files:"
find . -path "*/.rollback/*" | wc -l
echo "- Artifacts directories:"
find . -name "artifacts" -type d | wc -l
echo ""

# 7. Directory structure analysis
echo "7. DIRECTORY STRUCTURE"
echo "====================="
echo "Core directories (should be preserved):"
echo "- modules/: $(find modules -type f 2>/dev/null | wc -l) files"
echo "- libs/: $(find libs -type f 2>/dev/null | wc -l) files"
echo "- src/: $(find src -type f 2>/dev/null | wc -l) files"
echo "- backend/: $(find backend -type f 2>/dev/null | wc -l) files"
echo "- scripts/: $(find scripts -type f 2>/dev/null | wc -l) files"
echo ""

echo "Temporary/Generated directories (should be ignored):"
echo "- .rollback/: $(find .rollback -type f 2>/dev/null | wc -l) files"
echo "- artifacts/: $(find artifacts -type f 2>/dev/null | wc -l) files"
echo "- test-results/: $(find test-results -type f 2>/dev/null | wc -l) files"
echo "- node_modules/: $(find . -name node_modules -type d | wc -l) directories"
echo ""

# 8. Generate detailed file inventory
echo "8. GENERATING DETAILED INVENTORY"
echo "==============================="
echo "Creating detailed file inventory..."

# Essential files inventory
{
    echo "# ESSENTIAL FILES INVENTORY"
    echo "# Generated on $(date)"
    echo ""
    echo "## Core Source Files"
    find . -name "*.js" -o -name "*.mjs" -o -name "*.ts" -o -name "*.tsx" -o -name "*.sol" | sort
    echo ""
    echo "## Configuration Files"
    find . -name "package.json" -o -name "tsconfig*.json" -o -name "*.config.*" | sort
    echo ""
    echo "## Main Installation Scripts"
    find . -name "install-anarqq.sh" -o -name "install-anarqq-demo.*" | sort
    echo ""
    echo "## Core Documentation"
    find . -name "README*.md" -o -path "./docs/*.md" | sort
} > analysis-results/essential-files-inventory.txt

# Non-essential files inventory
{
    echo "# NON-ESSENTIAL FILES INVENTORY"
    echo "# Generated on $(date)"
    echo ""
    echo "## Log Files"
    find . -name "*.log" | sort
    echo ""
    echo "## Test Artifacts"
    find . -name "test-*" | sort
    echo ""
    echo "## Implementation Summaries"
    find . -name "*-implementation-summary.md" | sort
    echo ""
    echo "## Distribution Files"
    find . -name "*.tar.gz" -o -name "*.zip" | sort
    echo ""
    echo "## Rollback Files"
    find . -path "*/.rollback/*" | sort
} > analysis-results/non-essential-files-inventory.txt

# Current gitignore effectiveness report
{
    echo "# CURRENT .GITIGNORE EFFECTIVENESS REPORT"
    echo "# Generated on $(date)"
    echo ""
    echo "## Files that should be ignored but are tracked:"
    echo ""
    echo "### Log files in git:"
    git ls-files | grep -E '\.(log)$' || echo "None found"
    echo ""
    echo "### Temporary test directories in git:"
    git ls-files | grep -E '^test-.*/' || echo "None found"
    echo ""
    echo "### Distribution files in git:"
    git ls-files | grep -E '\.(tar\.gz|zip)$' || echo "None found"
    echo ""
    echo "### Implementation summaries in git:"
    git ls-files | grep -E '.*-implementation-summary\.md$' || echo "None found"
    echo ""
    echo "### Rollback files in git:"
    git ls-files | grep -E '\.rollback/' || echo "None found"
} > analysis-results/gitignore-effectiveness-report.txt

echo "Analysis complete! Results saved to analysis-results/ directory"
echo ""
echo "Summary files created:"
echo "- analysis-results/essential-files-inventory.txt"
echo "- analysis-results/non-essential-files-inventory.txt" 
echo "- analysis-results/gitignore-effectiveness-report.txt"