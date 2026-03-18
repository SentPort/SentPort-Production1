export const isAuthError = (error: any): boolean => {
  if (!error) return false;

  const authErrorCodes = ['PGRST301', '42501'];
  const authErrorMessages = [
    'JWT',
    'jwt',
    'token',
    'permission',
    'unauthorized',
    'authentication',
  ];

  if (error.code && authErrorCodes.includes(error.code)) {
    return true;
  }

  if (error.message) {
    const message = error.message.toLowerCase();
    return authErrorMessages.some(keyword => message.includes(keyword));
  }

  return false;
};

export const getErrorMessage = (error: any): string => {
  if (isAuthError(error)) {
    if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
      return 'Your session has expired. Please sign in again.';
    }
    if (error.code === '42501' || error.message?.includes('permission')) {
      return 'You do not have permission to perform this action.';
    }
    return 'Authentication error. Please sign in again.';
  }

  if (error.message) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
};

export const logAuthDebug = (context: string, data: any) => {
  if (import.meta.env.DEV) {
    console.log(`[Auth Debug - ${context}]`, {
      timestamp: new Date().toISOString(),
      ...data,
    });
  }
};
