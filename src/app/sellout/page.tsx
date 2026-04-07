// src/app/sellout/page.tsx
'use client';

import React, { useMemo, useState, Suspense, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader, PageHeaderTitle, PageHeaderDescription } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Loader2, UploadCloud, Calendar, Package, Lightbulb, FileDown, BarChart, BrainCircuit, Filter, ArrowUpNarrowWide, ArrowDownWideNarrow, History, Trash2, FileClock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parse, getYear, getMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { analyzeSellOut } from '@/ai/flows/sellout-flow';
import type { ProductStats, YearlyClientReport, SellOutEntry, SellOutAnalysisInput } from '@/types';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Bar,
  CartesianGrid,
  LabelList,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MainLayout } from '@/components/main-layout';


const formatCurrency = (value: number | null, context?: string) => {
  if (value === null || value === undefined) return '-';
   if (value === 0 && context === 'product') return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const parseExcelSerialDate = (serial: number): Date => {
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    const fractionalDay = serial - Math.floor(serial) + 0.0000001;
    const totalSeconds = Math.floor(86400 * fractionalDay);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);
    return new Date(
        dateInfo.getUTCFullYear(),
        dateInfo.getUTCMonth(),
        dateInfo.getUTCDate(),
        hours,
        minutes,
        seconds
    );
};

type ReportHistoryItem = {
    name: string;
    timestamp: number;
    data: SellOutEntry[];
    headers: string[];
};

const PageSkeleton = () => (
    <div className="space-y-8">
        <PageHeader>
            <PageHeaderTitle>Relatório de Sell Out</PageHeaderTitle>
            <PageHeaderDescription>Faça o upload de um arquivo .xlsx para processar e visualizar o relatório de vendas.</PageHeaderDescription>
        </PageHeader>
        <Card>
            <CardHeader>
                <div className="h-8 w-64 bg-muted rounded-md animate-pulse" />
            </CardHeader>
            <CardContent>
                 <div className="h-96 bg-muted rounded-md animate-pulse flex items-center justify-center">
                    <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                 </div>
            </CardContent>
        </Card>
    </div>
);

// --- Flexible Column Mapping Logic ---
const normalizeHeader = (header: string) => {
    if (typeof header !== 'string') return '';
    return header.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

const MAP_CONFIG: Record<string, string[]> = {
    date: ['emissao', 'data', 'data da venda', 'dt', 'date'],
    client: ['cliente', 'nome do cliente', 'client', 'rede'],
    productCode: ['código', 'cod. produto', 'cod produto', 'codigo produto', 'cod.', 'sku', 'codigo'],
    description: ['descrição', 'descricao', 'produto', 'description'],
    quantity: ['qtde', 'qtd', 'quantidade', 'quant', 'qty'],
    unitPrice: ['valor unit', 'valor unit.', 'valor unitario', 'vl unit', 'vl. unit.', 'unit price'],
};


const findColumnName = (headers: string[], possibleNames: string[]): string | undefined => {
    const normalizedHeaders = headers.map(normalizeHeader);
    for (const name of possibleNames) {
        const normalizedName = normalizeHeader(name);
        const index = normalizedHeaders.indexOf(normalizedName);
        if (index !== -1) {
            return headers[index]; // Return original header name
        }
    }
    return undefined;
};

function mapColumns(headers: string[]): { mapping: Record<string, string | undefined>, error: string | null } {
    const mapping: Record<string, string | undefined> = {};
    let missing: string[] = [];

    const requiredKeys = ['date', 'client', 'quantity', 'unitPrice', 'productCode'];

    Object.entries(MAP_CONFIG).forEach(([key, possibleNames]) => {
        const foundName = findColumnName(headers, possibleNames);
        if (foundName) {
            mapping[key] = foundName;
        } else {
             if(requiredKeys.includes(key)){
                missing.push(key);
            }
        }
    });

    if (missing.length > 0) {
        return {
            mapping: {},
            error: `Não foi possível encontrar colunas essenciais para: ${missing.join(', ')}. As colunas precisam ter nomes similares a (Data, Cliente, Qtd, Valor Unitário, Código). Colunas encontradas no arquivo: ${headers.join(', ')}`
        };
    }
    return { mapping, error: null };
}
// --- End of Column Mapping Logic ---


function SellOutContent() {
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();
    const [fileName, setFileName] = useState<string | null>(null);
    const [clientReportData, setClientReportData] = useState<YearlyClientReport[] | null>(null);
    const [productReportData, setProductReportData] = useState<ProductStats[] | null>(null);
    const [processingError, setProcessingError] = useState<string | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const chartQtyRef = useRef<HTMLDivElement>(null);
    const chartValueRef = useRef<HTMLDivElement>(null);

    const [allYears, setAllYears] = useState<number[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const [quantitySortOrder, setQuantitySortOrder] = useState<'asc' | 'desc'>('desc');
    const [valueSortOrder, setValueSortOrder] = useState<'asc' | 'desc'>('desc');
    
    // States for history
    const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>([]);

    useEffect(() => {
        try {
            const savedHistoryString = localStorage.getItem('sellOutHistory');
            if (savedHistoryString) {
                const history = JSON.parse(savedHistoryString);
                setReportHistory(history);
            }
        } catch (error) {
            console.error("Failed to read from localStorage", error);
        }
    }, []);

    const processSellOutData = useCallback((data: SellOutEntry[], mapping: Record<string, string | undefined>) => {
        const years = new Set<number>();
        
        // --- Process Client x Month/Year Report ---
        if (mapping.date && mapping.client && mapping.quantity && mapping.unitPrice) {
            const clientSalesMap = new Map<string, Map<number, Map<number, number>>>();
            data.forEach(row => {
                const dateValue = row[mapping.date!];
                const clientValue = row[mapping.client!];
                const qtyValue = Number(String(row[mapping.quantity!]).replace(',', '.'));
                const priceValue = Number(String(row[mapping.unitPrice!]).replace(',', '.'));

                if (!dateValue || !clientValue || isNaN(qtyValue) || isNaN(priceValue)) return;

                try {
                    const saleDate = typeof dateValue === 'number'
                        ? parseExcelSerialDate(dateValue)
                        : parse(String(dateValue), 'dd/MM/yyyy', new Date());

                    if (isNaN(saleDate.getTime())) return;

                    const year = getYear(saleDate);
                    years.add(year);
                    const monthIndex = getMonth(saleDate);
                    if (!clientSalesMap.has(clientValue)) clientSalesMap.set(clientValue, new Map());
                    const yearMap = clientSalesMap.get(clientValue)!;
                    if (!yearMap.has(year)) yearMap.set(year, new Map());
                    const monthMap = yearMap.get(year)!;
                    const saleValue = qtyValue * priceValue;
                    monthMap.set(monthIndex, (monthMap.get(monthIndex) || 0) + saleValue);
                } catch(e) {
                    console.warn(`Could not parse date for client report row:`, row, e);
                }
            });
            
            const finalClientReport: YearlyClientReport[] = [];
            for (const [clientName, yearMap] of clientSalesMap.entries()) {
                const sortedYears = Array.from(yearMap.keys()).sort();
                const yearlyData: YearlyClientReport['yearlyData'] = [];
                for (const year of sortedYears) {
                    const monthMap = yearMap.get(year)!;
                    const monthlySales: (number | null)[] = Array(12).fill(null);
                    let total = 0;
                    for (const [monthIndex, salesValue] of monthMap.entries()) {
                        monthlySales[monthIndex] = salesValue;
                        total += salesValue;
                    }
                    yearlyData.push({ year, monthlySales, total });
                }
                finalClientReport.push({ clientName, yearlyData });
            }
            setClientReportData(finalClientReport.sort((a, b) => a.clientName.localeCompare(b.clientName)));
        } else {
             setProcessingError("As colunas essenciais (Data, Cliente, Qtd, Valor Unit.) não foram encontradas para gerar o relatório Cliente x Mês.");
        }

        // --- Process Product Stats Report ---
        if(mapping.date && mapping.productCode && mapping.quantity && mapping.unitPrice){
            const productSalesMap = new Map<string, { year: number; prices: number[]; totalQuantity: number; description: string }>();

            data.forEach(row => {
                const dateValue = row[mapping.date!];
                const productCodeValue = row[mapping.productCode!];
                const qtyValue = Number(String(row[mapping.quantity!]).replace(',', '.'));
                const priceValue = Number(String(row[mapping.unitPrice!]).replace(',', '.'));
                const descriptionValue = mapping.description ? row[mapping.description!] : productCodeValue;


                if (!dateValue || !productCodeValue || isNaN(qtyValue) || isNaN(priceValue) || priceValue <= 0) return;

                 try {
                    const saleDate = typeof dateValue === 'number'
                        ? parseExcelSerialDate(dateValue)
                        : parse(String(dateValue), 'dd/MM/yyyy', new Date());

                    if (isNaN(saleDate.getTime())) return;
                    const year = getYear(saleDate);
                    const key = `${productCodeValue}_${year}`;

                    if(!productSalesMap.has(key)){
                        productSalesMap.set(key, { year, prices: [], totalQuantity: 0, description: descriptionValue });
                    }
                    const stats = productSalesMap.get(key)!;
                    stats.prices.push(priceValue);
                    stats.totalQuantity += qtyValue;
                 } catch(e) {
                     console.warn(`Could not parse date for product report row:`, row, e);
                 }
            });

            const finalProductReport: ProductStats[] = [];
            for (const [key, stats] of productSalesMap.entries()) {
                const [productCode, yearStr] = key.split('_');
                const year = parseInt(yearStr);
                const minPrice = Math.min(...stats.prices);
                const maxPrice = Math.max(...stats.prices);
                const avgPrice = stats.prices.reduce((sum, p) => sum + p, 0) / stats.prices.length;

                finalProductReport.push({
                    year,
                    productCode,
                    description: stats.description,
                    totalQuantity: stats.totalQuantity,
                    minPrice,
                    avgPrice,
                    maxPrice,
                    sharePercentage: 0, // Placeholder, calculated in useMemo
                });
            }
             setProductReportData(finalProductReport.sort((a,b) => b.year - a.year || a.productCode.localeCompare(b.productCode)));

        } else {
            setProcessingError(prev => prev ? `${prev}\nAs colunas essenciais (Data, Código, Qtd, Valor Unit.) não foram encontradas para gerar o relatório de produtos.` : "As colunas essenciais (Data, Código, Qtd, Valor Unit.) não foram encontradas para gerar o relatório de produtos.");
        }

        setAllYears(Array.from(years).sort((a, b) => b - a));
    }, []);

    const filteredClientReportData = useMemo(() => {
        if (!clientReportData) return null;

        const dataForYear = selectedYear === 'all'
            ? clientReportData
            : clientReportData.map(client => ({
                ...client,
                yearlyData: client.yearlyData.filter(yearData => yearData.year === parseInt(selectedYear, 10))
              })).filter(client => client.yearlyData.length > 0);

        return dataForYear.map(client => ({
            ...client,
            yearlyData: client.yearlyData.map(yearData => ({
                ...yearData,
                total: yearData.monthlySales.reduce((sum: number, current) => sum + (current || 0), 0)
            }))
        }));

    }, [clientReportData, selectedYear]);

    const filteredProductReportData = useMemo(() => {
        if (!productReportData) return null;

        const dataForYear = selectedYear === 'all'
          ? productReportData
          : productReportData.filter(p => p.year === parseInt(selectedYear, 10));

        if (dataForYear.length === 0) return [];
        
        const totalQuantityForPeriod = dataForYear.reduce((sum, p) => sum + p.totalQuantity, 0);

        return dataForYear.map(p => ({
            ...p,
            sharePercentage: totalQuantityForPeriod > 0 ? (p.totalQuantity / totalQuantityForPeriod) * 100 : 0
        })).sort((a,b) => b.totalQuantity - a.totalQuantity);

    }, [productReportData, selectedYear]);


    const topProductsByQuantity = useMemo(() => {
        if (!filteredProductReportData) return [];
        return [...filteredProductReportData]
            .sort((a, b) => quantitySortOrder === 'desc' ? b.totalQuantity - a.totalQuantity : a.totalQuantity - b.totalQuantity)
            .slice(0, 10);
    }, [filteredProductReportData, quantitySortOrder]);

    const topProductsByValue = useMemo(() => {
        if (!filteredProductReportData) return [];
        return [...filteredProductReportData]
            .map(p => ({ ...p, totalValue: p.totalQuantity * p.avgPrice }))
            .sort((a, b) => valueSortOrder === 'desc' ? b.totalValue - a.totalValue : a.totalValue - b.totalValue)
            .slice(0, 10);
    }, [filteredProductReportData, valueSortOrder]);

    const saveToHistory = (newItem: ReportHistoryItem) => {
        setReportHistory(prevHistory => {
            const newHistory = [newItem, ...prevHistory.filter(item => item.name !== newItem.name)].slice(0, 10); // Keep max 10 items
            localStorage.setItem('sellOutHistory', JSON.stringify(newHistory));
            return newHistory;
        });
    };

    const removeFromHistory = (timestamp: number) => {
        setReportHistory(prevHistory => {
            const newHistory = prevHistory.filter(item => item.timestamp !== timestamp);
            localStorage.setItem('sellOutHistory', JSON.stringify(newHistory));
            toast({ title: "Relatório removido do histórico." });
            return newHistory;
        });
    };

     const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFileName(file.name);
        } else {
            setFileName(null);
        }
    };
    
    const handleFileUpload = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const fileInput = (event.currentTarget.elements.namedItem('file-upload') as HTMLInputElement);
        const file = fileInput.files?.[0];

        if (!file) {
            toast({
                variant: 'destructive',
                title: "Nenhum arquivo selecionado",
                description: "Por favor, escolha um arquivo .xlsx para continuar."
            });
            return;
        }

        setIsProcessing(true);
        setProcessingError(null);
        setClientReportData(null);
        setProductReportData(null);
        setAiAnalysis(null);
        setFileName(file.name);
        
        try {
            const XLSX = await import('xlsx');
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { cellDates: false, dateNF: 'dd/mm/yyyy' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const headers: string[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];
            const json: SellOutEntry[] = XLSX.utils.sheet_to_json(worksheet);

            const { mapping, error: mappingError } = mapColumns(headers);

            if (mappingError) {
                setProcessingError(mappingError);
                toast({
                    variant: 'destructive',
                    title: "Erro de Mapeamento de Colunas",
                    description: mappingError,
                    duration: 10000,
                });
                setIsProcessing(false);
                return;
            }
            
            processSellOutData(json, mapping);
            
            saveToHistory({
                name: file.name,
                timestamp: Date.now(),
                data: json,
                headers: headers,
            });

            toast({
                title: "Arquivo processado com sucesso!",
                description: `Exibindo o relatório de ${file.name}.`
            });

        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: "Erro ao processar o arquivo",
                description: error.message || "Verifique se o formato do arquivo está correto."
            });
            setProcessingError(error.message || "Verifique se o formato do arquivo está correto.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReloadFromHistory = (item: ReportHistoryItem) => {
        setIsProcessing(true);
        setProcessingError(null);
        setClientReportData(null);
        setProductReportData(null);
        setAiAnalysis(null);
        setFileName(item.name);
        
        setTimeout(() => { // Simulate processing for user feedback
            try {
                const { mapping, error: mappingError } = mapColumns(item.headers);
                if (mappingError) {
                    throw new Error(mappingError);
                }
                processSellOutData(item.data, mapping);
                 toast({
                    title: "Relatório recarregado!",
                    description: `Exibindo dados de ${item.name}.`
                });
            } catch (error: any) {
                setProcessingError(error.message);
                toast({
                    variant: 'destructive',
                    title: "Erro ao recarregar dados",
                    description: error.message,
                });
            } finally {
                setIsProcessing(false);
            }
        }, 500);
    };

    const handleAiAnalysis = useCallback(async () => {
        if (!filteredProductReportData || filteredProductReportData.length === 0) {
            toast({
                variant: "destructive",
                title: "Sem dados para analisar",
                description: "Filtre ou processe um arquivo com dados de produtos primeiro.",
            });
            return;
        }
        setIsAnalyzing(true);
        setAiAnalysis(null);
        try {
            const analysisInput: SellOutAnalysisInput = {
                productStats: filteredProductReportData,
                year: selectedYear,
            };
            const result = await analyzeSellOut(analysisInput);
            setAiAnalysis(result.analysis);
        } catch (e: any) {
            toast({
                variant: "destructive",
                title: "Erro na Análise de IA",
                description: e.message || "Ocorreu um erro ao gerar a análise.",
            });
        } finally {
            setIsAnalyzing(false);
        }
    }, [filteredProductReportData, selectedYear, toast]);

    const exportToExcel = () => {
        const run = async () => {
        if (!clientReportData || !productReportData) {
            toast({ variant: "destructive", title: "Sem dados para exportar" });
            return;
        }
        const XLSX = await import('xlsx');
    
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([[]]); // Start with an empty sheet
    
        XLSX.utils.sheet_add_aoa(ws, [['Relatório Cliente x Mês']], { origin: 'A1' });
    
        let lastRow = 2; // Start after title
        filteredClientReportData?.forEach(client => {
            XLSX.utils.sheet_add_aoa(ws, [[`Cliente: ${client.clientName}`]], { origin: `A${lastRow}` });
            lastRow++;
            const yearData = client.yearlyData.map(y => ({
                'Ano': y.year,
                'Jan': y.monthlySales[0] ?? 0, 'Fev': y.monthlySales[1] ?? 0,
                'Mar': y.monthlySales[2] ?? 0, 'Abr': y.monthlySales[3] ?? 0,
                'Mai': y.monthlySales[4] ?? 0, 'Jun': y.monthlySales[5] ?? 0,
                'Jul': y.monthlySales[6] ?? 0, 'Ago': y.monthlySales[7] ?? 0,
                'Set': y.monthlySales[8] ?? 0, 'Out': y.monthlySales[9] ?? 0,
                'Nov': y.monthlySales[10] ?? 0,'Dez': y.monthlySales[11] ?? 0,
                'Total': y.total,
            }));
             XLSX.utils.sheet_add_json(ws, yearData, { origin: `A${lastRow}`, skipHeader: false });
             lastRow += yearData.length + 2; // +2 for header and space
        });
    
        const productTableStartRow = lastRow; 
    
        XLSX.utils.sheet_add_aoa(ws, [['Análise de Produtos']], { origin: `A${productTableStartRow}` });
    
        const productDataForSheet = filteredProductReportData?.map(p => ({
            'Ano': p.year,
            'Código': p.productCode,
            'Descrição': p.description,
            'Qtd. Total': p.totalQuantity,
            '% Part.': p.sharePercentage,
            'Vlr. Mínimo': p.minPrice,
            'Vlr. Médio': p.avgPrice,
            'Vlr. Máximo': p.maxPrice,
        })) || [];
        XLSX.utils.sheet_add_json(ws, productDataForSheet, { origin: `A${productTableStartRow + 1}`, skipHeader: false });
    
        XLSX.utils.book_append_sheet(wb, ws, "Relatório Sell Out");
        const today = format(new Date(), 'yyyy-MM-dd');
        XLSX.writeFile(wb, `Relatorio_SellOut_${today}.xlsx`);
        toast({ title: "Exportado para Excel com sucesso!" });
        };

        run().catch((error: any) => {
            toast({
                variant: "destructive",
                title: "Erro ao exportar Excel",
                description: error?.message || "Não foi possível gerar o arquivo Excel.",
            });
        });
    };

    const exportToPdf = async () => {
        if (!clientReportData || !productReportData) {
            toast({ variant: "destructive", title: "Sem dados para exportar" });
            return;
        }
    
        const { default: html2canvas } = await import('html2canvas');
        const [{ default: JsPdfCtor }] = await Promise.all([
            import('jspdf'),
            import('jspdf-autotable'),
        ]);
    
        const doc = new JsPdfCtor({ orientation: 'landscape' });
    
        const addPageHeader = (title: string, docInstance: any) => {
            docInstance.setFontSize(18);
            docInstance.text(title, 14, 20);
            docInstance.setFontSize(10);
            const subTitle = `Relatório de: ${fileName || 'dados importados'} | Ano: ${selectedYear === 'all' ? 'Todos' : selectedYear}`;
            docInstance.text(subTitle, 14, 26);
        };
    
        // --- Page 1: Charts ---
        addPageHeader('Business Intelligence - Resumo Gráfico', doc);
    
        const addChartToPdf = async (element: HTMLElement | null, docInstance: any, x: number, y: number, width: number, height: number, title: string) => {
            if (element) {
                // Temporarily add a class to show labels for PDF rendering
                element.classList.add('render-for-pdf');
                
                docInstance.setFontSize(12);
                docInstance.text(title, x, y - 5);
                
                const canvas = await html2canvas(element, { 
                    backgroundColor: null,
                    scale: 2 // Increase scale for better resolution
                });
                
                // Remove the class after rendering
                element.classList.remove('render-for-pdf');

                const imgData = canvas.toDataURL('image/png');
                docInstance.addImage(imgData, 'PNG', x, y, width, height);
            }
        };
    
        const page_width = doc.internal.pageSize.getWidth();
        const margin = 14;
        const chart_width = (page_width - margin * 3) / 2;
        const chart_height = 80;
    
        await addChartToPdf(chartQtyRef.current, doc, margin, 40, chart_width, chart_height, 'Top 10 Produtos por Quantidade');
        await addChartToPdf(chartValueRef.current, doc, margin + chart_width + margin, 40, chart_width, chart_height, 'Top 10 Produtos por Valor Total');
    
        // --- Subsequent Pages: Client and Product Reports ---
        doc.addPage('landscape');
        addPageHeader('Relatório Detalhado: Cliente x Ano/Mês', doc);
        let finalY = 30;
    
        filteredClientReportData?.forEach((client) => {
            const clientHead = [['Ano', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez', 'Total']];
            const clientBody = client.yearlyData.map(yearData => [
                yearData.year,
                ...yearData.monthlySales.map(sale => formatCurrency(sale)),
                formatCurrency(yearData.total)
            ]);

            const tableHeight = (client.yearlyData.length + 1) * 10;
            if (finalY + tableHeight > doc.internal.pageSize.getHeight() - 20) { // Check if space is enough
                doc.addPage('landscape');
                addPageHeader('Relatório Detalhado: Cliente x Ano/Mês (continuação)', doc);
                finalY = 30;
            }

            doc.setFontSize(12);
            doc.text(`Relatório para: ${client.clientName}`, margin, finalY);
            finalY += 7;

            const columnStyles: { [key: number]: { cellWidth: number | 'auto' } } = {
                 0: { cellWidth: 18 }, // Year
                 13: { cellWidth: 23 }, // Total
            };
             for(let i=1; i<=12; i++){
                columnStyles[i] = { cellWidth: 'auto' };
            }

            (doc as any).autoTable({
                startY: finalY,
                head: clientHead,
                body: clientBody,
                theme: 'striped',
                headStyles: { fillColor: [41, 128, 185] },
                margin: { left: margin, right: margin },
                columnStyles: columnStyles,
                tableWidth: 'auto'
            });
            finalY = (doc as any).lastAutoTable.finalY + 15;
        });

        // --- Product Report Page ---
        doc.addPage('landscape');
        addPageHeader('Relatório Detalhado: Análise de Produtos', doc);
        const productHead = [['Ano', 'Código', 'Descrição', 'Qtd. Total', '% Part.', 'Vlr. Mínimo', 'Vlr. Médio', 'Vlr. Máximo']];
        const productBody = filteredProductReportData?.map(p => [
            p.year,
            p.productCode,
            p.description,
            p.totalQuantity,
            p.sharePercentage.toFixed(2) + '%',
            formatCurrency(p.minPrice, 'product'),
            formatCurrency(p.avgPrice, 'product'),
            formatCurrency(p.maxPrice, 'product')
        ]) || [];
    
        (doc as any).autoTable({
            startY: 30,
            head: productHead,
            body: productBody,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] }
        });
    
        const today = format(new Date(), 'yyyy-MM-dd');
        doc.save(`Relatorio_SellOut_${today}.pdf`);
        toast({ title: "Exportado para PDF com sucesso!" });
    };


    const monthHeaders = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    return (
        <div className="space-y-8">
            <style>
                {`
                    .render-for-pdf .pdf-value-label {
                        display: block !important;
                    }
                `}
            </style>
            <PageHeader>
                <PageHeaderTitle>Relatório de Sell Out</PageHeaderTitle>
                <PageHeaderDescription>Faça o upload de um arquivo .xlsx para processar e visualizar os relatórios de vendas.</PageHeaderDescription>
            </PageHeader>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><UploadCloud /> Carregar Dados</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <form onSubmit={handleFileUpload} className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center">
                            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center gap-4">
                                <p className="text-lg font-semibold text-muted-foreground">
                                    {fileName ? `Arquivo: ${fileName}` : 'Clique para selecionar'}
                                </p>
                                <p className="text-xs text-muted-foreground/80">
                                    Apenas arquivos .xlsx. O relatório será salvo no histórico.
                                </p>
                            </label>
                            <input 
                                id="file-upload" 
                                name="file-upload"
                                type="file" 
                                className="sr-only" 
                                accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                                onChange={handleFileChange}
                                disabled={isProcessing}
                            />
                            <Button type="submit" className="mt-4" disabled={isProcessing || !fileName}>
                                {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isProcessing ? 'Processando...' : 'Processar Arquivo'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><History /> Histórico de Relatórios</CardTitle>
                        <CardDescription>Carregue rapidamente um relatório processado anteriormente.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {reportHistory.length > 0 ? (
                             <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                                {reportHistory.map(item => (
                                    <div key={item.timestamp} className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50 hover:bg-muted">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <FileClock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-medium truncate" title={item.name}>{item.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Carregado em: {format(new Date(item.timestamp), 'dd/MM/yy HH:mm')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button size="sm" onClick={() => handleReloadFromHistory(item)} disabled={isProcessing}>
                                                Carregar
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeFromHistory(item.timestamp)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <div className="text-center py-10 text-muted-foreground">
                                <p>Nenhum relatório no histórico.</p>
                                <p className="text-sm">Os arquivos que você processar aparecerão aqui.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {processingError && (
                 <Alert variant="destructive">
                    <Lightbulb className="h-4 w-4" />
                    <AlertTitle>Erro no Processamento</AlertTitle>
                    <AlertDescription>
                        {processingError}
                    </AlertDescription>
                 </Alert>
            )}

            {filteredClientReportData && filteredClientReportData.length > 0 && (
                <>
                <Card>
                    <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                             <CardTitle className="flex items-center gap-2">
                                <Filter /> Filtros e Ações
                            </CardTitle>
                             <CardDescription>
                                Filtre por ano para analisar um período específico ou exporte os relatórios completos.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Select value={selectedYear} onValueChange={setSelectedYear} disabled={allYears.length === 0}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Filtrar por ano..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Anos</SelectItem>
                                    {allYears.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Button className="w-full sm:w-auto" variant="outline" onClick={exportToExcel}><FileDown className="mr-2 h-4 w-4" /> Excel</Button>
                            <Button className="w-full sm:w-auto" variant="outline" onClick={exportToPdf}><FileDown className="mr-2 h-4 w-4" /> PDF</Button>
                        </div>
                    </CardHeader>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart /> Business Intelligence
                        </CardTitle>
                        <CardDescription>
                            Insights visuais sobre os dados do período selecionado.
                        </CardDescription>
                    </CardHeader>
                     <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div ref={chartQtyRef}>
                             <div className="flex items-center justify-center mb-4">
                                <h3 className="font-semibold text-center">Top 10 Produtos por Quantidade</h3>
                                <Button variant="ghost" size="icon" onClick={() => setQuantitySortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}>
                                    {quantitySortOrder === 'desc' ? <ArrowDownWideNarrow className="h-4 w-4"/> : <ArrowUpNarrowWide className="h-4 w-4" />}
                                </Button>
                            </div>
                            <div>
                                <ChartContainer config={{}} className="h-[400px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsBarChart data={topProductsByQuantity} layout="vertical" margin={{ right: 30, left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" />
                                            <YAxis dataKey="description" type="category" hide />
                                            <RechartsTooltip
                                                cursor={{ fill: 'hsl(var(--muted))' }}
                                                content={<ChartTooltipContent formatter={(value, name) => <span>{`${name}: ${value}`}</span>} />}
                                            />
                                            <Bar dataKey="totalQuantity" name="Quantidade" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                                                <LabelList dataKey="description" position="insideLeft" offset={8} className="fill-background" fontSize={12} />
                                                <LabelList 
                                                    dataKey="totalQuantity" 
                                                    position="right" 
                                                    className="fill-foreground font-semibold text-xs hidden pdf-value-label"
                                                />
                                            </Bar>
                                        </RechartsBarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </div>
                        </div>
                        <div ref={chartValueRef}>
                            <div className="flex items-center justify-center mb-4">
                                <h3 className="font-semibold text-center">Top 10 Produtos por Valor Total</h3>
                                <Button variant="ghost" size="icon" onClick={() => setValueSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}>
                                    {valueSortOrder === 'desc' ? <ArrowDownWideNarrow className="h-4 w-4"/> : <ArrowUpNarrowWide className="h-4 w-4" />}
                                </Button>
                            </div>
                             <div>
                                <ChartContainer config={{}} className="h-[400px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsBarChart data={topProductsByValue} layout="vertical" margin={{ right: 30, left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" tickFormatter={(value) => formatCurrency(value as number, 'chart')} />
                                            <YAxis dataKey="description" type="category" hide />
                                            <RechartsTooltip
                                                cursor={{ fill: 'hsl(var(--muted))' }}
                                                content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />}
                                            />
                                            <Bar dataKey="totalValue" name="Valor Total" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]}>
                                                <LabelList dataKey="description" position="insideLeft" offset={8} className="fill-background" fontSize={12} />
                                                <LabelList 
                                                    dataKey="totalValue" 
                                                    position="right" 
                                                    className="fill-foreground font-semibold text-xs hidden pdf-value-label"
                                                    formatter={(value: number) => formatCurrency(value)}
                                                />
                                            </Bar>
                                        </RechartsBarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </div>
                        </div>
                        <div className="lg:col-span-2">
                             <h3 className="font-semibold text-center mb-4">Análise da IA</h3>
                             <div className="flex justify-center mb-4">
                                <Button onClick={handleAiAnalysis} disabled={isAnalyzing}>
                                    {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Gerar Análise dos Produtos
                                </Button>
                             </div>
                             {aiAnalysis && (
                                <Alert>
                                    <Lightbulb className="h-4 w-4" />
                                    <AlertTitle>Resumo da Análise</AlertTitle>
                                    <AlertDescription className="whitespace-pre-wrap text-sm">
                                        {aiAnalysis}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                     </CardContent>
                 </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar /> Relatório Detalhado: Cliente x Ano/Mês
                        </CardTitle>
                        <CardDescription>
                            Total de vendas faturado para cada cliente, agrupado por ano.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="sticky left-0 bg-card z-10 font-semibold whitespace-nowrap">Cliente</TableHead>
                                    <TableHead>Ano</TableHead>
                                    {monthHeaders.map(month => (
                                        <TableHead key={month} className="text-right whitespace-nowrap">{month}</TableHead>
                                    ))}
                                    <TableHead className="text-right font-bold whitespace-nowrap">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredClientReportData.map((clientReport) => (
                                    <React.Fragment key={clientReport.clientName}>
                                        {clientReport.yearlyData.map((yearData, yearIndex) => (
                                            <TableRow key={`${clientReport.clientName}-${yearData.year}`} className="hover:bg-muted/50">
                                                {yearIndex === 0 && (
                                                     <TableCell 
                                                        rowSpan={clientReport.yearlyData.length} 
                                                        className="font-medium whitespace-nowrap sticky left-0 bg-card z-10 align-top pt-4 border-b max-w-[200px] truncate"
                                                    >
                                                        <TooltipProvider>
                                                          <Tooltip>
                                                            <TooltipTrigger asChild>
                                                              <span>{clientReport.clientName}</span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                              <p>{clientReport.clientName}</p>
                                                            </TooltipContent>
                                                          </Tooltip>
                                                        </TooltipProvider>
                                                    </TableCell>
                                                )}
                                                <TableCell>{yearData.year}</TableCell>
                                                {yearData.monthlySales.map((sale, monthIndex) => (
                                                    <TableCell key={monthIndex} className="text-right font-mono">
                                                        {formatCurrency(sale)}
                                                    </TableCell>
                                                ))}
                                                <TableCell className="text-right font-mono font-bold">{formatCurrency(yearData.total)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package /> Relatório Detalhado: Análise de Produtos
                        </CardTitle>
                        <CardDescription>
                            Estatísticas de venda para cada produto, agrupado por ano e ordenado por quantidade.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ano</TableHead>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Descrição</TableHead>
                                    <TableHead className="text-center">Qtd. Total</TableHead>
                                    <TableHead className="text-center">% Participação</TableHead>
                                    <TableHead className="text-right">Vlr. Mínimo</TableHead>
                                    <TableHead className="text-right">Vlr. Médio</TableHead>
                                    <TableHead className="text-right">Vlr. Máximo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProductReportData?.map((product) => (
                                    <TableRow key={`${product.productCode}-${product.year}`} className="hover:bg-muted/50">
                                        <TableCell className="font-semibold">{product.year}</TableCell>
                                        <TableCell>{product.productCode}</TableCell>
                                        <TableCell className="max-w-[250px] truncate">
                                           <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <span>{product.description}</span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                  <p>{product.description}</p>
                                                </TooltipContent>
                                              </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>
                                        <TableCell className="text-center font-medium">{product.totalQuantity}</TableCell>
                                        <TableCell className="text-center font-mono">{product.sharePercentage.toFixed(2)}%</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(product.minPrice, 'product')}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(product.avgPrice, 'product')}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(product.maxPrice, 'product')}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                </>
            )}

             {clientReportData && clientReportData.length === 0 && !isProcessing && !processingError && (
                 <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        <p>O arquivo foi processado, mas não foram encontrados dados válidos para gerar os relatórios.</p>
                        <p className="text-sm">Verifique se as colunas essenciais (com nomes parecidos com Data, Cliente, Código, Quantidade, Valor Unitário) existem e estão preenchidas corretamente.</p>
                    </CardContent>
                 </Card>
            )}

        </div>
    );
}

export default function SellOutPage() {
    return (
        <MainLayout>
          <Suspense fallback={<PageSkeleton />}>
              <SellOutContent />
          </Suspense>
        </MainLayout>
    );
}
