# 📦 IPH Калькулятор склада

Веб-приложение для учёта и анализа показателя **IPH** (Items Per Hour — штучек в час) по складам Лавки.

**Живой сайт:** https://iphcalculator.ru

---

## Что делает приложение

- Позволяет добавлять ежедневные записи: количество собранных штучек + рабочее время
- Автоматически считает IPH = Штучки / Часы
- Показывает средний IPH за весь период с цветовой индикацией (зелёный/жёлтый/красный)
- Позволяет задать план и видеть отклонение от него
- Отображает календарь с цветными ячейками по каждому дню
- Поддерживает 4 склада, переключение между ними
- Данные хранятся на сервере (общие для всей команды)

**Склады:**
| Ключ | Название |
|---|---|
| `slavyansky` | Славянский бул. 5к1 |
| `tallinskaya` | Таллинская 14 |
| `pyatnitskaya` | Пятницкая 11 |
| `vasilevskogo` | Васильевского 17 |

---

## Стек технологий

| Часть | Технология |
|---|---|
| Фронтенд | React 18 + TypeScript + Vite |
| Бэкенд | PHP 8 (API на VPS) |
| База данных | MySQL |
| Хостинг | VPS (Ubuntu), домен iphcalculator.ru |
| SSL | Let's Encrypt (Certbot) |

---

## Структура проекта

```
mvp-spa/
├── src/
│   ├── App.tsx          # Весь фронтенд (один компонент)
│   ├── index.css        # Стили
│   └── main.tsx         # Точка входа React
├── api/
│   ├── db.php           # Настройки подключения к БД
│   ├── records.php      # API для записей (GET/POST/DELETE)
│   └── plans.php        # API для планов (GET/POST/DELETE)
├── public/
│   └── .htaccess        # Apache: SPA routing + проброс /api/
├── create_tables.sql    # SQL для создания таблиц
├── vercel.json          # (не используется, оставлен как артефакт)
├── vite.config.ts       # Vite с проксированием /api/ → сервер
├── package.json
└── index.html
```

---

## Быстрый старт с нуля (полная инструкция)

### 1. Сервер (VPS)

Нужен VPS с Ubuntu 22.04+ и доменным именем, указывающим на его IP.

```bash
# Подключиться к серверу
ssh root@<IP_СЕРВЕРА>

# Установить Apache, PHP, MySQL
apt update
apt install -y apache2 php php-mysql mysql-server libapache2-mod-php

# Включить mod_rewrite для SPA
a2enmod rewrite

# Создать директорию сайта
mkdir -p /var/www/html/api
```

### 2. Настройка MySQL

```bash
mysql -u root -p
```

```sql
CREATE DATABASE u3559731_default CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'u3559731'@'localhost' IDENTIFIED BY 'ВАШ_ПАРОЛЬ';
GRANT ALL PRIVILEGES ON u3559731_default.* TO 'u3559731'@'localhost';
FLUSH PRIVILEGES;
```

Затем создать таблицы:

```bash
mysql -u u3559731 -p u3559731_default < create_tables.sql
```

Файл `create_tables.sql`:
```sql
CREATE TABLE IF NOT EXISTS iph_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  orders FLOAT NOT NULL,
  hours FLOAT NOT NULL,
  iph FLOAT NOT NULL,
  UNIQUE KEY store_date (store, date)
);

CREATE TABLE IF NOT EXISTS iph_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store VARCHAR(50) NOT NULL UNIQUE,
  value FLOAT NOT NULL
);
```

### 3. PHP API на сервере

Создать файл `/var/www/html/api/db.php`:

```php
<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'u3559731_default');
define('DB_USER', 'u3559731');
define('DB_PASS', 'ВАШ_ПАРОЛЬ');
```

Скопировать `api/records.php` и `api/plans.php` в `/var/www/html/api/`.

### 4. Настройка Apache

В файле `/etc/apache2/sites-available/000-default.conf` добавить:

```apache
<VirtualHost *:80>
    ServerName iphcalculator.ru
    ServerAlias www.iphcalculator.ru
    DocumentRoot /var/www/html

    <Directory /var/www/html>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

Перезапустить Apache:

```bash
systemctl restart apache2
```

Файл `public/.htaccess` (уже есть в проекте, копируется при деплое):

```apache
Options -MultiViews
RewriteEngine On

# Реальные файлы отдаём как есть (включая /api/)
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Всё остальное → index.html (SPA)
RewriteRule ^ index.html [L]
```

### 5. SSL (HTTPS) через Let's Encrypt

```bash
apt install -y certbot python3-certbot-apache
certbot --apache -d iphcalculator.ru -d www.iphcalculator.ru
```

Следовать инструкциям Certbot. SSL обновляется автоматически.

---

## Сборка и деплой фронтенда

### Локально

```bash
npm install
npm run build   # создаёт папку dist/
```

### Деплой на сервер

После сборки скопировать файлы на VPS:

```bash
# Скопировать всё из dist/ в /var/www/html/
scp -r dist/* root@<IP_СЕРВЕРА>:/var/www/html/

# Скопировать .htaccess (Vite его не включает в dist/)
scp public/.htaccess root@<IP_СЕРВЕРА>:/var/www/html/
```

Или одной командой через SSH:

```bash
ssh root@<IP_СЕРВЕРА> "rm -rf /var/www/html/assets && rm /var/www/html/index.html 2>/dev/null; true"
scp -r dist/* root@<IP_СЕРВЕРА>:/var/www/html/
scp public/.htaccess root@<IP_СЕРВЕРА>:/var/www/html/
```

> **Важно:** папку `api/` на сервере не трогать при деплое фронтенда.

---

## Разработка локально

```bash
npm install
npm run dev   # запускает на http://localhost:5173
```

Vite при локальной разработке проксирует `/api/` запросы на сервер. Конфиг в `vite.config.ts`:

```ts
server: {
  proxy: {
    '/api': {
      target: 'https://iphcalculator.ru',
      changeOrigin: true,
      secure: false,
    }
  }
}
```

Т.е. локально работаешь с данными с продакшн-сервера.

---

## API эндпоинты

### Записи (`/api/records.php`)

| Метод | Параметры | Действие |
|---|---|---|
| `GET` | `?store=slavyansky` | Получить все записи склада |
| `POST` | JSON body | Добавить/обновить запись |
| `DELETE` | JSON body | Удалить запись |

**Тело POST:**
```json
{ "store": "slavyansky", "date": "2026-07-09", "orders": 150, "hours": 9.5, "iph": 15.79 }
```

**Тело DELETE:**
```json
{ "store": "slavyansky", "date": "2026-07-09" }
```

### Планы (`/api/plans.php`)

| Метод | Параметры | Действие |
|---|---|---|
| `GET` | `?store=slavyansky` | Получить план склада |
| `POST` | JSON body | Установить план |
| `DELETE` | JSON body | Удалить план |

**Тело POST:**
```json
{ "store": "slavyansky", "value": 40.0 }
```

---

## Добавление нового склада

1. В `src/App.tsx` найти массив `STORES` и добавить объект:

```ts
const STORES = [
  { key: 'slavyansky', name: 'Славянский бул. 5к1' },
  { key: 'tallinskaya', name: 'Таллинская 14' },
  { key: 'pyatnitskaya', name: 'Пятницкая 11' },
  { key: 'vasilevskogo', name: 'Васильевского 17' },
  { key: 'noviy_sklad', name: 'Новый склад' },  // ← добавить
]
```

2. Пересобрать и задеплоить фронтенд. В БД ничего менять не нужно.

---

## Цветовая логика IPH

**Без плана:**
| IPH | Цвет |
|---|---|
| ≥ 50 | Зелёный |
| 30–49 | Жёлтый |
| < 30 | Красный |

**С планом:**
| Значение | Цвет |
|---|---|
| ≥ план | Зелёный |
| план − 10 … план | Жёлтый |
| < план − 10 | Красный |

---

## Текущие данные доступа

Хранятся на сервере в `/var/www/html/api/db.php`.

| Параметр | Значение |
|---|---|
| Сервер | iphcalculator.ru |
| IP | 194.58.109.62 |
| БД хост | localhost |
| БД имя | u3559731_default |
| БД пользователь | u3559731 |
| Веб-корень | /var/www/html |
| API путь | /var/www/html/api |

---

## Репозиторий

```
github.com/nikidav9/mvp-spa
Ветка разработки: claude/warehouse-iph-calculator-IIPFM
```
