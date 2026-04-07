

'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { PageHeader, PageHeaderTitle, PageHeaderDescription, PageHeaderActions } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Crown, Calendar as CalendarIcon, Shield, BarChart2, Star, Award, Phone, FileText, Video, ChevronsRight } from 'lucide-react';
import { fetchDeliverables } from '@/ai/flows/deliverables-flow';
import type { UIDeliverable, SellerDeliverableStats, RecordBreaker, TeamDeliverableStats, DeliverableCategory } from '@/types';
import { format, parseISO, isValid, startOfDay, endOfDay, eachDayOfInterval, getDay, isSameDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MainLayout } from '@/components/main-layout';


const generateAvatarUrl = (name: string) => {
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const color1 = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    const color2 = ((hash >> 8) & 0x00FFFFFF).toString(16).toUpperCase();
    return `https://placehold.co/100x100/${'000000'.substring(0, 6 - color1.length)}${color1}/${'FFFFFF'.substring(0, 6 - color2.length)}${color2}.png?text=${name.charAt(0)}`;
};

const getCategoryIcon = (category: DeliverableCategory | 'generalist') => {
    switch (category) {
        case 'calls': return <Phone className="w-4 h-4 text-blue-500" />;
        case 'proposals': return <FileText className="w-4 h-4 text-green-500" />;
        case 'videos': return <Video className="w-4 h-4 text-purple-500" />;
        default: return <Star className="w-4 h-4 text-yellow-500" />;
    }
};

const PageSkeleton = () => (
  <div className="space-y-8">
    <PageHeader>
      <PageHeaderTitle>Centro de Performance: Entregáveis</PageHeaderTitle>
      <PageHeaderDescription>Análise da competição de entregáveis.</PageHeaderDescription>
    </PageHeader>
    <div className="flex items-center justify-center h-96">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  </div>
);

type ViewMode = 'daily' | 'weekly' | 'monthly';

function DeliverablesContent() {
  const [deliverables, setDeliverables] = useState<UIDeliverable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<DateRange | undefined>({ from: new Date(), to: new Date() });
  const [selectedSeller, setSelectedSeller] = useState<SellerDeliverableStats | null>(null);
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('daily');


  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchDeliverables();
        if (result.error) {
          setError(result.error);
          toast({ variant: 'destructive', title: 'Erro ao buscar dados', description: result.error });
        } else {
          const dataWithDates = (result.data || []).map(d => ({
            ...d,
            date: parseISO(d.date),
          })).filter(d => isValid(d.date));
          setDeliverables(dataWithDates);
          if (dataWithDates.length > 0) {
             const mostRecentDate = dataWithDates.reduce((max, d) => d.date > max ? d.date : max, dataWithDates[0].date);
             setDate({ from: mostRecentDate, to: mostRecentDate });
          }
        }
      } catch (err: any) {
        setError('Ocorreu um erro inesperado.');
        toast({ variant: 'destructive', title: 'Erro de Conexão', description: err.message });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [toast]);

  const handleDateChange = (newDate: Date | undefined) => {
    if (!newDate) return;
    
    let newRange: DateRange;
    if (viewMode === 'daily') {
        newRange = { from: newDate, to: newDate };
    } else if (viewMode === 'weekly') {
        newRange = { from: startOfWeek(newDate, { locale: ptBR }), to: endOfWeek(newDate, { locale: ptBR }) };
    } else { // monthly
        newRange = { from: startOfMonth(newDate), to: endOfMonth(newDate) };
    }
    setDate(newRange);
  };
  
  const handleViewModeChange = (newMode: ViewMode) => {
    if (!newMode) return;
    setViewMode(newMode);
    // Recalculate date range based on new mode and current date
    const currentDate = date?.from || new Date();
    handleDateChange(currentDate);
  }

  const { rankedSellers, kingOfTheDay, recordBreakers, teamStats } = useMemo(() => {
    if (!deliverables.length || !date?.from || !date?.to) return { rankedSellers: [], kingOfTheDay: null, recordBreakers: [], teamStats: [] };

    const selectedInterval = { start: startOfDay(date.from), end: endOfDay(date.to) };
    const periodData = deliverables.filter(d => d.date >= selectedInterval.start && d.date <= selectedInterval.end);
    
    const dayBefore = startOfDay(subDays(selectedInterval.start, 1));
    const yesterdaysData = viewMode === 'daily' ? deliverables.filter(d => isSameDay(d.date, dayBefore)) : [];

    const sellersInPeriod = [...new Set(periodData.map(d => d.seller))];

    const stats: SellerDeliverableStats[] = sellersInPeriod.map(seller => {
        const sellerData = periodData.filter(d => d.seller === seller);

        const totalGoals = sellerData.reduce((acc, d) => ({
            calls: acc.calls + d.callsGoal,
            proposals: acc.proposals + d.proposalsGoal,
            videos: acc.videos + d.videosGoal
        }), { calls: 0, proposals: 0, videos: 0 });

        const totalMade = sellerData.reduce((acc, d) => ({
            calls: acc.calls + d.callsMade,
            proposals: acc.proposals + d.proposalsMade,
            videos: acc.videos + d.videosMade
        }), { calls: 0, proposals: 0, videos: 0 });

        const callsPerc = totalGoals.calls > 0 ? (totalMade.calls / totalGoals.calls) * 100 : 0;
        const proposalsPerc = totalGoals.proposals > 0 ? (totalMade.proposals / totalGoals.proposals) * 100 : 0;
        const videosPerc = totalGoals.videos > 0 ? (totalMade.videos / totalGoals.videos) * 100 : 0;
        
        const totalScore = callsPerc + proposalsPerc + videosPerc;

        let bestCategory: DeliverableCategory | 'generalist' = 'generalist';
        const percentages = { calls: callsPerc, proposals: proposalsPerc, videos: videosPerc };
        const maxPerc = Math.max(...Object.values(percentages));
        if (maxPerc > 0 && maxPerc >= (totalScore / 3) * 1.2) { // Must be significantly better
            bestCategory = Object.keys(percentages).find(k => percentages[k as DeliverableCategory] === maxPerc) as DeliverableCategory;
        }
        
        let weeklyStreak: number[] = [];
        if (viewMode === 'daily' && date?.from) {
          const weekStart = startOfWeek(date.from, { locale: ptBR });
          // Ensure we only look at days up to and including the selected date.from
          if (weekStart <= date.from) {
            const weekDays = eachDayOfInterval({ start: weekStart, end: date.from });
            weeklyStreak = weekDays.map(day => {
              // Find all records for the seller for the specific day of the week
              const dayData = deliverables.filter(d => d.seller === seller && isSameDay(d.date, day));
              
              if (dayData.length === 0) {
                return 0; // No data for this day, so goal not met.
              }
              
              // Aggregate goals and made for the day in case of multiple entries (though unlikely)
              const dailyTotals = dayData.reduce((acc, curr) => {
                  acc.callsGoal += curr.callsGoal;
                  acc.callsMade += curr.callsMade;
                  acc.proposalsGoal += curr.proposalsGoal;
                  acc.proposalsMade += curr.proposalsMade;
                  acc.videosGoal += curr.videosGoal;
                  acc.videosMade += curr.videosMade;
                  return acc;
              }, { callsGoal: 0, callsMade: 0, proposalsGoal: 0, proposalsMade: 0, videosGoal: 0, videosMade: 0 });

              // Check if all goals are met. If a goal is 0, it's considered met.
              const callsMet = dailyTotals.callsGoal === 0 || dailyTotals.callsMade >= dailyTotals.callsGoal;
              const proposalsMet = dailyTotals.proposalsGoal === 0 || dailyTotals.proposalsMade >= dailyTotals.proposalsGoal;
              const videosMet = dailyTotals.videosGoal === 0 || dailyTotals.videosMade >= dailyTotals.videosGoal;
              
              return (callsMet && proposalsMet && videosMet) ? 1 : 0;
            });
          }
        }

        return {
            seller,
            team: sellerData[0].team,
            totalScore,
            isKingOfTheDay: false,
            bestCategory,
            weeklyStreak,
            metrics: {
                calls: { goal: totalGoals.calls, made: totalMade.calls, percentage: callsPerc },
                proposals: { goal: totalGoals.proposals, made: totalMade.proposals, percentage: proposalsPerc },
                videos: { goal: totalGoals.videos, made: totalMade.videos, percentage: videosPerc },
            }
        };
    });
    
    // King of the Day is only for daily view
    let kingOfTheDay: string | null = null;
    if (viewMode === 'daily') {
        const sellersYesterday = [...new Set(yesterdaysData.map(d => d.seller))];
        const yesterdayScores: {seller: string, score: number}[] = sellersYesterday.map(seller => {
            const sellerData = yesterdaysData.find(d => d.seller === seller)!;
            const callsPerc = sellerData.callsGoal > 0 ? (sellerData.callsMade / sellerData.callsGoal) : 0;
            const proposalsPerc = sellerData.proposalsGoal > 0 ? (sellerData.proposalsMade / sellerData.proposalsGoal) : 0;
            const videosPerc = sellerData.videosGoal > 0 ? (sellerData.videosMade / sellerData.videosGoal) : 0;
            return { seller, score: (callsPerc + proposalsPerc + videosPerc) };
        }).sort((a,b) => b.score - a.score);

        kingOfTheDay = yesterdayScores.length > 0 ? yesterdayScores[0].seller : null;
        if (kingOfTheDay) {
            const kingStat = stats.find(s => s.seller === kingOfTheDay);
            if (kingStat) kingStat.isKingOfTheDay = true;
        }
    }
    
    // Record Breakers are for the selected period
    const recordBreakers: RecordBreaker[] = (['calls', 'proposals', 'videos'] as DeliverableCategory[]).map(cat => {
        return periodData.reduce((max, current) => {
            return current[`${cat}Made`] > max.value ? { category: cat, seller: current.seller, value: current[`${cat}Made`] } : max;
        }, { category: cat, seller: '', value: 0 });
    }).filter(r => r.value > 0);

    const teamNames = ['Maxiforce', 'Pyramid'] as const;
    const teamStats: TeamDeliverableStats[] = teamNames.map(team => {
        const teamMembers = stats.filter(s => s.team.toUpperCase() === team.toUpperCase());
        const avgScore = teamMembers.length > 0 ? teamMembers.reduce((sum, s) => sum + s.totalScore, 0) / teamMembers.length : 0;
        const totalMade = {
            calls: teamMembers.reduce((sum, s) => sum + s.metrics.calls.made, 0),
            proposals: teamMembers.reduce((sum, s) => sum + s.metrics.proposals.made, 0),
            videos: teamMembers.reduce((sum, s) => sum + s.metrics.videos.made, 0),
        };
        return { team, avgScore, totalMade };
    });

    return { rankedSellers: stats.sort((a,b) => b.totalScore - a.totalScore), kingOfTheDay, recordBreakers, teamStats };
  }, [deliverables, date, viewMode]);

  const formatDateString = (dateToFormat: DateRange | undefined) => {
    if (!dateToFormat?.from) return "um período";
    if (viewMode === 'daily') {
        return format(dateToFormat.from, "dd 'de' MMMM, yyyy", { locale: ptBR });
    }
    const start = format(dateToFormat.from, "dd/MM", { locale: ptBR });
    const end = dateToFormat.to ? format(dateToFormat.to, "dd/MM/yyyy", { locale: ptBR }) : '';
    return `de ${start} a ${end}`;
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <Dialog>
    <div className="space-y-8">
      <PageHeader>
        <PageHeaderTitle>Centro de Performance: Entregáveis</PageHeaderTitle>
        <PageHeaderDescription>
          Análise da competição de entregáveis para o período: {formatDateString(date)}
        </PageHeaderDescription>
         <PageHeaderActions>
            <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange} aria-label="Período de visualização">
                <ToggleGroupItem value="daily" aria-label="Diário">Diário</ToggleGroupItem>
                <ToggleGroupItem value="weekly" aria-label="Semanal">Semanal</ToggleGroupItem>
                <ToggleGroupItem value="monthly" aria-label="Mensal">Mensal</ToggleGroupItem>
            </ToggleGroup>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-[240px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    viewMode === 'daily' ? format(date.from, "PPP", { locale: ptBR }) : 
                    `${format(date.from, "dd/MM/yy")} - ${date.to ? format(date.to, "dd/MM/yy") : ''}`
                  ) : (
                    <span>Escolha uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={date?.from}
                  onSelect={(d) => handleDateChange(d)}
                  disabled={(d) => d > new Date() || d < new Date("2024-01-01")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </PageHeaderActions>
      </PageHeader>

      {error && (
        <Alert variant="destructive" className="mb-8">
          <AlertTitle>Falha ao Carregar Dados</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
       {!isLoading && !error && deliverables.length === 0 && (
         <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
                <BarChart2 className="mx-auto h-12 w-12 mb-4" />
                <h3 className="text-xl font-semibold">Nenhum dado de entregáveis encontrado</h3>
                <p>Verifique sua planilha ou comece a adicionar dados para ver a competição.</p>
            </CardContent>
        </Card>
      )}

      {rankedSellers.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Podium */}
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold flex items-center gap-3">
                            <Award className="text-primary" /> Pódio dos Vendedores
                        </CardTitle>
                        <CardDescription>Ranking geral com base na soma das porcentagens de metas atingidas no período. Clique para ver detalhes.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {rankedSellers.map((s, index) => (
                           <DialogTrigger asChild key={s.seller} onClick={() => setSelectedSeller(s)}>
                             <Card className={cn(
                                "p-4 flex items-center gap-4 transition-all hover:shadow-lg cursor-pointer hover:-translate-y-1",
                                kingOfTheDay === s.seller && "border-primary/50 animate-pulse-border"
                             )}>
                                <div className="text-2xl font-black text-muted-foreground w-8 text-center">{index + 1}</div>
                                <Avatar className="w-16 h-16 border-2 border-primary/50">
                                    <AvatarImage src={generateAvatarUrl(s.seller)} alt={s.seller} />
                                    <AvatarFallback>{s.seller.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-lg">{s.seller}</p>
                                        {kingOfTheDay === s.seller && (
                                            <UiTooltip>
                                                <TooltipTrigger>
                                                    <Crown className="w-6 h-6 text-yellow-400" />
                                                </TooltipTrigger>
                                                <TooltipContent><p>Rei do Dia Anterior!</p></TooltipContent>
                                            </UiTooltip>
                                        )}
                                         <UiTooltip>
                                            <TooltipTrigger>
                                                {getCategoryIcon(s.bestCategory)}
                                            </TooltipTrigger>
                                            <TooltipContent><p>Destaque em {s.bestCategory}</p></TooltipContent>
                                        </UiTooltip>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        {viewMode === 'daily' && s.weeklyStreak.length > 0 && (
                                            <>
                                            <span>Semana Imbatível:</span>
                                            {s.weeklyStreak.map((day, i) => (
                                                <div key={i} className={cn("w-3 h-3 rounded-full", day ? "bg-green-500" : "bg-muted")}></div>
                                            ))}
                                            </>
                                        )}
                                    </div>
                                    <Progress value={s.totalScore / 3} className="h-2" />
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-extrabold text-primary">{s.totalScore.toFixed(0)}</p>
                                    <p className="text-xs text-muted-foreground">Pontos</p>
                                </div>
                            </Card>
                           </DialogTrigger>
                        ))}
                    </CardContent>
                </Card>
            </div>
            
            {/* Side Column */}
            <div className="space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Star className="text-yellow-500" />Caçador de Recordes</CardTitle>
                        <CardDescription>Melhores performances individuais no período.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {recordBreakers.map(r => (
                             <div key={r.category} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    {getCategoryIcon(r.category)}
                                    <span className="font-semibold text-sm capitalize">{r.category === 'calls' ? 'Ligações' : r.category}</span>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-sm">{r.seller}</p>
                                    <p className="text-xs text-muted-foreground">{r.value} realizados</p>
                                </div>
                            </div>
                        ))}
                         {recordBreakers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum recorde no período.</p>}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Shield /> Batalha das Equipes</CardTitle>
                        <CardDescription>Performance e totais por equipe no período.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {teamStats.map(team => (
                            <div key={team.team} className={cn(
                                "p-4 rounded-lg border-2",
                                team.team.toUpperCase() === 'MAXIFORCE' ? 'border-green-500/50 bg-green-500/10' : 'border-purple-500/50 bg-purple-500/10'
                            )}>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className={cn(
                                        "font-bold text-lg",
                                        team.team.toUpperCase() === 'MAXIFORCE' ? 'text-green-700 dark:text-green-300' : 'text-purple-700 dark:text-purple-300'
                                    )}>{team.team}</h4>
                                    <div className="text-right">
                                        <p className="font-bold text-xl">{team.avgScore.toFixed(0)}</p>
                                        <p className="text-xs text-muted-foreground">Pontos (Média)</p>
                                    </div>
                                </div>
                                <Progress value={team.avgScore / 3} indicatorClassName={team.team.toUpperCase() === 'MAXIFORCE' ? 'bg-green-500' : 'bg-purple-500'} />
                                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                                    <div>
                                        <p className="font-bold text-sm text-foreground">{team.totalMade.calls}</p>
                                        <p>Ligações</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-foreground">{team.totalMade.proposals}</p>
                                        <p>Propostas</p>
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-foreground">{team.totalMade.videos}</p>
                                        <p>Vídeos</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
      ) : (
        !isLoading && (
             <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                    <CalendarIcon className="mx-auto h-12 w-12 mb-4" />
                    <h3 className="text-xl font-semibold">Sem dados para este período</h3>
                    <p>Não foram encontrados registros de entregáveis para {formatDateString(date)}.</p>
                </CardContent>
            </Card>
        )
      )}

    </div>
    {selectedSeller && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border-2 border-primary/50">
                <AvatarImage src={generateAvatarUrl(selectedSeller.seller)} alt={selectedSeller.seller} />
                <AvatarFallback>{selectedSeller.seller.charAt(0)}</AvatarFallback>
              </Avatar>
              Detalhes de {selectedSeller.seller}
            </DialogTitle>
            <DialogDescription>
              Performance consolidada para o período de {formatDateString(date)}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entregável</TableHead>
                  <TableHead className="text-center">Meta</TableHead>
                  <TableHead className="text-center">Realizado</TableHead>
                  <TableHead className="text-right">% Atingido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium flex items-center gap-2"><Phone className="w-4 h-4"/> Ligações</TableCell>
                  <TableCell className="text-center">{selectedSeller.metrics.calls.goal}</TableCell>
                  <TableCell className="text-center">{selectedSeller.metrics.calls.made}</TableCell>
                  <TableCell className="text-right font-bold">{selectedSeller.metrics.calls.percentage.toFixed(1)}%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium flex items-center gap-2"><FileText className="w-4 h-4"/> Propostas</TableCell>
                  <TableCell className="text-center">{selectedSeller.metrics.proposals.goal}</TableCell>
                  <TableCell className="text-center">{selectedSeller.metrics.proposals.made}</TableCell>
                  <TableCell className="text-right font-bold">{selectedSeller.metrics.proposals.percentage.toFixed(1)}%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium flex items-center gap-2"><Video className="w-4 h-4"/> Vídeos</TableCell>
                  <TableCell className="text-center">{selectedSeller.metrics.videos.goal}</TableCell>
                  <TableCell className="text-center">{selectedSeller.metrics.videos.made}</TableCell>
                  <TableCell className="text-right font-bold">{selectedSeller.metrics.videos.percentage.toFixed(1)}%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

export default function DeliverablesPage() {
  return (
    <MainLayout>
        <Suspense fallback={<PageSkeleton />}>
        <DeliverablesContent />
        </Suspense>
    </MainLayout>
  );
}
