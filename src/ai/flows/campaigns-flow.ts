// src/ai/flows/campaigns-flow.ts
'use server';
/**
 * @fileOverview Flows to manage campaigns in Google Sheets.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { google } from 'googleapis';
import type { Campaign } from '@/types';
import { format, parse } from 'date-fns';

// Constants
const SHEET_NAME = 'Campanhas';
const RANGE = `${SHEET_NAME}!A2:D`; // Read Name, Start, End, Description

// Schemas
const CampaignSchema = z.object({
  rowId: z.number(),
  name: z.string(),
  startDate: z.date(),
  endDate: z.date(),
  description: z.string(),
});

const AddCampaignInputSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  startDate: z.date(),
  endDate: z.date(),
  description: z.string().optional(),
});
export type AddCampaignInput = z.infer<typeof AddCampaignInputSchema>;

const UpdateCampaignInputSchema = z.object({
  rowId: z.number(),
  name: z.string().min(1, 'O nome é obrigatório.'),
  startDate: z.date(),
  endDate: z.date(),
  description: z.string().optional(),
});
export type UpdateCampaignInput = z.infer<typeof UpdateCampaignInputSchema>;

const DeleteCampaignInputSchema = z.object({
  rowId: z.number(),
});
export type DeleteCampaignInput = z.infer<typeof DeleteCampaignInputSchema>;

const FlowOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
});

// Helper for Google Sheets Auth - now exported
export async function getSheetsService() {
  const client_email = process.env.GOOGLE_CLIENT_EMAIL;
  const private_key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!client_email || !private_key || !spreadsheetId) {
    throw new Error('Variáveis de ambiente do Google Sheets não configuradas.');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email, private_key },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return { sheets, spreadsheetId };
}

// Flow to fetch all campaigns
export async function fetchCampaigns(): Promise<{ data?: Campaign[], error?: string }> {
  try {
    const { sheets, spreadsheetId } = await getSheetsService();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: RANGE,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return { data: [] };
    }

    const campaigns: Campaign[] = rows.map((row, index) => {
      // row[0]: Name, row[1]: Start Date, row[2]: End Date, row[3]: Description
      const startDate = parse(row[1], 'dd/MM/yyyy', new Date());
      const endDate = parse(row[2], 'dd/MM/yyyy', new Date());
      return {
        rowId: index + 2, // Sheet rows are 1-based, and we start at A2
        name: row[0] || '',
        startDate: !isNaN(startDate.getTime()) ? startDate : new Date(),
        endDate: !isNaN(endDate.getTime()) ? endDate : new Date(),
        description: row[3] || '',
      };
    }).filter(c => c.name); // Filter out empty rows

    return { data: campaigns };
  } catch (err: any) {
    console.error('API do Google Sheets retornou um erro:', err);
    return { error: err.message || 'Erro desconhecido ao buscar campanhas.' };
  }
}

// Flow to add a campaign
const addCampaignFlow = ai.defineFlow(
  {
    name: 'addCampaignFlow',
    inputSchema: AddCampaignInputSchema,
    outputSchema: FlowOutputSchema,
  },
  async (campaign) => {
    try {
      const { sheets, spreadsheetId } = await getSheetsService();
      const values = [
        [
          campaign.name,
          format(campaign.startDate, 'dd/MM/yyyy'),
          format(campaign.endDate, 'dd/MM/yyyy'),
          campaign.description || '',
        ],
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: SHEET_NAME,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });

      return { success: true, message: 'Campanha adicionada com sucesso!' };
    } catch (err: any) {
      console.error('API do Google Sheets retornou um erro:', err);
      return { success: false, error: err.message };
    }
  }
);

export async function addCampaign(input: AddCampaignInput) {
  return addCampaignFlow(input);
}


// Flow to update a campaign
const updateCampaignFlow = ai.defineFlow(
  {
    name: 'updateCampaignFlow',
    inputSchema: UpdateCampaignInputSchema,
    outputSchema: FlowOutputSchema,
  },
  async (campaign) => {
    try {
      const { sheets, spreadsheetId } = await getSheetsService();
      const range = `${SHEET_NAME}!A${campaign.rowId}:D${campaign.rowId}`;
      const values = [
        [
          campaign.name,
          format(campaign.startDate, 'dd/MM/yyyy'),
          format(campaign.endDate, 'dd/MM/yyyy'),
          campaign.description || '',
        ],
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });

      return { success: true, message: 'Campanha atualizada com sucesso!' };
    } catch (err: any) {
      console.error('API do Google Sheets retornou um erro:', err);
      return { success: false, error: err.message };
    }
  }
);
export async function updateCampaign(input: UpdateCampaignInput) {
    return updateCampaignFlow(input);
}


// Flow to delete a campaign
const deleteCampaignFlow = ai.defineFlow(
  {
    name: 'deleteCampaignFlow',
    inputSchema: DeleteCampaignInputSchema,
    outputSchema: FlowOutputSchema,
  },
  async ({ rowId }) => {
    try {
      const { sheets, spreadsheetId } = await getSheetsService();
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: await getSheetIdByName(sheets, spreadsheetId, SHEET_NAME), // Helper to get sheetId
                  dimension: 'ROWS',
                  startIndex: rowId - 1,
                  endIndex: rowId,
                },
              },
            },
          ],
        },
      });
      return { success: true, message: 'Campanha excluída com sucesso!' };
    } catch (err: any) {
      console.error('API do Google Sheets retornou um erro:', err);
      return { success: false, error: err.message };
    }
  }
);
export async function deleteCampaign(input: DeleteCampaignInput) {
    return deleteCampaignFlow(input);
}


// Helper to find sheetId by name, as it's required for deletion
async function getSheetIdByName(sheets: any, spreadsheetId: string, name: string): Promise<number> {
    const response = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = response.data.sheets.find((s: any) => s.properties.title === name);
    if (!sheet || sheet.properties.sheetId === null || sheet.properties.sheetId === undefined) {
        throw new Error(`Planilha com o nome '${name}' não encontrada.`);
    }
    return sheet.properties.sheetId;
}
