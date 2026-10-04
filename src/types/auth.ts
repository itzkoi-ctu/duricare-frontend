export interface User {
  email: string;
  role: 'ADMIN' | 'OWNER';
  farmId: number | null;
}

export interface LoginRequest { email: string; password: string }
export interface LoginResponse { accessToken: string; user: User }
export interface AccessTokenResponse { accessToken: string }
export interface CsrfResponse { token: string }

export interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  restoreError: string | null;
  retryRestore: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
