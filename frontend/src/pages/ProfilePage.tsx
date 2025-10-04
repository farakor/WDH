import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Layout } from '../components/Layout'
import { api } from '../lib/api'
import { User } from '../types'
import toast from 'react-hot-toast'
import { Send } from 'lucide-react'

const ProfilePage = () => {
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery<User>({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await api.get('/auth/profile')
      return response.data
    },
  })

  const [formData, setFormData] = useState({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    telegramChatId: profile?.telegramChatId || '',
    notificationsEnabled: profile?.notificationsEnabled || false,
  })

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => api.put('/auth/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Профиль обновлен')
    },
    onError: () => {
      toast.error('Ошибка при обновлении профиля')
    },
  })

  const reportMutation = useMutation({
    mutationFn: () => api.post('/status/report'),
    onSuccess: () => {
      toast.success('Отчет отправлен в Telegram')
    },
    onError: () => {
      toast.error('Ошибка при отправке отчета')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
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
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Профиль</h1>
          <p className="text-gray-600 mt-1">Управление настройками аккаунта</p>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Личная информация</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    disabled
                    className="input bg-gray-100 cursor-not-allowed"
                    value={profile?.email || ''}
                  />
                  <p className="text-xs text-gray-500 mt-1">Email нельзя изменить</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Имя
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Фамилия
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <button type="submit" disabled={updateMutation.isPending} className="btn-primary w-full">
                  {updateMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              </form>
            </div>

            {/* Account Information */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Информация об аккаунте</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Дата регистрации:</span>
                  <span className="text-sm font-medium">
                    {profile?.createdAt && new Date(profile.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600">ID пользователя:</span>
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{profile?.id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div>
            {/* Telegram Settings */}
            <div className="card h-full">
              <h2 className="text-xl font-bold mb-4">Настройки Telegram</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telegram Chat ID
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="123456789"
                    value={formData.telegramChatId}
                    onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                  />
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Как получить Chat ID:</strong>
                      <br />
                      1. Напишите боту @userinfobot в Telegram
                      <br />
                      2. Скопируйте ваш Chat ID и вставьте сюда
                    </p>
                  </div>
                </div>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.notificationsEnabled}
                    onChange={(e) =>
                      setFormData({ ...formData, notificationsEnabled: e.target.checked })
                    }
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Включить уведомления в Telegram</span>
                </label>

                <div className="flex flex-col space-y-3">
                  <button type="submit" disabled={updateMutation.isPending} className="btn-primary w-full">
                    {updateMutation.isPending ? 'Сохранение...' : 'Сохранить настройки'}
                  </button>
                  <button
                    type="button"
                    onClick={() => reportMutation.mutate()}
                    disabled={!formData.telegramChatId || reportMutation.isPending}
                    className="flex items-center justify-center space-x-2 btn-secondary w-full"
                  >
                    <Send className="w-4 h-4" />
                    <span>{reportMutation.isPending ? 'Отправка...' : 'Тестовый отчет'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ProfilePage
