import identitySchema from '../../schemas/identity.schema.json';
import consentSchema from '../../schemas/consent.schema.json';
import lockSchema from '../../schemas/lock.schema.json';
import indexSchema from '../../schemas/index.schema.json';
import auditSchema from '../../schemas/audit.schema.json';
import maskSchema from '../../schemas/mask.schema.json';

export const schemas = {
  identity: identitySchema,
  consent: consentSchema,
  lock: lockSchema,
  index: indexSchema,
  audit: auditSchema,
  mask: maskSchema,
};

export {
  identitySchema,
  consentSchema,
  lockSchema,
  indexSchema,
  auditSchema,
  maskSchema,
};