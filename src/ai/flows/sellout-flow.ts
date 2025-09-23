'use server';
/**
 * @fileOverview A flow to analyze sell out data.
 *
 * - analyzeSellOut - Analyzes product data to provide insights.
 * - SellOutAnalysisInput - The input type for the analyzeSellOut function.
 * - SellOutAnalysisOutput - The return type for the analyzeSellOut function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ProductStatsSchema = z.object({
  year: z.number(),
  productCode: z.string(),
  description: z.string(),
  totalQuantity: z.number(),
  minPrice: z.number(),
  avgPrice: z.number(),
  maxPrice: z.number(),
  sellers: z.array(z.string()).optional(), // Add sellers to the schema
});

const SellOutAnalysisInputSchema = z.object({
  productStats: z.array(ProductStatsSchema),
  year: z.string().describe("O ano selecionado para a análise, ou 'all' para todos os anos."),
});
export type SellOutAnalysisInput = z.infer<typeof SellOutAnalysisInputSchema>;


const SellOutAnalysisOutputSchema = z.object({
  analysis: z.string().describe("Uma análise textual concisa (2-3 frases) sobre os dados de venda de produtos, destacando os produtos mais vendidos e com maior destaque/rotatividade."),
  playbook: z.array(z.object({
    productCode: z.string(),
    description: z.string(),
    topSeller: z.string().describe("O vendedor que mais vendeu este produto."),
  })).describe("Uma lista dos 5 principais produtos e quem é o melhor vendedor para cada um.")
});
export type SellOutAnalysisOutput = z.infer<typeof SellOutAnalysisOutputSchema>;

export async function analyzeSellOut(input: SellOutAnalysisInput): Promise<SellOutAnalysisOutput> {
  return analyzeSellOutFlow(input);
}

const analysisPrompt = ai.definePrompt({
    name: 'sellOutAnalysisPrompt',
    input: { schema: z.object({ productStatsJson: z.string(), year: z.string() }) },
    output: { schema: SellOutAnalysisOutputSchema },
    prompt: `
        Você é um analista de dados comerciais e sua tarefa é analisar a performance de produtos.

        PARTE 1: Resumo Conciso
        Analise a lista de produtos fornecida e identifique:
        1. O produto mais vendido em termos de quantidade total.
        2. Um produto de destaque, que pode ser o segundo mais vendido ou um com bom volume.
        Com base nisso, crie uma análise de 2 a 3 frases. Seja direto e informativo.
        Exemplo: "O principal destaque de vendas no período foi o Produto X, liderando em quantidade. Além dele, o Produto Y também demonstrou forte rotatividade, consolidando-se como uma peça chave no portfólio."

        PARTE 2: Playbook de Vendas
        Com base nos vendedores associados a cada produto, identifique o principal vendedor (Top Seller) para os 5 produtos mais vendidos (em quantidade).
        O Top Seller é aquele que aparece com mais frequência na lista de vendedores daquele produto.

        Ano da análise: {{{year}}}
        Dados dos produtos (incluindo vendedores que venderam cada um):
        {{{productStatsJson}}}
    `,
});


const analyzeSellOutFlow = ai.defineFlow(
  {
    name: 'analyzeSellOutFlow',
    inputSchema: SellOutAnalysisInputSchema,
    outputSchema: SellOutAnalysisOutputSchema,
  },
  async ({ productStats, year }) => {
    
    if (productStats.length === 0) {
      return { analysis: "Não há dados de produtos para analisar no período selecionado.", playbook: [] };
    }

    const productStatsJson = JSON.stringify(productStats.map(p => ({
        produto: p.description,
        codigo: p.productCode,
        quantidade_total: p.totalQuantity,
        vendedores: p.sellers, // Include sellers in the data for the AI
    })));

    const { output } = await analysisPrompt({
        productStatsJson,
        year: year === 'all' ? 'Geral' : year,
    });
    
    return output || { analysis: "Não foi possível gerar a análise.", playbook: [] };
  }
);
