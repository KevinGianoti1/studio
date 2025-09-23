// src/components/seller-performance-dashboard.tsx
"use client"

import React, { useMemo, useState, useEffect, useContext, useCallback } from 'react';
import type { UIDateSale, SellerPerformanceData, Campaign } from '@/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogFooter as DialogFooterComponent,
  DialogTitle,
} from "@/components/ui/dialog";
import { User, Goal, Sparkles, Loader2, TrendingUp, CircleDollarSign, Target, Tag, BrainCircuit, Activity, CheckCircle } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine, Legend, Tooltip } from "recharts";
import { format, parseISO, eachDayOfInterval, startOfDay, isSameDay, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { HistoryIcon } from '@/components/ui/history-icon';
import Link from 'next/link';
import { useSharedDate } from '@/hooks/use-shared-date';
import { SalesContext } from '@/contexts/sales-context';
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { analyzeSingleSellerPerformance } from '@/ai/flows/analyze-seller-performance-flow';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Skeleton } from './ui/skeleton';


const generateAvatarUrl = (name: string) => {
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const color1 = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    const color2 = ((hash >> 8) & 0x00FFFFFF).toString(16).toUpperCase();
    return `https://placehold.co/100x100/${'000000'.substring(0, 6 - color1.length)}${color1}/${'FFFFFF'.substring(0, 6 - color2.length)}${color2}.png?text=${name.charAt(0)}`;
};


const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const SellerChartModal = ({ performance, isOpen, onOpenChange, allDaysInPeriod }: { performance: SellerPerformanceData | null, isOpen: boolean, onOpenChange: (open: boolean) => void, allDaysInPeriod: Date[] }) => {
  const { sales } = useContext(SalesContext);
  const { date } = useSharedDate(sales);
  
  const dailyChartData = useMemo(() => {
    if (!performance) return [];

    const sellerSalesByDate = new Map<string, {sales: number, projection: number}>();
    performance.chartData.forEach(p => {
       sellerSalesByDate.set(p.date, {sales: p.sales, projection: p.projection});
    });

    let lastSales = 0;
    let lastProjection = 0;
    
    return allDaysInPeriod.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayData = sellerSalesByDate.get(dateStr);
      
      if (dayData && dayData.sales > 0) {
        lastSales = dayData.sales;
        lastProjection = dayData.projection;
      }
      
      return {
        date: dateStr,
        Vendas: lastSales,
        Projeção: lastProjection,
      }
    });
  }, [performance, allDaysInPeriod]);
  
  const yAxisMax = useMemo(() => {
    if (!dailyChartData.length || !performance) return 100;
    const maxDataValue = Math.max(...dailyChartData.map(d => Math.max(d.Vendas, d.Projeção)), 0);
    return Math.max(maxDataValue, performance.monthlyGoal) * 1.1 || 100;
  }, [dailyChartData, performance]);

  const historyLink = () => {
    if (!performance) return '/';
    const from = date?.from ? `from=${format(date.from, 'yyyy-MM-dd')}` : '';
    const to = date?.to ? `to=${format(date.to, 'yyyy-MM-dd')}` : '';
    const params = [from, to].filter(Boolean).join('&');
    return `/history/${encodeURIComponent(performance.seller)}?${params}`;
  }


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        {performance && (
            <>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-4 text-2xl font-bold text-gray-800 dark:text-gray-200">
                        <Avatar className="h-12 w-12 border-2 border-primary">
                            <AvatarImage src={generateAvatarUrl(performance.seller)} alt={performance.seller} data-ai-hint="abstract pattern" />
                            <AvatarFallback>{performance.seller.charAt(0)}</AvatarFallback>
                        </Avatar>
                        Análise de Desempenho: {performance.seller}
                    </DialogTitle>
                    <DialogDescription>
                        Análise detalhada do desempenho do vendedor no período selecionado.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    <div className="md:col-span-1 space-y-4">
                        <Card>
                            <CardHeader>
                                <h3 className="text-lg font-semibold">Indicadores Chave</h3>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground text-sm flex items-center gap-2"><CircleDollarSign className="w-4 h-4" /> Vendas (Período)</span>
                                    <span className="font-bold text-lg">{formatCurrency(performance.billedInPeriod)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground text-sm flex items-center gap-2"><Target className="w-4 h-4" /> Meta Mensal</span>
                                    <span className="font-bold text-lg">{formatCurrency(performance.monthlyGoal)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground text-sm flex items-center gap-2"><Goal className="w-4 h-4" /> % da Meta</span>
                                    <span className={`font-bold text-lg ${performance.monthlyGoalPercentage >= 100 ? 'text-green-600' : 'text-orange-500'}`}>{performance.monthlyGoalPercentage.toFixed(2)}%</span>
                                </div>
                            </CardContent>
                        </Card>
                        {performance.campaigns.length > 0 && (
                        <Card className="bg-accent/20 border-accent">
                            <CardHeader>
                                <h3 className="text-base font-semibold flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-accent-foreground" />
                                    Campanhas no Período
                                </h3>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-2">
                                {performance.campaigns.map(campaign => (
                                    <Link key={campaign.rowId} href="/campaigns">
                                        <Badge variant="secondary" className="cursor-pointer hover:bg-accent/80">{campaign.name}</Badge>
                                    </Link>
                                ))}
                            </CardContent>
                        </Card>
                        )}
                    </div>
                    <div className="md:col-span-2">
                        <ChartContainer config={{}} className="min-h-[400px] w-full">
                            <AreaChart data={dailyChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                                <XAxis
                                dataKey="date"
                                tickFormatter={(tick) => format(parseISO(tick), "dd/MM", { locale: ptBR })}
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                axisLine={{ stroke: 'hsl(var(--border))' }}
                                tickLine={{ stroke: 'hsl(var(--border))' }}
                                />
                                <YAxis
                                tickFormatter={(value) => formatCurrency(value as number)}
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                axisLine={{ stroke: 'hsl(var(--border))' }}
                                tickLine={{ stroke: 'hsl(var(--border))' }}
                                width={80}
                                domain={[0, yAxisMax]}
                                />
                                <Tooltip
                                content={
                                    <ChartTooltipContent
                                    formatter={(value, name) => (
                                        <div className="flex flex-col p-1 rounded-md bg-background/90 shadow-lg border border-border">
                                        <span className='font-bold text-sm text-foreground'>{name}</span>
                                        <span className='text-xs text-muted-foreground'>{formatCurrency(value as number)}</span>
                                        </div>
                                    )}
                                    labelFormatter={(label) => `Data: ${format(parseISO(label), "dd 'de' MMMM", { locale: ptBR })}`}
                                    />
                                }
                                />
                                <Legend
                                verticalAlign="top"
                                align="center"
                                wrapperStyle={{ paddingBottom: '20px' }}
                                payload={[
                                    { value: 'Vendas', type: 'line', color: '#10B981' },
                                    { value: 'Projeção', type: 'line', color: '#F97316' },
                                    { value: 'Meta Mensal', type: 'line', color: '#3B82F6', payload: { strokeDasharray: '5 5' } }
                                ]}
                                />
                                {performance.monthlyGoal > 0 && <ReferenceLine y={performance.monthlyGoal} label={{ value: `Meta: ${formatCurrency(performance.monthlyGoal)}`, position: 'insideTopRight', fill: '#3B82F6', fontSize: 12, fontWeight: 'bold' }} stroke="#3B82F6" strokeDasharray="5 5" strokeWidth={2}/>}
                                <Area type="monotone" dataKey="Vendas" stroke="#10B981" fillOpacity={0.2} fill="url(#seller-chart-gradient-sales)" strokeWidth={2} dot={{ r: 4, fill: '#10B981', stroke: 'hsl(var(--card))', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#10B981', stroke: 'hsl(var(--card))', strokeWidth: 2 }} />
                                <Area type="monotone" dataKey="Projeção" stroke="#F97316" fillOpacity={0.1} fill="url(#seller-chart-gradient-proj)" />
                                <defs>
                                    <linearGradient id="seller-chart-gradient-sales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                                    </linearGradient>
                                    <linearGradient id="seller-chart-gradient-proj" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#F97316" stopOpacity={0.05}/>
                                    </linearGradient>
                                </defs>
                            </AreaChart>
                        </ChartContainer>
                    </div>
                </div>
                <DialogFooterComponent className="pt-4">
                    <Button asChild variant="secondary">
                        <Link href={historyLink()}>
                            <HistoryIcon className="mr-2 h-4 w-4" />
                            Ver Histórico Completo
                        </Link>
                    </Button>
                </DialogFooterComponent>
            </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const SellerSummaryCard = React.memo(({ performance, onCardClick, onAnalyzeClick, isAnalyzing }: { performance: SellerPerformanceData, onCardClick: () => void, onAnalyzeClick: () => void, isAnalyzing: boolean }) => {
    const goalColor = performance.monthlyGoalPercentage >= 100 ? 'text-green-600' : performance.monthlyGoalPercentage >= 70 ? 'text-yellow-600' : 'text-red-600';
    
    return (
        <Card className="shadow-md transition-all hover:shadow-lg hover:border-primary flex flex-col justify-between">
             <CardHeader className="cursor-pointer flex-row items-center justify-between p-4" onClick={onCardClick}>
                <div className="flex items-center gap-2 text-base font-bold">
                    <Avatar className="h-6 w-6 border">
                       <AvatarImage src={generateAvatarUrl(performance.seller)} alt={performance.seller} data-ai-hint="abstract pattern"/>
                       <AvatarFallback>{performance.seller.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">{performance.seller}</span>
                </div>
                <div className="relative flex h-3 w-3">
                    {performance.isActiveToday && (
                         <TooltipProvider>
                            <UiTooltip>
                                <TooltipTrigger>
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                <p>Registrou venda hoje</p>
                                </TooltipContent>
                            </UiTooltip>
                        </TooltipProvider>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-center items-center space-y-4 cursor-pointer p-4 pt-0" onClick={onCardClick}>
                <div className="flex justify-around items-center w-full">
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">Vendas</p>
                        <p className="text-xl font-bold">{formatCurrency(performance.billedInPeriod)}</p>
                    </div>
                     <Separator orientation="vertical" className="h-10" />
                    <div className="text-center">
                        <p className="text-xs text-muted-foreground">% Meta</p>
                        <p className={`text-xl font-bold ${goalColor}`}>{performance.monthlyGoalPercentage.toFixed(1)}%</p>
                    </div>
                </div>
                 <p className="text-xs text-muted-foreground text-center pt-2">
                    Meta Mensal: {formatCurrency(performance.monthlyGoal)}
                </p>
            </CardContent>
            
            <CardFooter className="flex-col items-start gap-2 bg-muted/50 p-3 mt-auto border-t">
                 <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <BrainCircuit className="w-3 h-3" />
                    Resumo IA
                </h4>
                <div className="h-5 text-xs text-muted-foreground w-full flex items-center justify-between">
                    {isAnalyzing ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin"/> 
                            <span>Analisando...</span>
                        </div>
                    ) : (
                       <p className='truncate flex-1 mr-2' title={performance.summary}>{performance.summary || 'Clique para analisar'}</p>
                    )}
                     <TooltipProvider>
                        <UiTooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={onAnalyzeClick} disabled={isAnalyzing}>
                                     <Sparkles className="w-4 h-4" />
                                     <span className="sr-only">Analisar com IA</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Analisar com IA</p>
                            </TooltipContent>
                        </UiTooltip>
                    </TooltipProvider>
                </div>
            </CardFooter>
        </Card>
    );
});
SellerSummaryCard.displayName = "SellerSummaryCard";

const SellerCardSkeleton = () => (
     <Card>
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
        <CardFooter className="flex-col items-start gap-2 bg-muted/50 p-3 mt-auto border-t">
                <Skeleton className="h-4 w-28 mb-1" />
                <div className="flex items-center gap-2 w-full">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-7 w-7 rounded-md" />
                </div>
        </CardFooter>
    </Card>
);

type SellerPerformanceDashboardProps = {
  filteredData: UIDateSale[];
  onPerformanceDataCalculated: (data: SellerPerformanceData[]) => void;
};

export function SellerPerformanceDashboard({ filteredData, onPerformanceDataCalculated }: SellerPerformanceDashboardProps) {
  const [selectedSeller, setSelectedSeller] = useState<SellerPerformanceData | null>(null);
  const [performanceData, setPerformanceData] = useState<SellerPerformanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [analyzingSeller, setAnalyzingSeller] = useState<string | null>(null);
  const { campaigns, sales } = useContext(SalesContext);
  const { toast } = useToast();

  const allDaysInPeriod = useMemo(() => {
    if (!filteredData.length) return [];
    const dates = filteredData.map(d => startOfDay(d.createdAt));
    const interval = { start: new Date(Math.min(...dates.map(d => d.getTime()))), end: new Date(Math.max(...dates.map(d => d.getTime()))) };
     if (!interval.start || !interval.end || isNaN(interval.start.getTime()) || isNaN(interval.end.getTime()) || interval.start.getTime() > interval.end.getTime()) {
      return [];
    }
    return eachDayOfInterval(interval);
  }, [filteredData]);
  
  useEffect(() => {
    const processData = () => {
        if (!filteredData.length) {
            setPerformanceData([]);
            onPerformanceDataCalculated([]);
            setIsLoading(false);
            return;
        };
        setIsLoading(true);

        const sellers = [...new Set(filteredData.map(s => s.seller))];
        const periodInterval = {
            start: allDaysInPeriod[0],
            end: allDaysInPeriod[allDaysInPeriod.length - 1],
        };

        const campaignsInPeriod = campaigns.filter(c => 
             isWithinInterval(c.startDate, periodInterval) || 
             isWithinInterval(c.endDate, periodInterval) ||
             (c.startDate < periodInterval.start && c.endDate > periodInterval.end)
        );

        const perfData: SellerPerformanceData[] = sellers.map(seller => {
            const sellerSalesInPeriod = filteredData.filter(sale => sale.seller === seller);

            const mostRecentSaleInPeriod = sellerSalesInPeriod.length > 0
              ? sellerSalesInPeriod.reduce((latest, current) => {
                  return current.createdAt.getTime() > latest.createdAt.getTime() ? current : latest;
                })
              : null;
            
            const billedInPeriod = mostRecentSaleInPeriod ? mostRecentSaleInPeriod.billed : 0;
            const monthlyGoal = mostRecentSaleInPeriod ? mostRecentSaleInPeriod.monthlyGoal : 0;
            const monthlyGoalPercentage = monthlyGoal > 0 ? (billedInPeriod / monthlyGoal) * 100 : 0;
            
            const salesByDate = new Map<string, {sales: number, projection: number}>();
            sellerSalesInPeriod.forEach(sale => {
                const dateStr = format(sale.createdAt, "yyyy-MM-dd");
                salesByDate.set(dateStr, { sales: sale.billed, projection: sale.projection });
            });
            
            const chartData = allDaysInPeriod.map(day => {
                const dateStr = format(day, "yyyy-MM-dd");
                return {
                    date: dateStr,
                    sales: salesByDate.get(dateStr)?.sales || 0,
                    projection: salesByDate.get(dateStr)?.projection || 0,
                };
            });
            
            const sellerCampaigns: Campaign[] = [];
            for (const campaign of campaignsInPeriod) {
                const hasSaleInCampaign = sellerSalesInPeriod.some(sale => 
                    isWithinInterval(sale.createdAt, { start: campaign.startDate, end: campaign.endDate })
                );
                if (hasSaleInCampaign) {
                    sellerCampaigns.push(campaign);
                }
            }

            const today = startOfDay(new Date());
            const isActiveToday = sales.filter(s => s.seller === seller).some(sale => isSameDay(sale.createdAt, today));

            return {
                seller,
                billedInPeriod,
                monthlyGoal: monthlyGoal,
                monthlyGoalPercentage: monthlyGoalPercentage,
                campaigns: sellerCampaigns,
                isActiveToday,
                summary: '', // Initialize summary
                chartData,
            };
        }).sort((a, b) => b.billedInPeriod - a.billedInPeriod);
        
        setPerformanceData(perfData);
        onPerformanceDataCalculated(perfData);
        setIsLoading(false);
    }

    processData();

  }, [filteredData, allDaysInPeriod, onPerformanceDataCalculated, campaigns, sales]);

  const handleAnalyzeSeller = useCallback(async (sellerName: string) => {
    // This function is now responsible for handling the analysis click,
    // but the actual AI call is commented out to save costs.
    // We can add a toast notification to inform the user.
    toast({
      title: "Análise de IA Desativada",
      description: "A geração automática de resumos foi desativada para otimizar os custos.",
    });

    // The code below is the original implementation, which is now commented out.
    /*
    setAnalyzingSeller(sellerName);
    try {
        const sellerData = performanceData.find(p => p.seller === sellerName);
        if (!sellerData) return;

        const sellerSales = filteredData.filter(sale => sale.seller === sellerName);
        const analysisInput = {
            seller: sellerName,
            salesData: sellerSales.map(s => ({
                billed: s.billed,
                monthlyGoal: s.monthlyGoal,
                monthlyGoalPercentage: s.monthlyGoal > 0 ? (s.billed / s.monthlyGoal) * 100 : 0,
                createdAt: format(s.createdAt, "yyyy-MM-dd"),
            }))
        };
        
        const result = await analyzeSingleSellerPerformance(analysisInput);
        
        setPerformanceData(currentData => 
            currentData.map(pd => pd.seller === sellerName ? { ...pd, summary: result.summary } : pd)
        );

    } catch (err: any) {
        console.error(`Error analyzing ${sellerName}:`, err);
        toast({
            variant: "destructive",
            title: `Erro ao analisar ${sellerName}`,
            description: err.message || "Não foi possível buscar o resumo de IA."
        });
        setPerformanceData(currentData => 
            currentData.map(pd => pd.seller === sellerName ? { ...pd, summary: "Erro na análise." } : pd)
        );
    } finally {
        setAnalyzingSeller(null);
    }
    */
  }, [toast]);

  const handleCardClick = useCallback((performance: SellerPerformanceData) => {
    setSelectedSeller(performance);
  }, []);

  if (isLoading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => <SellerCardSkeleton key={i} />)}
        </div>
      )
  }

  if (!performanceData.length && !isLoading) {
    return (
         <Card>
          <CardContent>
            <p className="pt-6 text-muted-foreground">Não há dados de vendas no período selecionado para analisar o desempenho dos vendedores.</p>
          </CardContent>
        </Card>
    )
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {performanceData.map(p => (
          <SellerSummaryCard 
            key={p.seller} 
            performance={p}
            onCardClick={() => handleCardClick(p)}
            onAnalyzeClick={() => handleAnalyzeSeller(p.seller)}
            isAnalyzing={analyzingSeller === p.seller}
          />
        ))}
      </div>
      <SellerChartModal 
        performance={selectedSeller} 
        isOpen={!!selectedSeller} 
        onOpenChange={(open) => { if (!open) setSelectedSeller(null) }} 
        allDaysInPeriod={allDaysInPeriod}
      />
    </div>
  );
}
