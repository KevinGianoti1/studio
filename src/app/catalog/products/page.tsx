'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/main-layout';
import { PageHeader, PageHeaderDescription, PageHeaderTitle } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCatalogStore } from '@/hooks/use-catalog-store';

export default function CatalogProductsPage() {
  const { products, addProduct } = useCatalogStore();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');

  const onSubmit = () => {
    if (!code || !name) return;
    addProduct({
      code,
      name,
      listPrice: Number(listPrice) || 0,
      salePrice: Number(salePrice) || 0,
    });
    setCode('');
    setName('');
    setListPrice('');
    setSalePrice('');
  };

  return (
    <MainLayout>
      <PageHeader>
        <PageHeaderTitle>Produtos</PageHeaderTitle>
        <PageHeaderDescription>Cadastro simples de produtos para uso da equipe comercial.</PageHeaderDescription>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Novo produto</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input placeholder="Código" value={code} onChange={(e) => setCode(e.target.value)} />
          <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Preço tabela" value={listPrice} onChange={(e) => setListPrice(e.target.value)} />
          <Input placeholder="Preço venda" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
          <div className="md:col-span-4">
            <Button onClick={onSubmit}>Salvar produto</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Produtos cadastrados ({products.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum produto cadastrado ainda.</p>
          ) : (
            products.map((p) => (
              <div key={p.id} className="text-sm border rounded-md p-3">
                <strong>{p.code}</strong> — {p.name} | Tabela: R$ {p.listPrice.toFixed(2)} | Venda: R$ {p.salePrice.toFixed(2)}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}

