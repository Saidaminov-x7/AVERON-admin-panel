// src/pages/LoginPage.tsx
// Страница входа в административную панель с поддержкой Telegram 2FA

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { loginApi, verify2faApi, resend2faApi, verifyAdminTotpLoginApi } from '../lib/authApi';
import ThemeToggle from '../components/ThemeToggle/ThemeToggle';

const REMEMBER_EMAIL_KEY = 'admin_remembered_email';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [step, setStep] = useState<'credentials' | 'telegram' | 'totp'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 2FA state
  const [tempToken, setTempToken] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [infoMessage, setInfoMessage] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Загружаем сохранённый email при монтировании
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  // Таймер для повторной отправки кода
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Фокус на инпут кода при переходе на 2FA
  useEffect(() => {
    if (step !== 'credentials') {
      setTimeout(() => {
        codeInputRef.current?.focus();
      }, 100);
    }
  }, [step]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const data = await loginApi({ email, password });

      if (data.requireTotp && data.challengeToken) {
        setChallengeToken(data.challengeToken);
        setTwoFactorCode('');
        setStep('totp');
        setInfoMessage('');
        return;
      }

      // Если требуется 2FA подтверждение через Telegram
      if (data.require2fa && data.tempToken) {
        setTempToken(data.tempToken);
        setStep('telegram');
        setResendCooldown(60); // 60 секунд до повторной отправки
        setInfoMessage(data.message || 'Одноразовый код отправлен в ваш Telegram бот.');
        return;
      }

      // Если авторизация без 2FA (для обычных ролей, если вызывается)
      if (data.accessToken && data.user) {
        if (data.user.role !== 'ADMIN' && !data.user.adminRole) {
          setError('Доступ запрещён. Эта панель предназначена только для администраторов.');
          return;
        }

        setAuth(data.accessToken, data.user);

        if (rememberMe) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, email);
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
        }

        navigate('/', { replace: true });
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      if (errorObj.response?.status === 401) {
        setError('Неверный email или пароль');
      } else if (errorObj.response?.status === 403) {
        setError('Аккаунт заблокирован или доступ запрещён');
      } else if (errorObj.response?.status === 429 || errorObj.message?.includes('Слишком много') || errorObj.message?.includes('Rate limit')) {
        setError('Слишком много попыток входа. Попробуйте через 1-2 минуты.');
      } else if (errorObj.response?.data?.message) {
        setError(errorObj.response.data.message);
      } else if (errorObj.message) {
        setError(errorObj.message);
      } else {
        setError('Ошибка соединения с сервером. Проверьте подключение.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handle2faSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await verify2faApi({
        tempToken,
        code: twoFactorCode.trim(),
      });

      if (data.user.role !== 'ADMIN' && !data.user.adminRole) {
        setError('Доступ запрещён. Эта панель предназначена только для администраторов.');
        return;
      }

      setAuth(data.accessToken, data.user);

      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      navigate('/', { replace: true });
    } catch (err: unknown) {
      const errorObj = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      if (errorObj.response?.data?.message) {
        setError(errorObj.response.data.message);
      } else if (errorObj.response?.status === 400) {
        setError('Неверный код подтверждения или срок его действия истек.');
      } else {
        setError('Ошибка верификации кода. Попробуйте еще раз.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await verifyAdminTotpLoginApi(challengeToken, twoFactorCode.trim());
      if (data.user.role !== 'ADMIN' && !data.user.adminRole) {
        setError('Доступ запрещён. Эта панель предназначена только для администраторов.');
        return;
      }
      setAuth(data.accessToken, data.user);
      if (rememberMe) localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      else localStorage.removeItem(REMEMBER_EMAIL_KEY);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj.response?.data?.message || 'Неверный код или срок действия запроса истёк.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || !tempToken || loading) return;
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const res = await resend2faApi(tempToken);
      setInfoMessage(res.message || 'Новый код отправлен в Telegram бот.');
      setResendCooldown(60);
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      setError(errorObj.response?.data?.message || 'Не удалось отправить код повторно.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setStep('credentials');
    setTempToken('');
    setChallengeToken('');
    setTwoFactorCode('');
    setError('');
    setInfoMessage('');
  };

  return (
    <div className="averon-admin-shell min-h-screen bg-app">
      <header className="h-20 border-b border-app bg-surface">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-[0.2em] text-app">AVERON</span>
            <span className="bg-primary-500 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white">ADMIN</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-[1440px] items-stretch lg:grid-cols-[minmax(0,1fr)_520px]">
        <section className="hidden border-r border-app bg-surface-soft px-12 py-16 lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-muted">Управление AVERON</p>
            <h1 className="max-w-2xl text-5xl font-black leading-[1.02] text-app xl:text-6xl">
              Единый стиль.<br />Полный контроль.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted">
              Товары, заказы, пользователи и настройки магазина — в защищённой панели, оформленной в той же визуальной системе, что и основной сайт.
            </p>
          </div>
          <div className="grid grid-cols-3 border-y border-app py-5 text-xs font-semibold uppercase tracking-wider text-muted">
            <span>Каталог</span><span>Заказы</span><span>Аналитика</span>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-12 sm:px-10">
      <div className="relative w-full max-w-sm">
        <div className="mb-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">Только для сотрудников</p>
          <h1 className="text-3xl font-black text-app">
            {step !== 'credentials' ? 'Подтверждение входа' : 'Вход в панель'}
          </h1>
          <p className="text-muted text-sm mt-1">
            {step === 'telegram' ? 'Введите код из Telegram бота' : step === 'totp' ? 'Введите код приложения-аутентификатора или резервный код' : 'Введите данные администратора'}
          </p>
        </div>

        {/* Форма */}
        <div className="card">
          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-app mb-1.5">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@averon.uz"
                  required
                  autoComplete="email"
                  className="input"
                />
              </div>

              {/* Пароль */}
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-app mb-1.5">
                  Пароль
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Введите пароль"
                    required
                    autoComplete="current-password"
                    className="input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-app transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center text-sm">
                <label className="flex items-center gap-2 cursor-pointer select-none text-app">
                  <input
                    type="checkbox"
                    id="remember-me"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs text-muted hover:text-app transition-colors">Запомнить меня</span>
                </label>
              </div>

              {/* Ошибка */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Кнопка входа */}
              <button
                type="submit"
                id="login-submit"
                disabled={loading}
                className="
                  w-full py-2.5 px-4 rounded-lg font-medium text-sm text-white
                  bg-primary-500 hover:bg-primary-600 active:bg-primary-700
                  disabled:opacity-60 disabled:cursor-not-allowed
                  transition-all duration-150
                  flex items-center justify-center gap-2
                "
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Проверка данных...
                  </>
                ) : 'Войти в панель'}
              </button>
            </form>
          ) : step === 'telegram' ? (
            <form onSubmit={handle2faSubmit} className="space-y-4">
              {/* Уведомление о Telegram */}
              <div className="flex items-center gap-3 p-3 bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/60 rounded-xl text-xs text-primary-900 dark:text-primary-200">
                <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.198 2.433a2.242 2.242 0 0 0-1.022.215l-17.5 7.5a2.25 2.25 0 0 0 .126 4.15l4.898 1.633 1.83 5.488a1.5 1.5 0 0 0 2.502.504l2.842-2.842 4.962 3.722a2.25 2.25 0 0 0 3.518-1.517l3.5-17a2.25 2.25 0 0 0-2.656-2.853z" />
                  </svg>
                </div>
                <div className="leading-tight">
                  <p className="font-semibold text-sm mb-0.5">Telegram 2FA</p>
                  <p className="opacity-90">{infoMessage || 'Проверьте сообщения в Telegram-боте'}</p>
                </div>
              </div>

              {/* Поле ввода 6-значного кода */}
              <div>
                <label htmlFor="2fa-code" className="block text-sm font-medium text-app mb-1.5">
                  6-значный код подтверждения
                </label>
                <input
                  ref={codeInputRef}
                  id="2fa-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  required
                  autoComplete="one-time-code"
                  className="input text-center tracking-[0.5em] text-xl font-mono font-bold"
                />
              </div>

              {/* Ошибка */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Кнопка подтверждения */}
              <button
                type="submit"
                id="verify-2fa-submit"
                disabled={loading || twoFactorCode.length !== 6}
                className="
                  w-full py-2.5 px-4 rounded-lg font-medium text-sm text-white
                  bg-primary-500 hover:bg-primary-600 active:bg-primary-700
                  disabled:opacity-60 disabled:cursor-not-allowed
                  transition-all duration-150
                  flex items-center justify-center gap-2
                "
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Подтверждение...
                  </>
                ) : 'Подтвердить и войти'}
              </button>

              {/* Повторная отправка и назад */}
              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="text-muted hover:text-app transition-colors"
                >
                  ← Назад к паролю
                </button>

                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || loading}
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {resendCooldown > 0 ? `Повтор через ${resendCooldown}с` : 'Отправить код снова'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleTotpSubmit} className="space-y-4">
              <div className="rounded-xl border border-primary-200 bg-primary-50 p-3 text-sm text-primary-900 dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-200">
                Подтвердите вход кодом из приложения-аутентификатора. Вместо него можно использовать резервный код.
              </div>
              <div>
                <label htmlFor="totp-code" className="mb-1.5 block text-sm font-medium text-app">
                  Код подтверждения
                </label>
                <input
                  ref={codeInputRef}
                  id="totp-code"
                  type="text"
                  inputMode="text"
                  value={twoFactorCode}
                  onChange={(event) => setTwoFactorCode(event.target.value.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40))}
                  placeholder="123456 или резервный код"
                  required
                  autoComplete="one-time-code"
                  className="input text-center font-mono font-bold tracking-widest"
                />
              </div>
              {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{error}</div>}
              <button
                type="submit"
                disabled={loading || twoFactorCode.trim().length < 6}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Проверка…' : 'Подтвердить и войти'}
              </button>
              <button type="button" onClick={handleBackToLogin} className="w-full pt-2 text-xs text-muted transition-colors hover:text-app">
                ← Назад к паролю
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Защищённый вход в панель администратора
        </p>
      </div>
        </section>
      </main>
    </div>
  );
};

export default LoginPage;
