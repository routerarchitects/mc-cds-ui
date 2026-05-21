export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: string
  ) {
    super(message);
  }
}

export function safeMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Request validation failed. Check the serial and controller endpoint.';
    case 401:
      return 'Your session is invalid or expired. Please log in again.';
    case 403:
      return 'Access denied. Your account is missing required CDS admin permissions.';
    case 404:
      return 'Device mapping was not found.';
    case 409:
      return 'Device already exists for another owner.';
    case 413:
      return 'Request body too large. Maximum allowed size is 1 MiB.';
    case 500:
      return 'CDS server error. Please try again or contact an administrator.';
    default:
      return 'Request failed. Please try again.';
  }
}
