export class ApplicationError extends Error {
  public readonly statusCode: number;

  public constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ApplicationError";
    this.statusCode = statusCode;
  }
}

export function badRequest(message: string): ApplicationError {
  return new ApplicationError(400, message);
}

export function notFound(message: string): ApplicationError {
  return new ApplicationError(404, message);
}

export function conflict(message: string): ApplicationError {
  return new ApplicationError(409, message);
}
