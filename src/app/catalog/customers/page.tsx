'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/main-layout';
import { PageHeader, PageHeaderDescription, PageHeaderTitle } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCatalogStore } from '@/hooks/use-catalog-store';

export default function CatalogCustomersPage() {
  const { customers, addCustomer } = useCatalogStore();
  const [name, setName] = useState('');
  const [segment, setSegment] = useState('');
  const [city, setCity] = useState('');

  const onSubmit = () => {
    if (!name) return;
    addCustomer({ name, segment, city });
    setName('');
    setSegment('');
    setCity('');
  };

  return (
    <MainLayout>
      <PageHeader>
        <PageHeaderTitle>Clientes</PageHeaderTitle>
        <PageHeaderDescription>Cadastro simplificado de clientes para rotina comercial.</PageHeaderDescription>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Novo cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="Nome do cliente" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Segmento" value={segment} onChange={(e) => setSegment(e.target.value)} />
          <Input placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
          <div className="md:col-span-3">
            <Button onClick={onSubmit}>Salvar cliente</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Clientes cadastrados ({customers.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {customers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
          ) : (
            customers.map((c) => (
              <div key={c.id} className="text-sm border rounded-md p-3">
                <strong>{c.name}</strong> {c.segment ? `| ${c.segment}` : ''} {c.city ? `| ${c.city}` : ''}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}

