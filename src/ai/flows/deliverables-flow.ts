'use server';
/**
 * @fileOverview Flow to fetch deliverables data from Google Sheets.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getSheetsService } from './campaigns-flow';
import type { Deliverable } from '@/types';

const DeliverableSchema = z.object({
  id: z.string(),
  date: z.string(),
  seller: z.string(),
  team: z.string(),
  callsGoal: z.number(),
  callsMade: z.number(),
  proposalsGoal: z.number(),
  proposalsMade: z.number(),
  videosGoal: z.number(),
  videosMade: z.number(),
});

const FetchDeliverablesOutputSchema = z.object({
  data: z.array(DeliverableSchema).optional(),
  error: z.string().optional(),
});
export type FetchDeliverablesOutput = z.infer<typeof FetchDeliverablesOutputSchema>;

export async function fetchDeliverables(): Promise<FetchDeliverablesOutput> {
  return fetchDeliverablesFlow();
}

const fetchDeliverablesFlow = ai.defineFlow(
  {
    name: 'fetchDeliverablesFlow',
    outputSchema: FetchDeliverablesOutputSchema,
  },
  async (): Promise<FetchDeliverablesOutput> => {
    try {
      const { sheets, spreadsheetId } = await getSheetsService();
      const sheetName = 'Entregaveis';
      const range = `'${sheetName}'!A:I`; // Assuming up to 9 columns

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return { data: [] };
      }

      // Helper to safely parse numbers
      const parseNumber = (value: any) => {
        const num = Number(String(value).replace(/[^0-9,.-]+/g, "").replace(",", "."));
        return isNaN(num) ? 0 : num;
      };

       // Helper to parse date strings like "DD/MM/YYYY" to ISO string
      const parseDate = (value: string) => {
        if (typeof value !== 'string' || !value.match(/^\d{2}\/\d{2}\/\d{4}$/)) return new Date().toISOString();
        const [day, month, year] = value.split('/');
        return new Date(`${year}-${month}-${day}T12:00:00Z`).toISOString();
      };

      const deliverables: Deliverable[] = rows.slice(1).map((row, index) => { // slice(1) to skip header
        return {
          id: `${spreadsheetId}-entregaveis-${index}`,
          date: parseDate(row[0]),          // Col A: Data
          team: row[1] || '',               // Col B: Equipe (Corrigido)
          seller: row[2] || '',             // Col C: Vendedor (Corrigido)
          callsGoal: parseNumber(row[3]),     // Col D: Ligação Meta
          proposalsGoal: parseNumber(row[4]), // Col E: Proposta Meta
          videosGoal: parseNumber(row[5]),    // Col F: Vídeos Meta
          callsMade: parseNumber(row[6]),     // Col G: Ligação Realizado
          proposalsMade: parseNumber(row[7]), // Col H: Proposta Realizado
          videosMade: parseNumber(row[8]),    // Col I: Vídeos Realizado
        };
      }).filter(d => d.seller); // Filter out rows without a seller

      return { data: deliverables };
    } catch (err: any) {
      console.error('The Google Sheets API returned an error: ' + err);
      if (err.message && err.message.includes('Unable to parse range')) {
          return { error: `A aba "${'Entregaveis'}" não foi encontrada. Por favor, verifique o nome da aba na sua planilha.` };
      }
      return { error: err.message || 'An unknown error occurred while fetching deliverables.' };
    }
  }
);
