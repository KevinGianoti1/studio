'use server';
/**
 * @fileOverview Flow to interact with Google Sheets.
 *
 * - fetchSalesData - Fetches sales data from a Google Sheet.
 * - FetchSalesDataOutput - The return type for the fetchSalesData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getSheetsService } from './campaigns-flow'; // Reusing the helper
import { google } from 'googleapis';
import type { Company, Sale } from '@/types';

// Define the expected data structure from the flow
const SaleSchema = z.object({
    id: z.string(),
    company: z.enum(['Maxiforce', 'Pyramid']),
    seller: z.string(),
    group: z.string(),
    projection: z.number(),
    billed: z.number(),
    openBudget: z.number(),
    dailyGoal: z.number(),
    monthlyGoal: z.number(),
    monthlyGoalPercentage: z.number(),
    createdAt: z.string(),
    campaign: z.string().optional(),
});

// This is the object the flow will return, containing either data or an error
const FetchSalesDataOutputSchema = z.object({
    data: z.array(SaleSchema).optional(),
    error: z.string().optional(),
});

export type FetchSalesDataOutput = z.infer<typeof FetchSalesDataOutputSchema>;

// This is the main function the frontend will call.
export async function fetchSalesData(): Promise<FetchSalesDataOutput> {
    return fetchSalesDataFlow();
}

const fetchSalesDataFlow = ai.defineFlow(
    {
        name: 'fetchSalesDataFlow',
        outputSchema: FetchSalesDataOutputSchema,
    },
    async (): Promise<FetchSalesDataOutput> => {
        try {
            const { sheets, spreadsheetId } = await getSheetsService();

            // Updated range to include column J for Campaign
            const range = "'Dados Comercial'!A2:J"; 

            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range,
            });

            const rows = response.data.values;
            if (!rows || rows.length === 0) {
                console.log('No data found.');
                return { data: [] };
            }

            // Map rows to the Sale type
            const sales: Sale[] = rows.map((row, index) => {
                // Helper to parse currency strings like "R$ 1.234,56" to a number
                const parseCurrency = (value: string | null | undefined): number => {
                    if (typeof value !== 'string' || !value) return 0;
                    const cleanValue = value.replace(/[^0-9,-]+/g, "").replace(",", ".");
                    const numberValue = Number(cleanValue);
                    return isNaN(numberValue) ? 0 : numberValue;
                };

                const parsePercentage = (value: string | null | undefined): number => {
                    if (typeof value !== 'string' || !value) return 0;
                    // Handles "85,42%" -> 85.42
                    const cleanValue = value.replace('%', '').replace(',', '.').trim();
                    const numberValue = Number(cleanValue);
                    return isNaN(numberValue) ? 0 : numberValue;
                };
                
                // Helper to parse date strings like "DD/MM/YYYY" to ISO string
                const parseDate = (value: string) => {
                    if (typeof value !== 'string' || !value.match(/^\d{2}\/\d{2}\/\d{4}$/)) return new Date().toISOString();
                    const [day, month, year] = value.split('/');
                    return new Date(`${year}-${month}-${day}T12:00:00Z`).toISOString();
                };

                const group = row[1] || ''; // Coluna B: Equipe
                const company: Company = group.toUpperCase() === 'PYRAMID' ? 'Pyramid' : 'Maxiforce';

                return {
                    id: `${spreadsheetId}-${index}`, // Generate a unique ID
                    createdAt: parseDate(row[0]), // Coluna A: Data
                    group: group.toUpperCase(), // Coluna B: Equipe
                    seller: row[2] || '', // Coluna C: Vendedor
                    company: company,
                    projection: parseCurrency(row[3]), // Coluna D: Projeção
                    billed: parseCurrency(row[4]), // Coluna E: Faturamento
                    openBudget: parseCurrency(row[5]), // Coluna F: Orçamento Aberto
                    dailyGoal: parseCurrency(row[6]), // Coluna G: Meta Diária
                    monthlyGoalPercentage: parsePercentage(row[7]), // Coluna H: % Meta
                    monthlyGoal: parseCurrency(row[8]), // Coluna I: Meta Mensal
                    campaign: row[9] || '', // Coluna J: Campanha
                };
            }).filter(sale => sale.seller); // Filter out rows without a seller

            return { data: sales };
        } catch (err: any) {
            console.error('The Google Sheets API returned an error: ' + err);
            // In case of error, we return an object with the error message.
            return { error: err.message || 'An unknown error occurred.' };
        }
    }
);
