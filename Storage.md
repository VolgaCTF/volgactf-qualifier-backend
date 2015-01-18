# Хранение данных
Хранение данных организовывается в базе данных Redis. Ниже приведены основные модели. В самом приложении должно быть минимизировано количество обращений к базе данных. При запуске приложения большая часть объектов должна загружаться из базы данных в объекты JavaScript, если они каким-то образом обновляются, то те процедуры, которые вызывают обновления, уведомляют об этом приложение через механизм publish/subscribe.
## Category
- id (implicit)
- name (required)
- created_at
- updated_at

`themis_category:<id> (HSET)`

## Team
- id (implicit)
- name (required)
- email (required)
- institution
- locality
- country
- password_hash (required)
- created_at
- updated_at

`team:<id> (HSET)`

## Task
- id (implicit)
- title (required)
- description (required)
- categories (implicit)
- answers (implicit)
- score (required)
- status (required)
- created_at
- updated_at

`task:<id> (HSET)`  
`task:<id>:categories (SET)`  
`task:<id>:answers (SET)`

## TaskAnswer
- id (implicit)
- task_id (implicit)
- text (required)
- flags (required)

`task_answer:<id> (HSET)`

## TeamTaskProgress
- team_id (implicit)
- task_id (implicit)
- solved_at (required)

`team:<team_id>:task:<task_id> (HSET)`
