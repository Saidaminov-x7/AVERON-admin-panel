Задача безопасности [LOW] — lint debt в admin panel.

oxlint сейчас даёт 14 warnings, включая effect-driven state updates,
impure render-time Date.now(), fast-refresh export boundaries.

Задача:
1. Пройдись по каждому warning по отдельности, с фокусированными
   правками, не затрагивая несвязанные экраны/провайдеры.
2. Для effect-driven state updates и impure Date.now() в рендере — убедись,
   что поведение компонента не меняется (добавь/прогони тесты на
   затронутые компоненты).
3. Никаких eslint-disable/oxlint-disable для "зачистки счётчика" без
   реального фикса.
4. Прогони production build и существующий test suite после изменений.
5. Summary в конце: что исправлено, что потребовало теста, что оставлено
   как есть и почему.

Работай только в этом репозитории. Коммить локально, не пушить.
