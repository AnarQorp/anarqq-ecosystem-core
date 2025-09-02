#!/usr/bin/env python3
"""
Infrastructure as Code Security Report Generator
Consolidates results from multiple IaC security scanning tools.
"""

import json
import argparse
import os
import glob
from datetime import datetime
from pathlib import Path

class IaCReportGenerator:
    def __init__(self):
        self.issues = []
        self.summary = {
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'info': 0,
            'total': 0
        }
        self.files_scanned = set()
    
    def parse_checkov_results(self, checkov_dir):
        """Parse Checkov JSON results"""
        checkov_file = os.path.join(checkov_dir, 'checkov-results.json')
        try:
            if os.path.exists(checkov_file):
                with open(checkov_file, 'r') as f:
                    data = json.load(f)
                
                for result in data.get('results', {}).get('failed_checks', []):
                    issue = {
                        'tool': 'Checkov',
                        'type': 'IaC Configuration',
                        'file': result.get('file_path', 'unknown'),
                        'resource': result.get('resource', 'unknown'),
                        'check_id': result.get('check_id', 'unknown'),
                        'severity': self._map_checkov_severity(result.get('severity', 'MEDIUM')),
                        'title': result.get('check_name', 'Unknown Check'),
                        'description': result.get('description', ''),
                        'guideline': result.get('guideline', ''),
                        'line_range': result.get('file_line_range', []),
                        'code_block': result.get('code_block', [])
                    }
                    self.issues.append(issue)
                    self._update_summary(issue['severity'])
                    self.files_scanned.add(issue['file'])
        except Exception as e:
            print(f"Error parsing Checkov results: {e}")
    
    def parse_kics_results(self, kics_dir):
        """Parse KICS JSON results"""
        kics_file = os.path.join(kics_dir, 'results.json')
        try:
            if os.path.exists(kics_file):
                with open(kics_file, 'r') as f:
                    data = json.load(f)
                
                for query in data.get('queries', []):
                    for file_result in query.get('files', []):
                        issue = {
                            'tool': 'KICS',
                            'type': 'IaC Configuration',
                            'file': file_result.get('file_name', 'unknown'),
                            'resource': file_result.get('resource_name', 'unknown'),
                            'check_id': query.get('query_id', 'unknown'),
                            'severity': query.get('severity', 'MEDIUM').lower(),
                            'title': query.get('query_name', 'Unknown Query'),
                            'description': query.get('description', ''),
                            'guideline': f"Category: {query.get('category', 'Unknown')}",
                            'line_range': [file_result.get('line', 0)],
                            'code_block': []
                        }
                        self.issues.append(issue)
                        self._update_summary(issue['severity'])
                        self.files_scanned.add(issue['file'])
        except Exception as e:
            print(f"Error parsing KICS results: {e}")
    
    def parse_hadolint_results(self, hadolint_dir):
        """Parse Hadolint JSON results"""
        hadolint_file = os.path.join(hadolint_dir, 'hadolint-results.json')
        try:
            if os.path.exists(hadolint_file):
                with open(hadolint_file, 'r') as f:
                    for line in f:
                        try:
                            result = json.loads(line.strip())
                            if result.get('level') in ['error', 'warning']:
                                issue = {
                                    'tool': 'Hadolint',
                                    'type': 'Dockerfile',
                                    'file': result.get('file', 'unknown'),
                                    'resource': 'Dockerfile',
                                    'check_id': result.get('code', 'unknown'),
                                    'severity': 'high' if result.get('level') == 'error' else 'medium',
                                    'title': result.get('message', 'Dockerfile Issue'),
                                    'description': result.get('message', ''),
                                    'guideline': f"Line {result.get('line', 0)}: Column {result.get('column', 0)}",
                                    'line_range': [result.get('line', 0)],
                                    'code_block': []
                                }
                                self.issues.append(issue)
                                self._update_summary(issue['severity'])
                                self.files_scanned.add(issue['file'])
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            print(f"Error parsing Hadolint results: {e}")
    
    def parse_docker_compose_results(self, docker_compose_dir):
        """Parse Docker Compose security results"""
        compose_file = os.path.join(docker_compose_dir, 'docker-compose-security.json')
        try:
            if os.path.exists(compose_file):
                with open(compose_file, 'r') as f:
                    data = json.load(f)
                
                for issue_data in data.get('issues', []):
                    issue = {
                        'tool': 'Docker Compose Security',
                        'type': 'Docker Compose',
                        'file': issue_data.get('file', 'unknown'),
                        'resource': issue_data.get('service', 'unknown'),
                        'check_id': issue_data.get('rule', 'unknown'),
                        'severity': issue_data.get('severity', 'medium'),
                        'title': issue_data.get('description', 'Docker Compose Issue'),
                        'description': issue_data.get('description', ''),
                        'guideline': issue_data.get('recommendation', ''),
                        'line_range': [],
                        'code_block': []
                    }
                    self.issues.append(issue)
                    self._update_summary(issue['severity'])
                    self.files_scanned.add(issue['file'])
        except Exception as e:
            print(f"Error parsing Docker Compose results: {e}")
    
    def parse_github_actions_results(self, github_actions_dir):
        """Parse GitHub Actions security results"""
        actions_file = os.path.join(github_actions_dir, 'github-actions-security.json')
        try:
            if os.path.exists(actions_file):
                with open(actions_file, 'r') as f:
                    data = json.load(f)
                
                for issue_data in data.get('issues', []):
                    issue = {
                        'tool': 'GitHub Actions Security',
                        'type': 'GitHub Actions',
                        'file': issue_data.get('file', 'unknown'),
                        'resource': f"{issue_data.get('job', 'unknown')}/{issue_data.get('step', 'unknown')}",
                        'check_id': issue_data.get('rule', 'unknown'),
                        'severity': issue_data.get('severity', 'medium'),
                        'title': issue_data.get('description', 'GitHub Actions Issue'),
                        'description': issue_data.get('description', ''),
                        'guideline': issue_data.get('recommendation', ''),
                        'line_range': [],
                        'code_block': []
                    }
                    self.issues.append(issue)
                    self._update_summary(issue['severity'])
                    self.files_scanned.add(issue['file'])
        except Exception as e:
            print(f"Error parsing GitHub Actions results: {e}")
    
    def parse_secrets_results(self, secrets_dir):
        """Parse secrets detection results"""
        secrets_file = os.path.join(secrets_dir, 'trufflehog-results.json')
        try:
            if os.path.exists(secrets_file):
                with open(secrets_file, 'r') as f:
                    for line in f:
                        try:
                            result = json.loads(line.strip())
                            if result.get('Verified'):
                                issue = {
                                    'tool': 'TruffleHog',
                                    'type': 'Secrets',
                                    'file': result.get('SourceMetadata', {}).get('Data', {}).get('Filesystem', {}).get('file', 'unknown'),
                                    'resource': result.get('DetectorName', 'unknown'),
                                    'check_id': result.get('DetectorType', 'unknown'),
                                    'severity': 'critical',
                                    'title': f"Secret detected: {result.get('DetectorName', 'Unknown')}",
                                    'description': f"Verified secret found in repository",
                                    'guideline': 'Remove secret from code and rotate credentials',
                                    'line_range': [result.get('SourceMetadata', {}).get('Data', {}).get('Filesystem', {}).get('line', 0)],
                                    'code_block': []
                                }
                                self.issues.append(issue)
                                self._update_summary(issue['severity'])
                                self.files_scanned.add(issue['file'])
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            print(f"Error parsing secrets results: {e}")
    
    def _map_checkov_severity(self, severity):
        """Map Checkov severity to standard levels"""
        mapping = {
            'CRITICAL': 'critical',
            'HIGH': 'high',
            'MEDIUM': 'medium',
            'LOW': 'low',
            'INFO': 'info'
        }
        return mapping.get(severity.upper(), 'medium')
    
    def _update_summary(self, severity):
        """Update issue summary counts"""
        severity_lower = severity.lower()
        if severity_lower == 'critical':
            self.summary['critical'] += 1
        elif severity_lower == 'high':
            self.summary['high'] += 1
        elif severity_lower == 'medium':
            self.summary['medium'] += 1
        elif severity_lower == 'low':
            self.summary['low'] += 1
        else:
            self.summary['info'] += 1
        self.summary['total'] += 1
    
    def generate_html_report(self, output_file):
        """Generate consolidated HTML IaC security report"""
        html_template = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Q Ecosystem IaC Security Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .summary-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
        .critical { border-left: 5px solid #dc3545; }
        .high { border-left: 5px solid #fd7e14; }
        .medium { border-left: 5px solid #ffc107; }
        .low { border-left: 5px solid #28a745; }
        .info { border-left: 5px solid #17a2b8; }
        .files-section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .issue { background: white; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .issue-header { padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
        .issue-content { padding: 15px; }
        .severity-badge { padding: 4px 8px; border-radius: 4px; color: white; font-size: 12px; font-weight: bold; }
        .severity-critical { background-color: #dc3545; }
        .severity-high { background-color: #fd7e14; }
        .severity-medium { background-color: #ffc107; color: #000; }
        .severity-low { background-color: #28a745; }
        .severity-info { background-color: #17a2b8; }
        .tool-badge { background: #6c757d; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-left: 10px; }
        .type-badge { background: #495057; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-left: 5px; }
        .resource-info { background: #f8f9fa; padding: 10px; margin: 10px 0; border-radius: 4px; font-family: monospace; font-size: 12px; }
        .code-block { background: #f8f9fa; padding: 10px; margin: 10px 0; border-radius: 4px; font-family: monospace; font-size: 11px; border-left: 3px solid #007bff; }
        .no-issues { text-align: center; padding: 40px; background: white; border-radius: 8px; color: #28a745; }
        .file-tag { display: inline-block; background: #e9ecef; color: #495057; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-right: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Q Ecosystem Infrastructure as Code Security Report</h1>
        <p>Generated on: {timestamp}</p>
        <p>Total Issues Found: {total_issues}</p>
        <p>Files Scanned: {files_count}</p>
    </div>
    
    <div class="summary">
        <div class="summary-card critical">
            <h3>{critical}</h3>
            <p>Critical</p>
        </div>
        <div class="summary-card high">
            <h3>{high}</h3>
            <p>High</p>
        </div>
        <div class="summary-card medium">
            <h3>{medium}</h3>
            <p>Medium</p>
        </div>
        <div class="summary-card low">
            <h3>{low}</h3>
            <p>Low</p>
        </div>
        <div class="summary-card info">
            <h3>{info}</h3>
            <p>Informational</p>
        </div>
    </div>
    
    <div class="files-section">
        <h3>Scanned Files</h3>
        <p>{files_list}</p>
    </div>
    
    {issues_html}
</body>
</html>
        """
        
        if not self.issues:
            issues_html = '<div class="no-issues"><h2>🎉 No IaC Security Issues Found!</h2><p>All infrastructure as code scans completed successfully with no issues detected.</p></div>'
        else:
            issues_html = ""
            for issue in sorted(self.issues, key=lambda x: self._get_severity_priority(x['severity']), reverse=True):
                severity_class = issue['severity'].lower()
                
                code_block_html = ""
                if issue['code_block']:
                    code_content = '\n'.join(issue['code_block'][:10])  # Limit to first 10 lines
                    code_block_html = f'<div class="code-block">{code_content}</div>'
                
                line_info = ""
                if issue['line_range'] and any(line > 0 for line in issue['line_range']):
                    line_info = f"Lines: {', '.join(map(str, issue['line_range']))}"
                
                issues_html += f"""
                <div class="issue">
                    <div class="issue-header">
                        <div>
                            <h3>{issue['title']} <span class="tool-badge">{issue['tool']}</span><span class="type-badge">{issue['type']}</span></h3>
                            <span class="file-tag">{os.path.basename(issue['file'])}</span>
                        </div>
                        <span class="severity-badge severity-{severity_class}">{issue['severity'].upper()}</span>
                    </div>
                    <div class="issue-content">
                        <div class="resource-info">
                            <strong>File:</strong> {issue['file']}<br>
                            <strong>Resource:</strong> {issue['resource']}<br>
                            <strong>Check ID:</strong> {issue['check_id']}<br>
                            {f'<strong>{line_info}</strong><br>' if line_info else ''}
                        </div>
                        <p><strong>Description:</strong> {issue['description']}</p>
                        <p><strong>Recommendation:</strong> {issue['guideline']}</p>
                        {code_block_html}
                    </div>
                </div>
                """
        
        files_list = ', '.join(sorted([os.path.basename(f) for f in self.files_scanned])) if self.files_scanned else 'None'
        
        html_content = html_template.format(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
            total_issues=self.summary['total'],
            files_count=len(self.files_scanned),
            critical=self.summary['critical'],
            high=self.summary['high'],
            medium=self.summary['medium'],
            low=self.summary['low'],
            info=self.summary['info'],
            files_list=files_list,
            issues_html=issues_html
        )
        
        with open(output_file, 'w') as f:
            f.write(html_content)
        
        print(f"IaC security report generated: {output_file}")
        print(f"Total issues: {self.summary['total']}")
        print(f"Critical: {self.summary['critical']}, High: {self.summary['high']}, Medium: {self.summary['medium']}, Low: {self.summary['low']}, Info: {self.summary['info']}")
        print(f"Files scanned: {len(self.files_scanned)}")
    
    def _get_severity_priority(self, severity):
        """Get numeric priority for severity level sorting"""
        priorities = {
            'critical': 5,
            'high': 4,
            'medium': 3,
            'low': 2,
            'info': 1
        }
        return priorities.get(severity.lower(), 0)

def main():
    parser = argparse.ArgumentParser(description='Generate consolidated IaC security report')
    parser.add_argument('--checkov', help='Path to Checkov results directory')
    parser.add_argument('--tfsec', help='Path to TFSec results directory')
    parser.add_argument('--kics', help='Path to KICS results directory')
    parser.add_argument('--hadolint', help='Path to Hadolint results directory')
    parser.add_argument('--docker-compose', help='Path to Docker Compose security results directory')
    parser.add_argument('--github-actions', help='Path to GitHub Actions security results directory')
    parser.add_argument('--secrets', help='Path to secrets detection results directory')
    parser.add_argument('--output', required=True, help='Output HTML file path')
    
    args = parser.parse_args()
    
    generator = IaCReportGenerator()
    
    # Parse results from different tools
    if args.checkov:
        generator.parse_checkov_results(args.checkov)
    
    if args.kics:
        generator.parse_kics_results(args.kics)
    
    if args.hadolint:
        generator.parse_hadolint_results(args.hadolint)
    
    if args.docker_compose:
        generator.parse_docker_compose_results(args.docker_compose)
    
    if args.github_actions:
        generator.parse_github_actions_results(args.github_actions)
    
    if args.secrets:
        generator.parse_secrets_results(args.secrets)
    
    # Generate consolidated report
    generator.generate_html_report(args.output)

if __name__ == '__main__':
    main()