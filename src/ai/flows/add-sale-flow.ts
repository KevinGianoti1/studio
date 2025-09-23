'use server';
/**
 * @fileOverview Flow to add a new sale to Google Sheets.
 *
 * - addSale - Appends a new sale record to the Google Sheet.
 * - AddSaleInput - The input type for the addSale function.
 * - AddSaleOutput - The return type for the addSale function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { google } from 'googleapis';
import { format } from "date-fns";

const AddSaleInputSchema = z.object({
  company: z.enum(['Maxiforce', 'Pyramid']),
  seller: z.string(),
  group: z.string(),
  projection: z.number(),
  billed: z.number(),
  openBudget: z.number(),
  dailyGoal: z.number(),
  monthlyGoal: z.number(),
  createdAt: z.string(), // ISO string from the client
  // Campaign is removed from input, as it's no longer manually entered.
});
export type AddSaleInput = z.infer<typeof AddSaleInputSchema>;

const AddSaleOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
});
export type AddSaleOutput = z.infer<typeof AddSaleOutputSchema>;

export async function addSale(input: AddSaleInput): Promise<AddSaleOutput> {
  return addSaleFlow(input);
}

const addSaleFlow = ai.defineFlow(
  {
    name: 'addSaleFlow',
    inputSchema: AddSaleInputSchema,
    outputSchema: AddSaleOutputSchema,
  },
  async (sale): Promise<AddSaleOutput> => {
    try {
      const client_email = process.env.GOOGLE_CLIENT_EMAIL;
      const private_key_from_env = process.env.GOOGLE_PRIVATE_KEY;
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;

      if (!client_email || !private_key_from_env || !spreadsheetId) {
        const missing = [
          !client_email && "GOOGLE_CLIENT_EMAIL",
          !private_key_from_env && "GOOGLE_PRIVATE_KEY",
          !spreadsheetId && "GOOGLE_SHEET_ID"
        ].filter(Boolean).join(', ');
        return { success: false, error: `Variáveis de ambiente faltando no servidor: ${missing}` };
      }

      const private_key = private_key_from_env.replace(/\\n/g, '\n');

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: client_email,
          private_key: private_key,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      // The range now only goes up to column I, as J (Campaign) is no longer written to.
      const range = "'Dados Comercial'!A:I"; 
      
      const formattedDate = format(new Date(sale.createdAt), "dd/MM/yyyy");

      // Column order in the sheet:
      // A: Data, B: Equipe, C: Vendedor, D: Projeção, E: Vendas, 
      // F: Orçamento Aberto, G: Meta Diária, H: % Meta, I: Meta Mensal
      const values = [
        [
          formattedDate,
          sale.group,
          sale.seller,
          sale.projection,
          sale.billed,
          sale.openBudget,
          sale.dailyGoal,
          sale.monthlyGoal > 0 ? (sale.billed / sale.monthlyGoal) : 0, // Calculate % Meta
          sale.monthlyGoal,
        ]
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: values,
        },
      });

      return { success: true, message: "Venda adicionada com sucesso!" };
    } catch (err: any) {
      console.error('The Google Sheets API returned an error: ' + err);
      return { success: false, error: err.message || 'Ocorreu um erro desconhecido ao adicionar a venda.' };
    }
  }
);
