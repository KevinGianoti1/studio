'use client';

import Link from 'next/link';
import { MainLayout } from '@/components/main-layout';
import { PageHeader, PageHeaderDescription, PageHeaderTitle } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Boxes, Users, Tags, Link2 } from 'lucide-react';

const items = [
  {
    href: '/catalog/products',
    title: 'Produtos',
    description: 'Cadastre e consulte produtos para a equipe comercial.',
    icon: Boxes,
  },
  {
    href: '/catalog/customers',
    title: 'Clientes',
    description: 'Cadastre e mantenha a base de clientes comercial.',
    icon: Users,
  },
  {
    href: '/catalog/pricing',
    title: 'Preços',
    description: 'Defina preço padrão e preço customizado por cliente.',
    icon: Tags,
  },
  {
    href: '/catalog/relations',
    title: 'Relacionamentos',
    description: 'Visualize combinações produto × cliente × preço.',
    icon: Link2,
  },
];

export default function CatalogHubPage() {
  return (
    <MainLayout>
      <PageHeader>
        <PageHeaderTitle>Comercial 360</PageHeaderTitle>
        <PageHeaderDescription>
          Um espaço único para organizar produtos, clientes, preços e relacionamentos comerciais.
        </PageHeaderDescription>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full transition-all hover:shadow-lg hover:border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <item.icon className="h-5 w-5 text-primary" />
                  {item.title}
                </CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm font-medium text-primary flex items-center gap-2">
                Abrir <ArrowRight className="h-4 w-4" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </MainLayout>
  );
}

