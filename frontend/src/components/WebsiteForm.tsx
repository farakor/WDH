import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Website } from '../types'
import toast from 'react-hot-toast'

interface WebsiteFormProps {
  website?: Website
  onSuccess: () => void
  onCancel: () => void
}

export const WebsiteForm = ({ website, onSuccess, onCancel }: WebsiteFormProps) => {
  const [formData, setFormData] = useState({
    url: website?.url || '',
    name: website?.name || '',
    description: website?.description || '',
    checkInterval: website?.checkInterval || 5,
    isActive: website?.isActive !== undefined ? website.isActive : true,
    notifyOnDown: website?.notifyOnDown !== undefined ? website.notifyOnDown : true,
    notifyOnUp: website?.notifyOnUp !== undefined ? website.notifyOnUp : true,
  })

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (data: typeof formData) => {
      if (website) {
        return api.put(`/websites/${website.id}`, data)
      }
      return api.post('/websites', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['websites'] })
      queryClient.invalidateQueries({ queryKey: ['websiteStats'] })
      toast.success(website ? 'Сайт обновлен' : 'Сайт добавлен')
      onSuccess()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка при сохранении')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL сайта *
          </label>
          <input
            type="url"
            required
            className="input"
            placeholder="https://example.com"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название *
          </label>
          <input
            type="text"
            required
            className="input"
            placeholder="Мой сайт"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Описание
        </label>
        <textarea
          className="input"
          rows={3}
          placeholder="Краткое описание сайта"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Интервал проверки (минуты)
        </label>
        <input
          type="number"
          min="1"
          className="input"
          value={formData.checkInterval}
          onChange={(e) => setFormData({ ...formData, checkInterval: parseInt(e.target.value) })}
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">Активировать мониторинг</span>
        </label>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.notifyOnDown}
            onChange={(e) => setFormData({ ...formData, notifyOnDown: e.target.checked })}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">Уведомлять при переходе в офлайн</span>
        </label>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.notifyOnUp}
            onChange={(e) => setFormData({ ...formData, notifyOnUp: e.target.checked })}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">Уведомлять при восстановлении</span>
        </label>
      </div>

      <div className="flex justify-end space-x-3">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Отмена
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn-primary"
        >
          {mutation.isPending ? 'Сохранение...' : website ? 'Обновить' : 'Добавить'}
        </button>
      </div>
    </form>
  )
}
