#!/usr/bin/env python3
"""
Dependency Security Report Generator
Consolidates results from multiple dependency and container scanning tools.
"""

import json
import argparse
import os
import glob
from datetime import datetime
from pathlib import Path

class DependencyReportGenerator:
    def __init__(self):
        self.vulnerabilities = []
        self.summary = {
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'info': 0,
            'total': 0
        }
        self.modules_scanned = set()
    
    def parse_npm_audit_results(self, npm_audit_dirs):
        """Parse NPM audit results from multiple directories"""
        for audit_dir in glob.glob(npm_audit_dirs):
            for audit_file in glob.glob(os.path.join(audit_dir, '*.json')):
                try:
                    with open(audit_file, 'r') as f:
                        data = json.load(f)
                        
                    if 'vulnerabilities' in data:
                        for package, vuln_data in data['vulnerabilities'].items():
                            if vuln_data.get('severity') in ['moderate', 'high', 'critical']:
                                vuln = {
                                    'tool': 'NPM Audit',
                                    'type': 'Dependency',
                                    'package': package,
                                    'severity': vuln_data.get('severity', 'unknown'),
                                    'title': vuln_data.get('title', f'Vulnerability in {package}'),
                                    'description': vuln_data.get('overview', ''),
                                    'recommendation': vuln_data.get('recommendation', ''),
                                    'reference': vuln_data.get('url', ''),
                                    'versions': vuln_data.get('range', ''),
                                    'patched_versions': vuln_data.get('patched_versions', ''),
                                    'module': os.path.basename(audit_dir).replace('npm-audit-', '')
                                }
                                self.vulnerabilities.append(vuln)
                                self._update_summary(vuln['severity'])
                                self.modules_scanned.add(vuln['module'])
                except Exception as e:
                    print(f"Error parsing NPM audit file {audit_file}: {e}")
    
    def parse_snyk_results(self, snyk_dir):
        """Parse Snyk vulnerability results"""
        snyk_file = os.path.join(snyk_dir, 'snyk-results.json')
        try:
            if os.path.exists(snyk_file):
                with open(snyk_file, 'r') as f:
                    data = json.load(f)
                
                for vuln in data.get('vulnerabilities', []):
                    vulnerability = {
                        'tool': 'Snyk',
                        'type': 'Dependency',
                        'package': vuln.get('packageName', 'unknown'),
                        'severity': vuln.get('severity', 'unknown'),
                        'title': vuln.get('title', ''),
                        'description': vuln.get('description', ''),
                        'recommendation': vuln.get('fixedIn', ['Update to latest version'])[0] if vuln.get('fixedIn') else 'Update package',
                        'reference': vuln.get('url', ''),
                        'versions': vuln.get('version', ''),
                        'patched_versions': ', '.join(vuln.get('fixedIn', [])),
                        'module': 'root'
                    }
                    self.vulnerabilities.append(vulnerability)
                    self._update_summary(vulnerability['severity'])
                    self.modules_scanned.add('root')
        except Exception as e:
            print(f"Error parsing Snyk results: {e}")
    
    def parse_osv_results(self, osv_dir):
        """Parse OSV scanner results"""
        osv_file = os.path.join(osv_dir, 'osv-results.json')
        try:
            if os.path.exists(osv_file):
                with open(osv_file, 'r') as f:
                    data = json.load(f)
                
                for result in data.get('results', []):
                    for package in result.get('packages', []):
                        for vuln in package.get('vulnerabilities', []):
                            vulnerability = {
                                'tool': 'OSV Scanner',
                                'type': 'Dependency',
                                'package': package.get('package', {}).get('name', 'unknown'),
                                'severity': self._map_osv_severity(vuln.get('database_specific', {}).get('severity', 'MODERATE')),
                                'title': vuln.get('summary', vuln.get('id', '')),
                                'description': vuln.get('details', ''),
                                'recommendation': 'Update to a patched version',
                                'reference': vuln.get('references', [{}])[0].get('url', '') if vuln.get('references') else '',
                                'versions': package.get('package', {}).get('version', ''),
                                'patched_versions': 'See reference for details',
                                'module': result.get('source', {}).get('path', 'unknown')
                            }
                            self.vulnerabilities.append(vulnerability)
                            self._update_summary(vulnerability['severity'])
                            self.modules_scanned.add(vulnerability['module'])
        except Exception as e:
            print(f"Error parsing OSV results: {e}")
    
    def parse_trivy_results(self, trivy_dirs):
        """Parse Trivy container scan results"""
        for trivy_dir in glob.glob(trivy_dirs):
            for trivy_file in glob.glob(os.path.join(trivy_dir, '*.json')):
                try:
                    with open(trivy_file, 'r') as f:
                        data = json.load(f)
                    
                    module_name = os.path.basename(trivy_file).replace('trivy-', '').replace('.json', '')
                    
                    for result in data.get('Results', []):
                        for vuln in result.get('Vulnerabilities', []):
                            vulnerability = {
                                'tool': 'Trivy',
                                'type': 'Container',
                                'package': vuln.get('PkgName', 'unknown'),
                                'severity': vuln.get('Severity', 'unknown').lower(),
                                'title': vuln.get('Title', vuln.get('VulnerabilityID', '')),
                                'description': vuln.get('Description', ''),
                                'recommendation': vuln.get('FixedVersion', 'Update package'),
                                'reference': ', '.join(vuln.get('References', [])),
                                'versions': vuln.get('InstalledVersion', ''),
                                'patched_versions': vuln.get('FixedVersion', ''),
                                'module': module_name
                            }
                            self.vulnerabilities.append(vulnerability)
                            self._update_summary(vulnerability['severity'])
                            self.modules_scanned.add(module_name)
                except Exception as e:
                    print(f"Error parsing Trivy file {trivy_file}: {e}")
    
    def parse_grype_results(self, grype_dirs):
        """Parse Grype container scan results"""
        for grype_dir in glob.glob(grype_dirs):
            for grype_file in glob.glob(os.path.join(grype_dir, '*.json')):
                try:
                    with open(grype_file, 'r') as f:
                        data = json.load(f)
                    
                    module_name = os.path.basename(grype_file).replace('grype-', '').replace('.json', '')
                    
                    for match in data.get('matches', []):
                        vuln = match.get('vulnerability', {})
                        artifact = match.get('artifact', {})
                        
                        vulnerability = {
                            'tool': 'Grype',
                            'type': 'Container',
                            'package': artifact.get('name', 'unknown'),
                            'severity': vuln.get('severity', 'unknown').lower(),
                            'title': vuln.get('id', ''),
                            'description': vuln.get('description', ''),
                            'recommendation': 'Update to a patched version',
                            'reference': ', '.join([ref.get('url', '') for ref in vuln.get('urls', [])]),
                            'versions': artifact.get('version', ''),
                            'patched_versions': 'See reference for details',
                            'module': module_name
                        }
                        self.vulnerabilities.append(vulnerability)
                        self._update_summary(vulnerability['severity'])
                        self.modules_scanned.add(module_name)
                except Exception as e:
                    print(f"Error parsing Grype file {grype_file}: {e}")
    
    def _map_osv_severity(self, severity):
        """Map OSV severity to standard levels"""
        mapping = {
            'CRITICAL': 'critical',
            'HIGH': 'high',
            'MODERATE': 'medium',
            'LOW': 'low'
        }
        return mapping.get(severity.upper(), 'medium')
    
    def _update_summary(self, severity):
        """Update vulnerability summary counts"""
        severity_lower = severity.lower()
        if severity_lower == 'critical':
            self.summary['critical'] += 1
        elif severity_lower == 'high':
            self.summary['high'] += 1
        elif severity_lower in ['medium', 'moderate']:
            self.summary['medium'] += 1
        elif severity_lower == 'low':
            self.summary['low'] += 1
        else:
            self.summary['info'] += 1
        self.summary['total'] += 1
    
    def generate_html_report(self, output_file):
        """Generate consolidated HTML dependency security report"""
        html_template = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Q Ecosystem Dependency Security Report</title>
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
        .modules-section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .vulnerability { background: white; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .vuln-header { padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
        .vuln-content { padding: 15px; }
        .severity-badge { padding: 4px 8px; border-radius: 4px; color: white; font-size: 12px; font-weight: bold; }
        .severity-critical { background-color: #dc3545; }
        .severity-high { background-color: #fd7e14; }
        .severity-medium { background-color: #ffc107; color: #000; }
        .severity-low { background-color: #28a745; }
        .severity-info { background-color: #17a2b8; }
        .tool-badge { background: #6c757d; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-left: 10px; }
        .type-badge { background: #495057; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-left: 5px; }
        .package-info { background: #f8f9fa; padding: 10px; margin: 10px 0; border-radius: 4px; font-family: monospace; font-size: 12px; }
        .no-vulnerabilities { text-align: center; padding: 40px; background: white; border-radius: 8px; color: #28a745; }
        .module-tag { display: inline-block; background: #e9ecef; color: #495057; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-right: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Q Ecosystem Dependency Security Report</h1>
        <p>Generated on: {timestamp}</p>
        <p>Total Vulnerabilities Found: {total_vulns}</p>
        <p>Modules Scanned: {modules_count}</p>
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
    
    <div class="modules-section">
        <h3>Scanned Modules</h3>
        <p>{modules_list}</p>
    </div>
    
    {vulnerabilities_html}
</body>
</html>
        """
        
        if not self.vulnerabilities:
            vulnerabilities_html = '<div class="no-vulnerabilities"><h2>🎉 No Security Vulnerabilities Found!</h2><p>All dependency and container scans completed successfully with no issues detected.</p></div>'
        else:
            vulnerabilities_html = ""
            for vuln in sorted(self.vulnerabilities, key=lambda x: self._get_severity_priority(x['severity']), reverse=True):
                severity_class = vuln['severity'].lower()
                
                vulnerabilities_html += f"""
                <div class="vulnerability">
                    <div class="vuln-header">
                        <div>
                            <h3>{vuln['title']} <span class="tool-badge">{vuln['tool']}</span><span class="type-badge">{vuln['type']}</span></h3>
                            <span class="module-tag">{vuln['module']}</span>
                        </div>
                        <span class="severity-badge severity-{severity_class}">{vuln['severity'].upper()}</span>
                    </div>
                    <div class="vuln-content">
                        <div class="package-info">
                            <strong>Package:</strong> {vuln['package']}<br>
                            <strong>Current Version:</strong> {vuln['versions']}<br>
                            <strong>Patched Versions:</strong> {vuln['patched_versions']}
                        </div>
                        <p><strong>Description:</strong> {vuln['description']}</p>
                        <p><strong>Recommendation:</strong> {vuln['recommendation']}</p>
                        {f'<p><strong>Reference:</strong> <a href="{vuln["reference"]}" target="_blank">{vuln["reference"]}</a></p>' if vuln['reference'] else ''}
                    </div>
                </div>
                """
        
        modules_list = ', '.join(sorted(self.modules_scanned)) if self.modules_scanned else 'None'
        
        html_content = html_template.format(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
            total_vulns=self.summary['total'],
            modules_count=len(self.modules_scanned),
            critical=self.summary['critical'],
            high=self.summary['high'],
            medium=self.summary['medium'],
            low=self.summary['low'],
            info=self.summary['info'],
            modules_list=modules_list,
            vulnerabilities_html=vulnerabilities_html
        )
        
        with open(output_file, 'w') as f:
            f.write(html_content)
        
        print(f"Dependency security report generated: {output_file}")
        print(f"Total vulnerabilities: {self.summary['total']}")
        print(f"Critical: {self.summary['critical']}, High: {self.summary['high']}, Medium: {self.summary['medium']}, Low: {self.summary['low']}, Info: {self.summary['info']}")
        print(f"Modules scanned: {len(self.modules_scanned)}")
    
    def _get_severity_priority(self, severity):
        """Get numeric priority for severity level sorting"""
        priorities = {
            'critical': 5,
            'high': 4,
            'medium': 3,
            'moderate': 3,
            'low': 2,
            'info': 1
        }
        return priorities.get(severity.lower(), 0)

def main():
    parser = argparse.ArgumentParser(description='Generate consolidated dependency security report')
    parser.add_argument('--npm-audit', help='Path to NPM audit results directories (glob pattern)')
    parser.add_argument('--snyk', help='Path to Snyk results directory')
    parser.add_argument('--osv', help='Path to OSV scanner results directory')
    parser.add_argument('--retire', help='Path to Retire.js results directory')
    parser.add_argument('--trivy', help='Path to Trivy results directories (glob pattern)')
    parser.add_argument('--grype', help='Path to Grype results directories (glob pattern)')
    parser.add_argument('--docker-scout', help='Path to Docker Scout results directories (glob pattern)')
    parser.add_argument('--output', required=True, help='Output HTML file path')
    
    args = parser.parse_args()
    
    generator = DependencyReportGenerator()
    
    # Parse results from different tools
    if args.npm_audit:
        generator.parse_npm_audit_results(args.npm_audit)
    
    if args.snyk:
        generator.parse_snyk_results(args.snyk)
    
    if args.osv:
        generator.parse_osv_results(args.osv)
    
    if args.trivy:
        generator.parse_trivy_results(args.trivy)
    
    if args.grype:
        generator.parse_grype_results(args.grype)
    
    # Generate consolidated report
    generator.generate_html_report(args.output)

if __name__ == '__main__':
    main()