'use client';

import { useMemo } from 'react';
import { MainLayout } from '@/components/main-layout';
import { PageHeader, PageHeaderDescription, PageHeaderTitle } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCatalogStore } from '@/hooks/use-catalog-store';

export default function CatalogRelationsPage() {
  const { products, customers, priceRules } = useCatalogStore();

  const relationRows = useMemo(() => {
    return priceRules.map((rule) => {
      const product = products.find((p) => p.id === rule.productId);
      const customer = customers.find((c) => c.id === rule.customerId);
      return {
        id: rule.id,
        customerName: customer?.name || 'Cliente não encontrado',
        productCode: product?.code || '-',
        productName: product?.name || 'Produto não encontrado',
        listPrice: product?.listPrice ?? 0,
        customPrice: rule.customPrice,
      };
    });
  }, [customers, priceRules, products]);

  return (
    <MainLayout>
      <PageHeader>
        <PageHeaderTitle>Relacionamentos Comerciais</PageHeaderTitle>
        <PageHeaderDescription>
          Visão consolidada de cliente × produto × preço customizado.
        </PageHeaderDescription>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Mapa de relacionamento ({relationRows.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {relationRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sem relacionamentos ainda. Cadastre produtos, clientes e regras de preço primeiro.
            </p>
          ) : (
            relationRows.map((row) => (
              <div key={row.id} className="text-sm border rounded-md p-3">
                <strong>{row.customerName}</strong> | {row.productCode} - {row.productName} | Tabela: R$ {row.listPrice.toFixed(2)} | Negociado: R$ {row.customPrice.toFixed(2)}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}

