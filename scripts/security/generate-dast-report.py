#!/usr/bin/env python3
"""
DAST Security Report Generator
Consolidates results from multiple DAST tools into a unified security report.
"""

import json
import argparse
import os
from datetime import datetime
from pathlib import Path
import xml.etree.ElementTree as ET

class DASTReportGenerator:
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
    
    def parse_zap_results(self, zap_file):
        """Parse OWASP ZAP XML results"""
        try:
            if os.path.exists(zap_file):
                tree = ET.parse(zap_file)
                root = tree.getroot()
                
                for alert in root.findall('.//alertitem'):
                    vuln = {
                        'tool': 'OWASP ZAP',
                        'name': alert.find('name').text if alert.find('name') is not None else 'Unknown',
                        'risk': alert.find('riskdesc').text if alert.find('riskdesc') is not None else 'Unknown',
                        'confidence': alert.find('confidence').text if alert.find('confidence') is not None else 'Unknown',
                        'description': alert.find('desc').text if alert.find('desc') is not None else '',
                        'solution': alert.find('solution').text if alert.find('solution') is not None else '',
                        'reference': alert.find('reference').text if alert.find('reference') is not None else '',
                        'instances': []
                    }
                    
                    for instance in alert.findall('instances/instance'):
                        vuln['instances'].append({
                            'uri': instance.find('uri').text if instance.find('uri') is not None else '',
                            'method': instance.find('method').text if instance.find('method') is not None else '',
                            'param': instance.find('param').text if instance.find('param') is not None else '',
                            'evidence': instance.find('evidence').text if instance.find('evidence') is not None else ''
                        })
                    
                    self.vulnerabilities.append(vuln)
                    self._update_summary(vuln['risk'])
        except Exception as e:
            print(f"Error parsing ZAP results: {e}")
    
    def parse_nuclei_results(self, nuclei_file):
        """Parse Nuclei JSON results"""
        try:
            if os.path.exists(nuclei_file):
                with open(nuclei_file, 'r') as f:
                    for line in f:
                        try:
                            result = json.loads(line.strip())
                            if 'info' in result:
                                vuln = {
                                    'tool': 'Nuclei',
                                    'name': result['info'].get('name', 'Unknown'),
                                    'risk': self._map_nuclei_severity(result['info'].get('severity', 'info')),
                                    'confidence': 'High',
                                    'description': result['info'].get('description', ''),
                                    'solution': result['info'].get('remediation', ''),
                                    'reference': ', '.join(result['info'].get('reference', [])),
                                    'instances': [{
                                        'uri': result.get('matched-at', ''),
                                        'method': result.get('type', ''),
                                        'param': '',
                                        'evidence': result.get('extracted-results', [''])[0] if result.get('extracted-results') else ''
                                    }]
                                }
                                self.vulnerabilities.append(vuln)
                                self._update_summary(vuln['risk'])
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            print(f"Error parsing Nuclei results: {e}")
    
    def parse_ssl_results(self, ssl_file):
        """Parse testssl.sh JSON results"""
        try:
            if os.path.exists(ssl_file):
                with open(ssl_file, 'r') as f:
                    data = json.load(f)
                    
                for finding in data.get('scanResult', []):
                    if finding.get('severity') in ['HIGH', 'CRITICAL', 'MEDIUM']:
                        vuln = {
                            'tool': 'testssl.sh',
                            'name': finding.get('id', 'SSL/TLS Issue'),
                            'risk': finding.get('severity', 'Unknown'),
                            'confidence': 'High',
                            'description': finding.get('finding', ''),
                            'solution': 'Review SSL/TLS configuration',
                            'reference': 'https://testssl.sh/',
                            'instances': [{
                                'uri': data.get('targetHost', ''),
                                'method': 'SSL/TLS',
                                'param': finding.get('id', ''),
                                'evidence': finding.get('finding', '')
                            }]
                        }
                        self.vulnerabilities.append(vuln)
                        self._update_summary(vuln['risk'])
        except Exception as e:
            print(f"Error parsing SSL results: {e}")
    
    def _map_nuclei_severity(self, severity):
        """Map Nuclei severity to standard risk levels"""
        mapping = {
            'critical': 'Critical',
            'high': 'High',
            'medium': 'Medium',
            'low': 'Low',
            'info': 'Informational'
        }
        return mapping.get(severity.lower(), 'Unknown')
    
    def _update_summary(self, risk):
        """Update vulnerability summary counts"""
        risk_lower = risk.lower()
        if 'critical' in risk_lower:
            self.summary['critical'] += 1
        elif 'high' in risk_lower:
            self.summary['high'] += 1
        elif 'medium' in risk_lower:
            self.summary['medium'] += 1
        elif 'low' in risk_lower:
            self.summary['low'] += 1
        else:
            self.summary['info'] += 1
        self.summary['total'] += 1
    
    def generate_html_report(self, output_file):
        """Generate consolidated HTML security report"""
        html_template = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Q Ecosystem DAST Security Report</title>
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
        .vulnerability { background: white; margin-bottom: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .vuln-header { padding: 15px; border-bottom: 1px solid #eee; }
        .vuln-content { padding: 15px; }
        .risk-badge { padding: 4px 8px; border-radius: 4px; color: white; font-size: 12px; font-weight: bold; }
        .risk-critical { background-color: #dc3545; }
        .risk-high { background-color: #fd7e14; }
        .risk-medium { background-color: #ffc107; color: #000; }
        .risk-low { background-color: #28a745; }
        .risk-info { background-color: #17a2b8; }
        .instances { margin-top: 15px; }
        .instance { background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 4px; font-family: monospace; font-size: 12px; }
        .tool-badge { background: #6c757d; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; }
        .no-vulnerabilities { text-align: center; padding: 40px; background: white; border-radius: 8px; color: #28a745; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Q Ecosystem DAST Security Report</h1>
        <p>Generated on: {timestamp}</p>
        <p>Total Vulnerabilities Found: {total_vulns}</p>
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
    
    {vulnerabilities_html}
</body>
</html>
        """
        
        if not self.vulnerabilities:
            vulnerabilities_html = '<div class="no-vulnerabilities"><h2>🎉 No Security Vulnerabilities Found!</h2><p>All DAST scans completed successfully with no issues detected.</p></div>'
        else:
            vulnerabilities_html = ""
            for vuln in sorted(self.vulnerabilities, key=lambda x: self._get_risk_priority(x['risk']), reverse=True):
                risk_class = vuln['risk'].lower().replace(' ', '-')
                instances_html = ""
                
                for instance in vuln['instances'][:5]:  # Limit to first 5 instances
                    instances_html += f"""
                    <div class="instance">
                        <strong>URI:</strong> {instance['uri']}<br>
                        <strong>Method:</strong> {instance['method']}<br>
                        <strong>Parameter:</strong> {instance['param']}<br>
                        <strong>Evidence:</strong> {instance['evidence'][:200]}{'...' if len(instance['evidence']) > 200 else ''}
                    </div>
                    """
                
                vulnerabilities_html += f"""
                <div class="vulnerability">
                    <div class="vuln-header">
                        <h3>{vuln['name']} <span class="tool-badge">{vuln['tool']}</span></h3>
                        <span class="risk-badge risk-{risk_class}">{vuln['risk']}</span>
                        <span style="margin-left: 10px; color: #666;">Confidence: {vuln['confidence']}</span>
                    </div>
                    <div class="vuln-content">
                        <p><strong>Description:</strong> {vuln['description']}</p>
                        <p><strong>Solution:</strong> {vuln['solution']}</p>
                        {f'<p><strong>Reference:</strong> {vuln["reference"]}</p>' if vuln['reference'] else ''}
                        <div class="instances">
                            <strong>Affected Instances ({len(vuln['instances'])}):</strong>
                            {instances_html}
                        </div>
                    </div>
                </div>
                """
        
        html_content = html_template.format(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
            total_vulns=self.summary['total'],
            critical=self.summary['critical'],
            high=self.summary['high'],
            medium=self.summary['medium'],
            low=self.summary['low'],
            info=self.summary['info'],
            vulnerabilities_html=vulnerabilities_html
        )
        
        with open(output_file, 'w') as f:
            f.write(html_content)
        
        print(f"DAST security report generated: {output_file}")
        print(f"Total vulnerabilities: {self.summary['total']}")
        print(f"Critical: {self.summary['critical']}, High: {self.summary['high']}, Medium: {self.summary['medium']}, Low: {self.summary['low']}, Info: {self.summary['info']}")
    
    def _get_risk_priority(self, risk):
        """Get numeric priority for risk level sorting"""
        priorities = {
            'critical': 5,
            'high': 4,
            'medium': 3,
            'low': 2,
            'informational': 1,
            'info': 1
        }
        return priorities.get(risk.lower(), 0)

def main():
    parser = argparse.ArgumentParser(description='Generate consolidated DAST security report')
    parser.add_argument('--zap-baseline', help='Path to ZAP baseline results directory')
    parser.add_argument('--zap-full', help='Path to ZAP full scan results directory')
    parser.add_argument('--nuclei', help='Path to Nuclei results directory')
    parser.add_argument('--api-security', help='Path to API security results directory')
    parser.add_argument('--ssl-tls', help='Path to SSL/TLS results directory')
    parser.add_argument('--output', required=True, help='Output HTML file path')
    
    args = parser.parse_args()
    
    generator = DASTReportGenerator()
    
    # Parse results from different tools
    if args.zap_baseline:
        zap_file = os.path.join(args.zap_baseline, 'report_html.html')
        if os.path.exists(zap_file):
            generator.parse_zap_results(zap_file)
    
    if args.zap_full:
        zap_file = os.path.join(args.zap_full, 'report_html.html')
        if os.path.exists(zap_file):
            generator.parse_zap_results(zap_file)
    
    if args.nuclei:
        nuclei_file = os.path.join(args.nuclei, 'nuclei-results.json')
        if os.path.exists(nuclei_file):
            generator.parse_nuclei_results(nuclei_file)
    
    if args.ssl_tls:
        ssl_file = os.path.join(args.ssl_tls, 'ssl-results.json')
        if os.path.exists(ssl_file):
            generator.parse_ssl_results(ssl_file)
    
    # Generate consolidated report
    generator.generate_html_report(args.output)

if __name__ == '__main__':
    main()