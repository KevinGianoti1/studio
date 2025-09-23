
"use client"

import React, { useState, useMemo, memo } from 'react';
import type { SellerPerformanceData } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Crown, TrendingUp, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

type SortKey = 'goalPercentage' | 'billed';

const generateAvatarUrl = (name: string) => {
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const color1 = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    const color2 = ((hash >> 8) & 0x00FFFFFF).toString(16).toUpperCase();
    return `https://placehold.co/100x100/${'000000'.substring(0, 6 - color1.length)}${color1}/${'FFFFFF'.substring(0, 6 - color2.length)}${color2}.png?text=${name.charAt(0)}`;
};


const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const SellerRanking = memo(function SellerRanking({ performanceData }: { performanceData: SellerPerformanceData[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('goalPercentage');

  const rankedSellers = useMemo(() => {
    
    const dataAsArray = [...performanceData];

    dataAsArray.sort((a, b) => {
      if (sortKey === 'goalPercentage') {
        const aPercentage = a.monthlyGoal > 0 ? (a.billedInPeriod / a.monthlyGoal) * 100 : 0;
        const bPercentage = b.monthlyGoal > 0 ? (b.billedInPeriod / b.monthlyGoal) * 100 : 0;
        return bPercentage - aPercentage;
      } else { // 'billed' sort key refers to billedInPeriod
        return b.billedInPeriod - a.billedInPeriod;
      }
    });
    
    return dataAsArray.slice(0, 10); // Top 10

  }, [performanceData, sortKey]);

  return (
    <Card>
       <CardHeader className="flex-col items-start sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Ranking de Vendedores</CardTitle>
          <CardDescription>Classificação dos vendedores por performance no período. Clique para ordenar.</CardDescription>
        </div>
        <ToggleGroup type="single" value={sortKey} onValueChange={(value: SortKey) => value && setSortKey(value)} className="mt-4 sm:mt-0">
          <ToggleGroupItem value="goalPercentage" aria-label="Ordenar por % da meta">
            <Target className="h-4 w-4 mr-2" />
            % Meta
          </ToggleGroupItem>
          <ToggleGroupItem value="billed" aria-label="Ordenar por volume de vendas">
             <TrendingUp className="h-4 w-4 mr-2" />
            Vendas R$
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {rankedSellers.map((seller, index) => {
            const goalPercentage = seller.monthlyGoal > 0 ? (seller.billedInPeriod / seller.monthlyGoal) * 100 : 0;
            const value = sortKey === 'goalPercentage' ? `${goalPercentage.toFixed(1)}%` : formatCurrency(seller.billedInPeriod);
            
            return (
              <div 
                key={seller.seller} 
                className="flex items-center gap-4 p-2 rounded-md hover:bg-muted/50 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms`}}
              >
                <div className="font-bold text-lg w-6 text-center text-muted-foreground">{index + 1}</div>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={generateAvatarUrl(seller.seller)} data-ai-hint="abstract pattern" alt={seller.seller} />
                  <AvatarFallback>{seller.seller.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{seller.seller}</p>
                  <p className="text-xs text-muted-foreground">
                    Meta: {formatCurrency(seller.monthlyGoal)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                    {index === 0 && <Crown className={cn("h-5 w-5 text-yellow-500", "animate-crown-shine")} />}
                    <div className="text-lg font-bold text-primary">{value}</div>
                </div>
              </div>
            );
          })}
        </div>
        {rankedSellers.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
                Não há dados suficientes para gerar o ranking.
            </p>
        )}
      </CardContent>
    </Card>
  );
});

SellerRanking.displayName = 'SellerRanking';
