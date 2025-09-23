// src/components/strategic-overview.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Crown, Loader2, Target, TrendingUp, TrendingDown } from 'lucide-react';
import React, { useState, useEffect, memo } from 'react';
import { analyzePerformance, type AnalyzePerformanceInput, type AnalyzePerformanceOutput } from "@/ai/flows/analyze-performance-flow";
import { findChampions, type FindChampionsInput, type FindChampionsOutput } from "@/ai/flows/champions-flow";
import type { UIDateSale } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const generateAvatarUrl = (name: string) => {
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const color1 = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    const color2 = ((hash >> 8) & 0x00FFFFFF).toString(16).toUpperCase();
    return `https://placehold.co/100x100/${'000000'.substring(0, 6 - color1.length)}${color1}/${'FFFFFF'.substring(0, 6 - color2.length)}${color2}.png?text=${name.charAt(0)}`;
};

const getProgressColor = (percentage: number) => {
    if (percentage < 40) return "bg-red-500";
    if (percentage < 80) return "bg-yellow-500";
    return "bg-green-500";
}

export const StrategicOverview = memo(function StrategicOverview({ data }: { data: UIDateSale[] }) {
  const [analysis, setAnalysis] = useState<AnalyzePerformanceOutput | null>(null);
  const [champions, setChampions] = useState<FindChampionsOutput>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const runAnalysis = async () => {
      if (data.length === 0) {
        setAnalysis(null);
        setChampions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const analysisInput: AnalyzePerformanceInput = data.map(sale => ({
            company: sale.company,
            seller: sale.seller,
            group: sale.group,
            billed: sale.billed,
            monthlyGoal: sale.monthlyGoal,
            createdAt: sale.createdAt.toISOString(),
        }));
        
        const [analysisResult, championsResult] = await Promise.all([
            analyzePerformance(analysisInput),
            findChampions(analysisInput)
        ]);

        setAnalysis(analysisResult);
        setChampions(championsResult);

      } catch (error: any) {
        console.error("Failed to run analysis:", error);
        toast({
          variant: "destructive",
          title: "Erro na Análise",
          description: "Não foi possível gerar o panorama estratégico.",
        });
        setAnalysis(null);
        setChampions([]);
      } finally {
        setIsLoading(false);
      }
    };

    runAnalysis();
  }, [data, toast]);

   if (isLoading) {
     return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader> <CardTitle>Análise do Período</CardTitle> </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="p-4 rounded-lg bg-muted animate-pulse h-32" />
                     <div className="p-4 rounded-lg bg-muted animate-pulse h-32" />
                     <div className="p-4 rounded-lg bg-muted animate-pulse h-32" />
                     <div className="p-4 rounded-lg bg-muted animate-pulse h-32" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader> <CardTitle>Campeões do Período</CardTitle> </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                     <div className="flex items-center gap-3 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p>Identificando...</p>
                     </div>
                </CardContent>
            </Card>
        </div>
     )
  }

  if (!analysis) {
     return (
        <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
                <p>Não há dados suficientes para gerar o panorama estratégico no período selecionado.</p>
            </CardContent>
        </Card>
     )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
        {analysis.teamGoalStatus.map(team => (
            <Card key={team.teamName} className={cn("shadow-lg", {
                'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800': team.teamName.toUpperCase() === 'MAXIFORCE',
                'bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800': team.teamName.toUpperCase() === 'PYRAMID',
            })}>
                <CardHeader>
                    <CardTitle className={cn("flex items-center gap-2 font-black tracking-tighter", {
                        'text-green-800 dark:text-green-300': team.teamName.toUpperCase() === 'MAXIFORCE',
                        'text-purple-800 dark:text-purple-300': team.teamName.toUpperCase() === 'PYRAMID',
                    })}>
                        <Target />
                        Meta {team.teamName}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Progress value={team.percentageToGoal} className="h-4" indicatorClassName={getProgressColor(team.percentageToGoal)} />
                    <div className="flex justify-between items-center text-sm font-medium">
                        <span className={cn("font-bold text-xl", {
                            'text-green-700 dark:text-green-200': team.teamName.toUpperCase() === 'MAXIFORCE',
                            'text-purple-700 dark:text-purple-200': team.teamName.toUpperCase() === 'PYRAMID',
                        })}>{team.percentageToGoal.toFixed(1)}%</span>
                        <span className="text-muted-foreground">
                            {formatCurrency(team.totalBilled)} / {formatCurrency(team.totalGoal)}
                        </span>
                    </div>
                     <p className="text-xs text-center text-muted-foreground pt-2">
                        Faltam {formatCurrency(team.amountRemaining)} para atingir a meta.
                    </p>
                </CardContent>
            </Card>
        ))}
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600"><TrendingUp/> Pontos Positivos</CardTitle>
            </CardHeader>
            <CardContent>
                {analysis.positivePoints.length > 0 ? (
                    <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-4">
                        {analysis.positivePoints.map((point, i) => <li key={i}>{point}</li>)}
                    </ul>
                ) : <p className="text-sm text-muted-foreground">Nenhum ponto positivo destacado pela IA.</p>}
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-500"><TrendingDown/> Pontos de Atenção</CardTitle>
            </CardHeader>
            <CardContent>
                 {analysis.attentionPoints.length > 0 ? (
                    <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-4">
                        {analysis.attentionPoints.map((point, i) => <li key={i}>{point}</li>)}
                    </ul>
                ) : <p className="text-sm text-muted-foreground">Nenhum ponto de atenção destacado pela IA.</p>}
            </CardContent>
        </Card>

      </div>
       <Card className="shadow-md">
            <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Crown className="h-6 w-6 text-yellow-500" />
                Campeões do Período
            </CardTitle>
            <CardDescription>Vendedores que atingiram a meta.</CardDescription>
            </CardHeader>
            <CardContent>
                {champions.length > 0 ? (
                    <div className="space-y-4">
                        {champions.map((champion) => (
                        <div key={champion.seller} className="flex items-center gap-4 p-2 rounded-md hover:bg-muted/50">
                            <Avatar className="h-10 w-10 border-2 border-amber-400">
                                <AvatarImage src={generateAvatarUrl(champion.seller)} data-ai-hint="abstract pattern" alt={champion.seller} />
                                <AvatarFallback>{champion.seller.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-semibold text-sm">{champion.seller}</p>
                                <p className="text-xs text-muted-foreground">{champion.team}</p>
                            </div>
                            <Badge className="bg-green-600 hover:bg-green-700 text-white font-bold">
                                {champion.goalPercentage.toFixed(0)}% da Meta
                            </Badge>
                        </div>
                        ))}
                    </div>
                    ) : (
                    <p className="text-muted-foreground text-center py-8">
                        Nenhum campeão no período selecionado.
                    </p>
                    )
                }
            </CardContent>
        </Card>
    </div>
  );
});
StrategicOverview.displayName = 'StrategicOverview';
