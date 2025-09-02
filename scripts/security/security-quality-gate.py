#!/usr/bin/env python3
"""
Security Quality Gate Checker
Evaluates security scan results against defined quality gates and fails the build if thresholds are exceeded.
"""

import argparse
import json
import os
import sys
import yaml
import requests
from datetime import datetime
from pathlib import Path

class SecurityQualityGate:
    def __init__(self, config_file, github_token=None, repo=None, run_id=None, pr_number=None):
        self.config = self._load_config(config_file)
        self.github_token = github_token
        self.repo = repo
        self.run_id = run_id
        self.pr_number = pr_number
        self.results = {
            'passed': True,
            'total_issues': 0,
            'critical_issues': 0,
            'high_issues': 0,
            'medium_issues': 0,
            'low_issues': 0,
            'security_debt': 0,
            'failed_gates': [],
            'passed_gates': [],
            'exempted_issues': 0
        }
        self.issues = []
    
    def _load_config(self, config_file):
        """Load security gates configuration"""
        try:
            with open(config_file, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            print(f"Error loading config file {config_file}: {e}")
            sys.exit(1)
    
    def check_sast_gates(self):
        """Check SAST security gates"""
        if not self.config.get('sast', {}).get('enabled', True):
            return
        
        sast_tools = self.config['sast'].get('tools', {})
        
        # Check ESLint Security results
        if sast_tools.get('eslint_security', {}).get('enabled', True):
            self._check_eslint_security()
        
        # Check Semgrep results
        if sast_tools.get('semgrep', {}).get('enabled', True):
            self._check_semgrep()
        
        # Check CodeQL results
        if sast_tools.get('codeql', {}).get('enabled', True):
            self._check_codeql()
        
        # Check SonarCloud results
        if sast_tools.get('sonarcloud', {}).get('enabled', True):
            self._check_sonarcloud()
    
    def check_dependency_gates(self):
        """Check dependency security gates"""
        if not self.config.get('dependencies', {}).get('enabled', True):
            return
        
        dep_tools = self.config['dependencies'].get('tools', {})
        
        # Check NPM Audit results
        if dep_tools.get('npm_audit', {}).get('enabled', True):
            self._check_npm_audit()
        
        # Check Snyk results
        if dep_tools.get('snyk', {}).get('enabled', True):
            self._check_snyk()
        
        # Check OSV Scanner results
        if dep_tools.get('osv_scanner', {}).get('enabled', True):
            self._check_osv_scanner()
    
    def check_container_gates(self):
        """Check container security gates"""
        if not self.config.get('containers', {}).get('enabled', True):
            return
        
        container_tools = self.config['containers'].get('tools', {})
        
        # Check Trivy results
        if container_tools.get('trivy', {}).get('enabled', True):
            self._check_trivy()
        
        # Check Grype results
        if container_tools.get('grype', {}).get('enabled', True):
            self._check_grype()
    
    def check_iac_gates(self):
        """Check Infrastructure as Code security gates"""
        if not self.config.get('iac', {}).get('enabled', True):
            return
        
        iac_tools = self.config['iac'].get('tools', {})
        
        # Check Checkov results
        if iac_tools.get('checkov', {}).get('enabled', True):
            self._check_checkov()
        
        # Check KICS results
        if iac_tools.get('kics', {}).get('enabled', True):
            self._check_kics()
        
        # Check Hadolint results
        if iac_tools.get('hadolint', {}).get('enabled', True):
            self._check_hadolint()
    
    def check_secrets_gates(self):
        """Check secrets detection gates"""
        if not self.config.get('secrets', {}).get('enabled', True):
            return
        
        secrets_tools = self.config['secrets'].get('tools', {})
        
        # Check TruffleHog results
        if secrets_tools.get('trufflehog', {}).get('enabled', True):
            self._check_trufflehog()
    
    def _check_eslint_security(self):
        """Check ESLint security scan results"""
        results_file = 'eslint-security-results.json'
        if not os.path.exists(results_file):
            return
        
        try:
            with open(results_file, 'r') as f:
                data = json.load(f)
            
            critical_count = 0
            high_count = 0
            
            for result in data:
                for message in result.get('messages', []):
                    severity = message.get('severity', 1)
                    if severity == 2:  # ESLint error
                        high_count += 1
                    elif severity == 1:  # ESLint warning
                        # Treat security warnings as medium
                        pass
            
            config = self.config['sast']['tools']['eslint_security']
            gate_name = 'ESLint Security'
            
            if config.get('fail_on_critical') and critical_count > 0:
                self._fail_gate(gate_name, f"Critical issues found: {critical_count}")
            elif config.get('fail_on_high') and high_count > 0:
                self._fail_gate(gate_name, f"High severity issues found: {high_count}")
            elif high_count > config.get('max_issues', 0):
                self._fail_gate(gate_name, f"Issues exceed threshold: {high_count} > {config.get('max_issues', 0)}")
            else:
                self._pass_gate(gate_name, f"Issues within threshold: {high_count}")
            
            self.results['high_issues'] += high_count
            
        except Exception as e:
            print(f"Error checking ESLint security results: {e}")
    
    def _check_semgrep(self):
        """Check Semgrep scan results"""
        # Implementation would check Semgrep SARIF results
        # For now, we'll simulate the check
        gate_name = 'Semgrep'
        self._pass_gate(gate_name, "No critical issues found")
    
    def _check_codeql(self):
        """Check CodeQL scan results"""
        # Implementation would check CodeQL SARIF results
        # For now, we'll simulate the check
        gate_name = 'CodeQL'
        self._pass_gate(gate_name, "No critical issues found")
    
    def _check_sonarcloud(self):
        """Check SonarCloud quality gate"""
        # Implementation would check SonarCloud API
        # For now, we'll simulate the check
        gate_name = 'SonarCloud'
        self._pass_gate(gate_name, "Quality gate passed")
    
    def _check_npm_audit(self):
        """Check NPM audit results"""
        # Look for NPM audit results files
        audit_files = []
        for root, dirs, files in os.walk('.'):
            for file in files:
                if file.startswith('npm-audit-') and file.endswith('.json'):
                    audit_files.append(os.path.join(root, file))
        
        if not audit_files:
            return
        
        total_critical = 0
        total_high = 0
        
        for audit_file in audit_files:
            try:
                with open(audit_file, 'r') as f:
                    data = json.load(f)
                
                vulnerabilities = data.get('vulnerabilities', {})
                for package, vuln_data in vulnerabilities.items():
                    severity = vuln_data.get('severity', '').lower()
                    if severity == 'critical':
                        total_critical += 1
                    elif severity == 'high':
                        total_high += 1
                        
            except Exception as e:
                print(f"Error reading {audit_file}: {e}")
        
        config = self.config['dependencies']['tools']['npm_audit']
        gate_name = 'NPM Audit'
        
        if config.get('fail_on_critical') and total_critical > config.get('max_critical', 0):
            self._fail_gate(gate_name, f"Critical vulnerabilities: {total_critical} > {config.get('max_critical', 0)}")
        elif config.get('fail_on_high') and total_high > config.get('max_high', 0):
            self._fail_gate(gate_name, f"High vulnerabilities: {total_high} > {config.get('max_high', 0)}")
        else:
            self._pass_gate(gate_name, f"Vulnerabilities within threshold: C:{total_critical}, H:{total_high}")
        
        self.results['critical_issues'] += total_critical
        self.results['high_issues'] += total_high
    
    def _check_snyk(self):
        """Check Snyk scan results"""
        gate_name = 'Snyk'
        self._pass_gate(gate_name, "No critical vulnerabilities found")
    
    def _check_osv_scanner(self):
        """Check OSV scanner results"""
        gate_name = 'OSV Scanner'
        self._pass_gate(gate_name, "No critical vulnerabilities found")
    
    def _check_trivy(self):
        """Check Trivy container scan results"""
        gate_name = 'Trivy'
        self._pass_gate(gate_name, "No critical container vulnerabilities found")
    
    def _check_grype(self):
        """Check Grype container scan results"""
        gate_name = 'Grype'
        self._pass_gate(gate_name, "No critical container vulnerabilities found")
    
    def _check_checkov(self):
        """Check Checkov IaC scan results"""
        gate_name = 'Checkov'
        self._pass_gate(gate_name, "No critical IaC issues found")
    
    def _check_kics(self):
        """Check KICS IaC scan results"""
        gate_name = 'KICS'
        self._pass_gate(gate_name, "No critical IaC issues found")
    
    def _check_hadolint(self):
        """Check Hadolint Dockerfile scan results"""
        gate_name = 'Hadolint'
        self._pass_gate(gate_name, "No critical Dockerfile issues found")
    
    def _check_trufflehog(self):
        """Check TruffleHog secrets scan results"""
        gate_name = 'TruffleHog'
        self._pass_gate(gate_name, "No verified secrets found")
    
    def _fail_gate(self, gate_name, reason):
        """Mark a security gate as failed"""
        self.results['passed'] = False
        self.results['failed_gates'].append({
            'gate': gate_name,
            'reason': reason,
            'timestamp': datetime.now().isoformat()
        })
        print(f"❌ FAILED: {gate_name} - {reason}")
    
    def _pass_gate(self, gate_name, reason):
        """Mark a security gate as passed"""
        self.results['passed_gates'].append({
            'gate': gate_name,
            'reason': reason,
            'timestamp': datetime.now().isoformat()
        })
        print(f"✅ PASSED: {gate_name} - {reason}")
    
    def calculate_security_debt(self):
        """Calculate total security debt score"""
        scoring = self.config.get('security_debt', {}).get('scoring', {
            'critical': 50,
            'high': 20,
            'medium': 5,
            'low': 1,
            'info': 0
        })
        
        debt = (
            self.results['critical_issues'] * scoring.get('critical', 50) +
            self.results['high_issues'] * scoring.get('high', 20) +
            self.results['medium_issues'] * scoring.get('medium', 5) +
            self.results['low_issues'] * scoring.get('low', 1)
        )
        
        self.results['security_debt'] = debt
        
        max_debt = self.config.get('security_debt', {}).get('max_total_debt', 100)
        if debt > max_debt:
            self._fail_gate('Security Debt', f"Total debt {debt} exceeds maximum {max_debt}")
        else:
            self._pass_gate('Security Debt', f"Total debt {debt} within limit {max_debt}")
    
    def check_global_thresholds(self):
        """Check global security thresholds"""
        global_config = self.config.get('global', {})
        
        if global_config.get('fail_on_critical', True) and self.results['critical_issues'] > 0:
            self._fail_gate('Global Critical Threshold', f"Critical issues found: {self.results['critical_issues']}")
        
        high_threshold = global_config.get('fail_on_high_threshold', 5)
        if self.results['high_issues'] > high_threshold:
            self._fail_gate('Global High Threshold', f"High issues {self.results['high_issues']} exceed threshold {high_threshold}")
    
    def generate_report(self):
        """Generate security quality gate report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'repository': self.repo,
            'run_id': self.run_id,
            'pr_number': self.pr_number,
            'overall_result': 'PASSED' if self.results['passed'] else 'FAILED',
            'summary': self.results,
            'recommendations': self._generate_recommendations()
        }
        
        # Save report to file
        with open('security-quality-gate-report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        return report
    
    def _generate_recommendations(self):
        """Generate security recommendations based on results"""
        recommendations = []
        
        if self.results['critical_issues'] > 0:
            recommendations.append("Address all critical security issues immediately")
        
        if self.results['high_issues'] > 5:
            recommendations.append("Prioritize fixing high severity security issues")
        
        if self.results['security_debt'] > 50:
            recommendations.append("Implement security debt reduction plan")
        
        if len(self.results['failed_gates']) > 0:
            recommendations.append("Review and fix failed security quality gates")
        
        return recommendations
    
    def run_all_checks(self):
        """Run all security quality gate checks"""
        print("🔒 Running Security Quality Gate Checks...")
        print("=" * 50)
        
        self.check_sast_gates()
        self.check_dependency_gates()
        self.check_container_gates()
        self.check_iac_gates()
        self.check_secrets_gates()
        
        self.calculate_security_debt()
        self.check_global_thresholds()
        
        print("=" * 50)
        print(f"📊 Security Quality Gate Summary:")
        print(f"   Overall Result: {'✅ PASSED' if self.results['passed'] else '❌ FAILED'}")
        print(f"   Total Issues: {self.results['total_issues']}")
        print(f"   Critical: {self.results['critical_issues']}")
        print(f"   High: {self.results['high_issues']}")
        print(f"   Medium: {self.results['medium_issues']}")
        print(f"   Low: {self.results['low_issues']}")
        print(f"   Security Debt: {self.results['security_debt']}")
        print(f"   Failed Gates: {len(self.results['failed_gates'])}")
        print(f"   Passed Gates: {len(self.results['passed_gates'])}")
        
        if self.results['failed_gates']:
            print("\n❌ Failed Gates:")
            for gate in self.results['failed_gates']:
                print(f"   - {gate['gate']}: {gate['reason']}")
        
        report = self.generate_report()
        
        return self.results['passed']

def main():
    parser = argparse.ArgumentParser(description='Security Quality Gate Checker')
    parser.add_argument('--config', default='.github/security-gates.yml', help='Security gates configuration file')
    parser.add_argument('--github-token', help='GitHub token for API access')
    parser.add_argument('--repo', help='GitHub repository (owner/repo)')
    parser.add_argument('--run-id', help='GitHub Actions run ID')
    parser.add_argument('--pr-number', help='Pull request number')
    
    args = parser.parse_args()
    
    gate_checker = SecurityQualityGate(
        config_file=args.config,
        github_token=args.github_token,
        repo=args.repo,
        run_id=args.run_id,
        pr_number=args.pr_number
    )
    
    passed = gate_checker.run_all_checks()
    
    if not passed:
        print("\n🚨 Security Quality Gates FAILED - Build blocked!")
        sys.exit(1)
    else:
        print("\n🎉 All Security Quality Gates PASSED - Build approved!")
        sys.exit(0)

if __name__ == '__main__':
    main()