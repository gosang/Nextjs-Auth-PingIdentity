export interface AuthResponse {
  success: boolean;
  redirectUrl?: string;
  error?: string;
}

export interface LoginRequest {
  action: string;
  redirectUri?: string;
  username?: string;
  password?: string;
}
