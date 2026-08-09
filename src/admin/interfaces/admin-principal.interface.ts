export interface AdminPrincipal {
  id: string;
  email: string;
  displayName: string;
  sessionId: string;
  roleKeys: string[];
  permissionKeys: string[];
  twoFactorEnabled: boolean;
}
