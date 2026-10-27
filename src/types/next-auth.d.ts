import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: "USER" | "EDITOR";
    username?: string;
  }

  interface Session {
    user: {
      id: string;
      role: "USER" | "EDITOR";
      username: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: "USER" | "EDITOR";
    username?: string;
  }
}

export {};
