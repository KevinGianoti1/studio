
'use server';
/**
 * @fileOverview A flow to analyze an individual seller's performance.
 *
 * - analyzeSingleSellerPerformance - Generates a concise summary for a single seller.
 * - AnalyzeSingleSellerPerformanceInput - The input type for the function.
 * - AnalyzeSingleSellerPerformanceOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeSingleSellerPerformanceInputSchema = z.object({
  seller: z.string(),
  salesData: z.array(z.object({
    billed: z.number(),
    monthlyGoal: z.number(),
    monthlyGoalPercentage: z.number(),
    createdAt: z.string(),
  })),
});
export type AnalyzeSingleSellerPerformanceInput = z.infer<typeof AnalyzeSingleSellerPerformanceInputSchema>;

const AnalyzeSingleSellerPerformanceOutputSchema = z.object({
  summary: z.string().describe("A concise summary (3-5 words) of the seller's performance."),
});
export type AnalyzeSingleSellerPerformanceOutput = z.infer<typeof AnalyzeSingleSellerPerformanceOutputSchema>;

export async function analyzeSingleSellerPerformance(input: AnalyzeSingleSellerPerformanceInput): Promise<AnalyzeSingleSellerPerformanceOutput> {
  return analyzeSingleSellerPerformanceFlow(input);
}

const analysisPrompt = ai.definePrompt({
  name: 'singleSellerPerformanceAnalysisPrompt',
  input: { schema: z.object({ sellerDataJson: z.string() }) },
  output: { schema: AnalyzeSingleSellerPerformanceOutputSchema },
  prompt: `
    Você é um analista de vendas e sua tarefa é criar um resumo muito curto e conciso (3 a 5 palavras) sobre o desempenho do vendedor fornecido.
    Foque na consistência, no ritmo de vendas e no quão perto ele está de bater as metas.

    Exemplos de resumos:
    - Desempenho forte e consistente
    - Ritmo de vendas lento
    - Atingindo metas consistentemente
    - Inconsistente, com picos de vendas
    - Precisa de atenção urgente
    - Melhorando nos últimos dias

    Analise os dados do vendedor e forneça o resumo.
    Dados de Vendas do Vendedor:
    {{{sellerDataJson}}}
  `,
});

const analyzeSingleSellerPerformanceFlow = ai.defineFlow(
  {
    name: 'analyzeSingleSellerPerformanceFlow',
    inputSchema: AnalyzeSingleSellerPerformanceInputSchema,
    outputSchema: AnalyzeSingleSellerPerformanceOutputSchema,
  },
  async (sellerData) => {
    if (!sellerData) {
      return { summary: "Dados insuficientes." };
    }
    
    const preparedData = {
        vendedor: sellerData.seller,
        dados: sellerData.salesData.map(d => ({
            data: d.createdAt,
            faturado: d.billed,
            meta_mensal: d.monthlyGoal,
            percentual_meta: d.monthlyGoalPercentage.toFixed(2) + '%'
        }))
    };

    const sellerDataJson = JSON.stringify(preparedData);

    const { output } = await analysisPrompt({ sellerDataJson });
    return output || { summary: "Análise indisponível." };
  }
);
