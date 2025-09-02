#!/usr/bin/env python3
"""
GitHub Actions Security Scanner
Analyzes GitHub Actions workflows for security misconfigurations.
"""

import yaml
import json
import os
import glob
from datetime import datetime

class GitHubActionsSecurityScanner:
    def __init__(self):
        self.issues = []
        self.security_rules = {
            'pull_request_target_checkout': {
                'severity': 'critical',
                'description': 'pull_request_target with checkout of PR code',
                'recommendation': 'Use pull_request trigger or checkout specific ref'
            },
            'script_injection': {
                'severity': 'critical',
                'description': 'Potential script injection vulnerability',
                'recommendation': 'Use environment variables instead of direct interpolation'
            },
            'third_party_action_no_pin': {
                'severity': 'high',
                'description': 'Third-party action not pinned to specific version',
                'recommendation': 'Pin actions to specific commit SHA or version tag'
            },
            'secrets_in_environment': {
                'severity': 'high',
                'description': 'Secrets exposed in environment variables',
                'recommendation': 'Use secrets context only when necessary'
            },
            'write_permissions_broad': {
                'severity': 'medium',
                'description': 'Broad write permissions granted',
                'recommendation': 'Use minimal required permissions'
            },
            'self_hosted_runner': {
                'severity': 'medium',
                'description': 'Using self-hosted runners',
                'recommendation': 'Ensure self-hosted runners are properly secured'
            },
            'artifact_upload_no_retention': {
                'severity': 'low',
                'description': 'Artifact upload without retention policy',
                'recommendation': 'Set appropriate retention period for artifacts'
            },
            'cache_key_predictable': {
                'severity': 'low',
                'description': 'Predictable cache keys may lead to cache poisoning',
                'recommendation': 'Use unique, unpredictable cache keys'
            }
        }
    
    def scan_workflows_directory(self, workflows_dir):
        """Scan all workflow files in the .github/workflows directory"""
        workflow_files = glob.glob(os.path.join(workflows_dir, '*.yml')) + \
                        glob.glob(os.path.join(workflows_dir, '*.yaml'))
        
        for workflow_file in workflow_files:
            self.scan_workflow_file(workflow_file)
    
    def scan_workflow_file(self, file_path):
        """Scan a single workflow file for security issues"""
        try:
            with open(file_path, 'r') as f:
                workflow_data = yaml.safe_load(f)
            
            if not workflow_data:
                return
            
            # Check triggers
            self._check_triggers(file_path, workflow_data.get('on', {}))
            
            # Check jobs
            jobs = workflow_data.get('jobs', {})
            for job_name, job_config in jobs.items():
                self._scan_job(file_path, job_name, job_config)
                
        except Exception as e:
            self.issues.append({
                'file': file_path,
                'job': 'N/A',
                'step': 'N/A',
                'rule': 'parse_error',
                'severity': 'high',
                'description': f'Failed to parse workflow file: {str(e)}',
                'recommendation': 'Fix YAML syntax errors in workflow file'
            })
    
    def _check_triggers(self, file_path, triggers):
        """Check workflow triggers for security issues"""
        if 'pull_request_target' in triggers:
            self._add_issue(file_path, 'trigger', 'pull_request_target', 'pull_request_target_checkout')
    
    def _scan_job(self, file_path, job_name, job_config):
        """Scan individual job configuration"""
        
        # Check permissions
        permissions = job_config.get('permissions', {})
        if isinstance(permissions, dict):
            write_perms = [k for k, v in permissions.items() if v == 'write']
            if len(write_perms) > 3:  # Arbitrary threshold for "broad"
                self._add_issue(file_path, job_name, 'permissions', 'write_permissions_broad')
        
        # Check runner
        runs_on = job_config.get('runs-on', '')
        if isinstance(runs_on, str) and 'self-hosted' in runs_on:
            self._add_issue(file_path, job_name, 'runner', 'self_hosted_runner')
        
        # Check steps
        steps = job_config.get('steps', [])
        for i, step in enumerate(steps):
            self._scan_step(file_path, job_name, i, step)
    
    def _scan_step(self, file_path, job_name, step_index, step_config):
        """Scan individual step configuration"""
        step_name = step_config.get('name', f'step-{step_index}')
        
        # Check for third-party actions without version pinning
        uses = step_config.get('uses', '')
        if uses and not uses.startswith('./') and not uses.startswith('docker://'):
            # Check if action is pinned to SHA or version
            if '@' in uses:
                version_part = uses.split('@')[1]
                # Check if it's a SHA (40 hex characters) or semantic version
                if not (len(version_part) == 40 and all(c in '0123456789abcdef' for c in version_part.lower())) and \
                   not version_part.startswith('v') and not version_part[0].isdigit():
                    self._add_issue(file_path, job_name, step_name, 'third_party_action_no_pin')
            else:
                self._add_issue(file_path, job_name, step_name, 'third_party_action_no_pin')
        
        # Check for script injection in run commands
        run_command = step_config.get('run', '')
        if run_command and '${{' in run_command:
            # Look for potentially dangerous interpolations
            dangerous_contexts = ['github.event.', 'github.head_ref', 'github.base_ref']
            for context in dangerous_contexts:
                if context in run_command:
                    self._add_issue(file_path, job_name, step_name, 'script_injection')
                    break
        
        # Check environment variables for secrets
        env = step_config.get('env', {})
        for env_name, env_value in env.items():
            if isinstance(env_value, str) and 'secrets.' in env_value:
                # This is generally OK, but flag if it's in a potentially dangerous context
                if any(keyword in env_name.lower() for keyword in ['url', 'endpoint', 'host']):
                    self._add_issue(file_path, job_name, step_name, 'secrets_in_environment')
        
        # Check for artifact uploads without retention
        if uses.startswith('actions/upload-artifact'):
            with_config = step_config.get('with', {})
            if 'retention-days' not in with_config:
                self._add_issue(file_path, job_name, step_name, 'artifact_upload_no_retention')
        
        # Check for cache actions with predictable keys
        if uses.startswith('actions/cache'):
            with_config = step_config.get('with', {})
            key = with_config.get('key', '')
            if key and not any(var in key for var in ['${{', 'hashFiles', 'runner.os']):
                self._add_issue(file_path, job_name, step_name, 'cache_key_predictable')
    
    def _add_issue(self, file_path, job_name, step_name, rule_name):
        """Add a security issue to the results"""
        rule = self.security_rules.get(rule_name, {})
        self.issues.append({
            'file': file_path,
            'job': job_name,
            'step': step_name,
            'rule': rule_name,
            'severity': rule.get('severity', 'unknown'),
            'description': rule.get('description', 'Unknown security issue'),
            'recommendation': rule.get('recommendation', 'Review configuration')
        })
    
    def get_results(self):
        """Get scan results in JSON format"""
        return {
            'timestamp': datetime.now().isoformat(),
            'tool': 'GitHub Actions Security Scanner',
            'total_issues': len(self.issues),
            'issues': self.issues,
            'summary': self._get_summary()
        }
    
    def _get_summary(self):
        """Get summary of issues by severity"""
        summary = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
        for issue in self.issues:
            severity = issue.get('severity', 'unknown')
            if severity in summary:
                summary[severity] += 1
        return summary

def main():
    import sys
    
    if len(sys.argv) != 2:
        print("Usage: python3 github-actions-security.py <workflows-directory>")
        sys.exit(1)
    
    workflows_dir = sys.argv[1]
    
    if not os.path.exists(workflows_dir):
        print(f"Error: Directory {workflows_dir} not found")
        sys.exit(1)
    
    scanner = GitHubActionsSecurityScanner()
    scanner.scan_workflows_directory(workflows_dir)
    
    results = scanner.get_results()
    print(json.dumps(results, indent=2))

if __name__ == '__main__':
    main()