// src/contexts/sales-context.tsx
'use client';

import React, { createContext, useState, useEffect, useCallback, type ReactNode, useMemo } from 'react';
import { fetchSalesData } from '@/ai/flows/google-sheets-flow';
import { fetchCampaigns } from '@/ai/flows/campaigns-flow';
import { fetchDeliverables } from '@/ai/flows/deliverables-flow';
import type { UIDateSale, Campaign, UIDeliverable } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { isValid, parseISO } from 'date-fns';

type SalesContextType = {
  sales: UIDateSale[];
  campaigns: Campaign[];
  deliverables: UIDeliverable[];
  isLoading: boolean;
  isMounted: boolean;
  error: string | null;
  loadData: () => Promise<void>;
  addSale: (newSale: UIDateSale, remove?: boolean) => void;
};

export const SalesContext = createContext<SalesContextType>({
  sales: [],
  campaigns: [],
  deliverables: [],
  isLoading: true,
  isMounted: false,
  error: null,
  loadData: async () => {},
  addSale: () => {},
});

export const SalesProvider = ({ children }: { children: ReactNode }) => {
  const [sales, setSales] = useState<UIDateSale[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [deliverables, setDeliverables] = useState<UIDeliverable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [salesResult, campaignsResult, deliverablesResult] = await Promise.all([
        fetchSalesData(),
        fetchCampaigns(),
        fetchDeliverables(),
      ]);

      // Process Sales
      if (salesResult.error) {
        toast({
          variant: "destructive",
          title: "Erro ao carregar vendas",
          description: salesResult.error,
          duration: 10000,
        });
        setError(prev => prev ? `${prev}\n${salesResult.error!}` : salesResult.error!);
      } else {
        const data = salesResult.data || [];
        const salesWithDates: UIDateSale[] = data.map(s => {
          const parsedDate = parseISO(s.createdAt);
          return { ...s, createdAt: isValid(parsedDate) ? parsedDate : new Date() };
        }).filter(s => isValid(s.createdAt));
        setSales(salesWithDates);
      }

      // Process Campaigns
      if (campaignsResult.error) {
         toast({
          variant: "destructive",
          title: "Erro ao carregar campanhas",
          description: campaignsResult.error,
          duration: 10000,
        });
        setError(prev => prev ? `${prev}\n${campaignsResult.error!}` : campaignsResult.error!);
      } else {
        const campaignData = campaignsResult.data || [];
        const campaignsWithDates = campaignData.map(c => ({
            ...c,
            startDate: isValid(c.startDate) ? c.startDate : new Date(),
            endDate: isValid(c.endDate) ? c.endDate : new Date(),
        }));
        setCampaigns(campaignsWithDates);
      }
      
      // Process Deliverables
      if (deliverablesResult.error) {
        toast({
          variant: "destructive",
          title: "Erro ao carregar entregáveis",
          description: deliverablesResult.error,
          duration: 10000,
        });
        setError(prev => prev ? `${prev}\n${deliverablesResult.error!}` : deliverablesResult.error!);
      } else {
        const data = deliverablesResult.data || [];
        const deliverablesWithDates: UIDeliverable[] = data.map(d => {
          const parsedDate = parseISO(d.date);
          return { ...d, date: isValid(parsedDate) ? parsedDate : new Date() };
        }).filter(d => isValid(d.date));
        setDeliverables(deliverablesWithDates);
      }

    } catch (err: any) {
      console.error("Failed to load spreadsheet data:", err);
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado ao buscar os dados.",
        duration: 10000,
      });
      setError("Falha ao buscar dados do servidor.");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isMounted) {
      loadData();
    }
  }, [isMounted, loadData]);

  const addSale = useCallback((newSale: UIDateSale, remove: boolean = false) => {
    if(remove) {
        setSales(prevSales => prevSales.filter(s => s.id !== newSale.id));
    } else {
        setSales(prevSales => [...prevSales, newSale].sort((a,b) => a.createdAt.getTime() - b.createdAt.getTime()));
    }
  }, []);

  const value = useMemo(() => ({ sales, campaigns, deliverables, isLoading, isMounted, error, loadData, addSale }), [sales, campaigns, deliverables, isLoading, isMounted, error, loadData, addSale]);

  return (
    <SalesContext.Provider value={value}>
      {children}
    </SalesContext.Provider>
  );
};
