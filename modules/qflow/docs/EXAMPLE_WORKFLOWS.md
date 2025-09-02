# Qflow Example Workflows

This document provides a comprehensive collection of example workflows demonstrating various Qflow patterns, integrations, and use cases.

## Table of Contents

1. [Basic Examples](#basic-examples)
2. [API Integration Examples](#api-integration-examples)
3. [Data Processing Examples](#data-processing-examples)
4. [Notification Examples](#notification-examples)
5. [E-commerce Examples](#e-commerce-examples)
6. [DevOps Examples](#devops-examples)
7. [Business Process Examples](#business-process-examples)
8. [Advanced Patterns](#advanced-patterns)

## Basic Examples

### 1. Simple HTTP Request

**Use Case**: Make a basic HTTP request and log the response

```yaml
id: "simple-http-request"
name: "Simple HTTP Request Example"
version: "1.0.0"
owner: "your-squid-identity"
description: "Demonstrates basic HTTP request functionality"

steps:
  - id: "make-request"
    type: "task"
    action: "qflow.action.http"
    params:
      method: "GET"
      url: "https://httpbin.org/json"
      headers:
        Accept: "application/json"
        User-Agent: "Qflow/1.0"
    onSuccess: "log-response"
    onFailure: "handle-error"
  
  - id: "log-response"
    type: "task"
    action: "qflow.action.log"
    params:
      message: "Response received: ${JSON.stringify(data.response.data)}"
      level: "info"
    onSuccess: "complete"
  
  - id: "handle-error"
    type: "task"
    action: "qflow.action.log"
    params:
      message: "Request failed: ${error.message}"
      level: "error"
    onSuccess: "complete"
  
  - id: "complete"
    type: "task"
    action: "qflow.action.complete"
    params:
      status: "success"

metadata:
  tags: ["basic", "http", "example"]
  category: "tutorial"
  visibility: "public"
```

### 2. Conditional Logic

**Use Case**: Execute different actions based on conditions

```yaml
id: "conditional-logic-example"
name: "Conditional Logic Example"
version: "1.0.0"
owner: "your-squid-identity"
description: "Demonstrates conditional execution patterns"

steps:
  - id: "get-random-number"
    type: "task"
    action: "qflow.action.http"
    params:
      method: "GET"
      url: "https://httpbin.org/uuid"
    onSuccess: "check-number"
  
  - id: "check-number"
    type: "task"
    action: "qflow.action.function"
    params:
      code: |
        const uuid = input.response.data.uuid;
        const hash = uuid.split('-')[0];
        const number = parseInt(hash.substring(0, 2), 16);
        return { number, isEven: number % 2 === 0 };
    onSuccess: "branch-on-even"
  
  - id: "branch-on-even"
    type: "condition"
    action: "qflow.condition.if"
    params:
      condition: "${data.isEven}"
    onTrue: "handle-even"
    onFalse: "handle-odd"
  
  - id: "handle-even"
    type: "task"
    action: "qflow.action.log"
    params:
      message: "Number ${data.number} is even!"
      level: "info"
    onSuccess: "complete"
  
  - id: "handle-odd"
    type: "task"
    action: "qflow.action.log"
    params:
      message: "Number ${data.number} is odd!"
      level: "info"
    onSuccess: "complete"
  
  - id: "complete"
    type: "task"
    action: "qflow.action.complete"
    params:
      status: "success"

metadata:
  tags: ["conditional", "logic", "example"]
  category: "tutorial"
  visibility: "public"
```

---

*This document contains comprehensive workflow examples. For the complete collection, see the full documentation.*