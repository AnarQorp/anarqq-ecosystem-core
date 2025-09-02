# Documentation Templates

This directory contains templates used by the documentation generator to create comprehensive module documentation.

## Template Files

- `api-documentation.md` - Template for HTTP API documentation
- `mcp-documentation.md` - Template for MCP tool documentation  
- `deployment-guide.md` - Template for deployment guides
- `troubleshooting-guide.md` - Template for troubleshooting guides
- `operational-runbook.md` - Template for operational runbooks

## Template Variables

Templates use `{{VARIABLE_NAME}}` syntax for variable substitution:

- `{{MODULE_NAME}}` - Formatted module name
- `{{MODULE_DESCRIPTION}}` - Module description
- `{{BASE_URL}}` - API base URL
- `{{ENDPOINTS}}` - Generated endpoint documentation
- `{{MCP_TOOLS}}` - Generated MCP tool documentation
- `{{EXAMPLES}}` - Generated code examples

## Customization

You can customize templates by:

1. Editing existing template files
2. Adding new template variables in the generator
3. Creating module-specific template overrides

## Usage

Templates are automatically loaded by the documentation generator. If a template file doesn't exist, a default template is used.