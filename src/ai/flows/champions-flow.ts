'use server';
/**
 * @fileOverview A flow to identify and list sellers who have met their monthly goal.
 *
 * - findChampions - Identifies sellers who have achieved 100% or more of their goal.
 * - FindChampionsInput - The input type for the findChampions function.
 * - FindChampionsOutput - The return type for the findChampions function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { parseISO } from 'date-fns';

const SaleDataForChampionsSchema = z.object({
  seller: z.string(),
  group: z.string(),
  billed: z.number(),
  monthlyGoal: z.number(),
  createdAt: z.string(), // ISO string
});

export type FindChampionsInput = z.infer<typeof SaleDataForChampionsSchema>[];

const ChampionSchema = z.object({
    seller: z.string().describe("The name of the champion seller."),
    team: z.string().describe("The team the seller belongs to."),
    goalPercentage: z.number().describe("The percentage of the monthly goal achieved."),
});

export type FindChampionsOutput = z.infer<typeof ChampionSchema>[];

export async function findChampions(input: FindChampionsInput): Promise<FindChampionsOutput> {
  return findChampionsFlow(input);
}


const findChampionsFlow = ai.defineFlow(
  {
    name: 'findChampionsFlow',
    inputSchema: z.array(SaleDataForChampionsSchema),
    outputSchema: z.array(ChampionSchema),
  },
  async (salesData) => {
    
    if (salesData.length === 0) {
        return [];
    }

    const champions: z.infer<typeof ChampionSchema>[] = [];
    const sellers = [...new Set(salesData.map(s => s.seller))];

    sellers.forEach(seller => {
        const mostRecentSale = salesData
            .filter(s => s.seller === seller)
            .sort((a,b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime())[0];

        if (mostRecentSale && mostRecentSale.monthlyGoal > 0) {
            const goalPercentage = (mostRecentSale.billed / mostRecentSale.monthlyGoal) * 100;
            if (goalPercentage >= 100) {
                champions.push({
                    seller: mostRecentSale.seller,
                    team: mostRecentSale.group,
                    goalPercentage: goalPercentage,
                });
            }
        }
    });
    
    // Sort champions by the highest percentage
    return champions.sort((a,b) => b.goalPercentage - a.goalPercentage);
  }
);
