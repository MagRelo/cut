export interface AdminUserListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  userType: string;
  createdAt: string;
  chainId: number;
  walletAddress: string | null;
  wallet: { publicKey: string; isPrimary: boolean; chainId: number } | null;
}

export interface AdminUsersListResponse {
  items: AdminUserListItem[];
  total: number;
  limit: number;
  offset: number;
  chainId: number;
}

export interface AdminUserDetailResponse {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  userType: string;
  isVerified: boolean;
  createdAt: string;
  chainId: number;
  walletAddress: string | null;
  wallet: { publicKey: string; isPrimary: boolean; chainId: number } | null;
}
