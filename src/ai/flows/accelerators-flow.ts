'use server';
/**
 * @fileOverview Flows to manage accelerator rules and achievements from Google Sheets.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { google } from 'googleapis';
import { parse, isValid } from 'date-fns';
import type { AcceleratorRule, Achievement } from '@/types';

// Helper for Google Sheets Auth
async function getSheetsService() {
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

// Schemas (internal to this flow now, not exported)
const AcceleratorRuleSchema = z.object({
  id: z.string(),
  label: z.string(),
  metaPercent: z.number(),
  bonus: z.number(),
  deadline: z.date(),
});

const AchievementSchema = z.object({
  achievementId: z.string(), // e.g., "SellerName-RuleID"
});

const FetchOutputSchema = z.object({
  rules: z.array(AcceleratorRuleSchema).optional(),
  achievements: z.array(AchievementSchema).optional(),
  error: z.string().optional(),
});

const ToggleInputSchema = z.object({
  achievementId: z.string(),
});
const ToggleOutputSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});


// Main flow to fetch both rules and achievements
export async function fetchAcceleratorRules(): Promise<{ rules?: AcceleratorRule[], achievements?: Achievement[], error?: string }> {
  const result = await fetchAcceleratorRulesFlow();
  if (result.error) {
    return { error: result.error };
  }
  return {
    rules: result.rules,
    achievements: result.achievements,
  };
}

const fetchAcceleratorRulesFlow = ai.defineFlow(
  {
    name: 'fetchAcceleratorRulesFlow',
    outputSchema: FetchOutputSchema,
  },
  async () => {
    try {
      const { sheets, spreadsheetId } = await getSheetsService();
      const rulesSheetName = 'Aceleradores';
      const achievementsSheetName = 'ConquistasAceleradores';

      // --- Check if sheets exist ---
      const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
      const sheetTitles = sheetMetadata.data.sheets?.map(s => s.properties?.title) || [];

      if (!sheetTitles.includes(rulesSheetName)) {
        return { error: `A aba "${rulesSheetName}" não foi encontrada na sua planilha.\n\nPor favor, crie-a com as seguintes colunas na primeira linha:\nID, Label, MetaPercent, Bonus, Deadline.\n\nO formato da data em 'Deadline' deve ser DD/MM/AAAA.` };
      }
      if (!sheetTitles.includes(achievementsSheetName)) {
        return { error: `A aba "${achievementsSheetName}" não foi encontrada na sua planilha.\n\nPor favor, crie-a com uma única coluna na primeira linha chamada:\nAchievementID.` };
      }
      
      // --- Fetch Rules ---
      const rulesRange = `${rulesSheetName}!A2:E`;
      const rulesResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: rulesRange });
      const rulesRows = rulesResponse.data.values || [];

      const rules: AcceleratorRule[] = rulesRows.map(row => {
          const deadlineStr = row[4] || '';
          const parsedDate = parse(deadlineStr, 'dd/MM/yyyy', new Date());

          return {
            id: row[0] || '',
            label: row[1] || '',
            metaPercent: Number(String(row[2] || '0').replace(',', '.')) || 0,
            bonus: Number(String(row[3] || '0').replace(',', '.')) || 0,
            deadline: parsedDate,
          };
      }).filter(rule => 
          rule.id && 
          isValid(rule.deadline) && // Filter out rows where date parsing failed
          !isNaN(rule.metaPercent) && 
          !isNaN(rule.bonus)
      );

      // --- Fetch Achievements ---
      const achievementsRange = `${achievementsSheetName}!A2:A`;
      const achievementsResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: achievementsRange });
      const achievementsRows = achievementsResponse.data.values || []; // Ensure this is an array, even if null/undefined
      const achievements: Achievement[] = achievementsRows
        .map(row => ({ achievementId: row[0] }))
        .filter(a => a.achievementId); // Filter out rows where achievementId is empty or null
      
      return { rules, achievements };

    } catch (err: any) {
        console.error('API do Google Sheets retornou um erro:', err);
        if (err.message && err.message.includes('Unable to parse range')) {
            return { error: `Erro de leitura. Verifique se as abas 'Aceleradores' e 'ConquistasAceleradores' existem e estão nomeadas corretamente.` };
        }
        return { error: `Erro ao buscar dados dos aceleradores: ${err.message}` };
    }
  }
);


// Flow to add/remove an achievement
export async function toggleAchievement(input: z.infer<typeof ToggleInputSchema>): Promise<z.infer<typeof ToggleOutputSchema>> {
  return toggleAchievementFlow(input);
}

const toggleAchievementFlow = ai.defineFlow(
    {
        name: 'toggleAchievementFlow',
        inputSchema: ToggleInputSchema,
        outputSchema: ToggleOutputSchema,
    },
    async ({ achievementId }) => {
        try {
            const { sheets, spreadsheetId } = await getSheetsService();
            const sheetName = 'ConquistasAceleradores';
            const range = `${sheetName}!A:A`;

            const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
            const rows = response.data.values || [];
            
            const rowIndexToDelete = rows.slice(1).findIndex(row => row[0] === achievementId);

            if (rowIndexToDelete !== -1) {
                 const sheetId = await getSheetIdByName(sheets, spreadsheetId, sheetName);
                 if (sheetId === null) {
                    throw new Error(`Planilha com o nome '${sheetName}' não encontrada ou sem ID.`);
                 }

                // API is 0-indexed, and we have a header row, so rowIndex + 1 is correct.
                const sheetRowIndex = rowIndexToDelete + 1;

                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId,
                    requestBody: {
                        requests: [{
                            deleteDimension: {
                                range: {
                                    sheetId: sheetId,
                                    dimension: 'ROWS',
                                    startIndex: sheetRowIndex,
                                    endIndex: sheetRowIndex + 1,
                                },
                            },
                        }],
                    },
                });
            } else {
                await sheets.spreadsheets.values.append({
                    spreadsheetId,
                    range: sheetName,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: { values: [[achievementId]] },
                });
            }
            return { success: true };
        } catch (err: any) {
            console.error('API do Google Sheets retornou um erro:', err);
            return { success: false, error: err.message };
        }
    }
);


// Helper to find sheetId by name, required for deletion
async function getSheetIdByName(sheets: any, spreadsheetId: string, name: string): Promise<number | null> {
    const response = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = response.data.sheets?.find((s: any) => s.properties?.title === name);
    if (!sheet || sheet.properties?.sheetId === null || sheet.properties?.sheetId === undefined) {
        return null;
    }
    return sheet.properties.sheetId;
}
