# Qflow Documentation

This directory contains comprehensive documentation for the Qflow Serverless Automation Engine.

## 📁 Directory Structure

```
docs/
├── api/                    # API Documentation
│   ├── openapi.yaml       # OpenAPI 3.0 specification
│   ├── swagger-ui.html    # Interactive API documentation
│   ├── README.md          # Complete API documentation
│   ├── sdk-javascript.md  # JavaScript/TypeScript SDK docs
│   ├── sdk-python.md      # Python SDK documentation
│   ├── postman-collection.json  # Postman collection
│   ├── postman-environment.json # Postman environment
│   ├── generate-docs.js   # Documentation generation script
│   ├── package.json       # Documentation tools dependencies
│   └── generated/         # Auto-generated documentation
├── USER_GUIDE.md          # Complete user guide for creating workflows
├── TRAINING_MATERIALS.md  # Tutorials, exercises, and certification
├── EXAMPLE_WORKFLOWS.md   # Real-world workflow examples
├── VIDEO_TUTORIAL_SCRIPTS.md # Professional training video scripts
├── FAQ.md                 # Frequently asked questions
├── DEPLOYMENT.md          # Deployment and configuration guide
├── TROUBLESHOOTING.md     # Comprehensive troubleshooting guide
├── MONITORING.md          # Monitoring and alerting setup
├── RUNBOOK.md             # Operational procedures and runbooks
├── MIGRATION.md           # N8n to Qflow migration guide
└── README.md              # This file
```

## 🚀 Quick Start

### View Documentation

#### API Documentation
1. **Interactive Documentation**: Open `api/swagger-ui.html` in your browser
2. **Complete Guide**: Read `api/README.md` for comprehensive documentation
3. **SDK Documentation**: Check `api/sdk-javascript.md` or `api/sdk-python.md`

#### Operational Documentation
1. **Deployment**: Read `DEPLOYMENT.md` for deployment instructions
2. **Troubleshooting**: Check `TROUBLESHOOTING.md` for problem resolution
3. **Monitoring**: See `MONITORING.md` for monitoring setup
4. **Operations**: Use `RUNBOOK.md` for daily operational procedures
5. **Migration**: Follow `MIGRATION.md` for n8n migration

### Generate Documentation

```bash
cd docs/api
npm install
npm run generate
```

### Validate API Specification

```bash
cd docs/api
npm run validate
```

### Serve Documentation Locally

```bash
cd docs/api
npm run serve
# Open http://localhost:8080 in your browser
```

## 📚 Documentation Types

### API Documentation
- **OpenAPI Specification**: Machine-readable API definition
- **Interactive Documentation**: Swagger UI for testing endpoints
- **SDK Documentation**: Client library documentation
- **Examples**: Code examples in multiple languages
- **Postman Collection**: Pre-configured API requests

### Operational Documentation
- **Deployment Guide**: Complete deployment and configuration instructions
- **Troubleshooting Guide**: Comprehensive problem-solving procedures
- **Monitoring Setup**: Monitoring, alerting, and observability configuration
- **Operational Runbook**: Step-by-step operational procedures
- **Migration Guide**: N8n to Qflow migration instructions

### Generated Documentation
- **Endpoints Summary**: All API endpoints at a glance
- **Code Examples**: Language-specific examples
- **Changelog**: Version history and updates

## 🛠️ Development Workflow

### Adding New Endpoints

1. Update `api/openapi.yaml` with new endpoint definitions
2. Add examples to `api/postman-collection.json`
3. Update SDK documentation if needed
4. Run `npm run generate` to update generated docs
5. Validate with `npm run validate`

### Updating Documentation

1. Edit the relevant documentation files
2. Run `npm run generate` to regenerate derived content
3. Test with `npm run serve` to preview changes
4. Commit all changes including generated files

### Documentation Standards

- **OpenAPI**: Follow OpenAPI 3.0 specification
- **Examples**: Provide realistic, working examples
- **Error Handling**: Document all error scenarios
- **Authentication**: Clearly explain authentication requirements
- **Rate Limiting**: Document rate limits and headers

## 🔧 Tools and Scripts

### Available Scripts

```bash
# Generate all documentation
npm run generate

# Validate API specification and Postman collection
npm run validate

# Serve documentation locally
npm run serve

# Watch for changes and regenerate
npm run watch

# Lint documentation generation script
npm run lint

# Run tests
npm run test
```

### Dependencies

- **js-yaml**: YAML parsing for OpenAPI specification
- **swagger-codegen**: OpenAPI validation
- **newman**: Postman collection validation
- **http-server**: Local documentation server
- **nodemon**: File watching for development

## 📖 Documentation Guidelines

### Writing Style
- Use clear, concise language
- Provide practical examples
- Include error scenarios
- Explain complex concepts
- Use consistent terminology

### Code Examples
- Provide working examples
- Include error handling
- Show best practices
- Cover common use cases
- Use realistic data

### API Documentation
- Document all parameters
- Explain response formats
- Include status codes
- Provide example requests/responses
- Document authentication requirements

## 🌐 Publishing Documentation

### GitHub Pages
Documentation is automatically published to GitHub Pages when changes are pushed to the main branch.

### CDN Distribution
Static documentation files are distributed via CDN for fast global access.

### Versioning
Documentation is versioned alongside the API to maintain compatibility.

## 🔍 Validation and Testing

### OpenAPI Validation
The OpenAPI specification is validated using swagger-codegen to ensure:
- Correct syntax and structure
- Valid schema definitions
- Proper endpoint definitions
- Consistent naming conventions

### Postman Collection Testing
The Postman collection is validated to ensure:
- All requests are properly formatted
- Environment variables are correctly used
- Examples are realistic and working
- Authentication is properly configured

### Documentation Testing
Generated documentation is tested for:
- Broken links
- Missing examples
- Inconsistent formatting
- Outdated information

## 📞 Support

For documentation-related questions or issues:

- **GitHub Issues**: [https://github.com/anarq/qflow/issues](https://github.com/anarq/qflow/issues)
- **Documentation Site**: [https://docs.qflow.anarq.org](https://docs.qflow.anarq.org)
- **Community**: [https://community.anarq.org](https://community.anarq.org)
- **Email**: docs@anarq.org

## 🤝 Contributing

We welcome contributions to improve the documentation:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run validation and generation scripts
5. Submit a pull request

### Contribution Guidelines
- Follow existing documentation style
- Provide clear examples
- Test all changes
- Update generated documentation
- Include appropriate metadata

---

*Last updated: ${new Date().toISOString().split('T')[0]}*