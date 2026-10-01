import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Button, Input, Modal } from '../ui';
import {
  disableAdminTotpApi,
  enableAdminTotpApi,
  getAdminTotpStatusApi,
  regenerateAdminRecoveryCodesApi,
  setupAdminTotpApi,
  type AdminTotpSetup,
} from '../../lib/authApi';

type DialogMode = 'setup' | 'recovery' | 'regenerate' | 'disable' | null;

export function AdminSecuritySection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<DialogMode>(null);
  const [setup, setSetup] = useState<AdminTotpSetup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');

  const status = useQuery({
    queryKey: ['admin', 'security', 'totp'],
    queryFn: getAdminTotpStatusApi,
  });

  const showCodes = (codes: string[]) => {
    setRecoveryCodes(codes);
    setAcknowledged(false);
    setPassword('');
    setCode('');
    setMode('recovery');
    void queryClient.invalidateQueries({ queryKey: ['admin', 'security', 'totp'] });
  };

  const setupMutation = useMutation({
    mutationFn: setupAdminTotpApi,
    onSuccess: (data) => {
      setSetup(data);
      setMode('setup');
      setError('');
    },
    onError: () => setError(t('security.requestFailed')),
  });

  const enableMutation = useMutation({
    mutationFn: () => enableAdminTotpApi(setup!.setupToken, code),
    onSuccess: ({ recoveryCodes: codes }) => {
      setSetup(null);
      showCodes(codes);
    },
    onError: () => setError(t('security.invalidCode')),
  });

  const regenerateMutation = useMutation({
    mutationFn: () => regenerateAdminRecoveryCodesApi(password, code),
    onSuccess: ({ recoveryCodes: codes }) => showCodes(codes),
    onError: () => setError(t('security.verificationFailed')),
  });

  const disableMutation = useMutation({
    mutationFn: () => disableAdminTotpApi(password, code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'security', 'totp'] });
      closeDialog();
      toast.success(t('security.disabled'));
    },
    onError: () => setError(t('security.verificationFailed')),
  });

  function closeDialog() {
    if (mode === 'recovery' && !acknowledged) return;
    setMode(null);
    setSetup(null);
    setRecoveryCodes([]);
    setPassword('');
    setCode('');
    setError('');
    setAcknowledged(false);
  }

  const submitting = enableMutation.isPending || regenerateMutation.isPending || disableMutation.isPending;

  return (
    <section className="card space-y-4" aria-labelledby="admin-security-heading">
      <div>
        <h3 id="admin-security-heading" className="mb-1 text-base font-semibold text-app">{t('security.title')}</h3>
        <p className="text-sm text-muted">{t('security.description')}</p>
      </div>
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-app p-4 sm:flex-row sm:items-center">
        <div>
          <p className="font-semibold text-app">{t('security.twoFactor')}</p>
          <p className="text-sm text-muted">
            {status.isLoading
              ? t('common.loading')
              : status.data?.enabled
                ? t('security.enabled', { count: status.data.unusedRecoveryCodes })
                : t('security.disabledStatus')}
          </p>
          {status.isError && <p role="alert" className="mt-1 text-sm text-red-500">{t('security.statusError')}</p>}
        </div>
        {status.data?.enabled ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => { setError(''); setMode('regenerate'); }}>
              {t('security.regenerateCodes')}
            </Button>
            <Button variant="outline" onClick={() => { setError(''); setMode('disable'); }}>
              {t('security.disableAction')}
            </Button>
          </div>
        ) : (
          <Button
            disabled={status.isLoading || status.isError || setupMutation.isPending}
            loading={setupMutation.isPending}
            onClick={() => { setError(''); setupMutation.mutate(); }}
          >
            {t('security.enableAction')}
          </Button>
        )}
      </div>

      <Modal
        isOpen={mode !== null}
        onClose={closeDialog}
        title={mode === 'setup' ? t('security.setupTitle') : mode === 'recovery' ? t('security.recoveryTitle') : mode === 'disable' ? t('security.disableTitle') : t('security.regenerateTitle')}
        closeLabel={t('common.close')}
        size="md"
        fullscreenOnMobile
        footer={(
          <>
            <Button variant="ghost" onClick={closeDialog} disabled={submitting || (mode === 'recovery' && !acknowledged)}>
              {t(mode === 'recovery' ? 'security.savedCodes' : 'common.cancel')}
            </Button>
            {mode === 'setup' && (
              <Button onClick={() => enableMutation.mutate()} loading={enableMutation.isPending} disabled={code.replace(/\D/g, '').length !== 6}>
                {t('security.confirmSetup')}
              </Button>
            )}
            {mode === 'regenerate' && (
              <Button onClick={() => regenerateMutation.mutate()} loading={regenerateMutation.isPending} disabled={!password || code.replace(/\D/g, '').length !== 6}>
                {t('security.regenerateAction')}
              </Button>
            )}
            {mode === 'disable' && (
              <Button onClick={() => disableMutation.mutate()} loading={disableMutation.isPending} disabled={!password || code.replace(/\D/g, '').length !== 6}>
                {t('security.disableAction')}
              </Button>
            )}
            {mode === 'recovery' && (
              <Button onClick={closeDialog} disabled={!acknowledged}>{t('security.done')}</Button>
            )}
          </>
        )}
      >
        <div className="space-y-4">
          {mode === 'setup' && setup && (
            <>
              <p className="text-sm text-muted">{t('security.scanInstructions')}</p>
              <div className="flex justify-center rounded-xl bg-white p-3">
                <img src={setup.qrCodeDataUrl} alt={t('security.qrAlt')} className="h-60 w-60 max-w-full object-contain" />
              </div>
              <Input label={t('security.manualKey')} value={setup.secret} readOnly />
              <Input
                label={t('security.codeLabel')}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                error={error}
              />
              <p className="text-xs text-muted">{t('security.setupExpires', { seconds: setup.expiresInSeconds })}</p>
            </>
          )}
          {mode === 'recovery' && (
            <>
              <p className="text-sm text-muted">{t('security.recoveryInstructions')}</p>
              <ul className="grid grid-cols-1 gap-2 rounded-xl border border-app bg-app p-4 font-mono text-sm sm:grid-cols-2">
                {recoveryCodes.map((recoveryCode) => <li key={recoveryCode}>{recoveryCode}</li>)}
              </ul>
              <label className="flex items-start gap-2 text-sm text-app">
                <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1" />
                <span>{t('security.acknowledgeCodes')}</span>
              </label>
            </>
          )}
          {(mode === 'regenerate' || mode === 'disable') && (
            <>
              <p className="text-sm text-muted">{t(mode === 'disable' ? 'security.disableWarning' : 'security.regenerateWarning')}</p>
              <Input
                type="password"
                label={t('security.passwordLabel')}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
              <Input
                label={t('security.codeLabel')}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40))}
                autoComplete="one-time-code"
              />
            </>
          )}
          {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        </div>
      </Modal>
    </section>
  );
}
