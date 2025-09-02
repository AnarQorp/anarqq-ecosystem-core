#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

/**
 * Schema validation script
 * Validates all JSON schemas for correctness and consistency
 */

const ajv = new Ajv({
  allErrors: true,
  strict: true,
});

addFormats(ajv);

const schemasDir = path.join(__dirname, '..', 'schemas');
const schemaFiles = fs.readdirSync(schemasDir).filter(file => file.endsWith('.schema.json'));

let hasErrors = false;

console.log('🔍 Validating JSON schemas...\n');

// Validate each schema file
schemaFiles.forEach(file => {
  const filePath = path.join(schemasDir, file);
  const schemaName = file.replace('.schema.json', '');
  
  console.log(`📄 Validating ${schemaName} schema...`);
  
  try {
    const schemaContent = fs.readFileSync(filePath, 'utf8');
    const schema = JSON.parse(schemaContent);
    
    // Validate schema structure
    const isValid = ajv.validateSchema(schema);
    
    if (!isValid) {
      console.error(`❌ Schema ${schemaName} is invalid:`);
      ajv.errors?.forEach(error => {
        console.error(`   - ${error.instancePath}: ${error.message}`);
      });
      hasErrors = true;
    } else {
      console.log(`✅ Schema ${schemaName} is valid`);
      
      // Try to compile the schema
      try {
        ajv.compile(schema);
        console.log(`✅ Schema ${schemaName} compiles successfully`);
      } catch (compileError) {
        console.error(`❌ Schema ${schemaName} compilation failed:`, compileError.message);
        hasErrors = true;
      }
    }
    
  } catch (error) {
    console.error(`❌ Failed to process ${schemaName}:`, error.message);
    hasErrors = true;
  }
  
  console.log('');
});

// Cross-reference validation
console.log('🔗 Validating cross-references...\n');

try {
  // Create a fresh AJV instance for cross-reference validation
  const crossRefAjv = new Ajv({ allErrors: true, strict: true });
  addFormats(crossRefAjv);
  
  // Load all schemas into the fresh AJV instance
  const allSchemas = {};
  schemaFiles.forEach(file => {
    const filePath = path.join(schemasDir, file);
    const schemaContent = fs.readFileSync(filePath, 'utf8');
    const schema = JSON.parse(schemaContent);
    const schemaName = file.replace('.schema.json', '');
    allSchemas[schemaName] = schema;
    crossRefAjv.addSchema(schema, schemaName);
  });
  
  // Test that schemas are properly structured
  const auditSchema = allSchemas.audit;
  if (auditSchema && auditSchema.definitions && auditSchema.definitions.AuditEvent) {
    const actorRef = auditSchema.definitions.AuditEvent.properties.actor;
    if (actorRef && actorRef.type === 'object' && actorRef.properties && actorRef.properties.squidId) {
      console.log('✅ Audit schema actor structure is valid');
    } else {
      console.error('❌ Audit schema actor structure is invalid');
      hasErrors = true;
    }
  }
  
  // Test that all schemas have proper structure
  Object.entries(allSchemas).forEach(([name, schema]) => {
    if (schema.$schema && schema.$id && schema.definitions) {
      console.log(`✅ Schema ${name} has proper structure`);
    } else {
      console.error(`❌ Schema ${name} is missing required structure`);
      hasErrors = true;
    }
  });
  
  console.log('✅ Cross-reference validation completed');
  
} catch (error) {
  console.error('❌ Cross-reference validation failed:', error.message);
  hasErrors = true;
}

// Summary
console.log('\n📊 Validation Summary:');
console.log(`   Schemas processed: ${schemaFiles.length}`);
console.log(`   Status: ${hasErrors ? '❌ FAILED' : '✅ PASSED'}`);

if (hasErrors) {
  console.log('\n💡 Please fix the errors above before proceeding.');
  process.exit(1);
} else {
  console.log('\n🎉 All schemas are valid and ready to use!');
  process.exit(0);
}