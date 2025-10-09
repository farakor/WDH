#!/bin/bash

# 🚀 Скрипт для быстрого деплоя WDH в production режиме

set -e

echo "🚀 WDH Production Deploy Script"
echo "================================"
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка наличия docker compose
if ! command -v docker &> /dev/null; then
    log_error "Docker не установлен! Установите Docker и попробуйте снова."
    exit 1
fi

# Проверка наличия .env.production
if [ ! -f ".env.production" ]; then
    log_warn ".env.production не найден!"
    if [ -f ".env.production.example" ]; then
        log_info "Копирую .env.production.example -> .env.production"
        cp .env.production.example .env.production
        log_warn "Пожалуйста, отредактируйте .env.production и запустите скрипт снова"
        exit 1
    else
        log_error ".env.production.example не найден!"
        exit 1
    fi
fi

# Проверка необходимых файлов
log_info "Проверка наличия production файлов..."
REQUIRED_FILES=(
    "docker-compose.prod.yml"
    "frontend/Dockerfile.prod"
    "frontend/nginx.conf"
    "backend/Dockerfile.prod"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        log_error "Файл $file не найден!"
        exit 1
    fi
done

log_info "Все необходимые файлы найдены ✓"
echo ""

# Показываем текущие контейнеры
log_info "Текущие контейнеры:"
docker compose -f docker-compose.prod.yml ps || true
echo ""

# Спрашиваем подтверждение
read -p "Начать сборку и развертывание? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_warn "Развертывание отменено"
    exit 0
fi

# Остановка старых контейнеров
log_info "Остановка старых контейнеров..."
docker compose -f docker-compose.prod.yml down || true
echo ""

# Сборка образов
log_info "Сборка Docker образов (это может занять несколько минут)..."
docker compose -f docker-compose.prod.yml build --no-cache
echo ""

# Запуск контейнеров
log_info "Запуск контейнеров..."
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
echo ""

# Ожидание запуска
log_info "Ожидание запуска сервисов..."
sleep 10

# Проверка статуса
log_info "Статус контейнеров:"
docker compose -f docker-compose.prod.yml ps
echo ""

# Проверка health checks
log_info "Проверка работоспособности..."
sleep 5

# Проверка backend
if curl -f http://localhost:3000/api/health &> /dev/null; then
    log_info "✓ Backend работает"
else
    log_warn "✗ Backend не отвечает (может все еще запускаться)"
fi

# Проверка frontend
if curl -f http://localhost/health &> /dev/null || curl -f http://localhost:80/health &> /dev/null; then
    log_info "✓ Frontend работает"
else
    log_warn "✗ Frontend не отвечает (может все еще запускаться)"
fi

echo ""
log_info "================================"
log_info "Развертывание завершено!"
log_info "================================"
echo ""
echo "📋 Полезные команды:"
echo ""
echo "  Просмотр логов:"
echo "    docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo "  Просмотр статуса:"
echo "    docker compose -f docker-compose.prod.yml ps"
echo ""
echo "  Остановка:"
echo "    docker compose -f docker-compose.prod.yml down"
echo ""
echo "  Перезапуск:"
echo "    docker compose -f docker-compose.prod.yml restart"
echo ""
echo "🌐 Доступ к приложению:"
echo "  Frontend: http://localhost"
echo "  Backend API: http://localhost:3000/api"
echo ""

