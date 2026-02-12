#!/usr/bin/env bash
# mock-scan.sh - Simulates afterburn CLI output for demo recording
# Matches real output format from src/cli/commander-cli.ts

# Green checkmark
G='\033[32m'
# Red for [HIGH] tags
R='\033[31m'
# Yellow/bold for health score number
Y='\033[1;33m'
# Cyan for AI annotation
C='\033[36m'
# Reset
N='\033[0m'

echo ""
echo "Afterburn v1.0.1"
echo ""
sleep 0.7
echo -e "  ${G}✔${N} Checking browser..."
sleep 0.7
echo -e "  ${G}✔${N} Crawling site..."
sleep 0.7
echo -e "  ${G}✔${N} Testing workflows..."
sleep 0.7
echo -e "  ${G}✔${N} Analyzing results..."
sleep 0.7
echo -e "  ${G}✔${N} Generating reports..."
sleep 0.3
echo ""
echo -e "Health: ${Y}47/100${N} - 52 issues found (13 high, 21 medium, 18 low)"
echo ""
sleep 0.3
echo "Top issues:"
sleep 0.4
echo -e "  1. ${R}[HIGH]${N} \"Get Started Free\" button does nothing when clicked"
sleep 0.4
echo -e "  2. ${R}[HIGH]${N} Newsletter signup form fails silently"
sleep 0.4
echo -e "  3. ${R}[HIGH]${N} JavaScript error: TypeError on page load"
sleep 0.3
echo "  ... and 49 more (see report)"
echo ""
sleep 0.3
echo "Reports saved:"
echo "  HTML:     afterburn-reports/report.html"
echo -e "  Markdown: afterburn-reports/report.md  ${C}<-- paste into AI to auto-fix${N}"
echo ""
