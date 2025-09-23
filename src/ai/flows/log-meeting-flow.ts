'use server';
/**
 * @fileOverview Flow to log a 1:1 meeting to Google Sheets.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { google } from 'googleapis';
import { format } from "date-fns";
import { parseISO } from 'date-fns';

// Define the input schema based on our new form with numeric ratings
const LogMeetingInputSchema = z.object({
  seller: z.string(),
  evaluationDate: z.string(), // Changed from z.date()
  prospeccao: z.number(),
  qualificacao: z.number(),
  apresentacao: z.number(),
  objecoes: z.number(),
  fechamento: z.number(),
  followUp: z.number(),
  gapsIdentified: z.string().optional(),
  courseSuggestions: z.array(z.string()).optional(),
  nextEvaluationDate: z.string().optional(), // Changed from z.date()
});
export type LogMeetingInput = z.infer<typeof LogMeetingInputSchema>;

// Define the output schema for the flow
const LogMeetingOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
});
export type LogMeetingOutput = z.infer<typeof LogMeetingOutputSchema>;

// Exported function that the frontend will call
export async function logMeeting(input: LogMeetingInput): Promise<LogMeetingOutput> {
  return logMeetingFlow(input);
}

const logMeetingFlow = ai.defineFlow(
  {
    name: 'logMeetingFlow',
    inputSchema: LogMeetingInputSchema,
    outputSchema: LogMeetingOutputSchema,
  },
  async (meetingData): Promise<LogMeetingOutput> => {
    try {
      // Get Google Sheets credentials from environment variables
      const client_email = process.env.GOOGLE_CLIENT_EMAIL;
      const private_key_from_env = process.env.GOOGLE_PRIVATE_KEY;
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;

      // Validate that all required environment variables are present
      if (!client_email || !private_key_from_env || !spreadsheetId) {
        const missing = [
          !client_email && "GOOGLE_CLIENT_EMAIL",
          !private_key_from_env && "GOOGLE_PRIVATE_KEY",
          !spreadsheetId && "GOOGLE_SHEET_ID"
        ].filter(Boolean).join(', ');
        return { success: false, error: `Variáveis de ambiente faltando no servidor: ${missing}` };
      }

      // Format the private key correctly
      const private_key = private_key_from_env.replace(/\\n/g, '\n');

      // Authenticate with Google API
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: client_email,
          private_key: private_key,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });

      // Specify the sheet name and range. We'll use a new sheet called 'Reunião 1:1'.
      const sheetName = 'Reunião 1:1';
      const range = `'${sheetName}'!A:L`; 

      const evaluationDate = format(parseISO(meetingData.evaluationDate), "dd/MM/yyyy");
      const nextEvaluationDate = meetingData.nextEvaluationDate ? format(parseISO(meetingData.nextEvaluationDate), "dd/MM/yyyy") : '';
      const submissionTimestamp = format(new Date(), "dd/MM/yyyy HH:mm:ss");

      // Prepare the row data in the correct order for the sheet
      // Columns: Data Avaliação, Vendedor, Prospecção, Qualificação, Apresentação, Objeções, Fechamento, Follow-up, Gaps, Cursos, Próxima Avaliação, Data Registro
      const values = [
        [
          evaluationDate,
          meetingData.seller,
          meetingData.prospeccao,
          meetingData.qualificacao,
          meetingData.apresentacao,
          meetingData.objecoes,
          meetingData.fechamento,
          meetingData.followUp,
          meetingData.gapsIdentified || '', // Ensure it's not undefined
          (meetingData.courseSuggestions || []).join(', '), // Join array into a string
          nextEvaluationDate,
          submissionTimestamp,
        ]
      ];

      // Append the new row to the sheet
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: values,
        },
      });

      return { success: true, message: "Relatório da reunião salvo com sucesso!" };
    } catch (err: any) {
      // Handle any errors from the Google Sheets API
      console.error('The Google Sheets API returned an error: ' + err);
      // Check if the error is about the sheet not being found
      if (err.message && err.message.includes('Unable to parse range')) {
           return { success: false, error: `A aba "${'Reunião 1:1'}" não foi encontrada na sua planilha. Por favor, crie-a e tente novamente.` };
      }
      return { success: false, error: err.message || 'Ocorreu um erro desconhecido ao salvar o relatório.' };
    }
  }
);
