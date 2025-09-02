module.exports = {
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:security/recommended',
    'plugin:node/recommended'
  ],
  plugins: [
    'security',
    'no-secrets',
    'anti-trojan-source'
  ],
  rules: {
    // Security-focused rules
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-new-buffer': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-non-literal-require': 'error',
    'security/detect-object-injection': 'error',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-pseudoRandomBytes': 'error',
    'security/detect-unsafe-regex': 'error',
    
    // Secret detection
    'no-secrets/no-secrets': ['error', {
      'tolerance': 4.2,
      'additionalRegexes': {
        'AWS Access Key': 'AKIA[0-9A-Z]{16}',
        'AWS Secret Key': '[0-9a-zA-Z/+]{40}',
        'GitHub Token': 'ghp_[0-9a-zA-Z]{36}',
        'JWT Token': 'eyJ[0-9a-zA-Z_-]*\\.[0-9a-zA-Z_-]*\\.[0-9a-zA-Z_-]*',
        'Private Key': '-----BEGIN [A-Z ]*PRIVATE KEY-----'
      }
    }],
    
    // Anti-trojan source
    'anti-trojan-source/no-bidi': 'error',
    
    // Additional security rules
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-proto': 'error',
    'no-iterator': 'error',
    'no-restricted-globals': ['error', 'eval', 'execScript'],
    'no-restricted-properties': [
      'error',
      {
        'object': 'document',
        'property': 'write',
        'message': 'document.write is dangerous and can lead to XSS'
      },
      {
        'object': 'window',
        'property': 'eval',
        'message': 'eval is dangerous and should not be used'
      }
    ],
    
    // Node.js specific security
    'node/no-deprecated-api': 'error',
    'node/no-exports-assign': 'error',
    'node/process-exit-as-throw': 'error'
  },
  env: {
    node: true,
    es2022: true
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  }
};