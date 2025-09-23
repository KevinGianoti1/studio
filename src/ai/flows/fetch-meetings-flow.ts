'use server';
/**
 * @fileOverview Flow to fetch 1:1 meeting data from Google Sheets.
 *
 * - fetchMeetingsData - Fetches meeting data from the 'Reunião 1:1' sheet.
 * - FetchMeetingsDataOutput - The return type for the fetchMeetingsData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getSheetsService } from './campaigns-flow'; // Reusing the helper
import { google } from 'googleapis';
import type { Meeting } from '@/types';
import { parse } from 'date-fns';

// Define the expected data structure from the flow, now including new fields
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
  courseSuggestions: z.string().optional(), // As it's a comma-separated string in the sheet
  nextEvaluationDate: z.string().optional(),
});

// This is the object the flow will return, containing either data or an error
const FetchMeetingsDataOutputSchema = z.object({
  data: z.array(MeetingSchema).optional(),
  error: z.string().optional(),
});
export type FetchMeetingsDataOutput = z.infer<typeof FetchMeetingsDataOutputSchema>;

// This is the main function the frontend will call.
export async function fetchMeetingsData(): Promise<FetchMeetingsDataOutput> {
  return fetchMeetingsDataFlow();
}

const fetchMeetingsDataFlow = ai.defineFlow(
  {
    name: 'fetchMeetingsDataFlow',
    outputSchema: FetchMeetingsDataOutputSchema,
  },
  async (): Promise<FetchMeetingsDataOutput> => {
    try {
      const { sheets, spreadsheetId } = await getSheetsService();
      const sheetName = 'Reunião 1:1';

      // Updated range to include all columns up to L
      const range = `'${sheetName}'!A2:L`; 

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return { data: [] };
      }

      const meetings: Meeting[] = rows.map((row) => {
          // Helper to parse date strings like "DD/MM/YYYY"
          const parseDate = (value: string): string => {
            if (typeof value !== 'string' || !value.match(/^\d{2}\/\d{2}\/\d{4}$/)) return new Date().toISOString();
            return parse(value, 'dd/MM/yyyy', new Date()).toISOString();
          };

          // Helper to safely parse numbers
          const parseNumber = (value: any) => {
              const num = Number(value);
              return isNaN(num) ? 0 : num;
          };
          
          return {
            evaluationDate: parseDate(row[0]),       // Col A: Data Avaliação
            seller: row[1] || '',                     // Col B: Vendedor
            prospeccao: parseNumber(row[2]),          // Col C: Prospecção
            qualificacao: parseNumber(row[3]),        // Col D: Qualificação
            apresentacao: parseNumber(row[4]),        // Col E: Apresentação
            objecoes: parseNumber(row[5]),            // Col F: Objeções
            fechamento: parseNumber(row[6]),          // Col G: Fechamento
            followUp: parseNumber(row[7]),            // Col H: Follow-up
            gapsIdentified: row[8] || '',             // Col I: Gaps
            courseSuggestions: row[9] || '',          // Col J: Cursos
            nextEvaluationDate: row[10] || '',        // Col K: Próxima Avaliação
          };
        })
        .filter((meeting) => meeting.seller); // Filter out rows without a seller

      return { data: meetings };
    } catch (err: any) {
        console.error('The Google Sheets API returned an error: ' + err);
        if (err.message && err.message.includes('Unable to parse range')) {
            return { error: `A aba "${'Reunião 1:1'}" não foi encontrada. Por favor, verifique o nome da aba na sua planilha.` };
        }
        return { error: err.message || 'An unknown error occurred.' };
    }
  }
);
