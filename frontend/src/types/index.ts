export interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  telegramChatId?: string
  notificationsEnabled: boolean
  createdAt: string
}

export interface Website {
  id: string
  url: string
  name: string
  description?: string
  checkInterval: number
  isActive: boolean
  notifyOnDown: boolean
  notifyOnUp: boolean
  ipAddress?: string | null
  hosting?: string | null
  userId: string
  createdAt: string
  updatedAt: string
  statusChecks?: StatusCheck[]
}

export interface StatusCheck {
  id: string
  websiteId: string
  status: 'ONLINE' | 'OFFLINE' | 'ERROR'
  responseTime?: number
  statusCode?: number
  errorMessage?: string
  checkedAt: string
  sslValid?: boolean | null
  sslExpiresAt?: string | null
  sslIssuer?: string | null
  sslDaysLeft?: number | null
}

export interface WebsiteStats {
  totalWebsites: number
  activeWebsites: number
  onlineCount: number
  offlineCount: number
  errorCount: number
}

export interface AuthResponse {
  message: string
  token: string
  user: User
}

export interface Domain {
  id: string
  domain: string
  name: string
  description?: string
  checkInterval: number
  isActive: boolean
  notifyOnExpiry: boolean
  userId: string
  createdAt: string
  updatedAt: string
  domainChecks?: DomainCheck[]
}

export interface DomainCheck {
  id: string
  domainId: string
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'ERROR'
  expiresAt?: string | null
  registrar?: string | null
  nameServers: string[]
  daysLeft?: number | null
  errorMessage?: string | null
  checkedAt: string
}

export interface DomainStats {
  totalDomains: number
  activeDomains: number
  expiringSoon: number
  expired: number
  active: number
}
