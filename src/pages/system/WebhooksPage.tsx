// src/pages/system/WebhooksPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import { Button, Modal } from '../../components/ui';
import { getWebhooksApi, createWebhookApi, deleteWebhookApi } from '../../lib/extendedAdminApi';
import { Webhook, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { toast } from 'sonner';

const WebhooksPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [event, setEvent] = useState('ALL');

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['admin', 'webhooks'],
    queryFn: getWebhooksApi,
  });

  const createMutation = useMutation({
    mutationFn: createWebhookApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'webhooks'] });
      setIsOpenModal(false);
      setName('');
      setUrl('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWebhookApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'webhooks'] });
      toast.success('Вебхук удален');
    },
  });

  const [testingId, setTestingId] = useState<string | null>(null);

  const handleTestWebhook = async (id: string) => {
    setTestingId(id);
    try {
      const { testWebhookApi } = await import('../../lib/extendedAdminApi');
      const res = await testWebhookApi(id);
      if (res.success) {
        toast.success(`Тестовый вебхук успешно доставлен (HTTP ${res.statusCode || 200})`);
      } else {
        toast.error(`Ошибка доставки тестового вебхука: ${res.error || 'Статус ' + res.statusCode}`);
      }
    } catch (err: any) {
      toast.error('Сбой отправки тестового вебхука: ' + (err.message || 'Ошибка сети'));
    } finally {
      setTestingId(null);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;
    createMutation.mutate({
      name,
      url,
      events: [event],
    });
  };

  const currentLocale = i18n.language === 'en' ? enUS : ru;

  return (
    <Layout title={t('system.webhooksTitle', 'Webhooks & Telegram-алерты')}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-muted">
            Настройте отправку мгновенных HTTP вебхуков или оповещений в Telegram-чат модераторов при обнаружении скама, жалобах и критических ошибках.
          </p>
          <button
            type="button"
            onClick={() => setIsOpenModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> {t('system.addWebhook', 'Добавить вебхук')}
          </button>
        </div>

        {/* Список вебхуков */}
        <div className="card p-0 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted">{t('common.loading', 'Загрузка вебхуков...')}</div>
          ) : !webhooks || webhooks.length === 0 ? (
            <div className="p-8 text-center text-muted">{t('system.noWebhooks', 'Вебхуков пока не настроено')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-white/5 border-b border-app text-xs text-muted uppercase">
                  <tr>
                    <th className="p-3">{t('system.webhookName', 'Название')}</th>
                    <th className="p-3">{t('system.webhookUrl', 'URL назначения')}</th>
                    <th className="p-3">{t('system.events', 'События')}</th>
                    <th className="p-3">{t('common.status', 'Статус')}</th>
                    <th className="p-3">{t('common.date', 'Дата добавления')}</th>
                    <th className="p-3 text-right">{t('common.actions', 'Действия')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app">
                  {webhooks.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-3 font-semibold text-app flex items-center gap-2">
                        <Webhook size={16} className="text-primary-500" />
                        {w.name}
                      </td>
                      <td className="p-3 font-mono text-xs text-muted max-w-xs truncate">{w.url}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {w.events.map((ev, i) => (
                            <span key={i} className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-white/10 font-mono">
                              {ev}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                          {t('common.active', 'Активен')}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-muted">
                        {format(new Date(w.createdAt), 'd MMM yyyy', { locale: currentLocale })}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTestWebhook(w.id)}
                            disabled={testingId === w.id}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors cursor-pointer disabled:opacity-50"
                            title="Тестовая отправка пинга"
                          >
                            {testingId === w.id ? 'Отправка...' : 'Тест'}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(w.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title={t('common.delete', 'Удалить')}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Модалка создания */}
        <Modal
          isOpen={isOpenModal}
          onClose={() => setIsOpenModal(false)}
          title={t('system.addWebhook', 'Добавить вебхук')}
          size="md"
          fullscreenOnMobile
          closeLabel={t('common.close', 'Закрыть')}
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsOpenModal(false)} disabled={createMutation.isPending}>
                {t('common.cancel', 'Отмена')}
              </Button>
              <Button type="submit" form="webhook-create-form" loading={createMutation.isPending}>
                {createMutation.isPending ? t('common.saving', 'Сохранение...') : t('common.save', 'Добавить')}
              </Button>
            </>
          }
        >
              <form id="webhook-create-form" onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">{t('system.webhookName', 'Название (для идентификации)')}</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Telegram Alerts / Zapier CRM"
                    className="w-full px-3 py-2 rounded-xl border border-app bg-app text-app text-sm outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">{t('system.webhookUrl', 'URL эндпоинта')}</label>
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://api.telegram.org/bot.../sendMessage"
                    className="w-full px-3 py-2 rounded-xl border border-app bg-app text-app font-mono text-sm outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">{t('system.events', 'События для отправки')}</label>
                  <select
                    value={event}
                    onChange={(e) => setEvent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-app bg-app text-app text-sm outline-none focus:border-primary-500 cursor-pointer"
                  >
                    <option value="ALL">Все события платформы (ALL)</option>
                    <option value="LISTING_REPORTED">Новая жалоба на объявление</option>
                    <option value="FRAUD_DETECTED">Обнаружен подозрительный скам</option>
                    <option value="USER_REGISTERED">Регистрация нового пользователя</option>
                  </select>
                </div>

              </form>
        </Modal>
      </div>
    </Layout>
  );
};

export default WebhooksPage;
