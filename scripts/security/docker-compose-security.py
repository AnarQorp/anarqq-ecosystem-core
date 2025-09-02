#!/usr/bin/env python3
"""
Docker Compose Security Scanner
Analyzes Docker Compose files for security misconfigurations.
"""

import yaml
import json
import sys
import os
from datetime import datetime

class DockerComposeSecurityScanner:
    def __init__(self):
        self.issues = []
        self.security_rules = {
            'privileged_containers': {
                'severity': 'critical',
                'description': 'Container running in privileged mode',
                'recommendation': 'Remove privileged: true or use specific capabilities instead'
            },
            'host_network': {
                'severity': 'high',
                'description': 'Container using host network mode',
                'recommendation': 'Use bridge network mode and expose specific ports'
            },
            'host_pid': {
                'severity': 'high',
                'description': 'Container sharing host PID namespace',
                'recommendation': 'Remove pid: host unless absolutely necessary'
            },
            'host_ipc': {
                'severity': 'high',
                'description': 'Container sharing host IPC namespace',
                'recommendation': 'Remove ipc: host unless absolutely necessary'
            },
            'docker_socket_mount': {
                'severity': 'critical',
                'description': 'Docker socket mounted in container',
                'recommendation': 'Avoid mounting /var/run/docker.sock unless absolutely necessary'
            },
            'root_filesystem_writable': {
                'severity': 'medium',
                'description': 'Container root filesystem is writable',
                'recommendation': 'Set read_only: true for container filesystem'
            },
            'no_user_specified': {
                'severity': 'medium',
                'description': 'Container running as root user',
                'recommendation': 'Specify non-root user with user: directive'
            },
            'insecure_capabilities': {
                'severity': 'high',
                'description': 'Container has dangerous capabilities',
                'recommendation': 'Remove dangerous capabilities like SYS_ADMIN, NET_ADMIN'
            },
            'host_port_binding': {
                'severity': 'low',
                'description': 'Service binding to all interfaces (0.0.0.0)',
                'recommendation': 'Bind to specific interfaces when possible'
            },
            'default_secrets': {
                'severity': 'high',
                'description': 'Potential default or weak secrets detected',
                'recommendation': 'Use strong, unique secrets and avoid defaults'
            },
            'insecure_environment': {
                'severity': 'medium',
                'description': 'Potentially sensitive data in environment variables',
                'recommendation': 'Use secrets or external configuration for sensitive data'
            }
        }
    
    def scan_compose_file(self, file_path):
        """Scan a Docker Compose file for security issues"""
        try:
            with open(file_path, 'r') as f:
                compose_data = yaml.safe_load(f)
            
            if not compose_data or 'services' not in compose_data:
                return
            
            for service_name, service_config in compose_data['services'].items():
                self._scan_service(file_path, service_name, service_config)
                
        except Exception as e:
            self.issues.append({
                'file': file_path,
                'service': 'N/A',
                'rule': 'parse_error',
                'severity': 'high',
                'description': f'Failed to parse Docker Compose file: {str(e)}',
                'recommendation': 'Fix YAML syntax errors in Docker Compose file'
            })
    
    def _scan_service(self, file_path, service_name, service_config):
        """Scan individual service configuration"""
        
        # Check for privileged containers
        if service_config.get('privileged'):
            self._add_issue(file_path, service_name, 'privileged_containers')
        
        # Check network mode
        if service_config.get('network_mode') == 'host':
            self._add_issue(file_path, service_name, 'host_network')
        
        # Check PID mode
        if service_config.get('pid') == 'host':
            self._add_issue(file_path, service_name, 'host_pid')
        
        # Check IPC mode
        if service_config.get('ipc') == 'host':
            self._add_issue(file_path, service_name, 'host_ipc')
        
        # Check for Docker socket mounts
        volumes = service_config.get('volumes', [])
        for volume in volumes:
            if isinstance(volume, str):
                if '/var/run/docker.sock' in volume:
                    self._add_issue(file_path, service_name, 'docker_socket_mount')
            elif isinstance(volume, dict):
                if volume.get('source') == '/var/run/docker.sock':
                    self._add_issue(file_path, service_name, 'docker_socket_mount')
        
        # Check if root filesystem is read-only
        if not service_config.get('read_only'):
            self._add_issue(file_path, service_name, 'root_filesystem_writable')
        
        # Check if user is specified
        if not service_config.get('user'):
            self._add_issue(file_path, service_name, 'no_user_specified')
        
        # Check capabilities
        cap_add = service_config.get('cap_add', [])
        dangerous_caps = ['SYS_ADMIN', 'NET_ADMIN', 'SYS_PTRACE', 'SYS_MODULE', 'DAC_OVERRIDE']
        for cap in cap_add:
            if cap in dangerous_caps:
                self._add_issue(file_path, service_name, 'insecure_capabilities')
        
        # Check port bindings
        ports = service_config.get('ports', [])
        for port in ports:
            if isinstance(port, str) and port.startswith('0.0.0.0:'):
                self._add_issue(file_path, service_name, 'host_port_binding')
        
        # Check environment variables for sensitive data
        environment = service_config.get('environment', {})
        if isinstance(environment, list):
            env_vars = environment
        else:
            env_vars = [f"{k}={v}" for k, v in environment.items()]
        
        sensitive_patterns = ['password', 'secret', 'key', 'token', 'api_key', 'private']
        for env_var in env_vars:
            env_lower = env_var.lower()
            for pattern in sensitive_patterns:
                if pattern in env_lower:
                    # Check for default/weak values
                    if any(weak in env_lower for weak in ['123', 'password', 'secret', 'admin', 'root']):
                        self._add_issue(file_path, service_name, 'default_secrets')
                    else:
                        self._add_issue(file_path, service_name, 'insecure_environment')
                    break
    
    def _add_issue(self, file_path, service_name, rule_name):
        """Add a security issue to the results"""
        rule = self.security_rules.get(rule_name, {})
        self.issues.append({
            'file': file_path,
            'service': service_name,
            'rule': rule_name,
            'severity': rule.get('severity', 'unknown'),
            'description': rule.get('description', 'Unknown security issue'),
            'recommendation': rule.get('recommendation', 'Review configuration')
        })
    
    def get_results(self):
        """Get scan results in JSON format"""
        return {
            'timestamp': datetime.now().isoformat(),
            'tool': 'Docker Compose Security Scanner',
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
    if len(sys.argv) != 2:
        print("Usage: python3 docker-compose-security.py <docker-compose-file>")
        sys.exit(1)
    
    compose_file = sys.argv[1]
    
    if not os.path.exists(compose_file):
        print(f"Error: File {compose_file} not found")
        sys.exit(1)
    
    scanner = DockerComposeSecurityScanner()
    scanner.scan_compose_file(compose_file)
    
    results = scanner.get_results()
    print(json.dumps(results, indent=2))

if __name__ == '__main__':
    main()