import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, X, Package, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Layout from '../../components/Layout';
import { approveImport, getImports, rejectImport, type ImportedProduct } from '../../lib/commerceApi';
import { EmptyState, Modal, Input, Button, Textarea } from '../../components/ui';

export default function ImportsPage() {
  const client = useQueryClient();
  const [approveItem, setApproveItem] = useState<ImportedProduct | null>(null);
  const [rejectItem, setRejectItem] = useState<ImportedProduct | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['imports', 'PENDING_REVIEW'],
    queryFn: () => getImports(),
  });

  const refresh = () => client.invalidateQueries({ queryKey: ['imports'] });

  const approveMutation = useMutation({
    mutationFn: ({ id, price }: { id: string; price: number }) =>
      approveImport(id, price, 1800),
    onSuccess: () => {
      toast.success('Товар опубликован');
      setApproveItem(null);
      setPriceInput('');
      refresh();
    },
    onError: () => toast.error('Ошибка публикации'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectImport(id, reason),
    onSuccess: () => {
      toast.success('Импорт отклонён');
      setRejectItem(null);
      setRejectReason('');
      refresh();
    },
    onError: () => toast.error('Ошибка отклонения'),
  });

  const openApprove = (item: ImportedProduct) => {
    setApproveItem(item);
    setPriceInput(item.suggestedPriceUzs ? String(Math.round(Number(item.suggestedPriceUzs))) : '');
  };

  return (
    <Layout title="Импорт · Очередь проверки">
      <div className="space-y-6">
        {/* Заголовок */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold tracking-widest text-amber-500">AI IMPORT QUEUE</p>
            <h1 className="text-2xl font-black text-app">Ожидают проверки</h1>
          </div>
          {data.length > 0 && (
            <span className="badge-warning">{data.length} товаров</span>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-32 animate-pulse" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={<Package size={32} />}
            title="Очередь пуста"
            description="Новые товары из парсера появятся здесь автоматически"
          />
        ) : (
          <div className="grid gap-4">
            {data.map((item) => (
              <article key={item.id} className="card">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                  {/* Изображение */}
                  {item.imageUrl && (
                    <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800">
                      <img
                        src={item.imageUrl}
                        alt={item.originalTitle}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  )}

                  {/* Информация */}
                  <div className="flex-1 min-w-0">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="badge-info">{item.source}</span>
                      <span className="badge-warning">PENDING REVIEW</span>
                    </div>
                    <h2 className="font-bold text-app truncate">{item.originalTitle}</h2>
                    <div className="mt-2 text-sm text-muted">
                      Закупка: <strong className="text-app">¥{item.sourcePriceCny}</strong>
                      {' · '}
                      Рекомендуемая цена:{' '}
                      <strong className="text-app">
                        {Number(item.suggestedPriceUzs || 0).toLocaleString('ru-RU')} сум
                      </strong>
                    </div>
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm text-primary-500 hover:underline"
                    >
                      Источник <ExternalLink size={14} />
                    </a>
                  </div>

                  {/* Действия */}
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Check size={15} />}
                      onClick={() => openApprove(item)}
                    >
                      Одобрить
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<X size={15} />}
                      className="text-red-500 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => { setRejectItem(item); setRejectReason(''); }}
                    >
                      Отклонить
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Модал: Одобрить */}
      <Modal
        isOpen={!!approveItem}
        onClose={() => { setApproveItem(null); setPriceInput(''); }}
        title="Одобрить товар"
        subtitle={approveItem?.originalTitle}
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => { setApproveItem(null); setPriceInput(''); }}>
              Отмена
            </Button>
            <Button
              loading={approveMutation.isPending}
              leftIcon={<Check size={15} />}
              disabled={!priceInput || Number(priceInput) <= 0}
              onClick={() => {
                if (approveItem && Number(priceInput) > 0) {
                  approveMutation.mutate({ id: approveItem.id, price: Number(priceInput) });
                }
              }}
            >
              Опубликовать
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>Укажите финальную цену продажи в сумах. Рекомендованная: <strong>{approveItem ? Number(approveItem.suggestedPriceUzs || 0).toLocaleString('ru-RU') : 0} сум</strong></span>
          </div>
          <Input
            label="Цена продажи (UZS)"
            type="number"
            min={1}
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="Например: 450000"
          />
        </div>
      </Modal>

      {/* Модал: Отклонить */}
      <Modal
        isOpen={!!rejectItem}
        onClose={() => { setRejectItem(null); setRejectReason(''); }}
        title="Отклонить импорт"
        subtitle={rejectItem?.originalTitle}
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => { setRejectItem(null); setRejectReason(''); }}>
              Отмена
            </Button>
            <Button
              variant="danger"
              loading={rejectMutation.isPending}
              leftIcon={<X size={15} />}
              disabled={rejectReason.trim().length < 3}
              onClick={() => {
                if (rejectItem && rejectReason.trim().length >= 3) {
                  rejectMutation.mutate({ id: rejectItem.id, reason: rejectReason.trim() });
                }
              }}
            >
              Отклонить
            </Button>
          </div>
        }
      >
        <Textarea
          label="Причина отклонения"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Укажите причину (минимум 3 символа)..."
          rows={3}
          helperText="Минимум 3 символа"
        />
      </Modal>
    </Layout>
  );
}
