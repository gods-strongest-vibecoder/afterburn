// Calculate 0-100 health score from workflow results, errors, accessibility, and performance
export function calculateHealthScore(executionArtifact) {
    // WORKFLOW SCORE (40% weight)
    const totalWorkflows = executionArtifact.workflowResults.length;
    const passedWorkflows = executionArtifact.workflowResults.filter(w => w.overallStatus === 'passed').length;
    const workflowScore = totalWorkflows > 0 ? (passedWorkflows / totalWorkflows) * 100 : 100;
    // ERROR SCORE (30% weight)
    const totalIssues = executionArtifact.totalIssues;
    const errorScore = Math.max(0, 100 - (totalIssues * 2));
    // ACCESSIBILITY SCORE (20% weight)
    let criticalViolations = 0;
    let seriousViolations = 0;
    for (const audit of executionArtifact.pageAudits) {
        if (audit.accessibility) {
            for (const violation of audit.accessibility.violations) {
                if (violation.impact === 'critical') {
                    criticalViolations++;
                }
                else if (violation.impact === 'serious') {
                    seriousViolations++;
                }
            }
        }
    }
    const accessibilityScore = Math.max(0, 100 - (criticalViolations * 10) - (seriousViolations * 5));
    // PERFORMANCE SCORE (10% weight)
    const perfAudits = executionArtifact.pageAudits.filter(a => a.performance);
    let performanceScore = 100; // Default if no perf data
    if (perfAudits.length > 0) {
        const avgLcp = perfAudits.reduce((sum, a) => sum + (a.performance?.lcp || 0), 0) / perfAudits.length;
        if (avgLcp < 2500) {
            performanceScore = 100;
        }
        else if (avgLcp <= 4000) {
            performanceScore = 75;
        }
        else {
            performanceScore = 50;
        }
    }
    // WEIGHTED OVERALL SCORE
    let overall = (workflowScore * 0.4) +
        (errorScore * 0.3) +
        (accessibilityScore * 0.2) +
        (performanceScore * 0.1);
    // VETO LOGIC: Cap at 50 if ANY workflow failed
    const hasFailedWorkflow = executionArtifact.workflowResults.some(w => w.overallStatus === 'failed');
    if (hasFailedWorkflow) {
        overall = Math.min(overall, 50);
    }
    // LABEL MAPPING
    let label;
    if (overall >= 80) {
        label = 'good';
    }
    else if (overall >= 50) {
        label = 'needs-work';
    }
    else {
        label = 'poor';
    }
    // CHECKS CALCULATION
    // checksTotal = total steps across all workflows + pageAudits.length
    // checksPassed = passed steps + audits with no critical violations
    const totalSteps = executionArtifact.workflowResults.reduce((sum, w) => sum + w.totalSteps, 0);
    const passedSteps = executionArtifact.workflowResults.reduce((sum, w) => sum + w.passedSteps, 0);
    const auditsWithoutCritical = executionArtifact.pageAudits.filter(a => {
        if (!a.accessibility)
            return true;
        return !a.accessibility.violations.some(v => v.impact === 'critical');
    }).length;
    const checksTotal = totalSteps + executionArtifact.pageAudits.length;
    const checksPassed = passedSteps + auditsWithoutCritical;
    return {
        overall: Math.round(overall),
        label,
        breakdown: {
            workflows: Math.round(workflowScore),
            errors: Math.round(errorScore),
            accessibility: Math.round(accessibilityScore),
            performance: Math.round(performanceScore),
        },
        checksPassed,
        checksTotal,
    };
}
//# sourceMappingURL=health-scorer.js.map