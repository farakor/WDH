import { useQuery } from '@tanstack/react-query'
import { Layout } from '../components/Layout'
import { api } from '../lib/api'
import { Website, WebsiteStats, Domain, DomainStats } from '../types'
import { Link, useNavigate } from 'react-router-dom'
import { Globe, CheckCircle, Circle, XCircle, Plus, Shield, ShieldAlert, AlertTriangle, Server, Globe2, Calendar } from 'lucide-react'

const DashboardPage = () => {
  const navigate = useNavigate()

  const { data: stats, isLoading: statsLoading } = useQuery<WebsiteStats>({
    queryKey: ['websiteStats'],
    queryFn: async () => {
      const response = await api.get('/websites/stats')
      return response.data
    },
  })

  const { data: websites, isLoading: websitesLoading } = useQuery<Website[]>({
    queryKey: ['websites'],
    queryFn: async () => {
      const response = await api.get('/websites')
      return response.data
    },
    refetchInterval: 30000, // Обновление каждые 30 секунд
  })

  const { data: domainStats, isLoading: domainStatsLoading } = useQuery<DomainStats>({
    queryKey: ['domainStats'],
    queryFn: async () => {
      const response = await api.get('/domains/stats')
      return response.data
    },
  })

  const { data: domains, isLoading: domainsLoading } = useQuery<Domain[]>({
    queryKey: ['domains'],
    queryFn: async () => {
      const response = await api.get('/domains')
      return response.data
    },
  })

  // Извлечь SSL ошибку из errorMessage
  const getSSLErrorText = (errorMessage: string | undefined): string => {
    if (!errorMessage) return 'SSL Проблема'
    
    // Ищем текст после "SSL: "
    const sslErrorMatch = errorMessage.match(/SSL:\s*(.+?)(?:;|$)/)
    if (sslErrorMatch && sslErrorMatch[1]) {
      return sslErrorMatch[1].trim()
    }
    
    return 'SSL Проблема'
  }

  const getStatusBadge = (website: Website) => {
    if (!website.statusChecks || website.statusChecks.length === 0) {
      return <span className="badge bg-gray-100 text-gray-800">Не проверялся</span>
    }

    const lastCheck = website.statusChecks[0]
    const statusMap = {
      ONLINE: (
        <span className="badge-online flex items-center space-x-1">
          <Circle className="w-3 h-3 fill-green-600" />
          <span>Онлайн</span>
        </span>
      ),
      OFFLINE: (
        <span className="badge-offline flex items-center space-x-1">
          <XCircle className="w-3 h-3" />
          <span>Офлайн</span>
        </span>
      ),
      ERROR: (
        <span className="badge-error flex items-center space-x-1">
          <Circle className="w-3 h-3 fill-orange-600" />
          <span>Ошибка</span>
        </span>
      ),
    }

    return statusMap[lastCheck.status] || null
  }

  if (statsLoading || websitesLoading || domainStatsLoading || domainsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Дашборд</h1>
          <p className="text-gray-600 mt-1">Обзор статуса всех ваших сайтов</p>
        </div>

        {/* Website Stats Cards */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Статистика сайтов</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Всего сайтов</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.totalWebsites || 0}</p>
                </div>
                <Globe className="w-10 h-10 text-gray-400" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">С ошибками</p>
                  <p className="text-3xl font-bold text-orange-600">{stats?.errorCount || 0}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-orange-400" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Онлайн</p>
                  <p className="text-3xl font-bold text-green-600">{stats?.onlineCount || 0}</p>
                </div>
                <Circle className="w-10 h-10 text-green-400 fill-green-400" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Офлайн</p>
                  <p className="text-3xl font-bold text-red-600">{stats?.offlineCount || 0}</p>
                </div>
                <XCircle className="w-10 h-10 text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Domain Stats Cards */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Статистика доменов</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Всего доменов</p>
                  <p className="text-3xl font-bold text-gray-900">{domainStats?.totalDomains || 0}</p>
                </div>
                <Globe2 className="w-10 h-10 text-gray-400" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Активных</p>
                  <p className="text-3xl font-bold text-green-600">{domainStats?.active || 0}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Истекает скоро</p>
                  <p className="text-3xl font-bold text-yellow-600">{domainStats?.expiringSoon || 0}</p>
                </div>
                <AlertTriangle className="w-10 h-10 text-yellow-400" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Истекло</p>
                  <p className="text-3xl font-bold text-red-600">{domainStats?.expired || 0}</p>
                </div>
                <XCircle className="w-10 h-10 text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Websites List */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Список сайтов</h2>
            <Link to="/websites" className="btn-primary">
              Управление сайтами
            </Link>
          </div>

          {websites && websites.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Сайт
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP адрес
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Хостинг
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Время ответа
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {websites.map((website) => {
                    const lastCheck = website.statusChecks?.[0]
                    return (
                      <tr key={website.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/websites/${website.id}`)}>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{website.name}</div>
                            <div className="text-sm text-gray-500">{website.url}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {website.ipAddress ? (
                            <div className="flex items-center space-x-2">
                              <Globe className="w-4 h-4 text-gray-400" />
                              <span className="font-mono text-sm text-gray-900">{website.ipAddress}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {website.hosting ? (
                            <div className="flex items-center space-x-2">
                              <Server className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900 truncate max-w-[200px]" title={website.hosting}>
                                {website.hosting}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2 flex-wrap">
                            {getStatusBadge(website)}
                            {/* SSL Проблема: невалидный или отсутствует */}
                            {(lastCheck?.sslValid === false || 
                              (lastCheck?.errorMessage && lastCheck.errorMessage.includes('SSL'))) && (
                              <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <ShieldAlert className="w-3 h-3" />
                                <span>{getSSLErrorText(lastCheck?.errorMessage)}</span>
                              </span>
                            )}
                            {/* SSL истекает */}
                            {lastCheck?.sslValid === true && lastCheck?.sslDaysLeft !== null && lastCheck.sslDaysLeft <= 30 && (
                              <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                                lastCheck.sslDaysLeft <= 7 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                              }`}>
                                <AlertTriangle className="w-3 h-3" />
                                <span>{lastCheck.sslDaysLeft}д</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {lastCheck?.responseTime ? `${lastCheck.responseTime}ms` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Globe className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                У вас пока нет добавленных сайтов
              </h3>
              <p className="text-gray-600 mb-6">
                Добавьте свой первый сайт для мониторинга
              </p>
              <Link to="/websites" className="inline-flex items-center space-x-2 btn-primary">
                <Plus className="w-4 h-4" />
                <span>Добавить сайт</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default DashboardPage
