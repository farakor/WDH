import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layout } from '../components/Layout'
import { api } from '../lib/api'
import { Domain } from '../types'
import toast from 'react-hot-toast'
import { Plus, Globe, CheckCircle, XCircle, AlertTriangle, Calendar, Pencil, Trash2, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown, Search, X } from 'lucide-react'

type SortField = 'domain' | 'status' | 'daysLeft'
type SortDirection = 'asc' | 'desc'

const DomainsPage = () => {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null)
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('daysLeft')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [searchQuery, setSearchQuery] = useState('')
  const queryClient = useQueryClient()

  const { data: domains, isLoading } = useQuery<Domain[]>({
    queryKey: ['domains'],
    queryFn: async () => {
      const response = await api.get('/domains')
      return response.data
    },
  })

  // Функция для переключения сортировки
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Если кликнули на уже активное поле, меняем направление
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Если кликнули на новое поле, устанавливаем его с ascending
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Иконка сортировки для заголовка
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-primary-600" />
      : <ArrowDown className="w-4 h-4 text-primary-600" />
  }

  // Фильтрация и сортировка доменов
  const sortedDomains = useMemo(() => {
    if (!domains) return []
    
    // Сначала фильтруем по поисковому запросу
    let filtered = domains
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = domains.filter(domain => 
        domain.name.toLowerCase().includes(query) ||
        domain.domain.toLowerCase().includes(query) ||
        domain.description?.toLowerCase().includes(query)
      )
    }
    
    // Затем сортируем отфильтрованные результаты
    return [...filtered].sort((a, b) => {
      let compareResult = 0

      if (sortField === 'domain') {
        // Сортировка по имени домена (алфавит)
        compareResult = a.domain.localeCompare(b.domain, 'ru')
      } else if (sortField === 'status') {
        // Сортировка по статусу
        const statusOrder = { 'EXPIRED': 0, 'EXPIRING_SOON': 1, 'ACTIVE': 2, 'ERROR': 3 }
        const aStatus = a.domainChecks?.[0]?.status || 'ERROR'
        const bStatus = b.domainChecks?.[0]?.status || 'ERROR'
        compareResult = statusOrder[aStatus] - statusOrder[bStatus]
      } else if (sortField === 'daysLeft') {
        // Сортировка по количеству дней
        const aDaysLeft = a.domainChecks?.[0]?.daysLeft
        const bDaysLeft = b.domainChecks?.[0]?.daysLeft
        
        // Если у одного из доменов нет данных о днях, помещаем его в конец
        if (aDaysLeft === null || aDaysLeft === undefined) return 1
        if (bDaysLeft === null || bDaysLeft === undefined) return -1
        
        compareResult = aDaysLeft - bDaysLeft
      }

      // Применяем направление сортировки
      return sortDirection === 'asc' ? compareResult : -compareResult
    })
  }, [domains, sortField, sortDirection, searchQuery])

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/domains/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      queryClient.invalidateQueries({ queryKey: ['domainStats'] })
      toast.success('Домен удален')
    },
    onError: () => {
      toast.error('Ошибка при удалении домена')
    },
  })

  const deleteMultipleMutation = useMutation({
    mutationFn: (ids: string[]) => api.post('/domains/delete-multiple', { ids }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      queryClient.invalidateQueries({ queryKey: ['domainStats'] })
      setSelectedDomains(new Set())
      toast.success(data.data.message || 'Домены удалены')
    },
    onError: () => {
      toast.error('Ошибка при массовом удалении доменов')
    },
  })

  const checkMutation = useMutation({
    mutationFn: (id: string) => api.post(`/domains/${id}/check`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      toast.success('Проверка выполнена')
    },
    onError: () => {
      toast.error('Ошибка при проверке домена')
    },
  })

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Вы уверены, что хотите удалить домен "${name}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  const handleDeleteMultiple = () => {
    const count = selectedDomains.size
    if (count === 0) {
      toast.error('Выберите домены для удаления')
      return
    }
    if (window.confirm(`Вы уверены, что хотите удалить выбранные домены (${count})?`)) {
      deleteMultipleMutation.mutate(Array.from(selectedDomains))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && sortedDomains) {
      setSelectedDomains(new Set(sortedDomains.map(d => d.id)))
    } else {
      setSelectedDomains(new Set())
    }
  }

  const handleSelectDomain = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedDomains)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedDomains(newSelected)
  }

  const isAllSelected = sortedDomains && sortedDomains.length > 0 && selectedDomains.size === sortedDomains.length

  const handleCheck = (id: string) => {
    checkMutation.mutate(id)
  }

  const getStatusBadge = (domain: Domain) => {
    if (!domain.domainChecks || domain.domainChecks.length === 0) {
      return <span className="badge bg-gray-100 text-gray-800">Не проверялся</span>
    }

    const lastCheck = domain.domainChecks[0]
    const statusMap = {
      ACTIVE: (
        <span className="badge-online inline-flex items-center space-x-1">
          <CheckCircle className="w-3 h-3" />
          <span>Активен</span>
        </span>
      ),
      EXPIRING_SOON: (
        <span className="badge-warning inline-flex items-center space-x-1">
          <AlertTriangle className="w-3 h-3" />
          <span>Истекает</span>
        </span>
      ),
      EXPIRED: (
        <span className="badge-offline inline-flex items-center space-x-1">
          <XCircle className="w-3 h-3" />
          <span>Истёк</span>
        </span>
      ),
      ERROR: (
        <span className="badge-error inline-flex items-center space-x-1">
          <XCircle className="w-3 h-3" />
          <span>Ошибка</span>
        </span>
      ),
    }

    return statusMap[lastCheck.status] || null
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
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
            <h1 className="text-3xl font-bold text-gray-900">Мои домены</h1>
            <p className="text-gray-600 mt-1">Отслеживание срока действия доменных имён</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-2 btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить домен</span>
          </button>
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingDomain) && (
          <DomainForm
            domain={editingDomain || undefined}
            onSuccess={() => {
              setShowAddForm(false)
              setEditingDomain(null)
            }}
            onCancel={() => {
              setShowAddForm(false)
              setEditingDomain(null)
            }}
          />
        )}

        {/* Search Bar */}
        <div className="card">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию или домену..."
              className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="mt-2 text-sm text-gray-600">
              Найдено: <span className="font-semibold">{sortedDomains?.length || 0}</span> {sortedDomains?.length === 1 ? 'домен' : 'доменов'}
            </p>
          )}
        </div>

        {/* Domains List */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">
              Список доменов ({sortedDomains?.length || 0})
            </h2>
            {selectedDomains.size > 0 && (
              <button
                onClick={handleDeleteMultiple}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                disabled={deleteMultipleMutation.isPending}
              >
                <Trash2 className="w-4 h-4" />
                <span>Удалить выбранные ({selectedDomains.size})</span>
              </button>
            )}
          </div>

          {sortedDomains && sortedDomains.length > 0 ? (
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
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('domain')}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Домен</span>
                        {getSortIcon('domain')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Статус</span>
                        {getSortIcon('status')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата окончания
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('daysLeft')}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Осталось дней</span>
                        {getSortIcon('daysLeft')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedDomains.map((domain) => (
                    <tr key={domain.id} className={selectedDomains.has(domain.id) ? 'bg-primary-50' : ''}>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedDomains.has(domain.id)}
                          onChange={(e) => handleSelectDomain(domain.id, e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{domain.name}</div>
                          <div className="text-sm text-gray-500">{domain.domain}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(domain)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {formatDate(domain.domainChecks?.[0]?.expiresAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {domain.domainChecks?.[0]?.daysLeft !== null && 
                         domain.domainChecks?.[0]?.daysLeft !== undefined ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                            domain.domainChecks[0].daysLeft < 0
                              ? 'bg-red-100 text-red-800'
                              : domain.domainChecks[0].daysLeft <= 30
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {domain.domainChecks[0].daysLeft} {domain.domainChecks[0].daysLeft === 1 ? 'день' : 'дней'}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-3">
                          <button
                            onClick={() => handleCheck(domain.id)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Проверить сейчас"
                            disabled={checkMutation.isPending}
                          >
                            <RefreshCw className={`w-4 h-4 ${checkMutation.isPending ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => setEditingDomain(domain)}
                            className="text-primary-600 hover:text-primary-900 transition-colors"
                            title="Редактировать"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(domain.id, domain.name)}
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
              {searchQuery ? (
                <>
                  <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Ничего не найдено
                  </h3>
                  <p className="text-gray-600 mb-4">
                    По запросу "{searchQuery}" доменов не найдено
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="btn-secondary"
                  >
                    Очистить поиск
                  </button>
                </>
              ) : (
                <>
                  <Globe className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    У вас пока нет добавленных доменов
                  </h3>
                  <p className="text-gray-600">
                    Добавьте свой первый домен для отслеживания
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

// Domain Form Component
interface DomainFormProps {
  domain?: Domain
  onSuccess: () => void
  onCancel: () => void
}

const DomainForm = ({ domain, onSuccess, onCancel }: DomainFormProps) => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    domain: domain?.domain || '',
    name: domain?.name || '',
    description: domain?.description || '',
    checkInterval: domain?.checkInterval || 1440,
    isActive: domain?.isActive ?? true,
    notifyOnExpiry: domain?.notifyOnExpiry ?? true,
  })

  const mutation = useMutation({
    mutationFn: (data: typeof formData) => {
      if (domain) {
        return api.put(`/domains/${domain.id}`, data)
      }
      return api.post('/domains', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      queryClient.invalidateQueries({ queryKey: ['domainStats'] })
      toast.success(domain ? 'Домен обновлен' : 'Домен добавлен')
      onSuccess()
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Произошла ошибка'
      toast.error(message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">
        {domain ? 'Редактировать домен' : 'Добавить новый домен'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Доменное имя *
          </label>
          <input
            type="text"
            value={formData.domain}
            onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
            placeholder="example.com"
            className="input"
            required
            disabled={!!domain}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Мой сайт"
            className="input"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Описание
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Описание домена"
            className="input"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Интервал проверки (минуты)
          </label>
          <select
            value={formData.checkInterval}
            onChange={(e) =>
              setFormData({ ...formData, checkInterval: Number(e.target.value) })
            }
            className="input"
          >
            <option value={1440}>Раз в день (1440 мин)</option>
            <option value={4320}>Раз в 3 дня (4320 мин)</option>
            <option value={10080}>Раз в неделю (10080 мин)</option>
          </select>
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Активен</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.notifyOnExpiry}
              onChange={(e) =>
                setFormData({ ...formData, notifyOnExpiry: e.target.checked })
              }
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Уведомлять об истечении</span>
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={mutation.isPending}
          >
            Отмена
          </button>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Сохранение...' : domain ? 'Обновить' : 'Добавить'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default DomainsPage
