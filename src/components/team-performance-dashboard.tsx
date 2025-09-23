

"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import type { UIDateSale } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine, Legend, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from "recharts";
import { format, parseISO, eachDayOfInterval, startOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';


const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

type ChartDataPoint = {
  date: string; // "yyyy-MM-dd"
  sales: number;
  projection: number;
};

const getProgressColor = (percentage: number) => {
    if (percentage < 40) return "hsl(var(--destructive))";
    if (percentage < 80) return "hsl(var(--chart-5))"; // yellow/orange
    return "hsl(var(--chart-1))"; // green
}

const AnimatedNumber = ({ value, formatter }: { value: number, formatter: (val: number) => string | number }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const nodeRef = useRef<SVGTSpanElement>(null); // Ref can be used on any element

    useEffect(() => {
        const DURATION = 1500; // 1.5 seconds
        let start: number | null = null;
        let animationFrameId: number;

        const step = (timestamp: number) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / DURATION, 1);
            const currentValue = 0 + progress * (value - 0);
            setDisplayValue(currentValue);
            if (progress < 1) {
                animationFrameId = requestAnimationFrame(step);
            }
        };

        animationFrameId = requestAnimationFrame(step);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [value]);
    
    // Just return the formatted value as a text node, no wrapper element.
    return <>{formatter(displayValue)}</>;
}


const FullScreenChart = ({ title, data, goal, yAxisMax, salesColor, projectionColor }: { title: string, data: ChartDataPoint[], goal: number, yAxisMax: number, salesColor: string, projectionColor: string }) => {
    const totalBilled = data.length > 0 ? data[data.length - 1].sales : 0;
    const percentageToGoal = goal > 0 ? (totalBilled / goal) * 100 : 0;
    const amountRemaining = Math.max(0, goal - totalBilled);

    const radialData = [
        {
            name: title,
            value: percentageToGoal,
            fill: getProgressColor(percentageToGoal),
        },
    ];

    return (
        <section className="w-full h-screen flex items-center justify-center p-8">
            <div className="w-1/3 h-full flex flex-col items-center justify-center p-4">
                <ResponsiveContainer width="100%" height="70%">
                    <RadialBarChart
                        innerRadius="80%"
                        outerRadius="100%"
                        data={radialData}
                        startAngle={90}
                        endAngle={-270}
                        barSize={30}
                    >
                        <RadialBar
                            background={{ fill: 'hsl(var(--muted) / 0.5)' }}
                            dataKey="value"
                            cornerRadius={15}
                        />
                        <text
                            x="50%"
                            y="45%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="fill-muted-foreground text-2xl font-bold"
                        >
                            {title}
                        </text>
                        <text
                            x="50%"
                            y="55%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="fill-foreground text-6xl font-black"
                        >
                         <tspan>
                            <AnimatedNumber value={percentageToGoal} formatter={(val) => `${val.toFixed(1)}%`}/>
                        </tspan>
                        </text>
                    </RadialBarChart>
                </ResponsiveContainer>
                <div className="text-center mt-4">
                    <p className="text-3xl font-bold">
                        <AnimatedNumber value={totalBilled} formatter={formatCurrency} /> / {formatCurrency(goal)}
                    </p>
                    <p className="text-lg text-muted-foreground font-semibold">
                       Faltam <AnimatedNumber value={amountRemaining} formatter={formatCurrency} />
                    </p>
                </div>
            </div>
            <div className="w-2/3 h-full flex flex-col p-4">
                <ChartContainer config={{}} className="h-full w-full">
                    <ResponsiveContainer>
                        <AreaChart data={data} margin={{ top: 5, right: 40, left: 40, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(tick) => format(parseISO(tick), "dd/MM", { locale: ptBR })}
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 16 }}
                                axisLine={{ stroke: 'hsl(var(--border))' }}
                                tickLine={{ stroke: 'hsl(var(--border))' }}
                                padding={{ left: 20, right: 20 }}
                            />
                            <YAxis
                                tickFormatter={(value) => formatCurrency(value as number)}
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 16 }}
                                axisLine={{ stroke: 'hsl(var(--border))' }}
                                tickLine={{ stroke: 'hsl(var(--border))' }}
                                width={120}
                                domain={[0, yAxisMax]}
                            />
                            <Tooltip
                                content={
                                <ChartTooltipContent
                                    formatter={(value, name) => (
                                    <div className="flex flex-col p-1 rounded-md bg-background/90 shadow-lg border border-border">
                                        <span className='font-bold text-sm text-foreground'>{name === 'sales' ? 'Vendas do Dia' : 'Projeção'}</span>
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
                                wrapperStyle={{ paddingBottom: '20px', fontSize: '16px' }}
                                payload={[
                                { value: 'Vendas', type: 'line', color: salesColor },
                                { value: 'Projeção', type: 'line', color: projectionColor },
                                { value: 'Meta Mensal', type: 'line', color: '#3B82F6', payload: { strokeDasharray: '5 5' } }
                                ]}
                            />
                            {goal > 0 && <ReferenceLine y={goal} label={{ value: `Meta: ${formatCurrency(goal)}`, position: 'insideTopRight', fill: '#3B82F6', fontSize: 18, fontWeight: 'bold' }} stroke="#3B82F6" strokeDasharray="5 5" strokeWidth={3}/>}
                            <Area type="monotone" dataKey="sales" name="Vendas" stroke={salesColor} fillOpacity={0.2} fill={`url(#${title.replace(/\s+/g, '')}-sales)`} strokeWidth={3} dot={{ r: 5, fill: salesColor, stroke: 'hsl(var(--card))', strokeWidth: 2 }} activeDot={{ r: 8, fill: salesColor, stroke: 'hsl(var(--card))', strokeWidth: 3 }} />
                            <Area type="monotone" dataKey="projection" name="Projeção" stroke={projectionColor} fillOpacity={0.1} fill={`url(#${title.replace(/\s+/g, '')}-proj)`} />
                            <defs>
                                <linearGradient id={`${title.replace(/\s+/g, '')}-sales`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={salesColor} stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor={salesColor} stopOpacity={0.1}/>
                                </linearGradient>
                                <linearGradient id={`${title.replace(/\s+/g, '')}-proj`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={projectionColor} stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor={projectionColor} stopOpacity={0.05}/>
                                </linearGradient>
                            </defs>
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>
        </section>
    );
};


const TeamChart = ({ 
    title, 
    data, 
    goal, 
    yAxisMax,
    "data-testid": dataTestId, 
    borderColor,
    salesColor,
    projectionColor,
    titleColor,
    onLegendHover,
    inactiveOpacity
}: { 
    title: string, 
    data: ChartDataPoint[], 
    goal: number, 
    yAxisMax: number,
    "data-testid"?: string, 
    borderColor: string,
    salesColor: string,
    projectionColor: string,
    titleColor: string,
    onLegendHover: (payload?: any) => void;
    inactiveOpacity: number;
}) => {

    const totalBilled = data.length > 0 ? data[data.length - 1].sales : 0;
    const percentageToGoal = goal > 0 ? (totalBilled / goal) * 100 : 0;
    const amountRemaining = Math.max(0, goal - totalBilled);
    
    return (
      <Card className={`shadow-lg flex flex-col h-full ${borderColor} transition-all duration-300 hover:shadow-2xl hover:-translate-y-1`} data-testid={dataTestId}>
        <CardHeader className="text-center">
            <CardTitle className={`text-2xl font-black tracking-tighter ${titleColor}`}>{title}</CardTitle>
            <CardDescription>Análise de Desempenho</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <ChartContainer config={{}} className="w-full min-h-[300px]">
            <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                        <span className='font-bold text-sm text-foreground'>{name === 'sales' ? 'Vendas do Dia' : 'Projeção'}</span>
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
                wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }}
                onMouseEnter={(payload) => onLegendHover(payload)}
                onMouseLeave={() => onLegendHover()}
              />
              {goal > 0 && <ReferenceLine y={goal} label={{ value: `Meta: ${formatCurrency(goal)}`, position: 'insideTopRight', fill: '#3B82F6', fontSize: 12, fontWeight: 'bold' }} stroke="#3B82F6" strokeDasharray="5 5" strokeWidth={2}/>}
              <Area 
                type="monotone" 
                dataKey="sales" 
                name="Vendas" 
                stroke={salesColor} 
                fillOpacity={0.2} 
                fill={`url(#${title.replace(/\s+/g, '')}-sales)`} 
                strokeWidth={2} 
                dot={{ r: 4, fill: salesColor, stroke: 'hsl(var(--card))', strokeWidth: 2 }} 
                activeDot={{ r: 6, fill: salesColor, stroke: 'hsl(var(--card))', strokeWidth: 2 }} 
                opacity={inactiveOpacity === 0.3 ? 1 : inactiveOpacity}
                style={{ transition: 'opacity 0.3s' }}
                />
               <Area 
                type="monotone" 
                dataKey="projection" 
                name="Projeção" 
                stroke={projectionColor} 
                fillOpacity={0.1} 
                fill={`url(#${title.replace(/\s+/g, '')}-proj)`} 
                opacity={inactiveOpacity === 0.3 ? 1 : inactiveOpacity}
                style={{ transition: 'opacity 0.3s' }}
                />
              <defs>
                  <linearGradient id={`${title.replace(/\s+/g, '')}-sales`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={salesColor} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={salesColor} stopOpacity={0.1}/>
                  </linearGradient>
                   <linearGradient id={`${title.replace(/\s+/g, '')}-proj`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={projectionColor} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={projectionColor} stopOpacity={0.05}/>
                  </linearGradient>
              </defs>
            </AreaChart>
          </ChartContainer>
        </CardContent>
         <CardFooter className="flex-col items-start gap-2 pt-4 border-t">
            <div className="w-full space-y-2">
                 <Progress value={percentageToGoal} className="h-3" />
                <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-primary">{percentageToGoal.toFixed(1)}%</span>
                    <span className="text-muted-foreground">
                        {formatCurrency(totalBilled)} / {formatCurrency(goal)}
                    </span>
                </div>
                 <p className="text-xs text-center text-muted-foreground pt-1">
                    Faltam {formatCurrency(amountRemaining)} para atingir a meta.
                </p>
            </div>
         </CardFooter>
      </Card>
    );
};

export function TeamPerformanceDashboard({ data }: { data: UIDateSale[] }) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentView, setCurrentView] = useState<'maxiforce' | 'pyramid'>('maxiforce');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [activeLegend, setActiveLegend] = useState<string | null>(null);

   const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentView(prev => (prev === 'maxiforce' ? 'pyramid' : 'maxiforce'));
    }, 5 * 60 * 1000); // 5 minutes
  }, []);

  const handleManualSwitch = useCallback(() => {
    setCurrentView(prev => (prev === 'maxiforce' ? 'pyramid' : 'maxiforce'));
    startTimer(); // Reset timer on manual interaction
  }, [startTimer]);


  useEffect(() => {
      if (isFullScreen) {
          startTimer();
          return () => {
              if (timerRef.current) clearInterval(timerRef.current);
          };
      } else {
          if (timerRef.current) clearInterval(timerRef.current);
      }
  }, [isFullScreen, startTimer]);

  const teamData = useMemo(() => {
    if (!data.length) return { maxiforce: [], pyramid: [], maxiforceGoal: 0, pyramidGoal: 0, maxiforceYMax: 100, pyramidYMax: 100 };

    const dates = data.map(d => startOfDay(d.createdAt));
    const interval = { start: new Date(Math.min(...dates.map(d => d.getTime()))), end: new Date(Math.max(...dates.map(d => d.getTime()))) };
    if (!interval.start || !interval.end || isNaN(interval.start.getTime()) || isNaN(interval.end.getTime()) || interval.start.getTime() > interval.end.getTime()) {
      return { maxiforce: [], pyramid: [], maxiforceGoal: 0, pyramidGoal: 0, maxiforceYMax: 100, pyramidYMax: 100 };
    }
    const allDaysInPeriod = eachDayOfInterval(interval);

    const processTeamChartData = (teamName: string): ChartDataPoint[] => {
        const teamKey = teamName.toUpperCase();
        const teamSales = data.filter(sale => sale.group.toUpperCase() === teamKey);

        let cumulativeSalesByDay: ChartDataPoint[] = [];
        let lastBilled: {[key: string]: number} = {};
        let lastProjection: {[key: string]: number} = {};

        allDaysInPeriod.forEach(day => {
             const dateStr = format(day, "yyyy-MM-dd");
             const sellersWithSalesOnDay = [...new Set(teamSales.filter(s => isSameDay(s.createdAt, day)).map(s => s.seller))];

             sellersWithSalesOnDay.forEach(seller => {
                const latestSale = teamSales
                    .filter(s => s.seller === seller && isSameDay(s.createdAt, day))
                    .reduce((a, b) => a.createdAt > b.createdAt ? a : b);
                lastBilled[seller] = latestSale.billed;
                lastProjection[seller] = latestSale.projection;
             });

            const totalBilled = Object.values(lastBilled).reduce((sum, val) => sum + val, 0);
            const totalProjection = Object.values(lastProjection).reduce((sum, val) => sum + val, 0);

             cumulativeSalesByDay.push({
                 date: dateStr,
                 sales: totalBilled,
                 projection: totalProjection
             });
        });
        
      return cumulativeSalesByDay;
    }
    
    const calculateTeamGoal = (teamName: string): number => {
        const teamKey = teamName.toUpperCase();
        const teamSalesInPeriod = data.filter(sale => sale.group.toUpperCase() === teamKey);
        const sellersInTeam = [...new Set(teamSalesInPeriod.map(s => s.seller))];
        
        let totalMonthlyGoal = 0;
        
        sellersInTeam.forEach(seller => {
            const mostRecentSaleForSellerInPeriod = teamSalesInPeriod
                .filter(s => s.seller === seller)
                .reduce((latest, current) => {
                    return current.createdAt.getTime() > latest.createdAt.getTime() ? current : latest;
                }, teamSalesInPeriod[0]);
            
            if(mostRecentSaleForSellerInPeriod) {
                totalMonthlyGoal += mostRecentSaleForSellerInPeriod.monthlyGoal;
            }
        });

        return totalMonthlyGoal;
    }

    const calculateYAxisMax = (chartData: ChartDataPoint[], goal: number) => {
        const maxDataValue = Math.max(...chartData.map(d => Math.max(d.sales, d.projection)), 0);
        return Math.max(maxDataValue, goal) * 1.1 || 100; // Add 10% padding, or a default if 0
    }

    const maxiforceData = processTeamChartData("Maxiforce");
    const pyramidData = processTeamChartData("Pyramid");
    const maxiforceGoal = calculateTeamGoal("Maxiforce");
    const pyramidGoal = calculateTeamGoal("Pyramid");

    return {
      maxiforce: maxiforceData,
      pyramid: pyramidData,
      maxiforceGoal: maxiforceGoal,
      pyramidGoal: pyramidGoal,
      maxiforceYMax: calculateYAxisMax(maxiforceData, maxiforceGoal),
      pyramidYMax: calculateYAxisMax(pyramidData, pyramidGoal)
    };
  }, [data]);

  const handleLegendHover = (payload: any) => {
    setActiveLegend(payload ? payload.dataKey : null);
  };
  
  if (!data.length) {
    return (
        <div className="space-y-4 mt-4 text-center text-muted-foreground py-10">
            <p>Não há dados de vendas no período selecionado para exibir os gráficos da equipe.</p>
        </div>
    );
  }

  return (
    <Dialog onOpenChange={setIsFullScreen} open={isFullScreen}>
      <DialogTrigger asChild>
        <div className="space-y-4 mt-4 cursor-pointer">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <TeamChart
                  title="Maxiforce"
                  data={teamData.maxiforce}
                  goal={teamData.maxiforceGoal}
                  yAxisMax={teamData.maxiforceYMax}
                  borderColor="border-primary/30"
                  salesColor="hsl(var(--chart-1))" 
                  projectionColor="hsl(var(--chart-2))" 
                  data-testid="maxiforce-chart"
                  titleColor="text-primary"
                  onLegendHover={handleLegendHover}
                  inactiveOpacity={activeLegend ? 0.3 : 1}
                  />
              <TeamChart
                  title="Pyramid"
                  data={teamData.pyramid}
                  goal={teamData.pyramidGoal}
                  yAxisMax={teamData.pyramidYMax}
                  borderColor="border-accent/30"
                  salesColor="hsl(var(--chart-3))"
                  projectionColor="hsl(var(--chart-4))"
                  data-testid="pyramid-chart"
                  titleColor="text-accent"
                  onLegendHover={handleLegendHover}
                  inactiveOpacity={activeLegend ? 0.3 : 1}
                  />
          </div>
        </div>
      </DialogTrigger>
        
      <DialogContent className="w-screen h-screen max-w-full m-0 p-0 border-0 bg-background/90 backdrop-blur-sm overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Visualização em Tela Cheia</DialogTitle>
        </DialogHeader>
        
        {/* Navigation Arrows */}
        <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/20 hover:bg-black/40 text-white"
            onClick={handleManualSwitch}
        >
            <ChevronLeft className="h-8 w-8" />
        </Button>
        <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/20 hover:bg-black/40 text-white"
            onClick={handleManualSwitch}
        >
            <ChevronRight className="h-8 w-8" />
        </Button>

        {currentView === 'maxiforce' && (
          <FullScreenChart
            title="Maxiforce"
            data={teamData.maxiforce}
            goal={teamData.maxiforceGoal}
            yAxisMax={teamData.maxiforceYMax}
            salesColor="hsl(var(--chart-1))"
            projectionColor="hsl(var(--chart-2))"
          />
        )}
        
        {currentView === 'pyramid' && (
          <FullScreenChart
            title="Pyramid"
            data={teamData.pyramid}
            goal={teamData.pyramidGoal}
            yAxisMax={teamData.pyramidYMax}
            salesColor="hsl(var(--chart-3))"
            projectionColor="hsl(var(--chart-4))"
          />
        )}

      </DialogContent>
    </Dialog>
  );
}
