#!/usr/bin/env python3
"""
Security Dashboard Updater
Updates the security dashboard with scan results and quality gate status.
"""

import argparse
import json
import os
import sys
import requests
from datetime import datetime

class SecurityDashboardUpdater:
    def __init__(self, github_token=None, repo=None, run_id=None, branch=None, commit=None):
        self.github_token = github_token
        self.repo = repo
        self.run_id = run_id
        self.branch = branch
        self.commit = commit
        self.dashboard_api = os.getenv('SECURITY_DASHBOARD_API')
        self.dashboard_key = os.getenv('SECURITY_DASHBOARD_KEY')
    
    def collect_scan_results(self):
        """Collect all security scan results from artifacts"""
        results = {
            'timestamp': datetime.now().isoformat(),
            'repository': self.repo,
            'branch': self.branch,
            'commit': self.commit,
            'run_id': self.run_id,
            'scans': {}
        }
        
        # Collect SAST results
        results['scans']['sast'] = self._collect_sast_results()
        
        # Collect dependency scan results
        results['scans']['dependencies'] = self._collect_dependency_results()
        
        # Collect container scan results
        results['scans']['containers'] = self._collect_container_results()
        
        # Collect IaC scan results
        results['scans']['iac'] = self._collect_iac_results()
        
        # Collect secrets scan results
        results['scans']['secrets'] = self._collect_secrets_results()
        
        # Collect quality gate results
        results['quality_gates'] = self._collect_quality_gate_results()
        
        return results
    
    def _collect_sast_results(self):
        """Collect SAST scan results"""
        sast_results = {
            'total_issues': 0,
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'tools': {}
        }
        
        # ESLint Security results
        if os.path.exists('eslint-security-results.json'):
            try:
                with open('eslint-security-results.json', 'r') as f:
                    data = json.load(f)
                
                issues = 0
                for result in data:
                    issues += len(result.get('messages', []))
                
                sast_results['tools']['eslint'] = {
                    'issues': issues,
                    'status': 'completed'
                }
                sast_results['total_issues'] += issues
                
            except Exception as e:
                sast_results['tools']['eslint'] = {
                    'status': 'error',
                    'error': str(e)
                }
        
        # Add other SAST tools results here
        # Semgrep, CodeQL, SonarCloud, etc.
        
        return sast_results
    
    def _collect_dependency_results(self):
        """Collect dependency scan results"""
        dep_results = {
            'total_vulnerabilities': 0,
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'tools': {}
        }
        
        # NPM Audit results
        npm_audit_files = []
        for root, dirs, files in os.walk('.'):
            for file in files:
                if file.startswith('npm-audit-') and file.endswith('.json'):
                    npm_audit_files.append(os.path.join(root, file))
        
        if npm_audit_files:
            total_vulns = 0
            critical = 0
            high = 0
            medium = 0
            low = 0
            
            for audit_file in npm_audit_files:
                try:
                    with open(audit_file, 'r') as f:
                        data = json.load(f)
                    
                    vulnerabilities = data.get('vulnerabilities', {})
                    for package, vuln_data in vulnerabilities.items():
                        severity = vuln_data.get('severity', '').lower()
                        total_vulns += 1
                        if severity == 'critical':
                            critical += 1
                        elif severity == 'high':
                            high += 1
                        elif severity == 'moderate':
                            medium += 1
                        elif severity == 'low':
                            low += 1
                            
                except Exception as e:
                    print(f"Error reading {audit_file}: {e}")
            
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
        
        return dep_results
    
    def _collect_container_results(self):
        """Collect container scan results"""
        container_results = {
            'total_vulnerabilities': 0,
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'tools': {}
        }
        
        # Trivy results
        trivy_files = []
        for root, dirs, files in os.walk('.'):
            for file in files:
                if file.startswith('trivy-') and file.endswith('.json'):
                    trivy_files.append(os.path.join(root, file))
        
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
        """Collect Infrastructure as Code scan results"""
        iac_results = {
            'total_issues': 0,
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'tools': {}
        }
        
        # Checkov results
        if os.path.exists('checkov-results.json'):
            try:
                with open('checkov-results.json', 'r') as f:
                    data = json.load(f)
                
                failed_checks = data.get('results', {}).get('failed_checks', [])
                issues = len(failed_checks)
                
                iac_results['tools']['checkov'] = {
                    'issues': issues,
                    'status': 'completed'
                }
                iac_results['total_issues'] += issues
                
            except Exception as e:
                iac_results['tools']['checkov'] = {
                    'status': 'error',
                    'error': str(e)
                }
        
        return iac_results
    
    def _collect_secrets_results(self):
        """Collect secrets detection results"""
        secrets_results = {
            'total_secrets': 0,
            'verified': 0,
            'unverified': 0,
            'tools': {}
        }
        
        # TruffleHog results
        if os.path.exists('trufflehog-results.json'):
            try:
                verified = 0
                unverified = 0
                
                with open('trufflehog-results.json', 'r') as f:
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
                secrets_results['tools']['trufflehog'] = {
                    'status': 'error',
                    'error': str(e)
                }
        
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
        
        if os.path.exists('security-quality-gate-report.json'):
            try:
                with open('security-quality-gate-report.json', 'r') as f:
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
    
    def update_dashboard(self, results):
        """Update the security dashboard with scan results"""
        if not self.dashboard_api or not self.dashboard_key:
            print("Security dashboard API not configured, skipping update")
            return
        
        try:
            headers = {
                'Authorization': f'Bearer {self.dashboard_key}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                f"{self.dashboard_api}/api/v1/scan-results",
                headers=headers,
                json=results,
                timeout=30
            )
            
            if response.status_code == 200:
                print("✅ Security dashboard updated successfully")
            else:
                print(f"❌ Failed to update security dashboard: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Error updating security dashboard: {e}")
    
    def create_github_issue(self, results):
        """Create GitHub issue for critical security findings"""
        if not self.github_token or not self.repo:
            return
        
        # Only create issue if there are critical findings
        total_critical = (
            results['scans']['sast']['critical'] +
            results['scans']['dependencies']['critical'] +
            results['scans']['containers']['critical'] +
            results['scans']['iac']['critical']
        )
        
        if total_critical == 0:
            return
        
        try:
            headers = {
                'Authorization': f'token {self.github_token}',
                'Accept': 'application/vnd.github.v3+json'
            }
            
            issue_title = f"🚨 Critical Security Issues Found - {datetime.now().strftime('%Y-%m-%d')}"
            issue_body = f"""
# Critical Security Issues Detected

**Repository:** {self.repo}
**Branch:** {self.branch}
**Commit:** {self.commit}
**Scan Date:** {results['timestamp']}

## Summary
- **Total Critical Issues:** {total_critical}
- **SAST Critical:** {results['scans']['sast']['critical']}
- **Dependencies Critical:** {results['scans']['dependencies']['critical']}
- **Containers Critical:** {results['scans']['containers']['critical']}
- **IaC Critical:** {results['scans']['iac']['critical']}

## Quality Gates Status
- **Overall Status:** {results['quality_gates']['overall_status'].upper()}
- **Failed Gates:** {results['quality_gates']['failed_gates']}
- **Security Debt:** {results['quality_gates']['security_debt']}

## Action Required
Please review and address these critical security issues immediately.

**Scan Details:** [View Run]({f"https://github.com/{self.repo}/actions/runs/{self.run_id}" if self.run_id else "N/A"})
            """
            
            issue_data = {
                'title': issue_title,
                'body': issue_body,
                'labels': ['security', 'critical', 'automated']
            }
            
            response = requests.post(
                f"https://api.github.com/repos/{self.repo}/issues",
                headers=headers,
                json=issue_data,
                timeout=30
            )
            
            if response.status_code == 201:
                issue_url = response.json().get('html_url')
                print(f"✅ GitHub issue created: {issue_url}")
            else:
                print(f"❌ Failed to create GitHub issue: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Error creating GitHub issue: {e}")
    
    def run_update(self):
        """Run the security dashboard update process"""
        print("📊 Collecting security scan results...")
        results = self.collect_scan_results()
        
        print("📈 Updating security dashboard...")
        self.update_dashboard(results)
        
        print("🔍 Checking for critical issues...")
        self.create_github_issue(results)
        
        # Save results to file for debugging
        with open('security-dashboard-update.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        print("✅ Security dashboard update completed")
        
        return results

def main():
    parser = argparse.ArgumentParser(description='Security Dashboard Updater')
    parser.add_argument('--github-token', help='GitHub token for API access')
    parser.add_argument('--repo', help='GitHub repository (owner/repo)')
    parser.add_argument('--run-id', help='GitHub Actions run ID')
    parser.add_argument('--branch', help='Git branch name')
    parser.add_argument('--commit', help='Git commit SHA')
    
    args = parser.parse_args()
    
    updater = SecurityDashboardUpdater(
        github_token=args.github_token,
        repo=args.repo,
        run_id=args.run_id,
        branch=args.branch,
        commit=args.commit
    )
    
    updater.run_update()

if __name__ == '__main__':
    main()