
/**
 * sQuid Validators
 * Validaciones para registro y datos de identidad
 */

export interface ValidationResult {
  valid: boolean;
  message: string;
}

/**
 * Valida el formato y disponibilidad de un alias
 */
export function validateAlias(alias: string): ValidationResult {
  // Limpiar espacios
  alias = alias.trim();
  
  // Verificar longitud
  if (alias.length < 3) {
    return {
      valid: false,
      message: 'El alias debe tener al menos 3 caracteres'
    };
  }
  
  if (alias.length > 20) {
    return {
      valid: false,
      message: 'El alias no puede tener más de 20 caracteres'
    };
  }
  
  // Verificar formato (solo letras, números y guiones)
  const formatRegex = /^[a-zA-Z0-9-]+$/;
  if (!formatRegex.test(alias)) {
    return {
      valid: false,
      message: 'Solo se permiten letras, números y guiones'
    };
  }
  
  // No puede empezar o terminar con guión
  if (alias.startsWith('-') || alias.endsWith('-')) {
    return {
      valid: false,
      message: 'No puede empezar o terminar con guión'
    };
  }
  
  // No puede tener guiones consecutivos
  if (alias.includes('--')) {
    return {
      valid: false,
      message: 'No se permiten guiones consecutivos'
    };
  }
  
  // Verificar palabras reservadas
  const reservedWords = [
    'admin', 'root', 'system', 'qmail', 'qlock', 'qindex', 
    'qerberos', 'squid', 'api', 'www', 'mail', 'test', 'demo'
  ];
  
  if (reservedWords.includes(alias.toLowerCase())) {
    return {
      valid: false,
      message: 'Este alias está reservado'
    };
  }
  
  // Verificar disponibilidad
  const existingAliases = JSON.parse(localStorage.getItem('squid_registered_aliases') || '[]');
  if (existingAliases.includes(alias.toLowerCase())) {
    return {
      valid: false,
      message: 'Este alias ya está en uso'
    };
  }
  
  return {
    valid: true,
    message: 'Alias disponible'
  };
}

/**
 * Valida el formato de un email
 */
export function validateEmail(email: string): ValidationResult {
  // Limpiar espacios
  email = email.trim();
  
  if (!email) {
    return {
      valid: false,
      message: 'El email es requerido'
    };
  }
  
  // Regex básico para validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return {
      valid: false,
      message: 'Formato de email inválido'
    };
  }
  
  // Verificar longitud
  if (email.length > 100) {
    return {
      valid: false,
      message: 'El email es demasiado largo'
    };
  }
  
  return {
    valid: true,
    message: 'Email válido'
  };
}

/**
 * Valida los datos completos del formulario de registro
 */
export function validateRegistrationForm(alias: string, email: string): {
  valid: boolean;
  errors: { alias?: string; email?: string };
} {
  const aliasValidation = validateAlias(alias);
  const emailValidation = validateEmail(email);
  
  const errors: { alias?: string; email?: string } = {};
  
  if (!aliasValidation.valid) {
    errors.alias = aliasValidation.message;
  }
  
  if (!emailValidation.valid) {
    errors.email = emailValidation.message;
  }
  
  return {
    valid: aliasValidation.valid && emailValidation.valid,
    errors
  };
}
