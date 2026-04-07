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

const SALES_CACHE_KEY = 'sales-context-cache-v1';
const SALES_CACHE_TTL_MS = 5 * 60 * 1000;

type SalesContextCache = {
  timestamp: number;
  sales: UIDateSale[];
  campaigns: Campaign[];
  deliverables: UIDeliverable[];
};

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

  const readCachedData = useCallback((): SalesContextCache | null => {
    try {
      const raw = sessionStorage.getItem(SALES_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SalesContextCache;
      if (!parsed.timestamp || Date.now() - parsed.timestamp > SALES_CACHE_TTL_MS) {
        sessionStorage.removeItem(SALES_CACHE_KEY);
        return null;
      }
      return {
        ...parsed,
        sales: parsed.sales.map(s => ({ ...s, createdAt: new Date(s.createdAt) })),
        campaigns: parsed.campaigns.map(c => ({ ...c, startDate: new Date(c.startDate), endDate: new Date(c.endDate) })),
        deliverables: parsed.deliverables.map(d => ({ ...d, date: new Date(d.date) })),
      };
    } catch {
      sessionStorage.removeItem(SALES_CACHE_KEY);
      return null;
    }
  }, []);

  const persistCache = useCallback((nextSales: UIDateSale[], nextCampaigns: Campaign[], nextDeliverables: UIDeliverable[]) => {
    try {
      const payload: SalesContextCache = {
        timestamp: Date.now(),
        sales: nextSales,
        campaigns: nextCampaigns,
        deliverables: nextDeliverables,
      };
      sessionStorage.setItem(SALES_CACHE_KEY, JSON.stringify(payload));
    } catch {
      // noop (private mode/quota issues)
    }
  }, []);

  const loadDataInternal = useCallback(async (forceRefresh: boolean = true) => {
    if (!forceRefresh) {
      const cached = readCachedData();
      if (cached) {
        setSales(cached.sales);
        setCampaigns(cached.campaigns);
        setDeliverables(cached.deliverables);
        setError(null);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    try {
      const [salesResult, campaignsResult, deliverablesResult] = await Promise.all([
        fetchSalesData(),
        fetchCampaigns(),
        fetchDeliverables(),
      ]);

      let nextSales: UIDateSale[] = [];
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
        nextSales = data.map(s => {
          const parsedDate = parseISO(s.createdAt);
          return { ...s, createdAt: isValid(parsedDate) ? parsedDate : new Date() };
        }).filter(s => isValid(s.createdAt));
        setSales(nextSales);
      }

      let nextCampaigns: Campaign[] = [];
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
        nextCampaigns = campaignData.map(c => ({
            ...c,
            startDate: isValid(c.startDate) ? c.startDate : new Date(),
            endDate: isValid(c.endDate) ? c.endDate : new Date(),
        }));
        setCampaigns(nextCampaigns);
      }
      
      let nextDeliverables: UIDeliverable[] = [];
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
        nextDeliverables = data.map(d => {
          const parsedDate = parseISO(d.date);
          return { ...d, date: isValid(parsedDate) ? parsedDate : new Date() };
        }).filter(d => isValid(d.date));
        setDeliverables(nextDeliverables);
      }

      if (!salesResult.error && !campaignsResult.error && !deliverablesResult.error) {
        persistCache(nextSales, nextCampaigns, nextDeliverables);
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
  }, [persistCache, readCachedData, toast]);

  const loadData = useCallback(async () => {
    await loadDataInternal(true);
  }, [loadDataInternal]);

  useEffect(() => {
    if (isMounted) {
      loadDataInternal(false);
    }
  }, [isMounted, loadDataInternal]);

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
