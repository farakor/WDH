import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layout } from '../components/Layout'
import { api } from '../lib/api'
import { Website } from '../types'
import toast from 'react-hot-toast'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ArrowLeft, RefreshCw, Shield, ShieldAlert, ShieldCheck, Clock, Server, Globe } from 'lucide-react'

const WebsiteDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: website, isLoading } = useQuery<Website>({
    queryKey: ['website', id],
    queryFn: async () => {
      const response = await api.get(`/websites/${id}`)
      return response.data
    },
  })

  const forceCheckMutation = useMutation({
    mutationFn: () => api.post('/status/check', { websiteId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website', id] })
      queryClient.invalidateQueries({ queryKey: ['websites'] })
      toast.success('Проверка выполнена')
    },
    onError: () => {
      toast.error('Ошибка при проверке сайта')
    },
  })

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    )
  }

  if (!website) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900">Сайт не найден</h2>
        </div>
      </Layout>
    )
  }

  const lastCheck = website.statusChecks?.[0]

  const getStatusColor = (status: string) => {
    const colors = {
      ONLINE: 'text-green-600',
      OFFLINE: 'text-red-600',
      ERROR: 'text-orange-600',
    }
    return colors[status as keyof typeof colors] || 'text-gray-600'
  }

  const chartData = website.statusChecks
    ?.slice(0, 50)
    .reverse()
    .map((check) => ({
      time: new Date(check.checkedAt).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      responseTime: check.responseTime || 0,
    })) || []

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/websites')}
            className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Назад к списку</span>
          </button>
          <button
            onClick={() => forceCheckMutation.mutate()}
            disabled={forceCheckMutation.isPending}
            className="flex items-center space-x-2 btn-primary"
          >
            <RefreshCw className={`w-4 h-4 ${forceCheckMutation.isPending ? 'animate-spin' : ''}`} />
            <span>{forceCheckMutation.isPending ? 'Проверка...' : 'Проверить сейчас'}</span>
          </button>
        </div>

        {/* Website Info */}
        <div className="card">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{website.name}</h1>
          <a
            href={website.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 break-all"
          >
            {website.url}
          </a>
          {website.description && (
            <p className="text-gray-600 mt-2">{website.description}</p>
          )}
          
          {/* IP and Hosting Info */}
          {(website.ipAddress || website.hosting) && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {website.ipAddress && (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Globe className="w-5 h-5 text-primary-600" />
                  <div>
                    <p className="text-xs text-gray-600">IP адрес</p>
                    <p className="font-semibold text-gray-900">{website.ipAddress}</p>
                  </div>
                </div>
              )}
              {website.hosting && (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Server className="w-5 h-5 text-primary-600" />
                  <div>
                    <p className="text-xs text-gray-600">Хостинг</p>
                    <p className="font-semibold text-gray-900">{website.hosting}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Current Status */}
        {lastCheck && (
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Текущий статус</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Статус</p>
                <p className={`text-2xl font-bold ${getStatusColor(lastCheck.status)}`}>
                  {lastCheck.status}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Время ответа</p>
                <p className="text-2xl font-bold text-gray-900">
                  {lastCheck.responseTime ? `${lastCheck.responseTime}ms` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Код ответа</p>
                <p className="text-2xl font-bold text-gray-900">
                  {lastCheck.statusCode || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Последняя проверка</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(lastCheck.checkedAt).toLocaleString('ru-RU')}
                </p>
              </div>
            </div>
            {lastCheck.errorMessage && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 whitespace-pre-line">
                  <strong>Ошибка:</strong> {lastCheck.errorMessage}
                </p>
              </div>
            )}

            {/* SSL Information */}
            {((lastCheck.sslValid !== null && lastCheck.sslValid !== undefined) || 
             (lastCheck.errorMessage && lastCheck.errorMessage.includes('SSL'))) && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>SSL Сертификат</span>
                </h3>

                {/* Если в errorMessage есть SSL ошибка, показываем её отдельно */}
                {lastCheck.errorMessage && lastCheck.errorMessage.includes('SSL') && !lastCheck.sslValid && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                    <div className="flex items-start space-x-3">
                      <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-800 mb-1">Проблема с SSL сертификатом</p>
                        <p className="text-sm text-red-700">
                          {lastCheck.errorMessage.split(';').find(part => part.includes('SSL'))?.replace('SSL:', '').trim() || 'SSL сертификат отсутствует'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {lastCheck.sslValid !== null && lastCheck.sslValid !== undefined && (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      {lastCheck.sslValid ? (
                        <ShieldCheck className="w-6 h-6 text-green-600" />
                      ) : (
                        <ShieldAlert className="w-6 h-6 text-red-600" />
                      )}
                      <div>
                        <p className="text-xs text-gray-600">Статус</p>
                        <p className={`font-semibold ${lastCheck.sslValid ? 'text-green-600' : 'text-red-600'}`}>
                          {lastCheck.sslValid ? 'Валидный' : 'Невалидный'}
                        </p>
                      </div>
                    </div>
                  )}

                  {lastCheck.sslDaysLeft !== null && lastCheck.sslDaysLeft !== undefined && (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Clock className={`w-6 h-6 ${
                        lastCheck.sslDaysLeft <= 7 ? 'text-red-600' :
                        lastCheck.sslDaysLeft <= 30 ? 'text-orange-600' :
                        'text-green-600'
                      }`} />
                      <div>
                        <p className="text-xs text-gray-600">Дней до истечения</p>
                        <p className={`font-semibold ${
                          lastCheck.sslDaysLeft <= 7 ? 'text-red-600' :
                          lastCheck.sslDaysLeft <= 30 ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          {lastCheck.sslDaysLeft} дней
                        </p>
                      </div>
                    </div>
                  )}

                  {lastCheck.sslExpiresAt && (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-xs text-gray-600">Срок действия до</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(lastCheck.sslExpiresAt).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {lastCheck.sslIssuer && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 mb-1">Издатель сертификата</p>
                    <p className="text-sm font-medium text-blue-900">{lastCheck.sslIssuer}</p>
                  </div>
                )}

                {lastCheck.sslDaysLeft !== null && lastCheck.sslDaysLeft !== undefined && lastCheck.sslDaysLeft <= 30 && (
                  <div className={`mt-3 p-4 rounded-lg border ${
                    lastCheck.sslDaysLeft <= 7 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-orange-50 border-orange-200'
                  }`}>
                    <p className={`text-sm font-medium ${
                      lastCheck.sslDaysLeft <= 7 ? 'text-red-800' : 'text-orange-800'
                    }`}>
                      ⚠️ Внимание! SSL сертификат истекает через {lastCheck.sslDaysLeft} дней. 
                      Рекомендуется обновить сертификат как можно скорее.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Response Time Chart */}
        {chartData.length > 0 && (
          <div className="card">
            <h2 className="text-xl font-bold mb-4">График времени ответа</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis label={{ value: 'ms', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="responseTime"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Check History */}
        <div className="card">
          <h2 className="text-xl font-bold mb-4">История проверок</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Время
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Время ответа
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Код
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ошибка
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {website.statusChecks?.map((check) => (
                  <tr key={check.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(check.checkedAt).toLocaleString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-medium ${getStatusColor(check.status)}`}>
                        {check.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {check.responseTime ? `${check.responseTime}ms` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {check.statusCode || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600">
                      {check.errorMessage || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default WebsiteDetailPage
