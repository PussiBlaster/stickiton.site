
Stick It On — ваш сайт (дизайн 1:1) + GitHub-сохранение товаров
==============================================================

Что нового:
- Кнопка «💾 Сохранить в GitHub» в админ-доке.
- Попытка загрузить товары из GitHub при старте (fallback — локальные).
- Серверная функция Vercel: /api/products (GitHub API).

Vercel → Project → Settings → Environment Variables:
- GH_TOKEN — GitHub Fine-grained token (Repository contents: Read/Write)
- GH_OWNER — ваш пользователь или организация
- GH_REPO — имя репозитория
- GH_BRANCH — main
- GH_FILE — products.json (можно указать путь, например data/products.json)

Деплой:
1) Залейте содержимое этого архива в репозиторий.
2) Укажите переменные окружения.
3) Откройте сайт, включите режим админа (секретный клик по лого ×5 или Ctrl/Cmd+Shift+A).
4) Редактируйте товары → «💾 Сохранить в GitHub».
