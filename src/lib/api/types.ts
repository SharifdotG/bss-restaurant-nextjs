// Hand-written until the OpenAPI types are generated in the data-layer pass.
export type Role = "admin" | "manager" | "waiter" | "chef" | "cashier";

export type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export type TokenOut = {
  accessToken: string;
  refreshToken: string;
  tokenType: "bearer";
  expiresIn: number;
  user: User;
};

export type ApiErrorBody = {
  detail: string;
  code: string;
  retryAfter?: number;
  errors?: { field: string; message: string; type: string }[];
};
