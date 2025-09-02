# Qmask API Documentation

## Overview
Privacy & Anonymization module for Q ecosystem

## Base URL
`http://localhost:3007/api/v1`

## Authentication
- **bearerAuth**: bearer authentication

## Endpoints


## Error Codes
- **404**: Profile not found
- **409**: Profile already exists

## Rate Limits

- **Default**: 100 requests per minute per identity
- **Burst**: 200 requests per minute (temporary)
- **Premium**: 1000 requests per minute (with Qwallet payment)
- **Headers**: Rate limit information in `X-RateLimit-*` headers


## Examples

