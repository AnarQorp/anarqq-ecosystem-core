# Q Ecosystem Deployment Matrix

This document provides deployment configurations for all Q ecosystem modules across different environments.

## Environment Overview

| Environment | Purpose | Modules | Configuration |
|-------------|---------|---------|---------------|
| **Development** | Local development | All modules with mocks | Standalone mode |
| **Staging** | Integration testing | All modules with real services | Hybrid mode |
| **Production** | Live system | All modules with full integration | Integrated mode |

## Module Deployment Status

| Module | Development | Staging | Production | Docker | K8s | Serverless |
|--------|-------------|---------|------------|--------|-----|------------|
| dao | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| qchat | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| qdrive | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| qerberos | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| qindex | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| qlock | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| qmail | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| qmarket | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| qmask | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| qnet | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| qonsent | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| qpic | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| qwallet | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| squid | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |

## Deployment Configurations

### Development Environment

```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  dao:
    build: ./modules/dao
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DAO_MODE=standalone
      - LOG_LEVEL=debug
    volumes:
      - ./modules/dao:/app
      - /app/node_modules
  qchat:
    build: ./modules/qchat
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=development
      - QCHAT_MODE=standalone
      - LOG_LEVEL=debug
    volumes:
      - ./modules/qchat:/app
      - /app/node_modules
  qdrive:
    build: ./modules/qdrive
    ports:
      - "3002:3000"
    environment:
      - NODE_ENV=development
      - QDRIVE_MODE=standalone
      - LOG_LEVEL=debug
    volumes:
      - ./modules/qdrive:/app
      - /app/node_modules
  qerberos:
    build: ./modules/qerberos
    ports:
      - "3003:3000"
    environment:
      - NODE_ENV=development
      - QERBEROS_MODE=standalone
      - LOG_LEVEL=debug
    volumes:
      - ./modules/qerberos:/app
      - /app/node_modules
  qindex:
    build: ./modules/qindex
    ports:
      - "3004:3000"
    environment:
      - NODE_ENV=development
      - QINDEX_MODE=standalone
      - LOG_LEVEL=debug
    volumes:
      - ./modules/qindex:/app
      - /app/node_modules
  qlock:
    build: ./modules/qlock
    ports:
      - "3005:3000"
    environment:
      - NODE_ENV=development
      - QLOCK_MODE=standalone
      - LOG_LEVEL=debug
    volumes:
      - ./modules/qlock:/app
      - /app/node_modules
  qmail:
    build: ./modules/qmail
    ports:
      - "3006:3000"
    environment:
      - NODE_ENV=development
      - QMAIL_MODE=standalone
      - LOG_LEVEL=debug
    volumes:
      - ./modules/qmail:/app
      - /app/node_modules
  qmarket:
    build: ./modules/qmarket
    ports:
      - "3007:3000"
    environment:
      - NODE_ENV=development
      - QMARKET_MODE=standalone
      - LOG_LEVEL=debug
    volumes:
      - ./modules/qmarket:/app
      - /app/node_modules
  qmask:
    build: ./modules/qmask
    ports:
      - "3008:3000"
    environment:
      - NODE_ENV=development
      - QMASK_MODE=standalone
      - LOG_LEVEL=debug
    volumes:
      - ./modules/qmask:/app
      - /app/node_modules
  qnet:
    build: ./modules/qnet
    ports:
      - "3009:3000"
    environment:
      - NODE_ENV=development
      - QNET_MODE=standalone
      - LOG_LEVEL=debug
    volumes:
      - ./modules/qnet:/app
      - /app/node_modules
  qonsent:
    build: ./modules/qonsent
    ports:
      - "3010:3000"
    environment:
      - NODE_ENV=development
      - QONSENT_MODE=standalone
      - LOG_LEVEL=debug
    volumes:
      - ./modules/qonsent:/app
      - /app/node_modules
  qpic:
    build: ./modules/qpic
    ports:
      - "3011:3000"
    environment:
      - NODE_ENV=development
      - QPIC_MODE=standalone
      - LOG_LEVEL=debug
    volumes:
      - ./modules/qpic:/app
      - /app/node_modules
  qwallet:
    build: ./modules/qwallet
    ports:
      - "3012:3000"
    environment:
      - NODE_ENV=development
      - QWALLET_MODE=standalone
      - LOG_LEVEL=debug
    volumes:
      - ./modules/qwallet:/app
      - /app/node_modules
  squid:
    build: ./modules/squid
    ports:
      - "3013:3000"
    environment:
      - NODE_ENV=development
      - SQUID_MODE=standalone
      - LOG_LEVEL=debug
    volumes:
      - ./modules/squid:/app
      - /app/node_modules
```

### Staging Environment

```yaml
# docker-compose.staging.yml
version: '3.8'
services:
  dao:
    image: dao:staging
    environment:
      - NODE_ENV=staging
      - DAO_MODE=hybrid
      - MOCK_SERVICES=${MOCK_SERVICES:-}
    depends_on:
      - squid
      - qonsent
      - qlock
  qchat:
    image: qchat:staging
    environment:
      - NODE_ENV=staging
      - QCHAT_MODE=hybrid
      - MOCK_SERVICES=${MOCK_SERVICES:-}
    depends_on:
      - squid
      - qonsent
      - qlock
  qdrive:
    image: qdrive:staging
    environment:
      - NODE_ENV=staging
      - QDRIVE_MODE=hybrid
      - MOCK_SERVICES=${MOCK_SERVICES:-}
    depends_on:
      - squid
      - qonsent
      - qlock
  qerberos:
    image: qerberos:staging
    environment:
      - NODE_ENV=staging
      - QERBEROS_MODE=hybrid
      - MOCK_SERVICES=${MOCK_SERVICES:-}
    depends_on:
      - squid
      - qonsent
      - qlock
  qindex:
    image: qindex:staging
    environment:
      - NODE_ENV=staging
      - QINDEX_MODE=hybrid
      - MOCK_SERVICES=${MOCK_SERVICES:-}
    depends_on:
      - squid
      - qonsent
      - qlock
  qlock:
    image: qlock:staging
    environment:
      - NODE_ENV=staging
      - QLOCK_MODE=hybrid
      - MOCK_SERVICES=${MOCK_SERVICES:-}
    depends_on:
      - squid
      - qonsent
      - qlock
  qmail:
    image: qmail:staging
    environment:
      - NODE_ENV=staging
      - QMAIL_MODE=hybrid
      - MOCK_SERVICES=${MOCK_SERVICES:-}
    depends_on:
      - squid
      - qonsent
      - qlock
  qmarket:
    image: qmarket:staging
    environment:
      - NODE_ENV=staging
      - QMARKET_MODE=hybrid
      - MOCK_SERVICES=${MOCK_SERVICES:-}
    depends_on:
      - squid
      - qonsent
      - qlock
  qmask:
    image: qmask:staging
    environment:
      - NODE_ENV=staging
      - QMASK_MODE=hybrid
      - MOCK_SERVICES=${MOCK_SERVICES:-}
    depends_on:
      - squid
      - qonsent
      - qlock
  qnet:
    image: qnet:staging
    environment:
      - NODE_ENV=staging
      - QNET_MODE=hybrid
      - MOCK_SERVICES=${MOCK_SERVICES:-}
    depends_on:
      - squid
      - qonsent
      - qlock
  qonsent:
    image: qonsent:staging
    environment:
      - NODE_ENV=staging
      - QONSENT_MODE=hybrid
      - MOCK_SERVICES=${MOCK_SERVICES:-}
    depends_on:
      - squid
      - qonsent
      - qlock
  qpic:
    image: qpic:staging
    environment:
      - NODE_ENV=staging
      - QPIC_MODE=hybrid
      - MOCK_SERVICES=${MOCK_SERVICES:-}
    depends_on:
      - squid
      - qonsent
      - qlock
  qwallet:
    image: qwallet:staging
    environment:
      - NODE_ENV=staging
      - QWALLET_MODE=hybrid
      - MOCK_SERVICES=${MOCK_SERVICES:-}
    depends_on:
      - squid
      - qonsent
      - qlock
  squid:
    image: squid:staging
    environment:
      - NODE_ENV=staging
      - SQUID_MODE=hybrid
      - MOCK_SERVICES=${MOCK_SERVICES:-}
    depends_on:
      - squid
      - qonsent
      - qlock
```

### Production Environment

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  dao:
    image: dao:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    environment:
      - NODE_ENV=production
      - DAO_MODE=integrated
    networks:
      - q-network
  qchat:
    image: qchat:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    environment:
      - NODE_ENV=production
      - QCHAT_MODE=integrated
    networks:
      - q-network
  qdrive:
    image: qdrive:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    environment:
      - NODE_ENV=production
      - QDRIVE_MODE=integrated
    networks:
      - q-network
  qerberos:
    image: qerberos:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    environment:
      - NODE_ENV=production
      - QERBEROS_MODE=integrated
    networks:
      - q-network
  qindex:
    image: qindex:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    environment:
      - NODE_ENV=production
      - QINDEX_MODE=integrated
    networks:
      - q-network
  qlock:
    image: qlock:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    environment:
      - NODE_ENV=production
      - QLOCK_MODE=integrated
    networks:
      - q-network
  qmail:
    image: qmail:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    environment:
      - NODE_ENV=production
      - QMAIL_MODE=integrated
    networks:
      - q-network
  qmarket:
    image: qmarket:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    environment:
      - NODE_ENV=production
      - QMARKET_MODE=integrated
    networks:
      - q-network
  qmask:
    image: qmask:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    environment:
      - NODE_ENV=production
      - QMASK_MODE=integrated
    networks:
      - q-network
  qnet:
    image: qnet:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    environment:
      - NODE_ENV=production
      - QNET_MODE=integrated
    networks:
      - q-network
  qonsent:
    image: qonsent:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    environment:
      - NODE_ENV=production
      - QONSENT_MODE=integrated
    networks:
      - q-network
  qpic:
    image: qpic:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    environment:
      - NODE_ENV=production
      - QPIC_MODE=integrated
    networks:
      - q-network
  qwallet:
    image: qwallet:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    environment:
      - NODE_ENV=production
      - QWALLET_MODE=integrated
    networks:
      - q-network
  squid:
    image: squid:latest
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    environment:
      - NODE_ENV=production
      - SQUID_MODE=integrated
    networks:
      - q-network
```

## Kubernetes Deployments

### Namespace Configuration

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: q-ecosystem
  labels:
    name: q-ecosystem
```

### Module Deployment Template

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{MODULE_NAME}}
  namespace: q-ecosystem
spec:
  replicas: 3
  selector:
    matchLabels:
      app: {{MODULE_NAME}}
  template:
    metadata:
      labels:
        app: {{MODULE_NAME}}
    spec:
      containers:
      - name: {{MODULE_NAME}}
        image: {{MODULE_NAME}}:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: {{MODULE_NAME}}_MODE
          value: "integrated"
        resources:
          limits:
            memory: "512Mi"
            cpu: "500m"
          requests:
            memory: "256Mi"
            cpu: "250m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: {{MODULE_NAME}}-service
  namespace: q-ecosystem
spec:
  selector:
    app: {{MODULE_NAME}}
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

## Serverless Deployments

### AWS Lambda Configuration

```yaml
# serverless.yml
service: q-ecosystem-{{MODULE_NAME}}

provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1
  environment:
    NODE_ENV: production
    {{MODULE_NAME}}_MODE: serverless

functions:
  {{MODULE_NAME}}:
    handler: src/lambda.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true
    timeout: 30
    memorySize: 512
    reservedConcurrency: 100
```

### Vercel Configuration

```json
{
  "name": "q-ecosystem-{{MODULE_NAME}}",
  "version": 2,
  "builds": [
    {
      "src": "src/vercel.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/src/vercel.js"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "{{MODULE_NAME}}_MODE": "serverless"
  }
}
```

## Infrastructure as Code

### Terraform Configuration

```hcl
# main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ECS Cluster
resource "aws_ecs_cluster" "q_ecosystem" {
  name = "q-ecosystem"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Module services

resource "aws_ecs_service" "dao" {
  name            = "dao"
  cluster         = aws_ecs_cluster.q_ecosystem.id
  task_definition = aws_ecs_task_definition.dao.arn
  desired_count   = 3
  
  load_balancer {
    target_group_arn = aws_lb_target_group.dao.arn
    container_name   = "dao"
    container_port   = 3000
  }
}

resource "aws_ecs_task_definition" "dao" {
  family                   = "dao"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  
  container_definitions = jsonencode([
    {
      name  = "dao"
      image = "dao:latest"
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "DAO_MODE"
          value = "integrated"
        }
      ]
    }
  ])
}
resource "aws_ecs_service" "qchat" {
  name            = "qchat"
  cluster         = aws_ecs_cluster.q_ecosystem.id
  task_definition = aws_ecs_task_definition.qchat.arn
  desired_count   = 3
  
  load_balancer {
    target_group_arn = aws_lb_target_group.qchat.arn
    container_name   = "qchat"
    container_port   = 3000
  }
}

resource "aws_ecs_task_definition" "qchat" {
  family                   = "qchat"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  
  container_definitions = jsonencode([
    {
      name  = "qchat"
      image = "qchat:latest"
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "QCHAT_MODE"
          value = "integrated"
        }
      ]
    }
  ])
}
resource "aws_ecs_service" "qdrive" {
  name            = "qdrive"
  cluster         = aws_ecs_cluster.q_ecosystem.id
  task_definition = aws_ecs_task_definition.qdrive.arn
  desired_count   = 3
  
  load_balancer {
    target_group_arn = aws_lb_target_group.qdrive.arn
    container_name   = "qdrive"
    container_port   = 3000
  }
}

resource "aws_ecs_task_definition" "qdrive" {
  family                   = "qdrive"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  
  container_definitions = jsonencode([
    {
      name  = "qdrive"
      image = "qdrive:latest"
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "QDRIVE_MODE"
          value = "integrated"
        }
      ]
    }
  ])
}
resource "aws_ecs_service" "qerberos" {
  name            = "qerberos"
  cluster         = aws_ecs_cluster.q_ecosystem.id
  task_definition = aws_ecs_task_definition.qerberos.arn
  desired_count   = 3
  
  load_balancer {
    target_group_arn = aws_lb_target_group.qerberos.arn
    container_name   = "qerberos"
    container_port   = 3000
  }
}

resource "aws_ecs_task_definition" "qerberos" {
  family                   = "qerberos"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  
  container_definitions = jsonencode([
    {
      name  = "qerberos"
      image = "qerberos:latest"
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "QERBEROS_MODE"
          value = "integrated"
        }
      ]
    }
  ])
}
resource "aws_ecs_service" "qindex" {
  name            = "qindex"
  cluster         = aws_ecs_cluster.q_ecosystem.id
  task_definition = aws_ecs_task_definition.qindex.arn
  desired_count   = 3
  
  load_balancer {
    target_group_arn = aws_lb_target_group.qindex.arn
    container_name   = "qindex"
    container_port   = 3000
  }
}

resource "aws_ecs_task_definition" "qindex" {
  family                   = "qindex"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  
  container_definitions = jsonencode([
    {
      name  = "qindex"
      image = "qindex:latest"
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "QINDEX_MODE"
          value = "integrated"
        }
      ]
    }
  ])
}
resource "aws_ecs_service" "qlock" {
  name            = "qlock"
  cluster         = aws_ecs_cluster.q_ecosystem.id
  task_definition = aws_ecs_task_definition.qlock.arn
  desired_count   = 3
  
  load_balancer {
    target_group_arn = aws_lb_target_group.qlock.arn
    container_name   = "qlock"
    container_port   = 3000
  }
}

resource "aws_ecs_task_definition" "qlock" {
  family                   = "qlock"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  
  container_definitions = jsonencode([
    {
      name  = "qlock"
      image = "qlock:latest"
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "QLOCK_MODE"
          value = "integrated"
        }
      ]
    }
  ])
}
resource "aws_ecs_service" "qmail" {
  name            = "qmail"
  cluster         = aws_ecs_cluster.q_ecosystem.id
  task_definition = aws_ecs_task_definition.qmail.arn
  desired_count   = 3
  
  load_balancer {
    target_group_arn = aws_lb_target_group.qmail.arn
    container_name   = "qmail"
    container_port   = 3000
  }
}

resource "aws_ecs_task_definition" "qmail" {
  family                   = "qmail"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  
  container_definitions = jsonencode([
    {
      name  = "qmail"
      image = "qmail:latest"
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "QMAIL_MODE"
          value = "integrated"
        }
      ]
    }
  ])
}
resource "aws_ecs_service" "qmarket" {
  name            = "qmarket"
  cluster         = aws_ecs_cluster.q_ecosystem.id
  task_definition = aws_ecs_task_definition.qmarket.arn
  desired_count   = 3
  
  load_balancer {
    target_group_arn = aws_lb_target_group.qmarket.arn
    container_name   = "qmarket"
    container_port   = 3000
  }
}

resource "aws_ecs_task_definition" "qmarket" {
  family                   = "qmarket"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  
  container_definitions = jsonencode([
    {
      name  = "qmarket"
      image = "qmarket:latest"
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "QMARKET_MODE"
          value = "integrated"
        }
      ]
    }
  ])
}
resource "aws_ecs_service" "qmask" {
  name            = "qmask"
  cluster         = aws_ecs_cluster.q_ecosystem.id
  task_definition = aws_ecs_task_definition.qmask.arn
  desired_count   = 3
  
  load_balancer {
    target_group_arn = aws_lb_target_group.qmask.arn
    container_name   = "qmask"
    container_port   = 3000
  }
}

resource "aws_ecs_task_definition" "qmask" {
  family                   = "qmask"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  
  container_definitions = jsonencode([
    {
      name  = "qmask"
      image = "qmask:latest"
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "QMASK_MODE"
          value = "integrated"
        }
      ]
    }
  ])
}
resource "aws_ecs_service" "qnet" {
  name            = "qnet"
  cluster         = aws_ecs_cluster.q_ecosystem.id
  task_definition = aws_ecs_task_definition.qnet.arn
  desired_count   = 3
  
  load_balancer {
    target_group_arn = aws_lb_target_group.qnet.arn
    container_name   = "qnet"
    container_port   = 3000
  }
}

resource "aws_ecs_task_definition" "qnet" {
  family                   = "qnet"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  
  container_definitions = jsonencode([
    {
      name  = "qnet"
      image = "qnet:latest"
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "QNET_MODE"
          value = "integrated"
        }
      ]
    }
  ])
}
resource "aws_ecs_service" "qonsent" {
  name            = "qonsent"
  cluster         = aws_ecs_cluster.q_ecosystem.id
  task_definition = aws_ecs_task_definition.qonsent.arn
  desired_count   = 3
  
  load_balancer {
    target_group_arn = aws_lb_target_group.qonsent.arn
    container_name   = "qonsent"
    container_port   = 3000
  }
}

resource "aws_ecs_task_definition" "qonsent" {
  family                   = "qonsent"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  
  container_definitions = jsonencode([
    {
      name  = "qonsent"
      image = "qonsent:latest"
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "QONSENT_MODE"
          value = "integrated"
        }
      ]
    }
  ])
}
resource "aws_ecs_service" "qpic" {
  name            = "qpic"
  cluster         = aws_ecs_cluster.q_ecosystem.id
  task_definition = aws_ecs_task_definition.qpic.arn
  desired_count   = 3
  
  load_balancer {
    target_group_arn = aws_lb_target_group.qpic.arn
    container_name   = "qpic"
    container_port   = 3000
  }
}

resource "aws_ecs_task_definition" "qpic" {
  family                   = "qpic"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  
  container_definitions = jsonencode([
    {
      name  = "qpic"
      image = "qpic:latest"
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "QPIC_MODE"
          value = "integrated"
        }
      ]
    }
  ])
}
resource "aws_ecs_service" "qwallet" {
  name            = "qwallet"
  cluster         = aws_ecs_cluster.q_ecosystem.id
  task_definition = aws_ecs_task_definition.qwallet.arn
  desired_count   = 3
  
  load_balancer {
    target_group_arn = aws_lb_target_group.qwallet.arn
    container_name   = "qwallet"
    container_port   = 3000
  }
}

resource "aws_ecs_task_definition" "qwallet" {
  family                   = "qwallet"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  
  container_definitions = jsonencode([
    {
      name  = "qwallet"
      image = "qwallet:latest"
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "QWALLET_MODE"
          value = "integrated"
        }
      ]
    }
  ])
}
resource "aws_ecs_service" "squid" {
  name            = "squid"
  cluster         = aws_ecs_cluster.q_ecosystem.id
  task_definition = aws_ecs_task_definition.squid.arn
  desired_count   = 3
  
  load_balancer {
    target_group_arn = aws_lb_target_group.squid.arn
    container_name   = "squid"
    container_port   = 3000
  }
}

resource "aws_ecs_task_definition" "squid" {
  family                   = "squid"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  
  container_definitions = jsonencode([
    {
      name  = "squid"
      image = "squid:latest"
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "SQUID_MODE"
          value = "integrated"
        }
      ]
    }
  ])
}
```

## Monitoring and Observability

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'dao'
    static_configs:
      - targets: ['dao:3000']
    metrics_path: /metrics
    scrape_interval: 30s
  - job_name: 'qchat'
    static_configs:
      - targets: ['qchat:3000']
    metrics_path: /metrics
    scrape_interval: 30s
  - job_name: 'qdrive'
    static_configs:
      - targets: ['qdrive:3000']
    metrics_path: /metrics
    scrape_interval: 30s
  - job_name: 'qerberos'
    static_configs:
      - targets: ['qerberos:3000']
    metrics_path: /metrics
    scrape_interval: 30s
  - job_name: 'qindex'
    static_configs:
      - targets: ['qindex:3000']
    metrics_path: /metrics
    scrape_interval: 30s
  - job_name: 'qlock'
    static_configs:
      - targets: ['qlock:3000']
    metrics_path: /metrics
    scrape_interval: 30s
  - job_name: 'qmail'
    static_configs:
      - targets: ['qmail:3000']
    metrics_path: /metrics
    scrape_interval: 30s
  - job_name: 'qmarket'
    static_configs:
      - targets: ['qmarket:3000']
    metrics_path: /metrics
    scrape_interval: 30s
  - job_name: 'qmask'
    static_configs:
      - targets: ['qmask:3000']
    metrics_path: /metrics
    scrape_interval: 30s
  - job_name: 'qnet'
    static_configs:
      - targets: ['qnet:3000']
    metrics_path: /metrics
    scrape_interval: 30s
  - job_name: 'qonsent'
    static_configs:
      - targets: ['qonsent:3000']
    metrics_path: /metrics
    scrape_interval: 30s
  - job_name: 'qpic'
    static_configs:
      - targets: ['qpic:3000']
    metrics_path: /metrics
    scrape_interval: 30s
  - job_name: 'qwallet'
    static_configs:
      - targets: ['qwallet:3000']
    metrics_path: /metrics
    scrape_interval: 30s
  - job_name: 'squid'
    static_configs:
      - targets: ['squid:3000']
    metrics_path: /metrics
    scrape_interval: 30s
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Q Ecosystem Overview",
    "panels": [
      {
        "id": 1,
        "title": "dao Metrics",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job='dao'}[5m])",
            "legendFormat": "Request Rate"
          }
        ]
      },
      {
        "id": 2,
        "title": "qchat Metrics",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job='qchat'}[5m])",
            "legendFormat": "Request Rate"
          }
        ]
      },
      {
        "id": 3,
        "title": "qdrive Metrics",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job='qdrive'}[5m])",
            "legendFormat": "Request Rate"
          }
        ]
      },
      {
        "id": 4,
        "title": "qerberos Metrics",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job='qerberos'}[5m])",
            "legendFormat": "Request Rate"
          }
        ]
      },
      {
        "id": 5,
        "title": "qindex Metrics",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job='qindex'}[5m])",
            "legendFormat": "Request Rate"
          }
        ]
      },
      {
        "id": 6,
        "title": "qlock Metrics",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job='qlock'}[5m])",
            "legendFormat": "Request Rate"
          }
        ]
      },
      {
        "id": 7,
        "title": "qmail Metrics",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job='qmail'}[5m])",
            "legendFormat": "Request Rate"
          }
        ]
      },
      {
        "id": 8,
        "title": "qmarket Metrics",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job='qmarket'}[5m])",
            "legendFormat": "Request Rate"
          }
        ]
      },
      {
        "id": 9,
        "title": "qmask Metrics",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job='qmask'}[5m])",
            "legendFormat": "Request Rate"
          }
        ]
      },
      {
        "id": 10,
        "title": "qnet Metrics",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job='qnet'}[5m])",
            "legendFormat": "Request Rate"
          }
        ]
      },
      {
        "id": 11,
        "title": "qonsent Metrics",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job='qonsent'}[5m])",
            "legendFormat": "Request Rate"
          }
        ]
      },
      {
        "id": 12,
        "title": "qpic Metrics",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job='qpic'}[5m])",
            "legendFormat": "Request Rate"
          }
        ]
      },
      {
        "id": 13,
        "title": "qwallet Metrics",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job='qwallet'}[5m])",
            "legendFormat": "Request Rate"
          }
        ]
      },
      {
        "id": 14,
        "title": "squid Metrics",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{job='squid'}[5m])",
            "legendFormat": "Request Rate"
          }
        ]
      }
    ]
  }
}
```

## Deployment Automation

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy Q Ecosystem

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        module: [dao, qchat, qdrive, qerberos, qindex, qlock, qmail, qmarket, qmask, qnet, qonsent, qpic, qwallet, squid]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Build ${{ matrix.module }}
      run: |
        cd modules/${{ matrix.module }}
        docker build -t ${{ matrix.module }}:latest .
    
    - name: Deploy ${{ matrix.module }}
      run: |
        kubectl apply -f k8s/${{ matrix.module }}.yaml
        kubectl rollout status deployment/${{ matrix.module }}
```

### Deployment Scripts

```bash
#!/bin/bash
# deploy-all.sh

set -e

echo "🚀 Deploying Q Ecosystem..."

# Build all modules
for module in dao qchat qdrive qerberos qindex qlock qmail qmarket qmask qnet qonsent qpic qwallet squid; do
  echo "Building $module..."
  cd modules/$module
  docker build -t $module:latest .
  cd ../..
done

# Deploy to Kubernetes
echo "Deploying to Kubernetes..."
kubectl apply -f k8s/namespace.yaml

for module in dao qchat qdrive qerberos qindex qlock qmail qmarket qmask qnet qonsent qpic qwallet squid; do
  echo "Deploying $module..."
  kubectl apply -f k8s/$module.yaml
  kubectl rollout status deployment/$module -n q-ecosystem
done

echo "✅ Deployment complete!"
```

## Rollback Procedures

### Kubernetes Rollback

```bash
# Rollback specific module
kubectl rollout undo deployment/MODULE_NAME -n q-ecosystem

# Rollback to specific revision
kubectl rollout undo deployment/MODULE_NAME --to-revision=2 -n q-ecosystem
```

### Docker Swarm Rollback

```bash
# Rollback service
docker service rollback q-ecosystem_MODULE_NAME
```

## Security Considerations

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: q-ecosystem-network-policy
  namespace: q-ecosystem
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: q-ecosystem
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: q-ecosystem
```

### Secrets Management

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: q-ecosystem-secrets
  namespace: q-ecosystem
type: Opaque
data:
  jwt-secret: <base64-encoded-secret>
  db-password: <base64-encoded-password>
```
