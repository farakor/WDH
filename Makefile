.PHONY: help dev prod-build prod-up prod-down prod-restart prod-logs prod-status prod-clean prod-deploy

# Цвета для вывода
GREEN  := \033[0;32m
YELLOW := \033[1;33m
BLUE   := \033[0;34m
NC     := \033[0m # No Color

help: ## Показать это сообщение помощи
	@echo "$(BLUE)🚀 WDH - Website Down Handler$(NC)"
	@echo ""
	@echo "$(GREEN)Доступные команды:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

dev: ## Запустить в режиме разработки
	@echo "$(GREEN)🔧 Запуск в режиме разработки...$(NC)"
	docker compose up -d
	@echo "$(GREEN)✓ Сервисы запущены$(NC)"
	@echo "Frontend: http://localhost:5173"
	@echo "Backend: http://localhost:3000"

prod-build: ## Собрать production образы
	@echo "$(GREEN)🏗️  Сборка production образов...$(NC)"
	docker compose -f docker-compose.prod.yml build --no-cache

prod-up: ## Запустить в production режиме
	@echo "$(GREEN)🚀 Запуск в production режиме...$(NC)"
	docker compose -f docker-compose.prod.yml --env-file .env.production up -d
	@echo "$(GREEN)✓ Сервисы запущены$(NC)"
	@make prod-status

prod-down: ## Остановить production контейнеры
	@echo "$(YELLOW)⏸️  Остановка production контейнеров...$(NC)"
	docker compose -f docker-compose.prod.yml down
	@echo "$(GREEN)✓ Контейнеры остановлены$(NC)"

prod-restart: ## Перезапустить production контейнеры
	@echo "$(YELLOW)🔄 Перезапуск production контейнеров...$(NC)"
	docker compose -f docker-compose.prod.yml restart
	@echo "$(GREEN)✓ Контейнеры перезапущены$(NC)"

prod-logs: ## Показать логи production контейнеров
	docker compose -f docker-compose.prod.yml logs -f

prod-status: ## Показать статус production контейнеров
	@echo ""
	@echo "$(BLUE)📊 Статус контейнеров:$(NC)"
	@docker compose -f docker-compose.prod.yml ps
	@echo ""
	@echo "$(BLUE)🏥 Health checks:$(NC)"
	@docker compose -f docker-compose.prod.yml ps --filter health=healthy || true
	@echo ""

prod-clean: ## Удалить production контейнеры и volumes
	@echo "$(YELLOW)⚠️  Удаление production контейнеров и volumes...$(NC)"
	@read -p "Вы уверены? Все данные будут удалены! (y/n) " -n 1 -r; \
	echo ""; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose -f docker-compose.prod.yml down -v; \
		echo "$(GREEN)✓ Удалено$(NC)"; \
	else \
		echo "$(YELLOW)Отменено$(NC)"; \
	fi

prod-deploy: ## Полный production deploy (build + up)
	@./deploy-prod.sh

check-env: ## Проверить файл .env.production
	@if [ -f .env.production ]; then \
		echo "$(GREEN)✓ .env.production найден$(NC)"; \
		echo ""; \
		echo "$(BLUE)Содержимое (без секретов):$(NC)"; \
		cat .env.production | grep -v "PASSWORD\|SECRET\|TOKEN" || true; \
	else \
		echo "$(YELLOW)⚠️  .env.production не найден$(NC)"; \
		echo "$(BLUE)Создайте его из шаблона:$(NC)"; \
		echo "  cp .env.production.example .env.production"; \
	fi

health: ## Проверить health endpoints
	@echo "$(BLUE)🏥 Проверка health endpoints...$(NC)"
	@echo ""
	@echo -n "Backend: "
	@curl -sf http://localhost:3000/api/health && echo "$(GREEN)✓$(NC)" || echo "$(YELLOW)✗$(NC)"
	@echo -n "Frontend: "
	@curl -sf http://localhost/health && echo "$(GREEN)✓$(NC)" || echo "$(YELLOW)✗$(NC)"
	@echo ""

update: prod-down ## Обновить и перезапустить production
	@echo "$(BLUE)🔄 Обновление приложения...$(NC)"
	git pull
	@make prod-build
	@make prod-up
	@echo "$(GREEN)✓ Обновление завершено$(NC)"

backup-db: ## Создать бэкап базы данных
	@echo "$(BLUE)💾 Создание бэкапа БД...$(NC)"
	@mkdir -p backups
	docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U wdh_user wdh_db > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✓ Бэкап создан в папке backups/$(NC)"

restore-db: ## Восстановить базу данных (укажите файл: make restore-db FILE=backup.sql)
	@if [ -z "$(FILE)" ]; then \
		echo "$(YELLOW)Укажите файл: make restore-db FILE=backups/backup.sql$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)📥 Восстановление БД из $(FILE)...$(NC)"
	docker compose -f docker-compose.prod.yml exec -T postgres psql -U wdh_user -d wdh_db < $(FILE)
	@echo "$(GREEN)✓ БД восстановлена$(NC)"

clean-logs: ## Очистить Docker логи
	@echo "$(BLUE)🧹 Очистка Docker логов...$(NC)"
	docker compose -f docker-compose.prod.yml exec -T backend truncate -s 0 /proc/1/fd/1 2>/dev/null || true
	@echo "$(GREEN)✓ Логи очищены$(NC)"

