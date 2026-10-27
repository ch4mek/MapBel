// Ошибки приложения без зависимости от next/server — переиспользуются логикой и тестами.

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface ApiErrorLike {
  status: number;
  code: string;
  message: string;
}
