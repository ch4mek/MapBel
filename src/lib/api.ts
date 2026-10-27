import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/auth";
import type { Session } from "next-auth";
import { Prisma } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api-errors";

export { ApiError };
export type { ApiErrorLike } from "@/lib/api-errors";

export type SessionUser = NonNullable<Session["user"]>;

/** Текущий пользователь или 401. Идентичность всегда из серверной сессии. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new ApiError(401, "UNAUTHORIZED", "Требуется вход в аккаунт");
  }
  return session.user;
}

/** Только редактор. */
export async function requireEditor(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "EDITOR") {
    throw new ApiError(403, "FORBIDDEN", "Доступно только редакторам");
  }
  return user;
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Единая обработка ошибок роутов: ApiError / ZodError / Prisma P2002 / прочее. */
export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return jsonError(error.status, error.code, error.message);
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return jsonError(
      400,
      "VALIDATION",
      first ? `Некорректные данные: ${first.message}` : "Некорректные данные",
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return jsonError(409, "CONFLICT", "Запись уже существует");
  }
  console.error("[api] unexpected error:", error);
  return jsonError(500, "INTERNAL", "Внутренняя ошибка сервера");
}

export function asyncRoute<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
): (...args: Args) => Promise<NextResponse> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleRouteError(error);
    }
  };
}
