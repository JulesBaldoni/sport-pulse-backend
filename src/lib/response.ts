import type { AppError } from '@/lib/errors.js';
import type { PaginatedResponse } from '@/lib/pagination.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SuccessResponse<T> = {
  success: true;
  data: T;
};

export type ErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

// ─── Builders ─────────────────────────────────────────────────────────────────

export function successResponse<T>(data: T): SuccessResponse<T> {
  return { success: true, data };
}

export function paginatedSuccessResponse<T>(
  paginated: PaginatedResponse<T>,
): SuccessResponse<PaginatedResponse<T>> {
  return { success: true, data: paginated };
}

export function errorResponse(error: AppError): ErrorResponse {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details !== undefined ? { details: error.details } : {}),
    },
  };
}

