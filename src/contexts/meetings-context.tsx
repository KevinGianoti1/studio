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
const MeetingsResponseSchema = z.array(MeetingSchema);

type MeetingsContextType = {
  meetings: UIMeeting[];
  isLoading: boolean;
  isMounted: boolean;
  error: string | null;
  loadData: () => Promise<void>;
};

export const MeetingsContext = createContext<MeetingsContextType>({
  meetings: [],
  isLoading: true,
  isMounted: false,
  error: null,
  loadData: async () => {},
});

export const MeetingsProvider = ({ children }: { children: ReactNode }) => {
  const [meetings, setMeetings] = useState<UIMeeting[]>([]);
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
      // Use the API route instead of the flow directly
      const response = await fetch('/api/meetings', { cache: 'no-store' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao buscar dados da API de reuniões');
      }
      
      const rawData: Meeting[] = await response.json();
      const parsedMeetings = MeetingsResponseSchema.safeParse(rawData);
      if (!parsedMeetings.success) {
        throw new Error('Formato de resposta inválido para reuniões.');
      }
      const data = parsedMeetings.data;

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
    loadData
  }), [meetings, isLoading, isMounted, error, loadData]);

  return (
    <MeetingsContext.Provider value={value}>
      {children}
    </MeetingsContext.Provider>
  );
};
