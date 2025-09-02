# Qpic API Documentation

## Overview
Media Management module for Q ecosystem with transcoding, optimization, and marketplace integration

## Base URL
`http://localhost:3008/api/v1`

## Authentication
- **bearerAuth**: bearer authentication

## Endpoints


## Error Codes
- **400**: Invalid file or parameters
- **413**: File too large
- **404**: Media not found

## Rate Limits

- **Default**: 100 requests per minute per identity
- **Burst**: 200 requests per minute (temporary)
- **Premium**: 1000 requests per minute (with Qwallet payment)
- **Headers**: Rate limit information in `X-RateLimit-*` headers


## Examples

