export function errorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'El correo o la contraseña no son correctos.',
    'auth/email-already-in-use': 'Ya existe una cuenta con este correo.',
    'auth/weak-password': 'Utiliza una contraseña de al menos 8 caracteres.',
    'auth/popup-closed-by-user': 'Se ha cerrado la ventana de Google. Puedes volver a intentarlo.',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento y vuelve a intentarlo.',
    'auth/network-request-failed': 'No hay conexión. Revisa tu red y vuelve a intentarlo.',
    'permission-denied': 'No tienes acceso a estos datos o la operación no es válida.',
    'unavailable': 'No se puede conectar con Firebase. Inténtalo de nuevo.'
  };
  return code && messages[code] || (error instanceof Error ? error.message : 'No se ha podido completar la operación.');
}
