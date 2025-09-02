/**
 * Validation schemas for Qindex API
 */

import Joi from 'joi';

// Common schemas
const keySchema = Joi.string()
  .min(1)
  .max(255)
  .pattern(/^[a-zA-Z0-9._/-]+$/)
  .required()
  .messages({
    'string.pattern.base': 'Key can only contain alphanumeric characters, dots, underscores, slashes, and hyphens'
  });

const metadataSchema = Joi.object({
  contentType: Joi.string().max(100),
  tags: Joi.array().items(Joi.string().max(50)).max(20),
  ttl: Joi.number().integer().min(1).max(31536000), // Max 1 year
  identity: Joi.string().max(255),
  description: Joi.string().max(500),
  category: Joi.string().max(100)
}).unknown(true);

const optionsSchema = Joi.object({
  encrypt: Joi.boolean().default(false),
  pin: Joi.boolean().default(true),
  version: Joi.string().max(50)
}).unknown(false);

// Request schemas
export const putRecordSchema = Joi.object({
  key: keySchema,
  value: Joi.any().required(),
  metadata: metadataSchema.default({}),
  options: optionsSchema.default({})
});

export const getRecordSchema = Joi.object({
  key: keySchema
});

export const listRecordsSchema = Joi.object({
  prefix: Joi.string().max(255),
  tags: Joi.string().max(1000), // Comma-separated tags
  contentType: Joi.string().max(100),
  limit: Joi.number().integer().min(1).max(1000).default(50),
  offset: Joi.number().integer().min(0).default(0),
  sort: Joi.string().valid(
    'created_asc', 
    'created_desc', 
    'updated_asc', 
    'updated_desc'
  ).default('created_desc')
});

export const historySchema = Joi.object({
  key: keySchema
});

export const deleteRecordSchema = Joi.object({
  key: keySchema
});