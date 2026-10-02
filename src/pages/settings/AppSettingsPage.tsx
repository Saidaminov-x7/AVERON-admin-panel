// src/pages/settings/AppSettingsPage.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/Layout';
import { getSiteSettingsApi, updateSiteSettingsApi } from '../../lib/siteSettingsApi';
import { getAdminAiStatusApi } from '../../lib/productAiApi';
import { Shield, Zap, CreditCard, BarChart2, CheckCircle2 } from 'lucide-react';

const AppSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['admin', 'site-settings'],
    queryFn: getSiteSettingsApi,
  });
  const { data: aiStatus, isError: aiStatusError } = useQuery({
    queryKey: ['admin', 'ai-status'],
    queryFn: ({ signal }) => getAdminAiStatusApi(signal),
    retry: false,
    staleTime: 60_000,
  });

  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(true);
  const [autoModerationEnabled, setAutoModerationEnabled] = useState(false);
  const [maxImagesPerListing, setMaxImagesPerListing] = useState(10);
  const [yandexMetrikaId, setYandexMetrikaId] = useState('112059980');
  const [yandexMetrikaEnabled, setYandexMetrikaEnabled] = useState(true);

  // Feature Flags
  const [deviceIpBanEnabled, setDeviceIpBanEnabled] = useState(false);
  const [adaptiveRateLimitEnabled, setAdaptiveRateLimitEnabled] = useState(true);
  const [twoFactorAuthEnabled, setTwoFactorAuthEnabled] = useState(false);
  const [geoIpValidationEnabled, setGeoIpValidationEnabled] = useState(false);
  const [tokenRotationEnabled, setTokenRotationEnabled] = useState(true);
  const [fieldEncryptionEnabled, setFieldEncryptionEnabled] = useState(true);
  const [sessionQuarantineEnabled, setSessionQuarantineEnabled] = useState(false);
  const [thunderingHerdEnabled, setThunderingHerdEnabled] = useState(true);
  const [fullTextSearchEnabled, setFullTextSearchEnabled] = useState(true);
  const [paymeClickEnabled, setPaymeClickEnabled] = useState(false);
  const [autoFiscalizationEnabled, setAutoFiscalizationEnabled] = useState(false);
  const [smsGatewayEnabled, setSmsGatewayEnabled] = useState(false);
  const [watermarkDetectorEnabled, setWatermarkDetectorEnabled] = useState(false);
  const [webPushEnabled, setWebPushEnabled] = useState(false);
  const [oneIdAuthEnabled, setOneIdAuthEnabled] = useState(false);
  const [yandexRealtyXmlEnabled, setYandexRealtyXmlEnabled] = useState(true);
  const [openTelemetryEnabled, setOpenTelemetryEnabled] = useState(true);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (settings) {
      setGoogleAuthEnabled(settings.googleAuthEnabled ?? true);
      setAutoModerationEnabled(settings.autoModerationEnabled ?? false);
      setMaxImagesPerListing(settings.maxImagesPerListing ?? 10);
      setYandexMetrikaId(settings.yandexMetrikaId ?? '112059980');
      setYandexMetrikaEnabled((settings as any).yandexMetrikaEnabled ?? true);

      setDeviceIpBanEnabled(settings.deviceIpBanEnabled ?? false);
      setAdaptiveRateLimitEnabled(settings.adaptiveRateLimitEnabled ?? true);
      setTwoFactorAuthEnabled(settings.twoFactorAuthEnabled ?? false);
      setGeoIpValidationEnabled(settings.geoIpValidationEnabled ?? false);
      setTokenRotationEnabled(settings.tokenRotationEnabled ?? true);
      setFieldEncryptionEnabled(settings.fieldEncryptionEnabled ?? true);
      setSessionQuarantineEnabled(settings.sessionQuarantineEnabled ?? false);
      setThunderingHerdEnabled(settings.thunderingHerdEnabled ?? true);
      setFullTextSearchEnabled(settings.fullTextSearchEnabled ?? true);
      setPaymeClickEnabled(settings.paymeClickEnabled ?? false);
      setAutoFiscalizationEnabled(settings.autoFiscalizationEnabled ?? false);
      setSmsGatewayEnabled(settings.smsGatewayEnabled ?? false);
      setWatermarkDetectorEnabled(settings.watermarkDetectorEnabled ?? false);
      setWebPushEnabled(settings.webPushEnabled ?? false);
      setOneIdAuthEnabled(settings.oneIdAuthEnabled ?? false);
      setYandexRealtyXmlEnabled(settings.yandexRealtyXmlEnabled ?? true);
      setOpenTelemetryEnabled(settings.openTelemetryEnabled ?? true);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: updateSiteSettingsApi,
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin', 'site-settings'], updated);
      setSuccessMsg('Параметры и Feature Flags успешно сохранены');
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      setErrorMsg(error.response?.data?.message || 'Ошибка сохранения настроек');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    mutation.mutate({
      googleAuthEnabled,
      autoModerationEnabled,
      maxImagesPerListing: Number(maxImagesPerListing),
      yandexMetrikaId,
      yandexMetrikaEnabled,
      deviceIpBanEnabled,
      adaptiveRateLimitEnabled,
      twoFactorAuthEnabled,
      geoIpValidationEnabled,
      tokenRotationEnabled,
      fieldEncryptionEnabled,
      sessionQuarantineEnabled,
      thunderingHerdEnabled,
      fullTextSearchEnabled,
      paymeClickEnabled,
      autoFiscalizationEnabled,
      smsGatewayEnabled,
      watermarkDetectorEnabled,
      webPushEnabled,
      oneIdAuthEnabled,
      yandexRealtyXmlEnabled,
      openTelemetryEnabled,
    });
  };

  const renderToggle = (
    title: string,
    desc: string,
    checked: boolean,
    onChange: (val: boolean) => void,
    inDevelopment = false,
  ) => (
    <div className={`flex items-center justify-between gap-4 py-3 border-b border-app ${inDevelopment ? 'opacity-60' : ''}`}>
      <div>
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-app">{title}</h4>
          {inDevelopment && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              🚧 В разработке
            </span>
          )}
        </div>
        <p className="text-xs text-muted mt-0.5">{desc}</p>
      </div>
      <label
        className={`relative inline-flex items-center flex-shrink-0 ${
          inDevelopment ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
        title={inDevelopment ? 'Функция находится в разработке на бэкенде' : undefined}
      >
        <input
          type="checkbox"
          checked={inDevelopment ? false : checked}
          disabled={inDevelopment}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500 peer-disabled:opacity-50" />
      </label>
    </div>
  );

  return (
    <Layout title="Настройки приложения и Feature Flags">
      <div className="max-w-4xl mx-auto space-y-6">
        <section className="card p-6" aria-labelledby="ai-status-title">
          <h3 id="ai-status-title" className="text-base font-semibold text-app flex items-center gap-2">
            <Zap size={20} className="text-primary-500" />
            AI-каталог: безопасное состояние
          </h3>
          {aiStatusError ? (
            <p className="mt-3 text-sm text-rose-600" role="alert">Не удалось получить состояние AI-конфигурации.</p>
          ) : aiStatus ? (
            <div className="mt-3 space-y-2 text-sm">
              <p>Провайдер настроен: <b>{aiStatus.providerConfigured ? 'Да' : 'Нет'}</b></p>
              <p>Провайдер / модель: <b>{aiStatus.provider} / {aiStatus.model}</b></p>
              <p>Лимит ожидания: <b>{aiStatus.timeoutMs} мс</b></p>
              <ul className="grid gap-1 text-muted sm:grid-cols-3">
                <li>AI Search: {aiStatus.flags.aiSearch ? 'включён' : 'выключен'}</li>
                <li>Style Assistant: {aiStatus.flags.styleAssistant ? 'включён' : 'выключен'}</li>
                <li>Complete the Look: {aiStatus.flags.completeTheLook ? 'включён' : 'выключен'}</li>
              </ul>
              <p className="text-xs text-muted">Ключи API не отображаются. Функции включаются только серверной конфигурацией.</p>
            </div>
          ) : <p className="mt-3 text-sm text-muted" role="status">Загрузка состояния…</p>}
        </section>
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-sm border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
            <CheckCircle2 size={18} />
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-sm border border-rose-200 dark:border-rose-800">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Яндекс.Метрика и Аналитика */}
          <div className="card p-6 space-y-4">
            <h3 className="text-base font-semibold text-app flex items-center gap-2">
              <BarChart2 size={20} className="text-primary-500" />
              Яндекс.Метрика и Внешняя аналитика
            </h3>

            {/* Переключатель */}
            <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-white/10">
              <div>
                <p className="text-sm font-semibold text-app">Включить Яндекс.Метрику</p>
                <p className="text-xs text-muted mt-0.5">
                  {yandexMetrikaEnabled
                    ? 'Счётчик активен и собирает данные о посетителях'
                    : 'Счётчик отключён — скрипт не загружается на сайте'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={yandexMetrikaEnabled}
                  onChange={(e) => setYandexMetrikaEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted mb-1">
                ID счётчика Яндекс.Метрики
              </label>
              <input
                type="text"
                value={yandexMetrikaId}
                onChange={(e) => setYandexMetrikaId(e.target.value)}
                placeholder="112059980"
                className="input font-mono max-w-xs"
                disabled={!yandexMetrikaEnabled}
              />
              <p className="text-xs text-muted mt-1">
                {yandexMetrikaEnabled
                  ? 'Счётчик инжектируется в клиентский бандл сайта с поддержкой SPA-хитов и Вебвизора.'
                  : 'Включите Яндекс.Метрику чтобы активировать счётчик.'}
              </p>
            </div>
          </div>


          {/* 1. Безопасность и Защита */}
          <div className="card p-6 space-y-2">
            <h3 className="text-base font-semibold text-app flex items-center gap-2 mb-4">
              <Shield size={20} className="text-primary-500" />
              Безопасность и Защита
            </h3>
            {renderToggle(
              '1. Автоматический бан по Device & IP',
              'Блокировка мошенников по связке цифрового отпечатка браузера и IP-подсети',
              deviceIpBanEnabled,
              setDeviceIpBanEnabled,
              true, // 🚧 В разработке
            )}
            {renderToggle(
              '2. Адаптивный Rate Limiting / DDoS защита',
              'Динамическое ограничение RPS через Redis Token Bucket для публичных каталогов и поиска',
              adaptiveRateLimitEnabled,
              setAdaptiveRateLimitEnabled,
              false, // Активно
            )}
            {renderToggle(
              '3. Двухфакторная аутентификация (2FA / Telegram Bot)',
              'Обязательное подтверждение одноразовым кодом из Telegram для входа персонала',
              twoFactorAuthEnabled,
              setTwoFactorAuthEnabled,
              false, // Активно
            )}
            {renderToggle(
              '4. Валидация геолокации по IP (GeoIP)',
              'Проверка соответствия IP-адреса региону Узбекистана при публикации объявления',
              geoIpValidationEnabled,
              setGeoIpValidationEnabled,
              true, // 🚧 В разработке
            )}
            {renderToggle(
              '6. Ротация Refresh токенов & Revocation',
              'Инвалидация всей цепочки сессий при попытке повторного использования refresh-токена',
              tokenRotationEnabled,
              setTokenRotationEnabled,
              true, // 🚧 В разработке
            )}
            {renderToggle(
              '7. Field-Level Encryption (AES-256)',
              'Шифрование паспортных данных и договоров аренды в базе данных',
              fieldEncryptionEnabled,
              setFieldEncryptionEnabled,
              true, // 🚧 В разработке
            )}
            {renderToggle(
              '8. Авто-карантин подозрительных сессий',
              'Блокировка сессии при внезапной смене страны с требованием подтверждения по SMS',
              sessionQuarantineEnabled,
              setSessionQuarantineEnabled,
              true, // 🚧 В разработке
            )}
          </div>

          {/* 2. Производительность и Поиск */}
          <div className="card p-6 space-y-2">
            <h3 className="text-base font-semibold text-app flex items-center gap-2 mb-4">
              <Zap size={20} className="text-amber-500" />
              Производительность и Поиск
            </h3>
            {renderToggle(
              '9. Защита кэша от лавины (Thundering Herd)',
              'Single-flight мьютексы в Redis для предотвращения перегрузки БД при сбросе кэша',
              thunderingHerdEnabled,
              setThunderingHerdEnabled,
              true, // 🚧 В разработке
            )}
            {renderToggle(
              '10. Полнотекстовый комбинированный поиск',
              'Полнотекстовый поиск по названию, описанию и адресу объявлений',
              fullTextSearchEnabled,
              setFullTextSearchEnabled,
              false, // Активно
            )}
            {renderToggle(
              '26. Детектор водяных знаков на фото',
              'Автоматическое выявление и отклонение чужих фото со сторонними логотипами',
              watermarkDetectorEnabled,
              setWatermarkDetectorEnabled,
              true, // 🚧 В разработке
            )}
            {renderToggle(
              '41. Генератор Yandex Realty XML фида',
              'Автоматическая генерация фида объявлений по стандарту Яндекс.Недвижимости',
              yandexRealtyXmlEnabled,
              setYandexRealtyXmlEnabled,
              true, // 🚧 В разработке
            )}
            {renderToggle(
              '47. Сквозная трассировка OpenTelemetry',
              'Correlation ID для трекинга пути каждого HTTP-запроса через сервисы',
              openTelemetryEnabled,
              setOpenTelemetryEnabled,
              true, // 🚧 В разработке
            )}
          </div>

          {/* 3. Платежи и Национальные интеграции */}
          <div className="card p-6 space-y-2">
            <h3 className="text-base font-semibold text-app flex items-center gap-2 mb-4">
              <CreditCard size={20} className="text-blue-500" />
              Платежи и Узбекистан-сервисы
            </h3>
            {renderToggle(
              '16. Платежные шлюзы Payme / Click',
              'Приём оплат за продвижение (TOP/VIP) картами UzCard и Humo',
              paymeClickEnabled,
              setPaymeClickEnabled,
              true, // 🚧 В разработке
            )}
            {renderToggle(
              '18. Авто-фискализация чеков (Soliq OFD)',
              'Автоматическая регистрация чеков в налоговой службе ГНК Узбекистана',
              autoFiscalizationEnabled,
              setAutoFiscalizationEnabled,
              true, // 🚧 В разработке
            )}
            {renderToggle(
              '31. SMS-шлюз Узбекистана (Eskiz / PlayMobile)',
              'Отправка сервисных SMS и кодов верификации телефонных номеров',
              smsGatewayEnabled,
              setSmsGatewayEnabled,
              true, // 🚧 В разработке
            )}
            {renderToggle(
              '35. Web Push уведомления',
              'Отправка браузерных уведомлений о снижении цен и новых сообщениях в чате',
              webPushEnabled,
              setWebPushEnabled,
              true, // 🚧 В разработке (PWA push)
            )}
            {renderToggle(
              '37. Интеграция с OneID / E-Imzo',
              'Официальная государственная верификация арендодателей через OneID',
              oneIdAuthEnabled,
              setOneIdAuthEnabled,
              true, // 🚧 В разработке
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn btn-primary px-8"
            >
              {mutation.isPending ? 'Сохранение...' : 'Сохранить все настройки'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default AppSettingsPage;
