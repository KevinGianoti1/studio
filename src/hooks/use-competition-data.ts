// src/hooks/use-competition-data.ts
'use client';

import { useContext, useMemo } from 'react';
import { SalesContext } from '@/contexts/sales-context';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import type { CompetitionSalesData, CompetitionDeliverablesData } from '@/types';

export type { LeaderboardEntry } from '@/types';

export function useCompetitionData() {
    const { sales, deliverables, isLoading, error } = useContext(SalesContext);

    const competitionData = useMemo(() => {
        const now = new Date();
        const weeklyInterval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
        const monthlyInterval = { start: startOfMonth(now), end: endOfMonth(now) };

        const processSales = (interval: {start: Date, end: Date}): CompetitionSalesData[] => {
            const salesInPeriod = sales.filter(s => isWithinInterval(s.createdAt, interval));
            const sellers = [...new Set(salesInPeriod.map(s => s.seller))];

            return sellers.map(seller => {
                const sellerSales = salesInPeriod.filter(s => s.seller === seller);
                const mostRecentSale = sellerSales.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
                const totalBilled = mostRecentSale?.billed || 0;
                const monthlyGoal = mostRecentSale?.monthlyGoal || 0;
                const goalPercentage = monthlyGoal > 0 ? (totalBilled / monthlyGoal) * 100 : 0;

                return {
                    seller,
                    team: mostRecentSale?.group || '',
                    totalBilled,
                    goalPercentage,
                    calls: 0, // Will be populated from deliverables
                    proposals: 0,
                    videos: 0
                };
            });
        };
        
        const processDeliverables = (interval: {start: Date, end: Date}): CompetitionDeliverablesData[] => {
            const deliverablesInPeriod = deliverables.filter(d => isWithinInterval(d.date, interval));
            const sellers = [...new Set(deliverablesInPeriod.map(d => d.seller))];

            return sellers.map(seller => {
                const sellerDeliverables = deliverablesInPeriod.filter(d => d.seller === seller);
                const team = sellerDeliverables[0]?.team || '';

                const totals = sellerDeliverables.reduce((acc, curr) => {
                    acc.callsMade += curr.callsMade;
                    acc.proposalsMade += curr.proposalsMade;
                    acc.videosMade += curr.videosMade;
                    return acc;
                }, { callsMade: 0, proposalsMade: 0, videosMade: 0 });

                return { seller, team, ...totals };
            });
        };

        const allTimeSales = processSales({ start: new Date(2000, 0, 1), end: now });

        const salesMap = new Map<'weekly' | 'monthly' | 'allTime', CompetitionSalesData[]>();
        salesMap.set('weekly', processSales(weeklyInterval));
        salesMap.set('monthly', processSales(monthlyInterval));
        salesMap.set('allTime', allTimeSales);
        
        const deliverablesMap = new Map<'weekly' | 'monthly', CompetitionDeliverablesData[]>();
        deliverablesMap.set('weekly', processDeliverables(weeklyInterval));
        deliverablesMap.set('monthly', processDeliverables(monthlyInterval));

        return { sales: salesMap, deliverables: deliverablesMap, isLoading, error };
    }, [sales, deliverables, isLoading, error]);

    return competitionData;
}
