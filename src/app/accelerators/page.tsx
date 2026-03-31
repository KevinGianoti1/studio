
'use client';

import React, { Suspense, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { SalesProvider, SalesContext } from '@/contexts/sales-context';
import { PageHeader, PageHeaderTitle, PageHeaderDescription, PageHeaderActions } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useSharedDate } from '@/hooks/use-shared-date';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { CheckCircle2, Rocket, Target, Trophy, Calendar as CalendarIcon, Goal, PlusCircle as PlusCircleIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { format, getMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { FullPageSkeleton } from '@/components/full-page-skeleton';
import { useIsClient } from '@/hooks/use-is-client';
import type { AcceleratorRule } from '@/types';
import { MainLayout } from '@/components/main-layout';

const buildRulesForYear = (year: number): AcceleratorRule[] => [
    // Rules for August (Month index 7)
    { id: 'aug_15_sexta', label: 'Atingir 15% da meta na sexta', metaPercent: 15, bonus: 0.0015, deadline: new Date(year, 7, 1) },
    { id: 'aug_20_sexta', label: 'Atingir 20% da meta até sexta', metaPercent: 20, bonus: 0.0020, deadline: new Date(year, 7, 1) },
    { id: 'aug_40_0808', label: 'Atingir 40% até 08/08', metaPercent: 40, bonus: 0.0015, deadline: new Date(year, 7, 8) },
    { id: 'aug_50_0808', label: 'Atingir 50% até 08/08', metaPercent: 50, bonus: 0.0020, deadline: new Date(year, 7, 8) },
    { id: 'aug_100_2708', label: 'Bater 100% da meta até 27/08', metaPercent: 100, bonus: 0.001, deadline: new Date(year, 7, 27) },

    // Rules for September (Month index 8)
    { id: 'sep_20_0509', label: '20% da Meta até 05/09', metaPercent: 20, bonus: 0.002, deadline: new Date(year, 8, 5) },
    { id: 'sep_60_1209', label: '60% da Meta até 12/09', metaPercent: 60, bonus: 0.002, deadline: new Date(year, 8, 12) },
    { id: 'sep_100_2409', label: '100% da Meta Batida até 24/09', metaPercent: 100, bonus: 0.001, deadline: new Date(year, 8, 24) },
];


const generateAvatarUrl = (name: string) => {
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const color1 = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    const color2 = ((hash >> 8) & 0x00FFFFFF).toString(16).toUpperCase();
    return `https://placehold.co/100x100/${'000000'.substring(0, 6 - color1.length)}${color1}/${'FFFFFF'.substring(0, 6 - color2.length)}${color2}.png?text=${name.charAt(0)}`;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatPercent = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function AcceleratorsContent() {
    const { sales, isLoading: isSalesLoading } = useContext(SalesContext);
    const { date, setDate, dateString } = useSharedDate(sales);
    const isClient = useIsClient();
    
    // --- Local State for Achievements, saved to localStorage ---
    const [achieved, setAchieved] = useState<Set<string>>(new Set());

    useEffect(() => {
        // Load achievements from localStorage on component mount
        if (isClient) {
            const saved = localStorage.getItem('acceleratorAchievements');
            if (saved) {
                setAchieved(new Set(JSON.parse(saved)));
            }
        }
    }, [isClient]);

    useEffect(() => {
        // Save achievements to localStorage whenever they change
        if (isClient) {
            localStorage.setItem('acceleratorAchievements', JSON.stringify(Array.from(achieved)));
        }
    }, [achieved, isClient]);

    const handleToggleAchieved = useCallback((achievementId: string) => {
        setAchieved(prev => {
            const newAchieved = new Set(prev);
            if (newAchieved.has(achievementId)) {
                newAchieved.delete(achievementId);
            } else {
                newAchieved.add(achievementId);
            }
            return newAchieved;
        });
    }, []);
    
    const performanceData = useMemo(() => {
        if (!date?.from || sales.length === 0) return [];
        
        const startOfDayFn = (d: Date) => new Date(new Date(d).setHours(0, 0, 0, 0));
        const endOfDayFn = (d: Date) => new Date(new Date(d).setHours(23, 59, 59, 999));
        
        const salesInSelectedPeriod = sales.filter(sale => {
            const saleDate = sale.createdAt;
            const fromDate = startOfDayFn(date.from!);
            const toDate = endOfDayFn(date.to ?? date.from!);
            return saleDate >= fromDate && saleDate <= toDate;
        });
        
        const sellers = [...new Set(salesInSelectedPeriod.map(s => s.seller))];

        return sellers.map(seller => {
            const sellerSalesInPeriod = salesInSelectedPeriod.filter(s => s.seller === seller);
            const mostRecentSaleInPeriod = sellerSalesInPeriod.length > 0
                ? sellerSalesInPeriod.reduce((latest, current) => current.createdAt > latest.createdAt ? current : latest)
                : null;
            
            const billed = mostRecentSaleInPeriod?.billed ?? 0;
            const goal = mostRecentSaleInPeriod?.monthlyGoal ?? 0;
            const percentage = goal > 0 ? (billed / goal) : 0;
            
            return {
                seller,
                billed,
                goal,
                percentage,
                team: mostRecentSaleInPeriod?.group ?? 'N/A',
            };
        }).sort((a,b) => b.percentage - a.percentage);

    }, [sales, date]);

    const filteredRules = useMemo(() => {
        if (!date?.from) return [];
        const selectedMonth = getMonth(date.from);
        const selectedYear = date.from.getFullYear();
        const rulesForYear = buildRulesForYear(selectedYear);
        return rulesForYear.filter(rule => getMonth(rule.deadline) === selectedMonth);
    }, [date]);


    if (isSalesLoading) {
        return <FullPageSkeleton />;
    }

    return (
        <div className="space-y-8">
            <PageHeader>
                <div className="flex-1">
                    <PageHeaderTitle>Aceleradores de Comissão</PageHeaderTitle>
                    <PageHeaderDescription>
                        Acompanhe e gerencie o progresso dos vendedores em relação aos marcos de comissão no período: {dateString}
                    </PageHeaderDescription>
                </div>
                <PageHeaderActions>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn("w-full sm:w-[260px] justify-start text-left font-normal", !date && "text-muted-foreground")}
                                disabled={isSalesLoading}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date?.from ? (date.to ? `${format(date.from, "dd/MM/yy")} - ${format(date.to, "dd/MM/yy")}` : format(date.from, "dd/MM/yy")) : <span>Escolha um período</span>}
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
                </PageHeaderActions>
            </PageHeader>

            {performanceData.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {performanceData.map(data => {
                        const totalBonus = filteredRules.reduce((acc, rule) => {
                             const achievementId = `${data.seller}-${rule.id}`;
                             return achieved.has(achievementId) ? acc + rule.bonus : acc;
                        }, 0);
                        
                        return (
                            <Card key={data.seller} className="shadow-lg flex flex-col">
                                <CardHeader>
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12 border-2 border-primary/50">
                                            <AvatarImage src={generateAvatarUrl(data.seller)} alt={data.seller} />
                                            <AvatarFallback>{data.seller.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle>{data.seller}</CardTitle>
                                            <CardDescription>{data.team}</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-grow space-y-4">
                                    <div>
                                        <div className="flex justify-between items-end mb-1">
                                            <span className="text-muted-foreground text-sm">Progresso da Meta</span>
                                            <span className="font-bold text-primary text-xl">{(data.percentage * 100).toFixed(1)}%</span>
                                        </div>
                                        <Progress value={data.percentage * 100} />
                                        <div className="flex justify-between items-end mt-1 text-xs text-muted-foreground">
                                            <span>{formatCurrency(data.billed)}</span>
                                            <Target className="h-3 w-3" />
                                            <span>{formatCurrency(data.goal)}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-sm font-medium text-center">Marcos de Aceleração ({date?.from ? format(date.from, 'MMMM', {locale: ptBR}) : ''})</p>
                                        <div className="space-y-2">
                                            {filteredRules.map(rule => {
                                                const achievementId = `${data.seller}-${rule.id}`;
                                                const isAchieved = achieved.has(achievementId);
                                                const hasReachedMeta = data.percentage >= rule.metaPercent / 100;
                                                
                                                return (
                                                    <TooltipProvider key={rule.id}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div 
                                                                    onClick={() => handleToggleAchieved(achievementId)}
                                                                    className={cn(
                                                                    "flex items-center justify-between p-2 rounded-md text-sm cursor-pointer transition-colors",
                                                                    isAchieved ? 'bg-green-100 dark:bg-green-900/50 hover:bg-green-200/80' : 'bg-muted/50 hover:bg-muted'
                                                                )}>
                                                                    <div className="flex items-center gap-2">
                                                                        {isAchieved 
                                                                            ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                                            : <Goal className={cn("h-5 w-5", hasReachedMeta ? "text-primary" : "text-muted-foreground")} />
                                                                        }
                                                                        <span className="truncate">{rule.label}</span>
                                                                    </div>
                                                                    <span className="font-bold">{formatPercent(rule.bonus)}</span>
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Meta: {rule.metaPercent}% da meta mensal até {format(rule.deadline, 'dd/MM/yy')}.</p>
                                                                <p>Bônus de comissão: +{formatPercent(rule.bonus)}</p>
                                                                <p className="font-bold mt-1">Clique para marcar como {isAchieved ? 'não concluído' : 'concluído'}.</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )
                                            })}
                                        </div>
                                        {filteredRules.length === 0 && (
                                            <p className="text-center text-xs text-muted-foreground py-4">Nenhuma regra de acelerador definida para este mês.</p>
                                        )}
                                        <div className="pt-2 border-t border-dashed">
                                            <div className="flex justify-between items-center p-2 rounded-md bg-blue-100 dark:bg-blue-900/50">
                                                <div className="flex items-center gap-2 font-bold text-blue-700 dark:text-blue-300">
                                                    <PlusCircleIcon className="h-5 w-5" />
                                                    <span>Bônus Total</span>
                                                </div>
                                                <span className="text-xl font-black text-blue-700 dark:text-blue-300">{formatPercent(totalBonus)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-muted/50 p-3 text-center">
                                    <p className="text-xs text-muted-foreground w-full">
                                        Clique nos marcos para gerenciar o status. Os dados ficam salvos no seu navegador.
                                    </p>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            ) : (
                <Card>
                    <CardContent className="py-16 text-center text-muted-foreground">
                        <Trophy className="mx-auto h-12 w-12 mb-4" />
                        <h3 className="text-xl font-semibold">Sem dados de performance</h3>
                        <p>Não foram encontrados dados de vendas para o período selecionado.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default function AcceleratorsPage() {
    const isClient = useIsClient();

    if (!isClient) {
        return <FullPageSkeleton />;
    }

    return (
        <MainLayout>
          <SalesProvider>
              <Suspense fallback={<FullPageSkeleton />}>
                  <AcceleratorsContent />
              </Suspense>
          </SalesProvider>
        </MainLayout>
    );
}
