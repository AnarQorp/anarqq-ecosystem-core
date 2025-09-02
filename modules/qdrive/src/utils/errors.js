export class QdriveError extends Error {
  constructor(message, code, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }
}

export class ValidationError extends QdriveError {
  constructor(message) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class NotFoundError extends QdriveError {
  constructor(message) {
    super(message, 'NOT_FOUND', 404);
  }
}

export class PermissionError extends QdriveError {
  constructor(message) {
    super(message, 'PERMISSION_DENIED', 403);
  }
}

export class AuthenticationError extends QdriveError {
  constructor(message) {
    super(message, 'AUTHENTICATION_FAILED', 401);
  }
}

export class StorageError extends QdriveError {
  constructor(message) {
    super(message, 'STORAGE_ERROR', 500);
  }
}

export class EncryptionError extends QdriveError {
  constructor(message) {
    super(message, 'ENCRYPTION_ERROR', 500);
  }
}

export class ServiceUnavailableError extends QdriveError {
  constructor(message, service) {
    super(message, 'SERVICE_UNAVAILABLE', 503);
    this.service = service;
  }
}