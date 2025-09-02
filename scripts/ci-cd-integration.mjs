#!/usr/bin/env node

/**
 * CI/CD Integration for Documentation Pipeline
 * Provides integration hooks for various CI/CD systems
 */

import { QflowDocumentationPipeline } from '../backend/services/QflowDocumentationPipeline.mjs';
import { EventBusService } from '../backend/services/EventBusService.mjs';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

class CICDIntegration {
  constructor() {
    this.pipeline = new QflowDocumentationPipeline();
    this.eventBus = new EventBusService();
    this.integrations = new Map();
    
    this.setupIntegrations();
  }

  setupIntegrations() {
    // GitHub Actions integration
    this.integrations.set('github-actions', {
      name: 'GitHub Actions',
      detectEnvironment: () => process.env.GITHUB_ACTIONS === 'true',
      extractContext: this.extractGitHubContext.bind(this),
      setupHooks: this.setupGitHubHooks.bind(this)
    });

    // GitLab CI integration
    this.integrations.set('gitlab-ci', {
      name: 'GitLab CI',
      detectEnvironment: () => process.env.GITLAB_CI === 'true',
      extractContext: this.extractGitLabContext.bind(this),
      setupHooks: this.setupGitLabHooks.bind(this)
    });

    // Jenkins integration
    this.integrations.set('jenkins', {
      name: 'Jenkins',
      detectEnvironment: () => process.env.JENKINS_URL !== undefined,
      extractContext: this.extractJenkinsContext.bind(this),
      setupHooks: this.setupJenkinsHooks.bind(this)
    });

    // Azure DevOps integration
    this.integrations.set('azure-devops', {
      name: 'Azure DevOps',
      detectEnvironment: () => process.env.AZURE_HTTP_USER_AGENT !== undefined,
      extractContext: this.extractAzureContext.bind(this),
      setupHooks: this.setupAzureHooks.bind(this)
    });

    // Generic CI integration
    this.integrations.set('generic', {
      name: 'Generic CI',
      detectEnvironment: () => process.env.CI === 'true',
      extractContext: this.extractGenericContext.bind(this),
      setupHooks: this.setupGenericHooks.bind(this)
    });
  }

  /**
   * Auto-detect CI/CD environment and setup integration
   */
  async autoSetup() {
    console.log('🔍 Detecting CI/CD environment...');

    for (const [key, integration] of this.integrations.entries()) {
      if (integration.detectEnvironment()) {
        console.log(`✅ Detected ${integration.name} environment`);
        
        const context = await integration.extractContext();
        await integration.setupHooks(context);
        
        return {
          platform: key,
          name: integration.name,
          context
        };
      }
    }

    console.log('⚠️ No specific CI/CD environment detected, using generic integration');
    const genericIntegration = this.integrations.get('generic');
    const context = await genericIntegration.extractContext();
    await genericIntegration.setupHooks(context);

    return {
      platform: 'generic',
      name: 'Generic CI',
      context
    };
  }

  /**
   * GitHub Actions integration
   */
  extractGitHubContext() {
    return {
      platform: 'github-actions',
      repository: process.env.GITHUB_REPOSITORY,
      ref: process.env.GITHUB_REF,
      sha: process.env.GITHUB_SHA,
      actor: process.env.GITHUB_ACTOR,
      eventName: process.env.GITHUB_EVENT_NAME,
      workflow: process.env.GITHUB_WORKFLOW,
      job: process.env.GITHUB_JOB,
      runId: process.env.GITHUB_RUN_ID,
      runNumber: process.env.GITHUB_RUN_NUMBER,
      workspace: process.env.GITHUB_WORKSPACE
    };
  }

  async setupGitHubHooks(context) {
    console.log('🔧 Setting up GitHub Actions hooks...');

    // Create GitHub Actions workflow for documentation pipeline
    const workflowContent = this.generateGitHubWorkflow();
    const workflowPath = '.github/workflows/docs-pipeline.yml';
    
    try {
      await fs.mkdir('.github/workflows', { recursive: true });
      await fs.writeFile(workflowPath, workflowContent);
      console.log(`✅ Created GitHub workflow: ${workflowPath}`);
    } catch (error) {
      console.warn(`⚠️ Could not create GitHub workflow: ${error.message}`);
    }

    // Setup event handlers for GitHub-specific events
    this.setupGitHubEventHandlers(context);
  }

  generateGitHubWorkflow() {
    return `name: Documentation Pipeline

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'docs/**'
      - 'modules/*/README.md'
      - 'modules/*/openapi.yaml'
      - 'modules/*/mcp.json'
      - '*.md'
  pull_request:
    branches: [ main ]
    paths:
      - 'docs/**'
      - 'modules/*/README.md'
      - 'modules/*/openapi.yaml'
      - 'modules/*/mcp.json'
      - '*.md'
  release:
    types: [ published ]
  workflow_dispatch:
    inputs:
      trigger_type:
        description: 'Pipeline trigger type'
        required: true
        default: 'manual'
        type: choice
        options:
          - manual
          - documentation-update
          - module-release
      module:
        description: 'Module name (for module-release trigger)'
        required: false
        type: string
      version:
        description: 'Version (for module-release trigger)'
        required: false
        type: string

jobs:
  documentation-pipeline:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4
      with:
        fetch-depth: 0
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run documentation pipeline
      run: |
        node scripts/ci-cd-integration.mjs github-actions \\
          --trigger \${{ github.event_name == 'workflow_dispatch' && github.event.inputs.trigger_type || 'documentation-update' }} \\
          --module \${{ github.event.inputs.module || '' }} \\
          --version \${{ github.event.inputs.version || '' }}
      env:
        GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
    
    - name: Upload pipeline artifacts
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: documentation-pipeline-results
        path: |
          docs/
          .pipeline-results/
        retention-days: 30
    
    - name: Comment on PR
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v7
      with:
        script: |
          const fs = require('fs');
          try {
            const results = fs.readFileSync('.pipeline-results/summary.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: results
            });
          } catch (error) {
            console.log('No pipeline results to comment');
          }
`;
  }

  setupGitHubEventHandlers(context) {
    // Handle GitHub-specific events
    this.eventBus.subscribe('q.docs.pipeline.completed.v1',
      { squidId: 'github-actions-integration' },
      async (event) => {
        await this.createGitHubSummary(event, context);
      }
    );

    this.eventBus.subscribe('q.docs.pipeline.failed.v1',
      { squidId: 'github-actions-integration' },
      async (event) => {
        await this.createGitHubErrorSummary(event, context);
      }
    );
  }

  async createGitHubSummary(event, context) {
    const summary = `# 📚 Documentation Pipeline Results

## ✅ Pipeline Completed Successfully

- **Pipeline ID**: \`${event.payload.pipelineId}\`
- **Execution Time**: ${event.payload.executionTime}ms
- **Verdict**: ${event.payload.verdict}
- **Confidence**: ${(event.payload.confidence * 100).toFixed(1)}%
- **Steps Completed**: ${event.payload.stepsCompleted}

## 📋 Step Results

${event.payload.stepResults?.map(step => 
  `- **${step.step}**: ${step.status === 'success' ? '✅' : step.status === 'warning' ? '⚠️' : '❌'} ${step.status} (${step.executionTime}ms)`
).join('\n') || 'No step details available'}

## 📊 Metrics

${event.payload.metrics ? Object.entries(event.payload.metrics).map(([key, value]) => 
  `- **${key}**: ${value}`
).join('\n') : 'No metrics available'}

---
*Generated by Q Ecosystem Documentation Pipeline*
`;

    await fs.mkdir('.pipeline-results', { recursive: true });
    await fs.writeFile('.pipeline-results/summary.md', summary);
    
    // Set GitHub Actions output
    if (process.env.GITHUB_OUTPUT) {
      await fs.appendFile(process.env.GITHUB_OUTPUT, `pipeline-success=true\n`);
      await fs.appendFile(process.env.GITHUB_OUTPUT, `pipeline-id=${event.payload.pipelineId}\n`);
    }
  }

  async createGitHubErrorSummary(event, context) {
    const summary = `# 📚 Documentation Pipeline Results

## ❌ Pipeline Failed

- **Pipeline ID**: \`${event.payload.pipelineId}\`
- **Execution Time**: ${event.payload.executionTime}ms
- **Failed Step**: ${event.payload.failedStep}
- **Error**: ${event.payload.error.message}

## 📋 Step Results

${event.payload.stepResults?.map(step => 
  `- **${step.step}**: ${step.status === 'success' ? '✅' : step.status === 'warning' ? '⚠️' : '❌'} ${step.status} (${step.executionTime}ms)`
).join('\n') || 'No step details available'}

## 🔧 Recommended Actions

${event.payload.recommendedActions?.map(action => 
  `- ${action.priority === 'critical' ? '🚨' : action.priority === 'high' ? '⚠️' : '💡'} ${action.action}`
).join('\n') || 'No recommendations available'}

---
*Generated by Q Ecosystem Documentation Pipeline*
`;

    await fs.mkdir('.pipeline-results', { recursive: true });
    await fs.writeFile('.pipeline-results/summary.md', summary);
    
    // Set GitHub Actions output
    if (process.env.GITHUB_OUTPUT) {
      await fs.appendFile(process.env.GITHUB_OUTPUT, `pipeline-success=false\n`);
      await fs.appendFile(process.env.GITHUB_OUTPUT, `pipeline-error=${event.payload.error.message}\n`);
    }
  }

  /**
   * GitLab CI integration
   */
  extractGitLabContext() {
    return {
      platform: 'gitlab-ci',
      projectId: process.env.CI_PROJECT_ID,
      projectName: process.env.CI_PROJECT_NAME,
      projectPath: process.env.CI_PROJECT_PATH,
      ref: process.env.CI_COMMIT_REF_NAME,
      sha: process.env.CI_COMMIT_SHA,
      actor: process.env.GITLAB_USER_LOGIN,
      pipelineId: process.env.CI_PIPELINE_ID,
      jobId: process.env.CI_JOB_ID,
      jobName: process.env.CI_JOB_NAME,
      workspace: process.env.CI_PROJECT_DIR
    };
  }

  async setupGitLabHooks(context) {
    console.log('🔧 Setting up GitLab CI hooks...');

    const ciConfig = this.generateGitLabCI();
    const ciPath = '.gitlab-ci.yml';
    
    try {
      // Check if .gitlab-ci.yml exists and append our job
      let existingConfig = '';
      try {
        existingConfig = await fs.readFile(ciPath, 'utf8');
      } catch {
        // File doesn't exist, create new
      }

      if (!existingConfig.includes('docs-pipeline:')) {
        const updatedConfig = existingConfig + '\n' + ciConfig;
        await fs.writeFile(ciPath, updatedConfig);
        console.log(`✅ Updated GitLab CI config: ${ciPath}`);
      }
    } catch (error) {
      console.warn(`⚠️ Could not update GitLab CI config: ${error.message}`);
    }
  }

  generateGitLabCI() {
    return `
# Documentation Pipeline Job
docs-pipeline:
  stage: test
  image: node:18
  rules:
    - changes:
        - docs/**/*
        - modules/*/README.md
        - modules/*/openapi.yaml
        - modules/*/mcp.json
        - "*.md"
    - if: $CI_PIPELINE_SOURCE == "web"
  script:
    - npm ci
    - node scripts/ci-cd-integration.mjs gitlab-ci --trigger documentation-update
  artifacts:
    reports:
      junit: .pipeline-results/junit.xml
    paths:
      - docs/
      - .pipeline-results/
    expire_in: 1 week
  cache:
    paths:
      - node_modules/
`;
  }

  /**
   * Jenkins integration
   */
  extractJenkinsContext() {
    return {
      platform: 'jenkins',
      buildNumber: process.env.BUILD_NUMBER,
      buildId: process.env.BUILD_ID,
      jobName: process.env.JOB_NAME,
      workspace: process.env.WORKSPACE,
      jenkinsUrl: process.env.JENKINS_URL,
      gitCommit: process.env.GIT_COMMIT,
      gitBranch: process.env.GIT_BRANCH,
      buildUrl: process.env.BUILD_URL
    };
  }

  async setupJenkinsHooks(context) {
    console.log('🔧 Setting up Jenkins hooks...');

    const jenkinsfile = this.generateJenkinsfile();
    const jenkinsfilePath = 'Jenkinsfile.docs';
    
    try {
      await fs.writeFile(jenkinsfilePath, jenkinsfile);
      console.log(`✅ Created Jenkinsfile: ${jenkinsfilePath}`);
    } catch (error) {
      console.warn(`⚠️ Could not create Jenkinsfile: ${error.message}`);
    }
  }

  generateJenkinsfile() {
    return `pipeline {
    agent any
    
    triggers {
        pollSCM('H/5 * * * *')
    }
    
    stages {
        stage('Setup') {
            steps {
                nodejs('NodeJS-18') {
                    sh 'npm ci'
                }
            }
        }
        
        stage('Documentation Pipeline') {
            when {
                anyOf {
                    changeset "docs/**"
                    changeset "modules/*/README.md"
                    changeset "modules/*/openapi.yaml"
                    changeset "modules/*/mcp.json"
                    changeset "*.md"
                }
            }
            steps {
                nodejs('NodeJS-18') {
                    sh 'node scripts/ci-cd-integration.mjs jenkins --trigger documentation-update'
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'docs/**, .pipeline-results/**', fingerprint: true
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: '.pipeline-results',
                        reportFiles: 'report.html',
                        reportName: 'Documentation Pipeline Report'
                    ])
                }
            }
        }
    }
    
    post {
        failure {
            emailext (
                subject: "Documentation Pipeline Failed: \${env.JOB_NAME} - \${env.BUILD_NUMBER}",
                body: "The documentation pipeline failed. Check the build logs for details.",
                to: "\${env.CHANGE_AUTHOR_EMAIL}"
            )
        }
    }
}`;
  }

  /**
   * Azure DevOps integration
   */
  extractAzureContext() {
    return {
      platform: 'azure-devops',
      buildId: process.env.BUILD_BUILDID,
      buildNumber: process.env.BUILD_BUILDNUMBER,
      sourceBranch: process.env.BUILD_SOURCEBRANCH,
      sourceVersion: process.env.BUILD_SOURCEVERSION,
      requestedFor: process.env.BUILD_REQUESTEDFOR,
      repository: process.env.BUILD_REPOSITORY_NAME,
      workspace: process.env.AGENT_BUILDDIRECTORY
    };
  }

  async setupAzureHooks(context) {
    console.log('🔧 Setting up Azure DevOps hooks...');

    const azurePipeline = this.generateAzurePipeline();
    const pipelinePath = 'azure-pipelines-docs.yml';
    
    try {
      await fs.writeFile(pipelinePath, azurePipeline);
      console.log(`✅ Created Azure pipeline: ${pipelinePath}`);
    } catch (error) {
      console.warn(`⚠️ Could not create Azure pipeline: ${error.message}`);
    }
  }

  generateAzurePipeline() {
    return `trigger:
  branches:
    include:
      - main
      - develop
  paths:
    include:
      - docs/*
      - modules/*/README.md
      - modules/*/openapi.yaml
      - modules/*/mcp.json
      - "*.md"

pr:
  branches:
    include:
      - main
  paths:
    include:
      - docs/*
      - modules/*/README.md
      - modules/*/openapi.yaml
      - modules/*/mcp.json
      - "*.md"

pool:
  vmImage: 'ubuntu-latest'

variables:
  nodeVersion: '18.x'

stages:
- stage: DocumentationPipeline
  displayName: 'Documentation Pipeline'
  jobs:
  - job: RunPipeline
    displayName: 'Run Documentation Pipeline'
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: '\$(nodeVersion)'
      displayName: 'Install Node.js'
    
    - script: npm ci
      displayName: 'Install dependencies'
    
    - script: node scripts/ci-cd-integration.mjs azure-devops --trigger documentation-update
      displayName: 'Run documentation pipeline'
    
    - task: PublishTestResults@2
      condition: always()
      inputs:
        testResultsFormat: 'JUnit'
        testResultsFiles: '.pipeline-results/junit.xml'
        testRunTitle: 'Documentation Pipeline Tests'
    
    - task: PublishBuildArtifacts@1
      condition: always()
      inputs:
        pathToPublish: 'docs'
        artifactName: 'documentation'
    
    - task: PublishBuildArtifacts@1
      condition: always()
      inputs:
        pathToPublish: '.pipeline-results'
        artifactName: 'pipeline-results'
`;
  }

  /**
   * Generic CI integration
   */
  extractGenericContext() {
    return {
      platform: 'generic',
      ci: process.env.CI,
      buildNumber: process.env.BUILD_NUMBER || process.env.CI_BUILD_NUMBER,
      workspace: process.env.WORKSPACE || process.cwd(),
      gitCommit: process.env.GIT_COMMIT || process.env.CI_COMMIT_SHA,
      gitBranch: process.env.GIT_BRANCH || process.env.CI_BRANCH
    };
  }

  async setupGenericHooks(context) {
    console.log('🔧 Setting up generic CI hooks...');
    
    // Create a generic CI script
    const ciScript = this.generateGenericCIScript();
    const scriptPath = 'scripts/ci-docs-pipeline.sh';
    
    try {
      await fs.writeFile(scriptPath, ciScript);
      await fs.chmod(scriptPath, '755');
      console.log(`✅ Created CI script: ${scriptPath}`);
    } catch (error) {
      console.warn(`⚠️ Could not create CI script: ${error.message}`);
    }
  }

  generateGenericCIScript() {
    return `#!/bin/bash
# Generic CI Documentation Pipeline Script

set -e

echo "🚀 Starting documentation pipeline in CI environment"

# Check if this is a documentation-related change
if git diff --name-only HEAD~1 HEAD | grep -E "(docs/|README\\.md|openapi\\.yaml|mcp\\.json)" > /dev/null; then
    echo "📝 Documentation changes detected"
    
    # Install dependencies if needed
    if [ -f "package.json" ]; then
        npm ci
    fi
    
    # Run the documentation pipeline
    node scripts/ci-cd-integration.mjs generic --trigger documentation-update
    
    echo "✅ Documentation pipeline completed"
else
    echo "ℹ️ No documentation changes detected, skipping pipeline"
fi
`;
  }

  /**
   * Execute pipeline in CI/CD context
   */
  async executePipelineInCI(platform, args) {
    console.log(`🚀 Executing documentation pipeline in ${platform} environment`);

    const integration = this.integrations.get(platform);
    if (!integration) {
      throw new Error(`Unknown CI/CD platform: ${platform}`);
    }

    const context = await integration.extractContext();
    
    // Add CLI arguments to context
    if (args.trigger) context.trigger = args.trigger;
    if (args.module) context.module = args.module;
    if (args.version) context.version = args.version;
    if (args.files) context.files = args.files.split(',');

    // Determine trigger type based on CI context
    if (!context.trigger) {
      if (context.eventName === 'release' || context.sourceBranch?.includes('release')) {
        context.trigger = 'module-release';
      } else {
        context.trigger = 'documentation-update';
      }
    }

    try {
      const result = await this.pipeline.executePipeline(context);
      
      // Create CI-specific artifacts
      await this.createCIArtifacts(result, context, platform);
      
      console.log('✅ Pipeline execution completed successfully in CI environment');
      return result;
    } catch (error) {
      // Create failure artifacts
      await this.createFailureArtifacts(error, context, platform);
      throw error;
    }
  }

  async createCIArtifacts(result, context, platform) {
    await fs.mkdir('.pipeline-results', { recursive: true });

    // Create JUnit XML for test reporting
    const junitXml = this.generateJUnitXML(result);
    await fs.writeFile('.pipeline-results/junit.xml', junitXml);

    // Create HTML report
    const htmlReport = this.generateHTMLReport(result, context);
    await fs.writeFile('.pipeline-results/report.html', htmlReport);

    // Create JSON summary
    const jsonSummary = {
      success: true,
      pipelineId: result.pipelineId,
      executionTime: result.executionTime,
      platform,
      context,
      result
    };
    await fs.writeFile('.pipeline-results/summary.json', JSON.stringify(jsonSummary, null, 2));

    console.log('📊 Created CI artifacts in .pipeline-results/');
  }

  async createFailureArtifacts(error, context, platform) {
    await fs.mkdir('.pipeline-results', { recursive: true });

    // Create failure summary
    const failureSummary = {
      success: false,
      error: error.message,
      platform,
      context,
      timestamp: new Date().toISOString()
    };
    await fs.writeFile('.pipeline-results/summary.json', JSON.stringify(failureSummary, null, 2));

    // Create failure report
    const failureReport = `# Documentation Pipeline Failure

**Platform**: ${platform}
**Error**: ${error.message}
**Timestamp**: ${new Date().toISOString()}

## Context
\`\`\`json
${JSON.stringify(context, null, 2)}
\`\`\`

## Stack Trace
\`\`\`
${error.stack}
\`\`\`
`;
    await fs.writeFile('.pipeline-results/failure-report.md', failureReport);

    console.log('📊 Created failure artifacts in .pipeline-results/');
  }

  generateJUnitXML(result) {
    const steps = result.evaluation?.layers || [];
    const testCases = steps.map(step => {
      const success = step.verdict === 'ALLOW';
      return `    <testcase name="${step.name}" time="${step.executionTime / 1000}" classname="DocumentationPipeline">
      ${success ? '' : `<failure message="${step.verdict}">Step failed with verdict: ${step.verdict}</failure>`}
    </testcase>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="DocumentationPipeline" tests="${steps.length}" failures="${steps.filter(s => s.verdict !== 'ALLOW').length}" time="${result.executionTime / 1000}">
${testCases}
</testsuite>`;
  }

  generateHTMLReport(result, context) {
    const steps = result.evaluation?.layers || [];
    const stepRows = steps.map(step => {
      const status = step.verdict === 'ALLOW' ? '✅ Success' : 
                    step.verdict === 'WARN' ? '⚠️ Warning' : '❌ Failed';
      return `    <tr>
      <td>${step.name}</td>
      <td>${status}</td>
      <td>${step.executionTime}ms</td>
      <td>${(step.confidence * 100).toFixed(1)}%</td>
    </tr>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html>
<head>
    <title>Documentation Pipeline Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📚 Documentation Pipeline Report</h1>
        <p><strong>Pipeline ID:</strong> ${result.pipelineId}</p>
        <p><strong>Execution Time:</strong> ${result.executionTime}ms</p>
        <p><strong>Platform:</strong> ${context.platform}</p>
        <p><strong>Status:</strong> <span class="success">✅ Success</span></p>
    </div>
    
    <h2>📋 Step Results</h2>
    <table>
        <thead>
            <tr>
                <th>Step</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Confidence</th>
            </tr>
        </thead>
        <tbody>
${stepRows}
        </tbody>
    </table>
    
    <h2>📊 Context</h2>
    <pre>${JSON.stringify(context, null, 2)}</pre>
</body>
</html>`;
  }
}

// CLI execution
async function main() {
  const integration = new CICDIntegration();
  
  const platform = process.argv[2];
  const args = {};

  // Parse command line arguments
  for (let i = 3; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--')) {
      const key = arg.substring(2);
      const value = process.argv[i + 1];
      
      if (value && !value.startsWith('--')) {
        args[key] = value;
        i++; // Skip the value in next iteration
      } else {
        args[key] = true; // Flag without value
      }
    }
  }

  if (!platform) {
    // Auto-detect environment
    const detected = await integration.autoSetup();
    console.log(`🔧 Auto-detected ${detected.name}, executing pipeline...`);
    
    try {
      await integration.executePipelineInCI(detected.platform, args);
      console.log('✅ CI/CD integration completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ CI/CD integration failed:', error.message);
      process.exit(1);
    }
  } else {
    // Use specified platform
    try {
      await integration.executePipelineInCI(platform, args);
      console.log('✅ CI/CD integration completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ CI/CD integration failed:', error.message);
      process.exit(1);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ CI/CD integration failed:', error);
    process.exit(1);
  });
}

export default CICDIntegration;