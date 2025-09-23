// src/app/competition/page.tsx
'use client';

import React, { Suspense, useContext, useMemo, useState } from 'react';
import { PageHeader, PageHeaderTitle, PageHeaderDescription } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Trophy, Crown, Star, Shield, Medal, Flame } from 'lucide-react';
import { SalesProvider, SalesContext } from '@/contexts/sales-context';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useCompetitionData, type LeaderboardEntry } from '@/hooks/use-competition-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/components/main-layout';

const generateAvatarUrl = (name: string) => {
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const color1 = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    const color2 = ((hash >> 8) & 0x00FFFFFF).toString(16).toUpperCase();
    return `https://placehold.co/100x100/${'000000'.substring(0, 6 - color1.length)}${color1}/${'FFFFFF'.substring(0, 6 - color2.length)}${color2}.png?text=${name.charAt(0)}`;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const LeaderboardCard = ({ title, description, icon, data }: { title: string, description: string, icon: React.ReactNode, data: LeaderboardEntry[] }) => (
    <Card className="shadow-lg">
        <CardHeader>
            <div className="flex items-center gap-3">
                <div className="text-primary">{icon}</div>
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            {data.length > 0 ? (
                <div className="space-y-4">
                    {data.slice(0, 5).map((entry, index) => (
                        <div key={entry.seller} className="flex items-center gap-4 animate-fade-in-up" style={{ animationDelay: `${index * 100}ms`}}>
                            <span className="font-bold text-lg w-6 text-center text-muted-foreground">{index + 1}</span>
                             <Avatar className="h-10 w-10">
                                <AvatarImage src={generateAvatarUrl(entry.seller)} data-ai-hint="abstract pattern" alt={entry.seller} />
                                <AvatarFallback>{entry.seller.charAt(0)}</AvatarFallback>
                            </Avatar>
                             <div className="flex-1">
                                <p className="font-semibold text-sm">{entry.seller}</p>
                                <p className="text-xs text-muted-foreground">{entry.team}</p>
                            </div>
                            <Badge variant={index === 0 ? "default" : "secondary"} className="font-bold text-base">
                                {entry.value}
                            </Badge>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-muted-foreground text-center py-8">Sem dados para este ranking.</p>
            )}
        </CardContent>
    </Card>
);


function CompetitionContent() {
    const { sales, deliverables, isLoading, error } = useCompetitionData();
    const [period, setPeriod] = useState<'monthly' | 'weekly'>('monthly');

    const leaderboardData = useMemo(() => {
        const getLeaderboard = (metric: 'totalBilled' | 'goalPercentage' | 'calls' | 'proposals' | 'videos'): LeaderboardEntry[] => {
            return [...(sales.get(period) || [])]
                .sort((a,b) => b[metric] - a[metric])
                .map(s => ({
                    seller: s.seller,
                    team: s.team,
                    value: metric === 'totalBilled' ? formatCurrency(s[metric]) :
                           metric === 'goalPercentage' ? `${s[metric].toFixed(1)}%` :
                           String(s[metric]),
                }));
        };

        const getDeliverablesLeaderboard = (metric: 'callsMade' | 'proposalsMade' | 'videosMade'): LeaderboardEntry[] => {
            return [...(deliverables.get(period) || [])]
                 .sort((a,b) => b[metric] - a[metric])
                 .map(d => ({
                    seller: d.seller,
                    team: d.team,
                    value: String(d[metric])
                 }));
        }
        
        return {
            billing: getLeaderboard('totalBilled'),
            goal: getLeaderboard('goalPercentage'),
            calls: getDeliverablesLeaderboard('callsMade'),
            proposals: getDeliverablesLeaderboard('proposalsMade'),
            videos: getDeliverablesLeaderboard('videosMade'),
        };
    }, [sales, deliverables, period]);
    
    const achievements = useMemo(() => {
        const allTimeSales = sales.get('allTime') || [];
        const monthlySales = sales.get('monthly') || [];

        const club100k = allTimeSales.filter(s => s.totalBilled >= 100000).map(s => s.seller);
        const goalMasters = monthlySales.filter(s => s.goalPercentage >= 100).map(s => s.seller);
        
        // Mocking streak for now - this would require more detailed daily data logic
        const hotStreak = allTimeSales.sort((a,b) => b.totalBilled - a.totalBilled).slice(0,2).map(s => s.seller);
        
        return { club100k, goalMasters, hotStreak };
    }, [sales]);


    if (isLoading) {
        return (
             <div className="flex h-screen items-center justify-center p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-xl font-semibold text-muted-foreground">Calculando rankings e conquistas...</p>
                </div>
            </div>
        );
    }
     if (error) {
        return (
            <div className="flex h-screen items-center justify-center p-8 text-center text-red-500">
                <Card className="p-8">
                <CardHeader>
                    <CardTitle>Ocorreu um Erro</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm font-mono bg-muted p-4 rounded-md text-destructive-foreground">{error}</p>
                </CardContent>
                </Card>
            </div>
        );
    }


    return (
        <div className="space-y-8">
            <PageHeader>
                <PageHeaderTitle>Pódio da Competição</PageHeaderTitle>
                <PageHeaderDescription>
                   Rankings, conquistas e performance gamificada.
                </PageHeaderDescription>
            </PageHeader>

             <Card>
                <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                     <div>
                        <CardTitle>Leaderboards</CardTitle>
                        <CardDescription>Filtre os rankings por período.</CardDescription>
                    </div>
                    <ToggleGroup type="single" value={period} onValueChange={(value: 'monthly' | 'weekly') => value && setPeriod(value)}>
                        <ToggleGroupItem value="monthly">Mensal</ToggleGroupItem>
                        <ToggleGroupItem value="weekly">Semanal</ToggleGroupItem>
                    </ToggleGroup>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <LeaderboardCard title="Top Faturamento" description={`Maior volume de vendas (${period === 'monthly' ? 'mês' : 'semana'}).`} icon={<Crown className="h-8 w-8" />} data={leaderboardData.billing} />
                    <LeaderboardCard title="Top Performance" description={`Maior % da meta atingida (${period === 'monthly' ? 'mês' : 'semana'}).`} icon={<Shield className="h-8 w-8" />} data={leaderboardData.goal} />
                    <LeaderboardCard title="Reis das Ligações" description={`Mais ligações realizadas (${period === 'monthly' ? 'mês' : 'semana'}).`} icon={<Medal className="h-8 w-8" />} data={leaderboardData.calls} />
                    <LeaderboardCard title="Mestres das Propostas" description={`Mais propostas enviadas (${period === 'monthly' ? 'mês' : 'semana'}).`} icon={<Medal className="h-8 w-8" />} data={leaderboardData.proposals} />
                    <LeaderboardCard title="Estrelas do Vídeo" description={`Mais vídeos produzidos (${period === 'monthly' ? 'mês' : 'semana'}).`} icon={<Medal className="h-8 w-8" />} data={leaderboardData.videos} />
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Quadro de Conquistas</CardTitle>
                    <CardDescription>Medalhas especiais para marcos importantes.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    <AchievementCard title="Clube dos 100k" description="Vendedores que ultrapassaram R$ 100.000 em faturamento total." icon={<Star className="text-amber-400" />} sellers={achievements.club100k} />
                    <AchievementCard title="Mestres da Meta" description="Vendedores que bateram 100% da meta este mês." icon={<Trophy className="text-green-500" />} sellers={achievements.goalMasters} />
                    <AchievementCard title="Em Chamas!" description="Vendedores com o melhor desempenho recente." icon={<Flame className="text-red-500" />} sellers={achievements.hotStreak} />
                </CardContent>
            </Card>

        </div>
    )
}

const AchievementCard = ({ title, description, icon, sellers }: { title: string, description: string, icon: React.ReactNode, sellers: string[] }) => (
    <Card className="bg-muted/50 p-4">
        <div className="flex items-center gap-4 mb-4">
            <div className="text-4xl">{icon}</div>
            <div>
                <h3 className="font-bold">{title}</h3>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
        </div>
        {sellers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
                {sellers.map(seller => (
                    <Badge key={seller} variant="secondary" className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                            <AvatarImage src={generateAvatarUrl(seller)} />
                            <AvatarFallback>{seller.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {seller}
                    </Badge>
                ))}
            </div>
        ) : <p className="text-sm text-center text-muted-foreground py-2">Ninguém desbloqueou esta conquista ainda.</p>}
    </Card>
)

export default function CompetitionPage() {
    return (
      <MainLayout>
        <SalesProvider>
            <Suspense>
                <CompetitionContent />
            </Suspense>
        </SalesProvider>
      </MainLayout>
    )
}
