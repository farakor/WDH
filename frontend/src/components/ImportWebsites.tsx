import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import { Download, Upload, FileText, X } from 'lucide-react'

interface ImportWebsitesProps {
  onClose: () => void
}

export const ImportWebsites = ({ onClose }: ImportWebsitesProps) => {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.post('/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['websites'] })
      queryClient.invalidateQueries({ queryKey: ['websiteStats'] })
      toast.success(`Импортировано: ${data.imported} сайтов`)
      if (data.errors && data.errors.length > 0) {
        toast.error(`Ошибок: ${data.errors.length}`)
      }
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Ошибка при импорте')
    },
  })

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/import/template', {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'websites-template.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Шаблон загружен')
    } catch (error) {
      toast.error('Ошибка при загрузке шаблона')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleSubmit = () => {
    if (file) {
      mutation.mutate(file)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Импорт сайтов</h2>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              Загрузите файл Excel (.xlsx) или CSV (.csv) со списком сайтов
            </p>
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              <Download className="w-4 h-4" />
              <span>Скачать шаблон</span>
            </button>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-primary-400'
            }`}
          >
            {file ? (
              <div>
                <FileText className="w-12 h-12 mx-auto mb-2 text-primary-600" />
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
                <button
                  onClick={() => setFile(null)}
                  className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-700 mt-2 mx-auto"
                >
                  <X className="w-4 h-4" />
                  <span>Удалить</span>
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 mb-2">
                  Перетащите файл сюда или
                </p>
                <label className="btn-primary cursor-pointer">
                  Выбрать файл
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Формат файла:</strong>
              <br />
              Столбцы: url, name, description (опц.), checkInterval (опц.)
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button onClick={onClose} className="btn-secondary">
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              disabled={!file || mutation.isPending}
              className="btn-primary"
            >
              {mutation.isPending ? 'Импорт...' : 'Импортировать'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
