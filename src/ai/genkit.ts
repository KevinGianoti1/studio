import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Explicitly load the .env file from the project root
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

console.log('Attempting to load environment variables from:', envPath);
console.log('GOOGLE_SHEET_ID loaded:', !!process.env.GOOGLE_SHEET_ID ? 'Yes' : 'No');
console.log('GOOGLE_CLIENT_EMAIL loaded:', !!process.env.GOOGLE_CLIENT_EMAIL ? 'Yes' : 'No');
console.log('GOOGLE_PRIVATE_KEY loaded:', !!process.env.GOOGLE_PRIVATE_KEY ? 'Yes' : 'No');
console.log('VENDASCONTROL_API_KEY loaded:', !!process.env.NEXT_PUBLIC_VENDASCONTROL_API_KEY ? 'Yes' : 'No');
console.log('EXTERNAL_API_URL loaded:', !!process.env.EXTERNAL_API_URL ? 'Yes' : 'No');
console.log('EXTERNAL_API_KEY loaded:', !!process.env.EXTERNAL_API_KEY ? 'Yes' : 'No');


export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
