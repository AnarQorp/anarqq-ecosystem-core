# Qflow Production Deployment Makefile
# Provides convenient commands for building, testing, and deploying Qflow

.PHONY: help build test deploy clean docker-build docker-push k8s-deploy k8s-clean monitoring

# Default target
.DEFAULT_GOAL := help

# Variables
VERSION ?= latest
ENVIRONMENT ?= production
NAMESPACE ?= qflow
DOCKER_REGISTRY ?= 
IMAGE_NAME ?= qflow
FULL_IMAGE_NAME = $(if $(DOCKER_REGISTRY),$(DOCKER_REGISTRY)/$(IMAGE_NAME),$(IMAGE_NAME))

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)Qflow Deployment Commands$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Development commands
install: ## Install dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	npm ci

build: ## Build the application
	@echo "$(BLUE)Building application...$(NC)"
	npm run build

test: ## Run tests
	@echo "$(BLUE)Running tests...$(NC)"
	npm test

test-all: ## Run all tests including integration and security
	@echo "$(BLUE)Running all tests...$(NC)"
	npm run test:all

lint: ## Run linting
	@echo "$(BLUE)Running linter...$(NC)"
	npm run lint

lint-fix: ## Fix linting issues
	@echo "$(BLUE)Fixing linting issues...$(NC)"
	npm run lint:fix

centralization-check: ## Run centralization sentinel check
	@echo "$(BLUE)Running centralization check...$(NC)"
	npm run centralization-check

# Docker commands
docker-build: ## Build Docker image
	@echo "$(BLUE)Building Docker image: $(FULL_IMAGE_NAME):$(VERSION)$(NC)"
	docker build \
		--tag $(FULL_IMAGE_NAME):$(VERSION) \
		--tag $(FULL_IMAGE_NAME):latest \
		--build-arg VERSION=$(VERSION) \
		--build-arg BUILD_NUMBER=$(shell date +%Y%m%d%H%M%S) \
		--build-arg GIT_COMMIT=$(shell git rev-parse --short HEAD 2>/dev/null || echo 'unknown') \
		.

docker-push: docker-build ## Build and push Docker image
	@if [ -z "$(DOCKER_REGISTRY)" ]; then \
		echo "$(RED)Error: DOCKER_REGISTRY not set$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)Pushing Docker image: $(FULL_IMAGE_NAME):$(VERSION)$(NC)"
	docker push $(FULL_IMAGE_NAME):$(VERSION)
	docker push $(FULL_IMAGE_NAME):latest

docker-run: docker-build ## Build and run Docker container locally
	@echo "$(BLUE)Running Docker container...$(NC)"
	docker run -d \
		--name qflow-local \
		-p 8080:8080 \
		-p 4001:4001 \
		-p 9090:9090 \
		--env-file config/development.env \
		$(FULL_IMAGE_NAME):$(VERSION)

docker-stop: ## Stop local Docker container
	@echo "$(BLUE)Stopping Docker container...$(NC)"
	docker stop qflow-local || true
	docker rm qflow-local || true

# Docker Compose commands
compose-up: ## Start services with Docker Compose
	@echo "$(BLUE)Starting services with Docker Compose...$(NC)"
	docker-compose up -d

compose-up-prod: ## Start services with production configuration
	@echo "$(BLUE)Starting services with production configuration...$(NC)"
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

compose-down: ## Stop Docker Compose services
	@echo "$(BLUE)Stopping Docker Compose services...$(NC)"
	docker-compose down

compose-logs: ## View Docker Compose logs
	@echo "$(BLUE)Viewing Docker Compose logs...$(NC)"
	docker-compose logs -f

compose-monitoring: ## Start with monitoring stack
	@echo "$(BLUE)Starting services with monitoring...$(NC)"
	docker-compose --profile monitoring up -d

# Kubernetes commands
k8s-namespace: ## Create Kubernetes namespace
	@echo "$(BLUE)Creating namespace: $(NAMESPACE)$(NC)"
	kubectl apply -f k8s/namespace.yaml

k8s-secrets: ## Apply Kubernetes secrets
	@echo "$(BLUE)Applying secrets...$(NC)"
	kubectl apply -f k8s/secret.yaml

k8s-config: ## Apply Kubernetes configuration
	@echo "$(BLUE)Applying configuration...$(NC)"
	kubectl apply -f k8s/configmap.yaml
	kubectl apply -f k8s/rbac.yaml

k8s-storage: ## Apply storage configuration
	@echo "$(BLUE)Applying storage configuration...$(NC)"
	kubectl apply -f k8s/pvc.yaml

k8s-infrastructure: k8s-namespace k8s-config k8s-storage ## Deploy infrastructure components
	@echo "$(BLUE)Deploying infrastructure...$(NC)"
	kubectl apply -f k8s/redis-deployment.yaml
	kubectl apply -f k8s/ipfs-deployment.yaml
	@echo "$(YELLOW)Waiting for infrastructure to be ready...$(NC)"
	kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=qflow-redis -n $(NAMESPACE) --timeout=300s
	kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=qflow-ipfs -n $(NAMESPACE) --timeout=300s

k8s-app: k8s-secrets ## Deploy application
	@echo "$(BLUE)Deploying application...$(NC)"
	kubectl apply -f k8s/deployment.yaml
	kubectl apply -f k8s/service.yaml
	kubectl apply -f k8s/ingress.yaml
	kubectl apply -f k8s/hpa.yaml
	kubectl apply -f k8s/pdb.yaml
	kubectl apply -f k8s/network-policy.yaml

k8s-monitoring: ## Deploy monitoring stack
	@echo "$(BLUE)Deploying monitoring...$(NC)"
	kubectl apply -f k8s/monitoring.yaml

k8s-deploy: k8s-infrastructure k8s-app k8s-monitoring ## Full Kubernetes deployment
	@echo "$(GREEN)Kubernetes deployment completed!$(NC)"
	@echo "$(BLUE)Waiting for deployment to be ready...$(NC)"
	kubectl rollout status deployment/qflow -n $(NAMESPACE) --timeout=600s
	@echo "$(GREEN)Deployment is ready!$(NC)"

k8s-status: ## Check Kubernetes deployment status
	@echo "$(BLUE)Checking deployment status...$(NC)"
	kubectl get pods -n $(NAMESPACE)
	kubectl get services -n $(NAMESPACE)
	kubectl get ingress -n $(NAMESPACE)

k8s-logs: ## View Kubernetes logs
	@echo "$(BLUE)Viewing application logs...$(NC)"
	kubectl logs -n $(NAMESPACE) -l app.kubernetes.io/name=qflow -f

k8s-describe: ## Describe Kubernetes resources
	@echo "$(BLUE)Describing deployment...$(NC)"
	kubectl describe deployment qflow -n $(NAMESPACE)

k8s-port-forward: ## Port forward to local machine
	@echo "$(BLUE)Port forwarding to localhost...$(NC)"
	@echo "$(YELLOW)API: http://localhost:8080$(NC)"
	@echo "$(YELLOW)WebSocket: ws://localhost:9090$(NC)"
	kubectl port-forward -n $(NAMESPACE) service/qflow-service 8080:8080 9090:9090

k8s-clean: ## Clean up Kubernetes resources
	@echo "$(BLUE)Cleaning up Kubernetes resources...$(NC)"
	kubectl delete -f k8s/ --ignore-not-found=true
	kubectl delete namespace $(NAMESPACE) --ignore-not-found=true

# Automated deployment
deploy: ## Deploy using automated script
	@echo "$(BLUE)Running automated deployment...$(NC)"
	./scripts/deploy.sh $(ENVIRONMENT) $(VERSION)

deploy-staging: ## Deploy to staging environment
	@echo "$(BLUE)Deploying to staging...$(NC)"
	$(MAKE) deploy ENVIRONMENT=staging

deploy-production: ## Deploy to production environment
	@echo "$(BLUE)Deploying to production...$(NC)"
	$(MAKE) deploy ENVIRONMENT=production

# Health and monitoring
health-check: ## Run health check
	@echo "$(BLUE)Running health check...$(NC)"
	@if command -v kubectl >/dev/null 2>&1 && kubectl get pods -n $(NAMESPACE) >/dev/null 2>&1; then \
		kubectl exec -n $(NAMESPACE) deployment/qflow -- curl -f http://localhost:8080/health; \
	else \
		curl -f http://localhost:8080/health; \
	fi

metrics: ## View metrics
	@echo "$(BLUE)Viewing metrics...$(NC)"
	@if command -v kubectl >/dev/null 2>&1 && kubectl get pods -n $(NAMESPACE) >/dev/null 2>&1; then \
		kubectl port-forward -n $(NAMESPACE) service/qflow-service 9090:9090 & \
		sleep 2; \
		curl http://localhost:9090/metrics; \
		pkill -f "kubectl port-forward"; \
	else \
		curl http://localhost:9090/metrics; \
	fi

# Maintenance
update: ## Update deployment with new image
	@echo "$(BLUE)Updating deployment with version: $(VERSION)$(NC)"
	kubectl set image deployment/qflow qflow=$(FULL_IMAGE_NAME):$(VERSION) -n $(NAMESPACE)
	kubectl rollout status deployment/qflow -n $(NAMESPACE)

rollback: ## Rollback deployment
	@echo "$(BLUE)Rolling back deployment...$(NC)"
	kubectl rollout undo deployment/qflow -n $(NAMESPACE)
	kubectl rollout status deployment/qflow -n $(NAMESPACE)

scale: ## Scale deployment (use REPLICAS=n)
	@echo "$(BLUE)Scaling deployment to $(REPLICAS) replicas...$(NC)"
	kubectl scale deployment qflow --replicas=$(REPLICAS) -n $(NAMESPACE)

restart: ## Restart deployment
	@echo "$(BLUE)Restarting deployment...$(NC)"
	kubectl rollout restart deployment/qflow -n $(NAMESPACE)

# Cleanup
clean: ## Clean up local artifacts
	@echo "$(BLUE)Cleaning up local artifacts...$(NC)"
	rm -rf dist/
	rm -rf node_modules/
	rm -rf logs/
	rm -rf data/
	docker system prune -f

clean-all: clean k8s-clean docker-stop ## Clean up everything
	@echo "$(BLUE)Cleaning up everything...$(NC)"
	docker-compose down -v --remove-orphans
	docker rmi $(FULL_IMAGE_NAME):$(VERSION) $(FULL_IMAGE_NAME):latest || true

# Development helpers
dev: ## Start development environment
	@echo "$(BLUE)Starting development environment...$(NC)"
	npm run dev

dev-docker: ## Start development with Docker Compose
	@echo "$(BLUE)Starting development with Docker Compose...$(NC)"
	docker-compose up -d
	docker-compose logs -f qflow

# Security
security-scan: ## Run security scan on Docker image
	@echo "$(BLUE)Running security scan...$(NC)"
	@if command -v trivy >/dev/null 2>&1; then \
		trivy image $(FULL_IMAGE_NAME):$(VERSION); \
	else \
		echo "$(YELLOW)Trivy not installed, skipping security scan$(NC)"; \
	fi

# Documentation
docs: ## Generate documentation
	@echo "$(BLUE)Generating documentation...$(NC)"
	npm run docs:generate

docs-serve: ## Serve documentation
	@echo "$(BLUE)Serving documentation...$(NC)"
	npm run docs:serve

# Examples
example-flow: ## Create example flow
	@echo "$(BLUE)Creating example flow...$(NC)"
	curl -X POST http://localhost:8080/api/v1/flows \
		-H "Content-Type: application/json" \
		-d @examples/simple-flow.json

# Environment info
info: ## Show environment information
	@echo "$(BLUE)Environment Information:$(NC)"
	@echo "Version: $(VERSION)"
	@echo "Environment: $(ENVIRONMENT)"
	@echo "Namespace: $(NAMESPACE)"
	@echo "Registry: $(DOCKER_REGISTRY)"
	@echo "Image: $(FULL_IMAGE_NAME):$(VERSION)"
	@echo ""
	@echo "$(BLUE)Available Commands:$(NC)"
	@$(MAKE) help