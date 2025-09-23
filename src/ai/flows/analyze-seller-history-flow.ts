'use server';
/**
 * @fileOverview A flow to analyze a seller's entire sales history and provide key insights.
 *
 * - analyzeSellerHistory - Analyzes history to find best day, week, month, and a summary.
 * - AnalyzeSellerHistoryInput - The input type for the function.
 * - AnalyzeSellerHistoryOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, getWeek, getYear, isFriday, eachDayOfInterval, getDay, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SaleHistorySchema = z.object({
  projection: z.number(),
  billed: z.number(),
  createdAt: z.string(), // ISO string
});

const AnalyzeSellerHistoryInputSchema = z.object({
  seller: z.string(),
  salesData: z.array(SaleHistorySchema),
});
export type AnalyzeSellerHistoryInput = z.infer<typeof AnalyzeSellerHistoryInputSchema>;

const AnalyzeSellerHistoryOutputSchema = z.object({
  bestDay: z.object({
    date: z.string().describe("Date of the best day (ISO format)"),
    amount: z.number().describe("Net sales amount on the best day"),
  }),
  bestWeek: z.object({
    date: z.string().describe("The Friday of the best performing week (ISO format)"),
    amount: z.number().describe("Total net sales amount in the best week"),
  }),
  bestMonth: z.object({
    month: z.string().describe("The best month (e.g., 'Agosto/2024')"),
    amount: z.number().describe("Total net sales amount in the best month"),
  }),
  kpis: z.object({
    activeDays: z.number().describe("Total number of days with sales in the period."),
    averageTicketPerDay: z.number().describe("Average sales amount per active day."),
    salesFrequency: z.number().describe("Average number of days between sales."),
    projectionConversionRate: z.number().describe("Percentage of the projection that was converted into sales."),
  }),
  weekdayAnalysis: z.array(z.object({
    day: z.string().describe("Day of the week (e.g., 'Segunda')"),
    amount: z.number().describe("Total sales amount for that day of the week."),
  })).describe("Sales performance analyzed by day of the week."),
  performanceSummary: z.string().optional().describe("A concise analysis of the seller's historical performance, highlighting consistency, growth trends, and patterns. Example: 'João demonstra um crescimento consistente, com picos de venda no final do mês. Sua performance é mais forte na segunda quinzena.'"),
  salesPaceAnalysis: z.string().optional().describe("An analysis of the seller's sales pace and patterns. E.g. 'Tende a concentrar vendas no final do mês', 'Mantém um ritmo de vendas constante durante a semana', 'Demonstra picos de venda sazonais no início do ano.'"),
  performanceTrend: z.string().optional().describe("Analysis of performance trend within the period, comparing first half vs. second half. E.g., 'Strong acceleration in the last two weeks.' or 'Performance is declining, needs attention.'")
});
export type AnalyzeSellerHistoryOutput = z.infer<typeof AnalyzeSellerHistoryOutputSchema>;

export async function analyzeSellerHistory(input: AnalyzeSellerHistoryInput): Promise<AnalyzeSellerHistoryOutput> {
  return analyzeSellerHistoryFlow(input);
}


const analysisPrompt = ai.definePrompt({
    name: 'sellerHistoryAnalysisPrompt',
    input: { schema: z.object({ 
        seller: z.string(), 
        salesDataJson: z.string(),
        firstHalfSales: z.number(),
        secondHalfSales: z.number(),
     }) },
    output: { schema: z.object({
        performanceSummary: z.string().describe("Uma análise concisa (1-2 frases) da performance histórica do vendedor, destacando consistência, crescimento e padrões. Ex: 'Demonstra um crescimento consistente, com picos de venda no final do mês. Sua performance é mais forte na segunda quinzena.'"),
        salesPaceAnalysis: z.string().describe("Uma análise do ritmo e padrão de vendas do vendedor (1-2 frases). Ex: 'Tende a concentrar vendas no final do mês', 'Mantém um ritmo de vendas constante durante a semana', 'Demonstra picos de venda sazonais no início do ano.'"),
        performanceTrend: z.string().describe("Uma análise da tendência de performance dentro do período, comparando o faturamento da primeira metade com a segunda. Seja direto. Ex: 'Mostrou forte aceleração na segunda metade do período.' ou 'Performance desacelerou, requer atenção.' ou 'Manteve um ritmo estável durante o período.'")
    }) },
    prompt: `
        Você é um analista de vendas sênior. Sua tarefa é analisar os dados históricos de vendas de um vendedor e fornecer três resumos:
        1.  **Resumo de Performance:** Uma visão geral do desempenho, procurando por consistência, crescimento, declínio, etc.
        2.  **Análise de Ritmo de Vendas:** Uma observação sobre quando as vendas tendem a acontecer (início/fim do mês, dias específicos, etc.).
        3.  **Análise de Tendência:** Compare o desempenho da primeira metade do período com a segunda metade.

        Seja conciso e direto em todas as análises.

        Analise os dados do vendedor '{{{seller}}}' e forneça os resumos.
        Dados Históricos de Vendas (faturamento acumulado na data):
        {{{salesDataJson}}}

        Faturamento na primeira metade do período: {{{firstHalfSales}}}
        Faturamento na segunda metade do período: {{{secondHalfSales}}}
    `,
});


const analyzeSellerHistoryFlow = ai.defineFlow(
  {
    name: 'analyzeSellerHistoryFlow',
    inputSchema: AnalyzeSellerHistoryInputSchema,
    outputSchema: AnalyzeSellerHistoryOutputSchema,
  },
  async ({ seller, salesData }) => {
    
    if (salesData.length === 0) {
      const emptyKpis = { activeDays: 0, averageTicketPerDay: 0, salesFrequency: 0, projectionConversionRate: 0 };
      const emptyWeekdayAnalysis = [
        { day: 'Dom', amount: 0 }, { day: 'Seg', amount: 0 }, { day: 'Ter', amount: 0 },
        { day: 'Qua', amount: 0 }, { day: 'Qui', amount: 0 }, { day: 'Sex', amount: 0 },
        { day: 'Sáb', amount: 0 },
      ];
      return {
        bestDay: { date: new Date().toISOString(), amount: 0 },
        bestWeek: { date: new Date().toISOString(), amount: 0 },
        bestMonth: { month: 'N/A', amount: 0 },
        kpis: emptyKpis,
        weekdayAnalysis: emptyWeekdayAnalysis,
        performanceSummary: "Sem dados para análise no período selecionado.",
        salesPaceAnalysis: "Sem dados para análise no período selecionado.",
        performanceTrend: "Sem dados para análise no período selecionado."
      };
    }
    
    // --- Calculation Logic ---
    const sortedSales = salesData.map(s => ({
        billed: s.billed,
        projection: s.projection,
        createdAt: parseISO(s.createdAt),
    })).sort((a,b) => a.createdAt.getTime() - b.createdAt.getTime());

    let lastBilled = 0;
    const dailySales: { date: Date, amount: number }[] = sortedSales.map(sale => {
        const dailySalesAmount = sale.billed - lastBilled;
        lastBilled = sale.billed;
        return { date: sale.createdAt, amount: dailySalesAmount };
    }).filter(s => s.amount > 0); // Only consider days with actual sales
    
    // 1. Best Day Calculation
    const bestDay = dailySales.length > 0
        ? dailySales.reduce((max, current) => current.amount > max.amount ? current : max, { date: sortedSales[0].createdAt, amount: -1 })
        : { date: sortedSales[0].createdAt, amount: 0 };

    // 2. Best Week Calculation (Friday to Friday)
    const salesByWeek: { [key: number]: {endDate: Date, billed: number} } = {};
    sortedSales.forEach(sale => {
       const weekNumber = getWeek(sale.createdAt, { weekStartsOn: 6 /* Saturday */}); // Sat-Fri week
       const year = getYear(sale.createdAt);
       const weekYearKey = year * 100 + weekNumber;

       if (!salesByWeek[weekYearKey] || sale.createdAt > salesByWeek[weekYearKey].endDate) {
           salesByWeek[weekYearKey] = { endDate: sale.createdAt, billed: sale.billed };
       }
    });
    
    let lastWeekBilled = 0;
    const weeklyTotals: { date: Date, amount: number }[] = Object.values(salesByWeek)
        .sort((a,b) => a.endDate.getTime() - b.endDate.getTime())
        .map(week => {
            const weeklyAmount = week.billed - lastWeekBilled;
            lastWeekBilled = week.billed;
            const fridayOfWeek = endOfWeek(week.endDate, { weekStartsOn: 6 });
            return { date: fridayOfWeek, amount: weeklyAmount };
    });

    const bestWeek = weeklyTotals.length > 0
        ? weeklyTotals.reduce((max, current) => current.amount > max.amount ? current : max, { date: sortedSales[0].createdAt, amount: -1 })
        : { date: sortedSales[0].createdAt, amount: 0 };


    // 3. Best Month Calculation
    const salesByMonth: { [key: string]: number } = {};
     sortedSales.forEach(sale => {
      const monthKey = format(sale.createdAt, 'yyyy-MM');
      salesByMonth[monthKey] = sale.billed;
    });

    let lastMonthBilled = 0;
    const monthlySales: { month: string, amount: number }[] = Object.keys(salesByMonth).sort().map(monthKey => {
      const monthBilled = salesByMonth[monthKey];
      const monthlyAmount = monthBilled - lastMonthBilled;
      lastMonthBilled = monthBilled;
      const monthDate = parseISO(monthKey + '-01');
      return { 
        month: format(monthDate, "MMMM/yyyy", { locale: ptBR }), 
        amount: monthlyAmount 
      };
    });

    const bestMonth = monthlySales.length > 0
        ? monthlySales.reduce((max, current) => current.amount > max.amount ? current : max, { month: '', amount: -1 })
        : { month: 'N/A', amount: 0 };
        
    // 4. KPIs Calculation
    const firstSale = sortedSales[0];
    const lastSale = sortedSales[sortedSales.length - 1];

    const totalBilledInPeriod = lastSale.billed - (firstSale.billed - (dailySales[0]?.amount || 0));
    const totalProjectionInPeriod = lastSale.projection; // Assuming projection is cumulative
    const activeDays = dailySales.length;
    const averageTicketPerDay = activeDays > 0 ? totalBilledInPeriod / activeDays : 0;
    
    const periodStart = firstSale.createdAt;
    const periodEnd = lastSale.createdAt;
    const totalDaysInPeriod = differenceInDays(periodEnd, periodStart) + 1;
    const salesFrequency = activeDays > 1 ? totalDaysInPeriod / (activeDays - 1) : 0;
    
    const projectionConversionRate = totalProjectionInPeriod > 0 ? (totalBilledInPeriod / totalProjectionInPeriod) * 100 : 0;

    const kpis = {
        activeDays,
        averageTicketPerDay,
        salesFrequency,
        projectionConversionRate,
    };

    // 5. Weekday Analysis
    const weekdaySales = [
        { day: 'Dom', amount: 0 }, { day: 'Seg', amount: 0 }, { day: 'Ter', amount: 0 },
        { day: 'Qua', amount: 0 }, { day: 'Qui', amount: 0 }, { day: 'Sex', amount: 0 },
        { day: 'Sáb', amount: 0 },
    ];
    dailySales.forEach(sale => {
        const dayIndex = getDay(sale.date); // 0 for Sunday, 1 for Monday, etc.
        weekdaySales[dayIndex].amount += sale.amount;
    });

    // --- AI Analysis ---
    let aiAnalysis = { 
        performanceSummary: "Dados insuficientes para uma análise de performance detalhada.", 
        salesPaceAnalysis: "Dados insuficientes para analisar o ritmo de vendas.",
        performanceTrend: "Dados insuficientes para analisar a tendência."
    };

    // Only run AI analysis if there's enough data (e.g., at least 3 sales records)
    if (dailySales.length >= 3) {
      const salesDataJson = JSON.stringify(sortedSales.map(d => ({
          data: format(d.createdAt, 'yyyy-MM-dd'),
          faturamento_acumulado: d.billed,
          projecao_acumulada: d.projection,
      })));

      // Trend analysis calculation
      const midPointIndex = Math.floor(dailySales.length / 2);
      const firstHalfSales = dailySales.slice(0, midPointIndex).reduce((sum, s) => sum + s.amount, 0);
      const secondHalfSales = dailySales.slice(midPointIndex).reduce((sum, s) => sum + s.amount, 0);

      
      const { output } = await analysisPrompt({ 
          seller, 
          salesDataJson,
          firstHalfSales,
          secondHalfSales,
      });
      if (output) {
        aiAnalysis = output;
      }
    }

    // Return combined data
    return {
        bestDay: {
            date: bestDay.date.toISOString(),
            amount: bestDay.amount,
        },
        bestWeek: {
            date: bestWeek.date.toISOString(),
            amount: bestWeek.amount,
        },
        bestMonth: {
            month: bestMonth.month.charAt(0).toUpperCase() + bestMonth.month.slice(1),
            amount: bestMonth.amount,
        },
        kpis,
        weekdayAnalysis: weekdaySales,
        performanceSummary: aiAnalysis.performanceSummary,
        salesPaceAnalysis: aiAnalysis.salesPaceAnalysis,
        performanceTrend: aiAnalysis.performanceTrend,
    };
  }
);
