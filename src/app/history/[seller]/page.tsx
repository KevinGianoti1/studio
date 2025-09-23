
// src/app/history/[seller]/page.tsx
'use client';

import { useEffect, useState, useMemo, Suspense, useContext } from 'react';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import { analyzeSellerHistory, type AnalyzeSellerHistoryOutput } from '@/ai/flows/analyze-seller-history-flow';
import type { UIDateSale } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Calendar, Award, TrendingUp, BarChart, DollarSign, Loader2, Star, BrainCircuit, Activity, BarChart2, Repeat, Target as TargetIcon, Percent, LineChart } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, Bar, BarChart as RechartsBarChart, ResponsiveContainer } from "recharts";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useSharedDate } from '@/hooks/use-shared-date';
import { Calendar as DayPickerCalendar } from "@/components/ui/calendar";
import { SalesContext, SalesProvider } from '@/contexts/sales-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MainLayout } from '@/components/main-layout';


const generateAvatarUrl = (name: string) => {
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const color1 = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    const color2 = ((hash >> 8) & 0x00FFFFFF).toString(16).toUpperCase();
    return `https://placehold.co/150x150/${'000000'.substring(0, 6 - color1.length)}${color1}/${'FFFFFF'.substring(0, 6 - color2.length)}${color2}.png?text=${name.charAt(0)}`;
};

const formatCurrency = (value: number) => {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (dateString: string | undefined, formatStr: string = "dd/MM/yyyy") => {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), formatStr, { locale: ptBR });
  } catch (e) {
    return 'Data inválida'
  }
};

const InsightCard = ({ icon, title, value, subtext }: { icon: React.ReactNode, title: string, value: string | number, subtext?: string }) => (
  <Card className="shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="text-muted-foreground">{icon}</div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
    </CardContent>
  </Card>
);

function SellerHistoryContent() {
  const params = useParams();
  const sellerName = useMemo(() => {
    const name = params.seller;
    if (typeof name !== 'string') return null;
    try {
      return decodeURIComponent(name.replace(/\+/g, ' '));
    } catch (e) {
      return name;
    }
  }, [params.seller]);
  
  const { sales: allSalesData, isLoading: isSalesLoading, error: salesError } = useContext(SalesContext);
  const [analysis, setAnalysis] = useState<AnalyzeSellerHistoryOutput | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(true);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  const allSellerSales = useMemo(() => {
    if (!sellerName || !allSalesData) return [];
    return allSalesData
        .filter(s => s.seller === sellerName)
        .sort((a,b) => a.createdAt.getTime() - b.createdAt.getTime());
  }, [allSalesData, sellerName]);

  const { date, setDate, dateString } = useSharedDate(allSellerSales);

  const filteredSales = useMemo(() => {
    if (!date?.from || !allSellerSales.length) return [];
    
    const fromDate = new Date(date.from.setHours(0, 0, 0, 0));
    const toDate = date.to ? new Date(date.to.setHours(23, 59, 59, 999)) : fromDate;

    return allSellerSales.filter(sale => {
        const saleDate = sale.createdAt;
        return saleDate >= fromDate && saleDate <= toDate;
    });
  }, [allSellerSales, date]);


  useEffect(() => {
    if (!sellerName || isSalesLoading) return;

    if (allSellerSales.length === 0) {
        setIsAnalysisLoading(false);
        return;
    }

    if (!date?.from) {
        if(!isAnalysisLoading) setIsAnalysisLoading(true); // show loader if we have sales but no date yet
        return;
    };

    const runAnalysis = async () => {
        setIsAnalysisLoading(true);
        setAnalysisError(null);

        try {
            const salesForAnalysis = filteredSales.map(s => ({ 
                billed: s.billed, 
                projection: s.projection, 
                createdAt: s.createdAt.toISOString() 
            }));
            
            const analysisResult = await analyzeSellerHistory({
              seller: sellerName,
              salesData: salesForAnalysis,
            });
            setAnalysis(analysisResult);

        } catch(err: any) {
            setAnalysisError(err.message || 'Falha ao gerar a análise.');
            console.error(err);
        } finally {
            setIsAnalysisLoading(false);
        }
    }
    runAnalysis();

  }, [filteredSales, sellerName, allSalesData, date, isSalesLoading]);


  const chartData = useMemo(() => {
    return filteredSales.map(sale => ({
      date: format(sale.createdAt, "yyyy-MM-dd"),
      Vendas: sale.billed,
      Projeção: sale.projection,
    }));
  }, [filteredSales]);
  
  const mostRecentSale = useMemo(() => {
    if (filteredSales.length === 0) return null;
    return filteredSales[filteredSales.length - 1];
  }, [filteredSales]);

  const yAxisMax = useMemo(() => {
    if (!mostRecentSale) return 100;
    const maxDataValue = Math.max(...chartData.map(d => Math.max(d.Vendas, d.Projeção)), 0);
    return Math.max(maxDataValue, mostRecentSale.monthlyGoal) * 1.1 || 100;
  }, [chartData, mostRecentSale]);

  const finalError = salesError || analysisError;
  if (finalError) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500 p-8 text-center">
        <Card className="p-8">
            <CardHeader>
                <CardTitle>Ocorreu um Erro</CardTitle>
            </CardHeader>
            <CardContent>
                 <p>{finalError}</p>
                 <Button asChild variant="link" className="mt-4">
                    <Link href="/">Voltar para o Dashboard</Link>
                 </Button>
            </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!sellerName) {
      notFound();
      return null;
  }
  
  const isLoading = isSalesLoading || isAnalysisLoading;
  
  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className='flex items-center gap-4'>
            <Avatar className="h-20 w-20 border-4 border-card shadow-lg">
              <AvatarImage src={sellerName ? generateAvatarUrl(sellerName) : ''} alt={sellerName} data-ai-hint="abstract pattern" />
              <AvatarFallback className="text-3xl">{sellerName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <h1 className="text-4xl font-bold tracking-tighter">{sellerName}</h1>
                <p className="text-lg text-muted-foreground">Dossiê de Performance de Vendas</p>
            </div>
        </div>
        <Button asChild variant="outline">
          <Link href={`/sellers${date ? `?from=${format(date.from!, 'yyyy-MM-dd')}&to=${format(date.to || date.from!, 'yyyy-MM-dd')}`: ''}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar aos Vendedores
          </Link>
        </Button>
      </header>

      <main className="space-y-10">
        <Card className="shadow-md">
          <CardHeader>
              <CardTitle>Período de Análise</CardTitle>
              <CardDescription>
                  {dateString}. Use o seletor abaixo para alterar o período.
              </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-[300px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
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
              <PopoverContent className="w-auto p-0" align="start">
                <DayPickerCalendar
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
          </CardContent>
        </Card>
        
        {isLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center bg-background">
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-xl font-medium">Carregando e analisando dados...</p>
              </div>
          </div>
        ) : (
          <>
            {filteredSales.length === 0 ? (
                <div className="text-center py-16">
                  <h2 className="text-2xl font-bold">Sem dados encontrados</h2>
                  <p className="text-muted-foreground">Não foi possível encontrar lançamentos para {sellerName} no período selecionado.</p>
              </div>
            ) : (
              <>
                <section>
                    <h2 className="text-2xl font-bold tracking-tighter mb-4 flex items-center gap-3">
                        <Star className="w-6 h-6 text-primary" />
                        Recordes (Período Selecionado)
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <InsightCard icon={<Award className="h-5 w-5" />} title="Melhor Dia (Venda Líquida)" value={formatCurrency(analysis?.bestDay.amount ?? 0)} subtext={`Em ${formatDate(analysis?.bestDay.date, "dd 'de' MMM, yyyy")}`} />
                      <InsightCard icon={<TrendingUp className="h-5 w-5" />} title="Melhor Semana (Venda Líquida)" value={formatCurrency(analysis?.bestWeek.amount ?? 0)} subtext={`Semana terminando em ${formatDate(analysis?.bestWeek.date, "dd/MM/yy")}`} />
                      <InsightCard icon={<BarChart className="h-5 w-5" />} title="Melhor Mês (Venda Líquida)" value={formatCurrency(analysis?.bestMonth.amount ?? 0)} subtext={analysis?.bestMonth.month} />
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-bold tracking-tighter mb-4 flex items-center gap-3">
                        <TargetIcon className="w-6 h-6 text-primary" />
                        Métricas de Performance (KPIs)
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <InsightCard icon={<Activity className="h-5 w-5" />} title="Dias Ativos no Período" value={analysis?.kpis.activeDays ?? 0} subtext="Dias com pelo menos uma venda" />
                      <InsightCard icon={<DollarSign className="h-5 w-5" />} title="Ticket Médio por Dia Ativo" value={formatCurrency(analysis?.kpis.averageTicketPerDay ?? 0)} subtext="Média de faturamento por dia trabalhado" />
                      <InsightCard icon={<Repeat className="h-5 w-5" />} title="Frequência de Vendas" value={`${(analysis?.kpis.salesFrequency ?? 0).toFixed(1)} dias`} subtext="Intervalo médio entre vendas" />
                      <InsightCard icon={<Percent className="h-5 w-5" />} title="Taxa de Realização" value={`${(analysis?.kpis.projectionConversionRate ?? 0).toFixed(1)}%`} subtext="Da projeção total convertida em vendas" />
                    </div>
                </section>
                
                <section>
                  <h2 className="text-2xl font-bold tracking-tighter mb-4 flex items-center gap-3">
                      <BrainCircuit className="w-6 h-6 text-primary" />
                      Análise de Performance (IA)
                  </h2>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Alert>
                          <Activity className="h-4 w-4" />
                          <AlertTitle>Ritmo de Vendas</AlertTitle>
                          <AlertDescription>
                              {analysis?.salesPaceAnalysis || "Análise indisponível."}
                          </AlertDescription>
                      </Alert>
                       <Alert>
                          <LineChart className="h-4 w-4" />
                          <AlertTitle>Tendência de Performance</AlertTitle>
                          <AlertDescription>
                              {analysis?.performanceTrend || "Análise indisponível."}
                          </AlertDescription>
                      </Alert>
                      <Alert>
                          <TrendingUp className="h-4 w-4" />
                          <AlertTitle>Resumo da Performance</AlertTitle>
                          <AlertDescription>
                              {analysis?.performanceSummary || "Análise indisponível."}
                          </AlertDescription>
                      </Alert>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                  <section className="lg:col-span-3 space-y-4">
                      <h2 className="text-2xl font-bold tracking-tighter flex items-center gap-3">
                          <DollarSign className="w-6 h-6 text-primary" />
                          Evolução das Vendas (Acumulado no Período)
                      </h2>
                      <Card>
                        <CardContent className="pt-6">
                            <ChartContainer config={{}} className="min-h-[400px] w-full">
                                <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" tickFormatter={(tick) => format(parseISO(tick), "dd/MM/yy")} />
                                    <YAxis tickFormatter={(value) => formatCurrency(value as number)} width={80} domain={[0, yAxisMax]} />
                                    <Tooltip content={<ChartTooltipContent formatter={(value, name) => (
                                        <div className="flex flex-col p-1 rounded-md bg-background/90 shadow-lg border border-border">
                                            <span className='font-bold text-sm text-foreground'>{name}</span>
                                            <span className='text-xs text-muted-foreground'>{formatCurrency(value as number)}</span>
                                        </div>
                                    )} />} />
                                    <Legend />
                                      {mostRecentSale && (
                                        <ReferenceLine y={mostRecentSale.monthlyGoal} label={{ value: `Meta: ${formatCurrency(mostRecentSale.monthlyGoal)}`, position: 'insideTopRight', fill: '#3B82F6', fontSize: 12, fontWeight: 'bold' }} stroke="#3B82F6" strokeDasharray="5 5" strokeWidth={2}/>
                                      )}
                                    <Area type="monotone" dataKey="Vendas" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1) / 0.2)" />
                                    <Area type="monotone" dataKey="Projeção" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2) / 0.1)" />
                                </AreaChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                    </section>
                    <section className="lg:col-span-2 space-y-4">
                         <h2 className="text-2xl font-bold tracking-tighter flex items-center gap-3">
                            <BarChart2 className="w-6 h-6 text-primary" />
                            Vendas por Dia da Semana
                        </h2>
                        <Card>
                            <CardContent className="pt-6">
                               <div className="min-h-[400px] w-full">
                                    <ResponsiveContainer width="100%" height={400}>
                                        <RechartsBarChart data={analysis?.weekdayAnalysis}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="day" />
                                            <YAxis tickFormatter={(value) => formatCurrency(value as number)}/>
                                            <Tooltip
                                                contentStyle={{ 
                                                    backgroundColor: 'hsl(var(--background))',
                                                    borderColor: 'hsl(var(--border))',
                                                    borderRadius: 'var(--radius)'
                                                }}
                                                formatter={(value: number) => [formatCurrency(value), "Vendas"]}
                                            />
                                            <Bar dataKey="amount" name="Vendas" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                                        </RechartsBarChart>
                                    </ResponsiveContainer>
                               </div>
                            </CardContent>
                        </Card>
                    </section>
                </div>
                
                  <section>
                  <h2 className="text-2xl font-bold tracking-tighter mb-4 flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-primary" />
                    Histórico de Lançamentos (Período Selecionado)
                  </h2>
                  <Card>
                    <CardContent className='p-0'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Vendas (Acumulado)</TableHead>
                            <TableHead>Projeção</TableHead>
                            <TableHead>Meta Mensal</TableHead>
                            <TableHead>% da Meta</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSales.slice().reverse().map(sale => (
                            <TableRow key={sale.id}>
                              <TableCell>{format(sale.createdAt, "dd/MM/yyyy")}</TableCell>
                              <TableCell>{formatCurrency(sale.billed)}</TableCell>
                              <TableCell>{formatCurrency(sale.projection)}</TableCell>
                              <TableCell>{formatCurrency(sale.monthlyGoal)}</TableCell>
                              <TableCell>
                                  <span className={`font-semibold ${sale.monthlyGoalPercentage >= 100 ? 'text-green-600' : 'text-orange-500'}`}>
                                    {sale.monthlyGoalPercentage.toFixed(2)}%
                                  </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </section>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}


function SellerHistoryPageWrapper() {
    return (
        <MainLayout>
          <SalesProvider>
              <SellerHistoryContent />
          </SalesProvider>
        </MainLayout>
    );
}

export default function SellerHistoryPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-xl font-medium">Carregando...</p>
                </div>
            </div>
        }>
            <SellerHistoryPageWrapper />
        </Suspense>
    )
}
