#!/usr/bin/env python3
"""
Comprehensive Security Report Generator
Consolidates all security scan results into a single comprehensive report.
"""

import argparse
import json
import os
import glob
from datetime import datetime
from pathlib import Path

class ComprehensiveSecurityReportGenerator:
    def __init__(self, results_dir, repo=None, branch=None, commit=None, run_id=None):
        self.results_dir = results_dir
        self.repo = repo
        self.branch = branch
        self.commit = commit
        self.run_id = run_id
        self.summary = {
            'total_issues': 0,
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'info': 0,
            'security_debt': 0,
            'quality_gates_passed': False,
            'scans_completed': 0,
            'scans_failed': 0
        }
        self.scan_results = {}
    
    def collect_all_results(self):
        """Collect results from all security scans"""
        print("📊 Collecting security scan results...")
        
        # Collect SAST results
        self.scan_results['sast'] = self._collect_sast_results()
        
        # Collect dependency results
        self.scan_results['dependencies'] = self._collect_dependency_results()
        
        # Collect container results
        self.scan_results['containers'] = self._collect_container_results()
        
        # Collect IaC results
        self.scan_results['iac'] = self._collect_iac_results()
        
        # Collect DAST results
        self.scan_results['dast'] = self._collect_dast_results()
        
        # Collect secrets results
        self.scan_results['secrets'] = self._collect_secrets_results()
        
        # Collect quality gate results
        self.scan_results['quality_gates'] = self._collect_quality_gate_results()
        
        # Calculate overall summary
        self._calculate_summary()
    
    def _collect_sast_results(self):
        """Collect SAST scan results"""
        sast_results = {
            'tools': {},
            'total_issues': 0,
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'status': 'completed'
        }
        
        # ESLint Security
        eslint_files = glob.glob(os.path.join(self.results_dir, '**/eslint-security-results.json'), recursive=True)
        if eslint_files:
            try:
                with open(eslint_files[0], 'r') as f:
                    data = json.load(f)
                
                issues = sum(len(result.get('messages', [])) for result in data)
                sast_results['tools']['eslint'] = {
                    'issues': issues,
                    'status': 'completed'
                }
                sast_results['total_issues'] += issues
                sast_results['high'] += issues  # Treat ESLint errors as high
                
            except Exception as e:
                sast_results['tools']['eslint'] = {'status': 'error', 'error': str(e)}
        
        # Add other SAST tools (Semgrep, CodeQL, SonarCloud)
        # Implementation would be similar to ESLint
        
        return sast_results
    
    def _collect_dependency_results(self):
        """Collect dependency scan results"""
        dep_results = {
            'tools': {},
            'total_vulnerabilities': 0,
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'status': 'completed'
        }
        
        # NPM Audit results
        npm_files = glob.glob(os.path.join(self.results_dir, '**/npm-audit-*.json'), recursive=True)
        if npm_files:
            total_vulns = 0
            critical = 0
            high = 0
            medium = 0
            low = 0
            
            for npm_file in npm_files:
                try:
                    with open(npm_file, 'r') as f:
                        data = json.load(f)
                    
                    vulnerabilities = data.get('vulnerabilities', {})
                    for package, vuln_data in vulnerabilities.items():
                        severity = vuln_data.get('severity', '').lower()
                        total_vulns += 1
                        if severity == 'critical':
                            critical += 1
                        elif severity == 'high':
                            high += 1
                        elif severity in ['moderate', 'medium']:
                            medium += 1
                        elif severity == 'low':
                            low += 1
                            
                except Exception as e:
                    print(f"Error reading {npm_file}: {e}")
            
            dep_results['tools']['npm_audit'] = {
                'vulnerabilities': total_vulns,
                'critical': critical,
                'high': high,
                'medium': medium,
                'low': low,
                'status': 'completed'
            }
            
            dep_results['total_vulnerabilities'] += total_vulns
            dep_results['critical'] += critical
            dep_results['high'] += high
            dep_results['medium'] += medium
            dep_results['low'] += low
        
        # Add other dependency tools (Snyk, OSV Scanner, etc.)
        
        return dep_results
    
    def _collect_container_results(self):
        """Collect container scan results"""
        container_results = {
            'tools': {},
            'total_vulnerabilities': 0,
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'status': 'completed'
        }
        
        # Trivy results
        trivy_files = glob.glob(os.path.join(self.results_dir, '**/trivy-*.json'), recursive=True)
        if trivy_files:
            total_vulns = 0
            critical = 0
            high = 0
            medium = 0
            low = 0
            
            for trivy_file in trivy_files:
                try:
                    with open(trivy_file, 'r') as f:
                        data = json.load(f)
                    
                    for result in data.get('Results', []):
                        for vuln in result.get('Vulnerabilities', []):
                            severity = vuln.get('Severity', '').lower()
                            total_vulns += 1
                            if severity == 'critical':
                                critical += 1
                            elif severity == 'high':
                                high += 1
                            elif severity == 'medium':
                                medium += 1
                            elif severity == 'low':
                                low += 1
                                
                except Exception as e:
                    print(f"Error reading {trivy_file}: {e}")
            
            container_results['tools']['trivy'] = {
                'vulnerabilities': total_vulns,
                'critical': critical,
                'high': high,
                'medium': medium,
                'low': low,
                'status': 'completed'
            }
            
            container_results['total_vulnerabilities'] += total_vulns
            container_results['critical'] += critical
            container_results['high'] += high
            container_results['medium'] += medium
            container_results['low'] += low
        
        return container_results
    
    def _collect_iac_results(self):
        """Collect IaC scan results"""
        iac_results = {
            'tools': {},
            'total_issues': 0,
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'status': 'completed'
        }
        
        # Checkov results
        checkov_files = glob.glob(os.path.join(self.results_dir, '**/checkov-results.json'), recursive=True)
        if checkov_files:
            try:
                with open(checkov_files[0], 'r') as f:
                    data = json.load(f)
                
                failed_checks = data.get('results', {}).get('failed_checks', [])
                issues = len(failed_checks)
                
                # Categorize by severity (simplified)
                high = sum(1 for check in failed_checks if check.get('severity') == 'HIGH')
                medium = sum(1 for check in failed_checks if check.get('severity') == 'MEDIUM')
                low = issues - high - medium
                
                iac_results['tools']['checkov'] = {
                    'issues': issues,
                    'high': high,
                    'medium': medium,
                    'low': low,
                    'status': 'completed'
                }
                
                iac_results['total_issues'] += issues
                iac_results['high'] += high
                iac_results['medium'] += medium
                iac_results['low'] += low
                
            except Exception as e:
                iac_results['tools']['checkov'] = {'status': 'error', 'error': str(e)}
        
        return iac_results
    
    def _collect_dast_results(self):
        """Collect DAST scan results"""
        dast_results = {
            'tools': {},
            'total_vulnerabilities': 0,
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'status': 'not_run'
        }
        
        # Check if DAST scans were run
        dast_files = glob.glob(os.path.join(self.results_dir, '**/consolidated-security-report.html'), recursive=True)
        if dast_files:
            dast_results['status'] = 'completed'
            # Implementation would parse DAST results
        
        return dast_results
    
    def _collect_secrets_results(self):
        """Collect secrets detection results"""
        secrets_results = {
            'tools': {},
            'total_secrets': 0,
            'verified': 0,
            'unverified': 0,
            'status': 'completed'
        }
        
        # TruffleHog results
        trufflehog_files = glob.glob(os.path.join(self.results_dir, '**/trufflehog-results.json'), recursive=True)
        if trufflehog_files:
            try:
                verified = 0
                unverified = 0
                
                with open(trufflehog_files[0], 'r') as f:
                    for line in f:
                        try:
                            result = json.loads(line.strip())
                            if result.get('Verified'):
                                verified += 1
                            else:
                                unverified += 1
                        except json.JSONDecodeError:
                            continue
                
                secrets_results['tools']['trufflehog'] = {
                    'verified': verified,
                    'unverified': unverified,
                    'total': verified + unverified,
                    'status': 'completed'
                }
                
                secrets_results['verified'] += verified
                secrets_results['unverified'] += unverified
                secrets_results['total_secrets'] += verified + unverified
                
            except Exception as e:
                secrets_results['tools']['trufflehog'] = {'status': 'error', 'error': str(e)}
        
        return secrets_results
    
    def _collect_quality_gate_results(self):
        """Collect quality gate results"""
        quality_gates = {
            'overall_status': 'unknown',
            'passed_gates': 0,
            'failed_gates': 0,
            'security_debt': 0,
            'gates': []
        }
        
        gate_files = glob.glob(os.path.join(self.results_dir, '**/security-quality-gate-report.json'), recursive=True)
        if gate_files:
            try:
                with open(gate_files[0], 'r') as f:
                    data = json.load(f)
                
                quality_gates['overall_status'] = data.get('overall_result', 'unknown').lower()
                summary = data.get('summary', {})
                quality_gates['passed_gates'] = len(summary.get('passed_gates', []))
                quality_gates['failed_gates'] = len(summary.get('failed_gates', []))
                quality_gates['security_debt'] = summary.get('security_debt', 0)
                quality_gates['gates'] = summary.get('failed_gates', []) + summary.get('passed_gates', [])
                
            except Exception as e:
                print(f"Error reading quality gate results: {e}")
        
        return quality_gates
    
    def _calculate_summary(self):
        """Calculate overall summary statistics"""
        # Sum up all issues
        for scan_type, results in self.scan_results.items():
            if scan_type == 'quality_gates':
                continue
            
            self.summary['critical'] += results.get('critical', 0)
            self.summary['high'] += results.get('high', 0)
            self.summary['medium'] += results.get('medium', 0)
            self.summary['low'] += results.get('low', 0)
            
            # Count completed scans
            if results.get('status') == 'completed':
                self.summary['scans_completed'] += 1
            elif results.get('status') == 'error':
                self.summary['scans_failed'] += 1
        
        self.summary['total_issues'] = (
            self.summary['critical'] + 
            self.summary['high'] + 
            self.summary['medium'] + 
            self.summary['low']
        )
        
        # Get quality gate info
        quality_gates = self.scan_results.get('quality_gates', {})
        self.summary['security_debt'] = quality_gates.get('security_debt', 0)
        self.summary['quality_gates_passed'] = quality_gates.get('overall_status') == 'passed'
    
    def generate_html_report(self, output_file):
        """Generate comprehensive HTML security report"""
        html_template = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Q Ecosystem Comprehensive Security Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; background: #f8f9fa; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .summary-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
        .critical { border-left: 6px solid #dc3545; }
        .high { border-left: 6px solid #fd7e14; }
        .medium { border-left: 6px solid #ffc107; }
        .low { border-left: 6px solid #28a745; }
        .info { border-left: 6px solid #17a2b8; }
        .scan-section { background: white; margin: 20px 0; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
        .scan-header { background: #f8f9fa; padding: 20px; border-bottom: 1px solid #dee2e6; }
        .scan-content { padding: 20px; }
        .status-badge { padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .status-completed { background: #d4edda; color: #155724; }
        .status-error { background: #f8d7da; color: #721c24; }
        .status-not-run { background: #fff3cd; color: #856404; }
        .metric { display: inline-block; margin: 10px 15px; }
        .metric-value { font-size: 24px; font-weight: bold; display: block; }
        .metric-label { font-size: 12px; color: #6c757d; text-transform: uppercase; }
        .quality-gates { background: white; margin: 20px 0; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .gate-item { padding: 15px; border-bottom: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center; }
        .gate-passed { border-left: 4px solid #28a745; }
        .gate-failed { border-left: 4px solid #dc3545; }
        .recommendations { background: #e7f3ff; border: 1px solid #b8daff; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .footer { text-align: center; padding: 30px; color: #6c757d; font-size: 14px; }
        .chart-container { margin: 20px 0; text-align: center; }
        .progress-bar { background: #e9ecef; border-radius: 10px; height: 20px; overflow: hidden; margin: 10px 0; }
        .progress-fill { height: 100%; transition: width 0.3s ease; }
        .progress-critical { background: #dc3545; }
        .progress-high { background: #fd7e14; }
        .progress-medium { background: #ffc107; }
        .progress-low { background: #28a745; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔒 Q Ecosystem Security Report</h1>
        <p>Comprehensive Security Analysis</p>
        <div style="margin-top: 20px; font-size: 14px; opacity: 0.9;">
            <div>Repository: {repo}</div>
            <div>Branch: {branch} | Commit: {commit}</div>
            <div>Generated: {timestamp}</div>
        </div>
    </div>
    
    <div class="container">
        <!-- Executive Summary -->
        <div class="summary-grid">
            <div class="summary-card critical">
                <div class="metric-value">{critical}</div>
                <div class="metric-label">Critical Issues</div>
            </div>
            <div class="summary-card high">
                <div class="metric-value">{high}</div>
                <div class="metric-label">High Issues</div>
            </div>
            <div class="summary-card medium">
                <div class="metric-value">{medium}</div>
                <div class="metric-label">Medium Issues</div>
            </div>
            <div class="summary-card low">
                <div class="metric-value">{low}</div>
                <div class="metric-label">Low Issues</div>
            </div>
            <div class="summary-card info">
                <div class="metric-value">{security_debt}</div>
                <div class="metric-label">Security Debt</div>
            </div>
            <div class="summary-card {quality_gate_class}">
                <div class="metric-value">{quality_gate_status}</div>
                <div class="metric-label">Quality Gates</div>
            </div>
        </div>
        
        <!-- Security Debt Progress -->
        <div class="chart-container">
            <h3>Security Issue Distribution</h3>
            <div class="progress-bar">
                <div class="progress-fill progress-critical" style="width: {critical_percent}%"></div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill progress-high" style="width: {high_percent}%"></div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill progress-medium" style="width: {medium_percent}%"></div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill progress-low" style="width: {low_percent}%"></div>
            </div>
        </div>
        
        {scan_sections}
        
        {quality_gates_section}
        
        {recommendations_section}
    </div>
    
    <div class="footer">
        <p>Generated by Q Ecosystem Security Pipeline | Run ID: {run_id}</p>
        <p>For questions or support, contact the Security Team</p>
    </div>
</body>
</html>
        """
        
        # Generate scan sections
        scan_sections = ""
        for scan_type, results in self.scan_results.items():
            if scan_type == 'quality_gates':
                continue
            
            status_class = f"status-{results.get('status', 'unknown')}"
            status_text = results.get('status', 'unknown').replace('_', ' ').title()
            
            tools_html = ""
            for tool_name, tool_data in results.get('tools', {}).items():
                if isinstance(tool_data, dict):
                    if tool_data.get('status') == 'completed':
                        metrics = []
                        for key, value in tool_data.items():
                            if key != 'status' and isinstance(value, (int, float)):
                                metrics.append(f"<span class='metric'><span class='metric-value'>{value}</span><span class='metric-label'>{key}</span></span>")
                        tools_html += f"<div><strong>{tool_name.title()}:</strong> {' '.join(metrics)}</div>"
                    else:
                        tools_html += f"<div><strong>{tool_name.title()}:</strong> {tool_data.get('status', 'unknown')}</div>"
            
            scan_sections += f"""
            <div class="scan-section">
                <div class="scan-header">
                    <h3>{scan_type.upper().replace('_', ' ')} Security Scan</h3>
                    <span class="status-badge {status_class}">{status_text}</span>
                </div>
                <div class="scan-content">
                    <div class="metric">
                        <span class="metric-value">{results.get('total_issues', results.get('total_vulnerabilities', results.get('total_secrets', 0)))}</span>
                        <span class="metric-label">Total Issues</span>
                    </div>
                    <div class="metric">
                        <span class="metric-value">{results.get('critical', 0)}</span>
                        <span class="metric-label">Critical</span>
                    </div>
                    <div class="metric">
                        <span class="metric-value">{results.get('high', 0)}</span>
                        <span class="metric-label">High</span>
                    </div>
                    <div class="metric">
                        <span class="metric-value">{results.get('medium', 0)}</span>
                        <span class="metric-label">Medium</span>
                    </div>
                    <div class="metric">
                        <span class="metric-value">{results.get('low', 0)}</span>
                        <span class="metric-label">Low</span>
                    </div>
                    <div style="margin-top: 20px;">
                        {tools_html}
                    </div>
                </div>
            </div>
            """
        
        # Generate quality gates section
        quality_gates = self.scan_results.get('quality_gates', {})
        gates_html = ""
        for gate in quality_gates.get('gates', []):
            gate_class = 'gate-passed' if 'passed' in gate.get('gate', '').lower() else 'gate-failed'
            gates_html += f"""
            <div class="gate-item {gate_class}">
                <div>
                    <strong>{gate.get('gate', 'Unknown Gate')}</strong>
                    <div style="font-size: 14px; color: #6c757d;">{gate.get('reason', '')}</div>
                </div>
                <div>{'✅' if gate_class == 'gate-passed' else '❌'}</div>
            </div>
            """
        
        quality_gates_section = f"""
        <div class="quality-gates">
            <div class="scan-header">
                <h3>Security Quality Gates</h3>
                <span class="status-badge {'status-completed' if quality_gates.get('overall_status') == 'passed' else 'status-error'}">
                    {quality_gates.get('overall_status', 'unknown').title()}
                </span>
            </div>
            <div>
                {gates_html}
            </div>
        </div>
        """
        
        # Generate recommendations
        recommendations = []
        if self.summary['critical'] > 0:
            recommendations.append("🚨 Address all critical security issues immediately before deployment")
        if self.summary['high'] > 5:
            recommendations.append("⚠️ High number of high-severity issues detected - prioritize remediation")
        if self.summary['security_debt'] > 100:
            recommendations.append("📈 Security debt is high - implement debt reduction plan")
        if not self.summary['quality_gates_passed']:
            recommendations.append("🚫 Security quality gates failed - review and fix issues before merging")
        if self.summary['scans_failed'] > 0:
            recommendations.append("🔧 Some security scans failed - check scan configuration and logs")
        
        if not recommendations:
            recommendations.append("🎉 Great job! No critical security issues detected")
        
        recommendations_section = f"""
        <div class="recommendations">
            <h3>🎯 Security Recommendations</h3>
            <ul>
                {''.join(f'<li>{rec}</li>' for rec in recommendations)}
            </ul>
        </div>
        """
        
        # Calculate percentages for progress bars
        total = max(self.summary['total_issues'], 1)
        critical_percent = (self.summary['critical'] / total) * 100
        high_percent = (self.summary['high'] / total) * 100
        medium_percent = (self.summary['medium'] / total) * 100
        low_percent = (self.summary['low'] / total) * 100
        
        # Quality gate status
        quality_gate_status = "PASSED" if self.summary['quality_gates_passed'] else "FAILED"
        quality_gate_class = "info" if self.summary['quality_gates_passed'] else "critical"
        
        html_content = html_template.format(
            repo=self.repo or 'Unknown',
            branch=self.branch or 'Unknown',
            commit=(self.commit[:8] if self.commit else 'Unknown'),
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
            run_id=self.run_id or 'Unknown',
            critical=self.summary['critical'],
            high=self.summary['high'],
            medium=self.summary['medium'],
            low=self.summary['low'],
            security_debt=self.summary['security_debt'],
            quality_gate_status=quality_gate_status,
            quality_gate_class=quality_gate_class,
            critical_percent=critical_percent,
            high_percent=high_percent,
            medium_percent=medium_percent,
            low_percent=low_percent,
            scan_sections=scan_sections,
            quality_gates_section=quality_gates_section,
            recommendations_section=recommendations_section
        )
        
        with open(output_file, 'w') as f:
            f.write(html_content)
        
        print(f"📊 Comprehensive security report generated: {output_file}")
        print(f"Summary: {self.summary['total_issues']} total issues, {self.summary['security_debt']} security debt")
        print(f"Quality Gates: {'PASSED' if self.summary['quality_gates_passed'] else 'FAILED'}")

def main():
    parser = argparse.ArgumentParser(description='Generate comprehensive security report')
    parser.add_argument('--results-dir', required=True, help='Directory containing security scan results')
    parser.add_argument('--output', required=True, help='Output HTML file path')
    parser.add_argument('--repo', help='Repository name')
    parser.add_argument('--branch', help='Branch name')
    parser.add_argument('--commit', help='Commit SHA')
    parser.add_argument('--run-id', help='CI/CD run ID')
    
    args = parser.parse_args()
    
    generator = ComprehensiveSecurityReportGenerator(
        results_dir=args.results_dir,
        repo=args.repo,
        branch=args.branch,
        commit=args.commit,
        run_id=args.run_id
    )
    
    generator.collect_all_results()
    generator.generate_html_report(args.output)

if __name__ == '__main__':
    main()