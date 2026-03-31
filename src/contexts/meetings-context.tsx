// src/contexts/meetings-context.tsx
'use client';

import React, { createContext, useState, useEffect, useCallback, type ReactNode, useMemo } from 'react';
import type { Meeting } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { parseISO, isValid } from 'date-fns';
import { z } from 'zod';

export type UIMeeting = Omit<Meeting, 'evaluationDate' | 'nextEvaluationDate'> & {
    evaluationDate: Date;
    nextEvaluationDate?: Date;
}

const MeetingSchema = z.object({
  evaluationDate: z.string(),
  seller: z.string(),
  prospeccao: z.number(),
  qualificacao: z.number(),
  apresentacao: z.number(),
  objecoes: z.number(),
  fechamento: z.number(),
  followUp: z.number(),
  gapsIdentified: z.string().optional(),
  courseSuggestions: z.string().optional(),
  nextEvaluationDate: z.string().optional(),
});
const MeetingsApiResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(MeetingSchema),
});

type MeetingsContextType = {
  meetings: UIMeeting[];
  isLoading: boolean;
  isMounted: boolean;
  error: string | null;
  lastRequestId: string | null;
  loadData: () => Promise<void>;
};

export const MeetingsContext = createContext<MeetingsContextType>({
  meetings: [],
  isLoading: true,
  isMounted: false,
  error: null,
  lastRequestId: null,
  loadData: async () => {},
});

export const MeetingsProvider = ({ children }: { children: ReactNode }) => {
  const [meetings, setMeetings] = useState<UIMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setLastRequestId(null);
    try {
      const maxAttempts = 2;
      let response: Response | null = null;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        try {
          response = await fetch('/api/meetings', {
            cache: 'no-store',
            signal: controller.signal,
            headers: { 'x-request-id': crypto.randomUUID() },
          });
          clearTimeout(timeout);
          lastError = null;
          break;
        } catch (error) {
          clearTimeout(timeout);
          const message = error instanceof Error ? error.message : 'Erro desconhecido';
          lastError = new Error(`Tentativa ${attempt}/${maxAttempts}: ${message}`);
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 400));
          }
        }
      }

      if (!response) {
        throw lastError || new Error('Falha ao buscar dados da API de reuniões.');
      }

      if (!response.ok) {
        const errorData = await response.json();
        const requestId = response.headers.get('x-request-id');
        setLastRequestId(requestId);
        const suffix = requestId ? ` (ref: ${requestId})` : '';
        throw new Error((errorData.error || 'Falha ao buscar dados da API de reuniões') + suffix);
      }
      
      const rawPayload = await response.json();
      const parsedMeetings = MeetingsApiResponseSchema.safeParse(rawPayload);
      if (!parsedMeetings.success) {
        throw new Error('Formato de resposta inválido para reuniões.');
      }
      const data = parsedMeetings.data.data;

      const meetingsWithDates: UIMeeting[] = data
          .map(m => {
              const evalDate = parseISO(m.evaluationDate);
              const nextEvalDate = m.nextEvaluationDate ? parseISO(m.nextEvaluationDate) : undefined;
              return { 
                  ...m, 
                  evaluationDate: isValid(evalDate) ? evalDate : new Date(),
                  nextEvaluationDate: nextEvalDate && isValid(nextEvalDate) ? nextEvalDate : undefined,
              };
          })
          .filter(m => isValid(m.evaluationDate));
      setMeetings(meetingsWithDates);

    } catch (err: any) {
      console.error("Failed to load meeting data:", err);
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: err.message || "Ocorreu um erro inesperado ao buscar os dados das reuniões.",
        duration: 10000,
      });
      setMeetings([]);
      setError("Falha ao buscar dados do servidor.");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if(isMounted) {
        loadData();
    }
  }, [isMounted, loadData]);

  const value = useMemo(() => ({
    meetings,
    isLoading,
    isMounted,
    error,
    lastRequestId,
    loadData
  }), [meetings, isLoading, isMounted, error, lastRequestId, loadData]);

  return (
    <MeetingsContext.Provider value={value}>
      {children}
    </MeetingsContext.Provider>
  );
};
