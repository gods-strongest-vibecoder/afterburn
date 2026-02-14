#!/usr/bin/env bash
# mock-scan.sh - Simulates afterburn CLI output for demo recording
# Updated with Pain Point Strategist copy for maximum vibe-coder impact

# Catppuccin Mocha ANSI colors
G='\033[32m'      # Green (checkmarks)
R='\033[31m'      # Red ([CRITICAL] tags)
Y='\033[1;33m'    # Yellow/bold (health score)
C='\033[36m'      # Cyan (AI annotation)
B='\033[1m'       # Bold
D='\033[2m'       # Dim (muted text)
N='\033[0m'       # Reset

echo ""
echo -e "${B}Afterburn v1.0.2${N}"
echo ""
sleep 0.6
echo -e "  ${G}✔${N} Checking browser..."
sleep 0.6
echo -e "  ${G}✔${N} Crawling site..."
sleep 0.6
echo -e "  ${G}✔${N} Testing workflows..."
sleep 0.6
echo -e "  ${G}✔${N} Analyzing results..."
sleep 0.5
echo -e "  ${G}✔${N} Generating reports..."
sleep 0.3
echo ""
echo -e "Health: ${Y}38/100${N} -- 47 issues found ${D}(11 critical, 19 medium, 17 low)${N}"
echo ""
sleep 0.3
echo "Top issues:"
sleep 0.4
echo -e "  1. ${R}[CRITICAL]${N} \"Start Free Trial\" button does nothing"
sleep 0.4
echo -e "  2. ${R}[CRITICAL]${N} Contact form submits but loses the message"
sleep 0.4
echo -e "  3. ${R}[CRITICAL]${N} Pricing page crashes on mobile"
sleep 0.3
echo -e "  ${D}... and 44 more (see report)${N}"
echo ""
sleep 0.3
echo "Reports saved:"
echo -e "  ${D}For you:${N}     ./afterburn-reports/report.html"
echo -e "  ${D}For your AI:${N} ./afterburn-reports/report.md"
echo ""
sleep 0.3
echo -e "${C}Paste ${B}report.md${N}${C} into Claude or Cursor to auto-fix these bugs.${N}"
echo ""
