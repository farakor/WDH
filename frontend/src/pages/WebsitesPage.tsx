import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layout } from '../components/Layout'
import { api } from '../lib/api'
import { Website } from '../types'
import toast from 'react-hot-toast'
import { WebsiteForm } from '../components/WebsiteForm'
import { ImportWebsites } from '../components/ImportWebsites'
import { Plus, Upload, Globe, CheckCircle, XCircle, Circle, ShieldAlert, AlertTriangle, Server, Pencil, Trash2, Search, X, Send } from 'lucide-react'

const WebsitesPage = () => {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [selectedWebsites, setSelectedWebsites] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterIp, setFilterIp] = useState('')
  const [filterHosting, setFilterHosting] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const queryClient = useQueryClient()

  const { data: websites, isLoading } = useQuery<Website[]>({
    queryKey: ['websites'],
    queryFn: async () => {
      const response = await api.get('/websites')
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/websites/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites'] })
      queryClient.invalidateQueries({ queryKey: ['websiteStats'] })
      toast.success('Сайт удален')
    },
    onError: () => {
      toast.error('Ошибка при удалении сайта')
    },
  })

  const deleteMultipleMutation = useMutation({
    mutationFn: (ids: string[]) => api.post('/websites/delete-multiple', { ids }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['websites'] })
      queryClient.invalidateQueries({ queryKey: ['websiteStats'] })
      setSelectedWebsites(new Set())
      toast.success(data.data.message || 'Сайты удалены')
    },
    onError: () => {
      toast.error('Ошибка при массовом удалении сайтов')
    },
  })

  const reportMutation = useMutation({
    mutationFn: () => api.post('/status/report'),
    onSuccess: () => {
      toast.success('Отчет по сайтам отправлен в Telegram')
    },
    onError: () => {
      toast.error('Ошибка при отправке отчета')
    },
  })

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить сайт "${name}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  const handleDeleteMultiple = () => {
    const count = selectedWebsites.size
    if (count === 0) {
      toast.error('Выберите сайты для удаления')
      return
    }
    if (window.confirm(`Вы уверены, что хотите удалить выбранные сайты (${count})?`)) {
      deleteMultipleMutation.mutate(Array.from(selectedWebsites))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && websites) {
      setSelectedWebsites(new Set(websites.map(w => w.id)))
    } else {
      setSelectedWebsites(new Set())
    }
  }

  const handleSelectWebsite = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedWebsites)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedWebsites(newSelected)
  }

  const isAllSelected = websites && websites.length > 0 && selectedWebsites.size === websites.length

  // Функция для получения статуса сайта
  const getWebsiteStatus = (website: Website): string => {
    if (!website.statusChecks || website.statusChecks.length === 0) {
      return 'NOT_CHECKED'
    }
    return website.statusChecks[0].status
  }

  // Получить уникальные IP адреса
  const uniqueIPs = Array.from(new Set(websites?.filter(w => w.ipAddress).map(w => w.ipAddress) || []))
  
  // Получить уникальные хостинги
  const uniqueHostings = Array.from(new Set(websites?.filter(w => w.hosting).map(w => w.hosting) || []))

  // Фильтрация сайтов
  const filteredWebsites = websites?.filter((website) => {
    // Поиск по названию, URL, IP и хостингу
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch = !searchQuery || 
      website.name.toLowerCase().includes(searchLower) ||
      website.url.toLowerCase().includes(searchLower) ||
      (website.ipAddress && website.ipAddress.toLowerCase().includes(searchLower)) ||
      (website.hosting && website.hosting.toLowerCase().includes(searchLower))

    // Фильтр по IP
    const matchesIp = !filterIp || website.ipAddress === filterIp

    // Фильтр по хостингу
    const matchesHosting = !filterHosting || website.hosting === filterHosting

    // Фильтр по статусу
    const websiteStatus = getWebsiteStatus(website)
    const matchesStatus = !filterStatus || websiteStatus === filterStatus

    return matchesSearch && matchesIp && matchesHosting && matchesStatus
  }) || []

  // Функция для получения приоритета статуса при сортировке
  const getStatusPriority = (status: string): number => {
    const priorityMap: { [key: string]: number } = {
      'OFFLINE': 0,    // Офлайн - самый высокий приоритет
      'ERROR': 1,      // Ошибка - второй приоритет
      'ONLINE': 2,     // Онлайн - третий приоритет
      'NOT_CHECKED': 3 // Не проверялся - самый низкий приоритет
    }
    return priorityMap[status] ?? 4
  }

  // Сортировка по статусу: офлайн → ошибки → онлайн → не проверялся
  const sortedWebsites = [...filteredWebsites].sort((a, b) => {
    const statusA = getWebsiteStatus(a)
    const statusB = getWebsiteStatus(b)
    return getStatusPriority(statusA) - getStatusPriority(statusB)
  })

  // Сброс фильтров
  const clearFilters = () => {
    setSearchQuery('')
    setFilterIp('')
    setFilterHosting('')
    setFilterStatus('')
  }

  const hasActiveFilters = searchQuery || filterIp || filterHosting || filterStatus

  const getStatusBadge = (website: Website) => {
    if (!website.statusChecks || website.statusChecks.length === 0) {
      return <span className="badge bg-gray-100 text-gray-800">Не проверялся</span>
    }

    const lastCheck = website.statusChecks[0]
    const statusMap = {
      ONLINE: (
        <span className="badge-online inline-flex items-center space-x-1">
          <CheckCircle className="w-3 h-3" />
          <span>Онлайн</span>
        </span>
      ),
      OFFLINE: (
        <span className="badge-offline inline-flex items-center space-x-1">
          <XCircle className="w-3 h-3" />
          <span>Офлайн</span>
        </span>
      ),
      ERROR: (
        <span className="badge-error inline-flex items-center space-x-1">
          <Circle className="w-3 h-3 fill-orange-600" />
          <span>Ошибка</span>
        </span>
      ),
    }

    return statusMap[lastCheck.status] || null
  }

  if (isLoading) {
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Мои сайты</h1>
            <p className="text-gray-600 mt-1">Управление списком отслеживаемых сайтов</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => reportMutation.mutate()}
              disabled={reportMutation.isPending}
              className="flex items-center space-x-2 btn-secondary"
              title="Отправить отчет в Telegram"
            >
              <Send className="w-4 h-4" />
              <span>{reportMutation.isPending ? 'Отправка...' : 'Отчет'}</span>
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center space-x-2 btn-secondary"
            >
              <Upload className="w-4 h-4" />
              <span>Импорт</span>
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 btn-primary"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить сайт</span>
            </button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingWebsite) && (
          <div className="card">
            <h2 className="text-xl font-bold mb-4">
              {editingWebsite ? 'Редактировать сайт' : 'Добавить новый сайт'}
            </h2>
            <WebsiteForm
              website={editingWebsite || undefined}
              onSuccess={() => {
                setShowAddForm(false)
                setEditingWebsite(null)
              }}
              onCancel={() => {
                setShowAddForm(false)
                setEditingWebsite(null)
              }}
            />
          </div>
        )}

        {/* Import Modal */}
        {showImport && (
          <ImportWebsites onClose={() => setShowImport(false)} />
        )}

        {/* Поиск и фильтры */}
        <div className="card">
          <div className="space-y-4">
            {/* Поисковая строка */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по сайту, URL, IP адресу или хостингу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Фильтры */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Фильтр по IP */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IP адрес</label>
                <select
                  value={filterIp || ''}
                  onChange={(e) => setFilterIp(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Все IP адреса</option>
                  {uniqueIPs.map((ip) => (
                    <option key={ip || 'empty'} value={ip || ''}>{ip}</option>
                  ))}
                </select>
              </div>

              {/* Фильтр по хостингу */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Хостинг</label>
                <select
                  value={filterHosting || ''}
                  onChange={(e) => setFilterHosting(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Все хостинги</option>
                  {uniqueHostings.map((hosting) => (
                    <option key={hosting || 'empty'} value={hosting || ''}>{hosting}</option>
                  ))}
                </select>
              </div>

              {/* Фильтр по статусу */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Все статусы</option>
                  <option value="ONLINE">Онлайн</option>
                  <option value="OFFLINE">Офлайн</option>
                  <option value="ERROR">Ошибка</option>
                  <option value="NOT_CHECKED">Не проверялся</option>
                </select>
              </div>

              {/* Кнопка сброса фильтров */}
              <div className="flex items-end">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Сбросить фильтры</span>
                  </button>
                )}
              </div>
            </div>

            {/* Показать количество результатов */}
            {hasActiveFilters && (
              <div className="text-sm text-gray-600">
                Найдено: <span className="font-semibold">{sortedWebsites.length}</span> из {websites?.length || 0}
              </div>
            )}
          </div>
        </div>

        {/* Websites List */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">
              Список сайтов ({sortedWebsites.length})
            </h2>
            {selectedWebsites.size > 0 && (
              <button
                onClick={handleDeleteMultiple}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                disabled={deleteMultipleMutation.isPending}
              >
                <Trash2 className="w-4 h-4" />
                <span>Удалить выбранные ({selectedWebsites.size})</span>
              </button>
            )}
          </div>

          {sortedWebsites && sortedWebsites.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
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
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedWebsites.map((website) => (
                    <tr key={website.id} className={selectedWebsites.has(website.id) ? 'bg-primary-50' : ''}>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedWebsites.has(website.id)}
                          onChange={(e) => handleSelectWebsite(website.id, e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
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
                            <span className="text-sm text-gray-900 truncate max-w-[250px]" title={website.hosting}>
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
                          {(website.statusChecks?.[0]?.sslValid === false || 
                            (website.statusChecks?.[0]?.errorMessage && 
                             website.statusChecks[0].errorMessage.includes('SSL'))) && (
                            <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <ShieldAlert className="w-3 h-3" />
                              <span>{getSSLErrorText(website.statusChecks?.[0]?.errorMessage)}</span>
                            </span>
                          )}
                          {/* SSL истекает */}
                          {website.statusChecks?.[0]?.sslValid === true && 
                           website.statusChecks?.[0]?.sslDaysLeft !== null && 
                           website.statusChecks?.[0]?.sslDaysLeft !== undefined && 
                           website.statusChecks[0].sslDaysLeft <= 30 && (
                            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                              website.statusChecks[0].sslDaysLeft <= 7 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              <AlertTriangle className="w-3 h-3" />
                              <span>{website.statusChecks[0].sslDaysLeft}д</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-3">
                          <button
                            onClick={() => setEditingWebsite(website)}
                            className="text-primary-600 hover:text-primary-900 transition-colors"
                            title="Редактировать"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(website.id, website.name)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Globe className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              {websites && websites.length > 0 ? (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Нет результатов
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Попробуйте изменить параметры поиска или фильтры
                  </p>
                  <button
                    onClick={clearFilters}
                    className="btn-secondary inline-flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Сбросить фильтры</span>
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    У вас пока нет добавленных сайтов
                  </h3>
                  <p className="text-gray-600">
                    Добавьте свой первый сайт для мониторинга
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default WebsitesPage
