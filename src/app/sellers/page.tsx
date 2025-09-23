// src/app/sellers/page.tsx
'use client';

import { useState, useMemo, Suspense, useContext, useCallback, memo } from "react";
import dynamic from 'next/dynamic';
import { Button } from "@/components/ui/button";
import type { UIDateSale, Sale, SellerPerformanceData } from "@/types";
import { Loader2, Calendar as CalendarIcon, Printer } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { addSale as addSaleToSheet } from "@/ai/flows/add-sale-flow";
import { useToast } from "@/hooks/use-toast";
import { useSharedDate } from "@/hooks/use-shared-date";
import { Skeleton } from "@/components/ui/skeleton";
import { SalesContext, SalesProvider } from "@/contexts/sales-context";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { PageHeader, PageHeaderTitle, PageHeaderDescription, PageHeaderActions } from "@/components/page-header";
import { useIsClient } from "@/hooks/use-is-client";
import { MainLayout } from "@/components/main-layout";

const AddSaleSheet = dynamic(() => import('@/components/add-sale-sheet').then(mod => mod.AddSaleSheet), {
  ssr: false,
  loading: () => <Button disabled>Adicionar Venda</Button>
});

// --- Skeletons ---
const SellerRankingSkeleton = memo(() => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-1/3" />
       <Skeleton className="h-4 w-1/2 mt-1" />
    </CardHeader>
    <CardContent className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-2">
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
));
SellerRankingSkeleton.displayName = "SellerRankingSkeleton";

const SellerPerformanceSkeleton = memo(() => (
   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {[...Array(10)].map((_, i) => (
        <Card key={i}>
            <CardHeader className="flex flex-row items-center gap-2 text-base font-bold text-center p-4">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-5 w-20" />
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-center items-center space-y-4 p-4">
                 <div className="flex justify-around items-center w-full">
                    <div className="text-center space-y-1">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-6 w-20" />
                    </div>
                     <div className="h-10 w-px bg-border" />
                    <div className="text-center space-y-1">
                         <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-6 w-16" />
                    </div>
                </div>
                 <Skeleton className="h-3 w-24" />
            </CardContent>
            <CardContent className="flex flex-col items-start gap-2 bg-muted/50 p-3 mt-auto border-t">
                 <Skeleton className="h-4 w-28 mb-1" />
                 <div className="flex items-center gap-2 w-full">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-7 w-7 rounded-md" />
                 </div>
            </CardContent>
        </Card>
      ))}
    </div>
));
SellerPerformanceSkeleton.displayName = "SellerPerformanceSkeleton";


const FullPageSkeleton = memo(() => (
    <div className="space-y-8">
      <PageHeader>
        <div className="flex-1 space-y-2">
          <PageHeaderTitle>Performance Individual</PageHeaderTitle>
          <Skeleton className="h-4 w-48" />
        </div>
        <PageHeaderActions>
           <Skeleton className="h-10 w-[260px]" />
           <Skeleton className="h-10 w-10" />
           <Skeleton className="h-10 w-32" />
        </PageHeaderActions>
      </PageHeader>
      <div className="space-y-8">
        <section>
             <div className="space-y-2 mb-4">
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
            <SellerPerformanceSkeleton />
        </section>
        <section className="page-break">
             <div className="mt-8">
                <SellerRankingSkeleton />
            </div>
        </section>
      </div>
    </div>
));
FullPageSkeleton.displayName = "FullPageSkeleton";

// --- Dynamic Imports ---
const SellerRanking = dynamic(() => import('@/components/seller-ranking').then(mod => mod.SellerRanking), {
    loading: () => <SellerRankingSkeleton />,
    ssr: false
});
const SellerPerformanceDashboard = dynamic(() => import('@/components/seller-performance-dashboard').then(mod => mod.SellerPerformanceDashboard), {
    loading: () => <SellerPerformanceSkeleton />,
    ssr: false
});


const SellersPageContent = memo(() => {
  const { sales, isLoading, addSale: addSaleToContext, loadData } = useContext(SalesContext);
  const { date, setDate, dateString } = useSharedDate(sales);
  const [performanceData, setPerformanceData] = useState<SellerPerformanceData[]>([]);
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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

  return (
    <>
      <PageHeader>
        <div className="flex-1">
          <PageHeaderTitle>Performance Individual</PageHeaderTitle>
          <PageHeaderDescription>{dateString}</PageHeaderDescription>
        </div>
        <PageHeaderActions>
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
                 <div className="space-y-1 mb-4">
                    <h2 className="text-2xl font-bold tracking-tighter">Análise Individual por Vendedor</h2>
                    <p className="text-muted-foreground">
                        Clique em um card para ver a análise detalhada. Clique no ícone de cérebro para gerar um resumo com IA.
                    </p>
                </div>
                <SellerPerformanceDashboard 
                    filteredData={filteredSales} 
                    onPerformanceDataCalculated={setPerformanceData}
                />
            </section>
            <section className="page-break">
                <div className="mt-8">
                    <SellerRanking performanceData={performanceData} />
                </div>
            </section>
          </>
        )}
      </div>
    </>
  );
});
SellersPageContent.displayName = 'SellersPageContent';

export default function SellersPage() {
    const isClient = useIsClient();
    return (
        <MainLayout>
          <SalesProvider>
              <Suspense fallback={<FullPageSkeleton />}>
                  {isClient ? <SellersPageContent /> : <FullPageSkeleton />}
              </Suspense>
          </SalesProvider>
        </MainLayout>
    )
}
