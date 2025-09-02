// Common API response types
declare namespace ApiTypes {
  interface User {
    agentDID?: string;
    did?: string;
    email?: string;
    avatar?: string;
    reputation?: number;
    // Add other user properties as needed
  }

  interface AuthResponse {
    token?: string;
    user?: User;
    spaceDID?: string;
    space?: string;
    message?: string;
    // Add other auth response properties as needed
  }

  // Add more API response types as needed
}

export = ApiTypes;
export as namespace ApiTypes;
