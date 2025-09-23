// src/app/teams/page.tsx
'use client';

import { useMemo, Suspense, useContext, useState, useCallback, memo } from "react";
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import type { UIDateSale, Sale } from "@/types";
import { Loader2, Calendar as CalendarIcon, Printer, RotateCw } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { addSale as addSaleToSheet } from "@/ai/flows/add-sale-flow";
import { useToast } from "@/hooks/use-toast";
import { useSharedDate } from "@/hooks/use-shared-date";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SalesContext, SalesProvider } from "@/contexts/sales-context";
import { PageHeader, PageHeaderActions, PageHeaderDescription, PageHeaderTitle } from "@/components/page-header";
import { useIsClient } from "@/hooks/use-is-client";
import { StrategicOverview } from "@/components/strategic-overview";
import { MainLayout } from "@/components/main-layout";


// --- Skeletons ---
const TeamPerformanceSkeleton = () => (
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-4">
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  </div>
);

const StrategicOverviewSkeleton = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
            <CardHeader> <Skeleton className="h-6 w-1/3" /> </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </CardContent>
        </Card>
        <Card>
            <CardHeader> <Skeleton className="h-6 w-1/2" /> </CardHeader>
             <CardContent className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-1/4" />
                    </div>
                ))}
            </CardContent>
        </Card>
    </div>
);


const SalesDashboardSkeleton = () => (
    <Card>
        <CardContent className="p-0">
             <div className="overflow-x-auto">
                <Skeleton className="h-[400px] w-full" />
            </div>
        </CardContent>
    </Card>
);

const FullPageSkeleton = () => (
    <div className="space-y-8">
      <PageHeader>
        <div className="flex-1">
            <PageHeaderTitle>Performance de Equipes</PageHeaderTitle>
            <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <PageHeaderActions>
             <Skeleton className="h-10 w-40" />
             <Skeleton className="h-10 w-[260px]" />
             <Skeleton className="h-10 w-10" />
             <Skeleton className="h-10 w-32" />
        </PageHeaderActions>
      </PageHeader>
      <div className="space-y-8">
        <section>
            <h2 className="text-2xl font-bold tracking-tighter">Panorama Estratégico</h2>
            <p className="text-muted-foreground mb-4">Metas, destaques e pontos de atenção do período.</p>
            <StrategicOverviewSkeleton />
        </section>
        <section>
            <h2 className="text-2xl font-bold tracking-tighter">Desempenho Visual por Equipe</h2>
            <p className="text-muted-foreground mb-4">Análise comparativa da evolução de vendas das equipes.</p>
            <TeamPerformanceSkeleton />
        </section>
        <section className="page-break">
            <h2 className="text-2xl font-bold tracking-tighter">Tabela Detalhada de Vendas</h2>
            <p className="text-muted-foreground mb-4">Todos os lançamentos de vendas do período selecionado.</p>
            <SalesDashboardSkeleton />
        </section>
        </div>
    </div>
);


// --- Dynamic Imports ---
const AddSaleSheet = dynamic(() => import('@/components/add-sale-sheet').then(mod => mod.AddSaleSheet), { ssr: false });
const TeamPerformanceDashboard = dynamic(() => import('@/components/team-performance-dashboard').then(mod => mod.TeamPerformanceDashboard), {
  loading: () => <TeamPerformanceSkeleton />,
  ssr: false
});

const SalesDashboard = dynamic(() => import('@/components/sales-dashboard').then(mod => mod.SalesDashboard), {
    loading: () => <SalesDashboardSkeleton />,
    ssr: false
});

const TeamsPageContent = memo(() => {
  const { sales, isLoading, addSale: addSaleToContext, loadData } = useContext(SalesContext);
  const { date, setDate, dateString } = useSharedDate(sales);
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const isClient = useIsClient();

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const addSale = useCallback(async (newSaleData: Omit<Sale, 'id' | 'createdAt' | 'monthlyGoalPercentage' | 'campaign'> & { createdAt: Date }) => {
    const saleForSheet = { ...newSaleData, createdAt: newSaleData.createdAt.toISOString() };
    const tempUiSale: UIDateSale = {
      ...newSaleData,
      id: `temp-${Date.now()}`,
      monthlyGoalPercentage: newSaleData.monthlyGoal > 0 ? (newSaleData.billed / newSaleData.monthlyGoal) * 100 : 0,
      campaign: '',
    };
    addSaleToContext(tempUiSale, false);

    try {
      const result = await addSaleToSheet(saleForSheet);
      if (result.success) {
        toast({
          title: "Sucesso!",
          description: "Venda registrada com sucesso na planilha.",
        });
        await loadData();
      } else {
        addSaleToContext(tempUiSale, true);
        toast({
          variant: "destructive",
          title: "Erro ao adicionar venda",
          description: result.error || "Não foi possível salvar os dados na planilha.",
          duration: 10000,
        });
      }
    } catch (error) {
      addSaleToContext(tempUiSale, true);
      toast({
        variant: "destructive",
        title: "Erro de Conexão",
        description: "Não foi possível conectar ao servidor para salvar a venda.",
        duration: 10000,
      });
    }
    return { success: true };
  }, [addSaleToContext, loadData, toast]);

  const filteredSales = useMemo(() => {
    if (!sales.length || !date?.from) return [];
    const fromDate = new Date(date.from.setHours(0, 0, 0, 0));
    const toDate = date.to ? new Date(date.to.setHours(23, 59, 59, 999)) : fromDate;
    
    return sales.filter(sale => {
      const saleDate = sale.createdAt;
      return saleDate >= fromDate && saleDate <= toDate;
    });
  }, [sales, date]);
  
  if (!isClient) {
    return <FullPageSkeleton />;
  }

  return (
    <>
      <PageHeader>
        <div className="flex-1">
            <PageHeaderTitle>Performance de Equipes</PageHeaderTitle>
            <PageHeaderDescription>{dateString}</PageHeaderDescription>
        </div>
        <PageHeaderActions>
             <Button onClick={loadData} variant="outline" disabled={isLoading}>
                <RotateCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                Atualizar
             </Button>
             <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-full sm:w-[260px] justify-start text-left font-normal bg-card text-card-foreground shadow-sm",
                      !date && "text-muted-foreground"
                    )}
                    disabled={isLoading}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "dd/MM/yy")} - {format(date.to, "dd/MM/yy")}
                        </>
                      ) : (
                        format(date.from, "dd/MM/yy")
                      )
                    ) : (
                      <span>Escolha um período</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
               <Button variant="ghost" size="icon" onClick={handlePrint} className="print:hidden" disabled={isLoading}>
                  <Printer className="h-5 w-5" />
                  <span className="sr-only">Imprimir</span>
               </Button>
              <Button onClick={() => setIsSheetOpen(true)} disabled={isLoading}>Adicionar Venda</Button>
        </PageHeaderActions>
      </PageHeader>
      
      {isSheetOpen && <AddSaleSheet open={isSheetOpen} onOpenChange={setIsSheetOpen} onAddSale={addSale} />}

      <div className="space-y-8">
        {isLoading ? (
          <FullPageSkeleton />
        ) : (
          <>
             <section>
              <h2 className="text-2xl font-bold tracking-tighter">Panorama Estratégico</h2>
              <p className="text-muted-foreground mb-4">Metas, destaques e pontos de atenção do período.</p>
              <Suspense fallback={<StrategicOverviewSkeleton />}>
                <StrategicOverview data={filteredSales} />
              </Suspense>
            </section>
            <section>
              <h2 className="text-2xl font-bold tracking-tighter">Desempenho Visual por Equipe</h2>
              <p className="text-muted-foreground mb-4">Análise comparativa da evolução de vendas das equipes.</p>
              <TeamPerformanceDashboard data={filteredSales} />
            </section>
            <section className="page-break">
              <h2 className="text-2xl font-bold tracking-tighter">Tabela Detalhada de Vendas</h2>
              <p className="text-muted-foreground mb-4">Todos os lançamentos de vendas do período selecionado.</p>
              <SalesDashboard data={filteredSales} />
            </section>
          </>
        )}
      </div>
    </>
  );
});
TeamsPageContent.displayName = 'TeamsPageContent';


export default function TeamsPage() {
    return (
        <MainLayout>
          <SalesProvider>
            <Suspense fallback={<FullPageSkeleton />}>
                  <TeamsPageContent />
            </Suspense>
          </SalesProvider>
        </MainLayout>
    )
}
