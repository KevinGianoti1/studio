'use client';

import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/main-layout';
import { PageHeader, PageHeaderDescription, PageHeaderTitle } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCatalogStore } from '@/hooks/use-catalog-store';

export default function CatalogPricingPage() {
  const { products, customers, priceRules, addPriceRule } = useCatalogStore();
  const [productId, setProductId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  const canSave = productId && customerId && Number(customPrice) > 0;

  const enrichedRules = useMemo(() => {
    return priceRules.map((rule) => ({
      ...rule,
      product: products.find((p) => p.id === rule.productId),
      customer: customers.find((c) => c.id === rule.customerId),
    }));
  }, [customers, priceRules, products]);

  const onSubmit = () => {
    if (!canSave) return;
    addPriceRule({
      productId,
      customerId,
      customPrice: Number(customPrice),
    });
    setCustomPrice('');
  };

  return (
    <MainLayout>
      <PageHeader>
        <PageHeaderTitle>Preços por Cliente</PageHeaderTitle>
        <PageHeaderDescription>
          Relacione produtos e clientes com preço customizado para negociação comercial.
        </PageHeaderDescription>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Nova regra de preço</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um produto" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.code} - {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Preço customizado"
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
          />
          <div className="md:col-span-3">
            <Button onClick={onSubmit} disabled={!canSave}>
              Salvar regra
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Regras cadastradas ({enrichedRules.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {enrichedRules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma regra cadastrada ainda.</p>
          ) : (
            enrichedRules.map((rule) => (
              <div key={rule.id} className="text-sm border rounded-md p-3">
                <strong>{rule.customer?.name || 'Cliente removido'}</strong> →{' '}
                {rule.product?.code || 'Produto removido'} - {rule.product?.name || ''} | R$ {rule.customPrice.toFixed(2)}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}

