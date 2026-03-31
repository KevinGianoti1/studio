// src/app/page.tsx
'use client';

import { Suspense, useContext } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, User, ArrowRight, Tag, ClipboardList, Radar, ShoppingCart, ClipboardCheck, Trophy, Rocket, Activity } from "lucide-react";
import { SalesProvider, SalesContext } from "@/contexts/sales-context";
import { PageHeader, PageHeaderTitle, PageHeaderDescription } from "@/components/page-header";
import { StrategicOverview } from "@/components/strategic-overview";
import { MainLayout } from "@/components/main-layout";

function HomePageContent() {
  const { sales } = useContext(SalesContext);

  return (
    <>
      <PageHeader>
        <PageHeaderTitle>Visão Geral Estratégica</PageHeaderTitle>
        <PageHeaderDescription>Seu hub central para análise de performance. Comece com o panorama estratégico ou navegue para uma seção específica.</PageHeaderDescription>
      </PageHeader>
      
      <div className="space-y-8">
        <section>
          <StrategicOverview data={sales} />
        </section>

        <section>
            <h2 className="text-2xl font-bold tracking-tighter mb-4">Navegar para Seções</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <CardLink 
                href="/accelerators"
                icon={<Rocket className="h-8 w-8 text-primary" />}
                title="Aceleradores"
                description="Acompanhe os marcos de comissão e o progresso para o próximo nível."
                buttonText="Ver Aceleradores"
              />
              <CardLink 
                href="/competition"
                icon={<Trophy className="h-8 w-8 text-primary" />}
                title="Competição e Pódio"
                description="Acompanhe os rankings, conquistas e performance gamificada."
                buttonText="Ver Competição"
              />
              <CardLink 
                href="/teams"
                icon={<Users className="h-8 w-8 text-primary" />}
                title="Análise de Equipes"
                description="Compare a performance e a evolução das suas equipes de vendas."
                buttonText="Ir para Equipes"
              />
              <CardLink 
                href="/sellers"
                icon={<User className="h-8 w-8 text-primary" />}
                title="Análise de Vendedores"
                description="Explore o desempenho individual e o histórico de cada vendedor."
                buttonText="Ir para Vendedores"
              />
               <CardLink 
                href="/campaigns"
                icon={<Tag className="h-8 w-8 text-primary" />}
                title="Gestão de Campanhas"
                description="Crie, edite e analise a performance de suas campanhas de vendas."
                buttonText="Ir para Campanhas"
              />
              <CardLink 
                href="/deliverables"
                icon={<ClipboardCheck className="h-8 w-8 text-primary" />}
                title="Entregáveis Diários"
                description="Acompanhe as metas diárias de ligações, propostas e vídeos."
                buttonText="Ver Entregáveis"
              />
              <CardLink 
                href="/attributes"
                icon={<Radar className="h-8 w-8 text-primary" />}
                title="Análise de Atributos"
                description="Visualize a performance dos vendedores por competência."
                buttonText="Ver Atributos"
              />
               <CardLink 
                href="/survey"
                icon={<ClipboardList className="h-8 w-8 text-primary" />}
                title="Reunião 1:1"
                description="Acesse o formulário para registrar os pontos da sua reunião individual."
                buttonText="Abrir Formulário"
              />
               <CardLink 
                href="/sellout"
                icon={<ShoppingCart className="h-8 w-8 text-primary" />}
                title="Relatório de Sell Out"
                description="Faça upload e analise os dados de venda de produtos para clientes."
                buttonText="Analisar Sell Out"
              />
              <CardLink
                href="/health"
                icon={<Activity className="h-8 w-8 text-primary" />}
                title="Saúde do Sistema"
                description="Monitore disponibilidade, variáveis críticas e status operacional do ambiente."
                buttonText="Ver Saúde"
              />
          </div>
        </section>
      </div>
    </>
  );
}

const CardLink = ({ href, icon, title, description, buttonText }: { href: string, icon: React.ReactNode, title: string, description: string, buttonText: string }) => (
     <Link href={href} className="flex">
        <Card className="hover:border-primary hover:shadow-lg transition-all cursor-pointer w-full flex flex-col hover:-translate-y-1">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                        {icon}
                    </div>
                    <div>
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow flex items-end justify-end mt-auto">
                <Button variant="link">
                    {buttonText} <ArrowRight className="ml-2 h-4 w-4"/>
                </Button>
            </CardContent>
        </Card>
    </Link>
  );


export default function Home() {
    return (
      <MainLayout>
        <SalesProvider>
           <Suspense>
                <HomePageContent />
           </Suspense>
        </SalesProvider>
      </MainLayout>
    )
}
