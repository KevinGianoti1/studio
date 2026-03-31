
'use server';
/**
 * @fileOverview A flow to analyze sales performance, focusing on team goals and AI-driven insights.
 *
 * - analyzePerformance - Calculates team goal status and generates performance points.
 * - AnalyzePerformanceInput - The input type for the analyzePerformance function.
 * - AnalyzePerformanceOutput - The return type for the analyzePerformance function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { parseISO } from 'date-fns';

const SaleSchemaForAnalysis = z.object({
  company: z.enum(['Maxiforce', 'Pyramid']),
  seller: z.string(),
  group: z.string(),
  billed: z.number(),
  monthlyGoal: z.number(),
  createdAt: z.string(), // ISO string from the client
});

const AnalyzePerformanceInputSchema = z.array(SaleSchemaForAnalysis);
export type AnalyzePerformanceInput = z.infer<typeof AnalyzePerformanceInputSchema>;


const TeamGoalStatusSchema = z.object({
  teamName: z.enum(['Maxiforce', 'Pyramid']),
  totalBilled: z.number(),
  totalGoal: z.number(),
  amountRemaining: z.number(),
  percentageToGoal: z.number(),
});

const AnalyzePerformanceOutputSchema = z.object({
  teamGoalStatus: z.array(TeamGoalStatusSchema).describe("Status of each team's goal attainment."),
  positivePoints: z.array(z.string()).describe("A list of positive performance highlights."),
  attentionPoints: z.array(z.string()).describe("A list of performance areas that need attention."),
});
export type AnalyzePerformanceOutput = z.infer<typeof AnalyzePerformanceOutputSchema>;

export async function analyzePerformance(input: AnalyzePerformanceInput): Promise<AnalyzePerformanceOutput> {
  return analyzePerformanceFlow(input);
}

const analysisPrompt = ai.definePrompt({
    name: 'performanceOverviewPrompt',
    input: { schema: z.object({ salesDataJson: z.string() }) },
    output: { schema: z.object({
        positivePoints: z.array(z.string()).describe("Liste 2-3 pontos positivos observados nos dados. Seja breve, direto e focado em performance. Ex: 'Crescimento consistente nas vendas da equipe X.', 'Vários vendedores superaram a meta.'"),
        attentionPoints: z.array(z.string()).describe("Liste 2-3 pontos de atenção. Seja breve, direto e focado em ritmo ou projeções. Ex: 'Ritmo de vendas lento no início do mês.', 'Projeções de venda diminuíram em comparação com o faturamento.'"),
    }) },
    prompt: `
        Você é um analista de vendas sênior e conciso. Analise o resumo de dados de vendas do período e forneça os pontos positivos e de atenção.
        Foque em tendências gerais, performance de metas e ritmo. Evite linguagem genérica.

        Dados de Vendas (resumo do período):
        {{{salesDataJson}}}
    `,
});


const analyzePerformanceFlow = ai.defineFlow(
  {
    name: 'analyzePerformanceFlow',
    inputSchema: AnalyzePerformanceInputSchema,
    outputSchema: AnalyzePerformanceOutputSchema,
  },
  async (salesData) => {
    
    let aiAnalysisResult: Pick<AnalyzePerformanceOutput, 'positivePoints' | 'attentionPoints'> = {
      positivePoints: [],
      attentionPoints: [],
    };
    
    // --- AI Analysis ---
    if(salesData.length >= 2) { // Run AI only if there's enough data
        const salesDataJson = JSON.stringify(salesData.map(s => ({
            data: s.createdAt,
            vendedor: s.seller,
            equipe: s.group,
            faturado: s.billed,
            meta_mensal: s.monthlyGoal,
        })));
        const { output } = await analysisPrompt({ salesDataJson });
        if (output) {
            aiAnalysisResult = output;
        }
    }


    // --- Team Goal Analysis ---
    const teams = ['Maxiforce', 'Pyramid'] as const;
    const teamGoalStatus: z.infer<typeof TeamGoalStatusSchema>[] = [];
    
    for (const teamName of teams) {
        const teamSales = salesData.filter(s => s.group.toUpperCase() === teamName.toUpperCase());
        const sellersInTeam = [...new Set(teamSales.map(s => s.seller))];

        let totalBilled = 0;
        let totalGoal = 0;
        
        sellersInTeam.forEach(seller => {
            const mostRecentSaleForSeller = teamSales
                .filter(s => s.seller === seller)
                .sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime())[0];
            
            if (mostRecentSaleForSeller) {
                totalBilled += mostRecentSaleForSeller.billed;
                totalGoal += mostRecentSaleForSeller.monthlyGoal;
            }
        });

        const amountRemaining = Math.max(0, totalGoal - totalBilled);
        const percentageToGoal = totalGoal > 0 ? (totalBilled / totalGoal) * 100 : 0;

        teamGoalStatus.push({
            teamName,
            totalBilled,
            totalGoal,
            amountRemaining,
            percentageToGoal,
        });
    }

    return {
      teamGoalStatus,
      positivePoints: aiAnalysisResult.positivePoints,
      attentionPoints: aiAnalysisResult.attentionPoints,
    };
  }
);
