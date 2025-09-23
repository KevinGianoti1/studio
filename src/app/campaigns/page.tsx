// src/app/campaigns/page.tsx
'use client';

import { Suspense, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { SalesContext, SalesProvider } from '@/contexts/sales-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Tag, ArrowLeft, Users, Calendar, DollarSign, PlusCircle, Trash2, Edit, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Campaign } from '@/types';
import { deleteCampaign } from '@/ai/flows/campaigns-flow';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PageHeader, PageHeaderTitle, PageHeaderActions } from '@/components/page-header';
import { MainLayout } from '@/components/main-layout';

const CampaignFormSheet = dynamic(() => import('@/components/campaign-form-sheet').then(mod => mod.CampaignFormSheet), {
  loading: () => <p>Carregando formulário...</p>,
  ssr: false
});

type CampaignStats = {
  totalBilled: number;
  sellerCount: number;
  sellerRanking: { seller: string; billedInCampaign: number }[];
};

const generateAvatarUrl = (name: string) => {
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const color1 = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    const color2 = ((hash >> 8) & 0x00FFFFFF).toString(16).toUpperCase();
    return `https://placehold.co/100x100/${'000000'.substring(0, 6 - color1.length)}${color1}/${'FFFFFF'.substring(0, 6 - color2.length)}${color2}.png?text=${name.charAt(0)}`;
};

const formatCurrency = (value: number) => {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (date: Date) => {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('pt-BR').format(date);
};

function CampaignsContent() {
  const { sales, campaigns, isLoading: isContextLoading, error: contextError, loadData: loadContextData } = useContext(SalesContext);
  const { toast } = useToast();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const loadCampaigns = useCallback(async () => {
    // Campaigns are now loaded from the context, so we just trigger a refresh
    await loadContextData();
  }, [loadContextData]);

  const handleAddCampaign = useCallback(() => {
    setEditingCampaign(null);
    setIsSheetOpen(true);
  }, []);

  const handleEditCampaign = useCallback((campaign: Campaign) => {
    setEditingCampaign(campaign);
    setIsSheetOpen(true);
  }, []);
  
  const handleDeleteCampaign = useCallback(async (campaign: Campaign) => {
      try {
        const result = await deleteCampaign({ rowId: campaign.rowId });
        if(result.success) {
            toast({ title: "Sucesso!", description: "Campanha excluída." });
            await loadCampaigns();
        } else {
            toast({ variant: "destructive", title: "Erro!", description: result.error });
        }
      } catch (err: any) {
          toast({ variant: "destructive", title: "Erro de Conexão", description: err.message });
      }
  }, [toast, loadCampaigns]);

  const campaignStats = useMemo((): Map<number, CampaignStats> => {
    if (isContextLoading || sales.length === 0 || campaigns.length === 0) return new Map();
    
    const statsMap = new Map<number, CampaignStats>();

    campaigns.forEach(campaign => {
      const salesInCampaignPeriod = sales.filter(sale => 
        sale.createdAt >= campaign.startDate && sale.createdAt <= campaign.endDate
      );

      const sellersInCampaign = [...new Set(salesInCampaignPeriod.map(s => s.seller))];
      const sellerRanking: { seller: string; billedInCampaign: number }[] = [];

      sellersInCampaign.forEach(seller => {
        // Find the sales for the specific seller within the campaign period, and also before it.
        const sellerSalesInCampaign = salesInCampaignPeriod.filter(s => s.seller === seller);
        const sellerSalesBeforeCampaign = sales.filter(s => s.seller === seller && s.createdAt < campaign.startDate);

        // Sort to easily find the last sale
        sellerSalesInCampaign.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        sellerSalesBeforeCampaign.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        const lastSaleInCampaign = sellerSalesInCampaign[0];
        const lastSaleBeforeCampaign = sellerSalesBeforeCampaign[0];
        
        const endBilled = lastSaleInCampaign ? lastSaleInCampaign.billed : 0;
        const startBilled = lastSaleBeforeCampaign ? lastSaleBeforeCampaign.billed : 0;
        
        const billedInCampaign = endBilled - startBilled;
        
        if (billedInCampaign > 0) {
            sellerRanking.push({ seller, billedInCampaign });
        }
      });
      
      sellerRanking.sort((a,b) => b.billedInCampaign - a.billedInCampaign);
      const totalBilledInCampaign = sellerRanking.reduce((sum, current) => sum + current.billedInCampaign, 0);

      statsMap.set(campaign.rowId, {
        totalBilled: totalBilledInCampaign,
        sellerCount: sellersInCampaign.length,
        sellerRanking,
      });
    });

    return statsMap;

  }, [sales, campaigns, isContextLoading]);

  const isLoading = isContextLoading;
  const error = contextError;

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-8 text-center text-red-500">
        <Card className="p-8">
          <CardHeader>
            <CardTitle>Ocorreu um Erro</CardTitle>
            <CardDescription className="text-muted-foreground">
              Não foi possível carregar os dados. Verifique sua conexão e as variáveis de ambiente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-mono bg-muted p-4 rounded-md text-destructive-foreground">{error}</p>
            <Button asChild variant="link" className="mt-4">
              <Link href="/">Voltar para o Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <PageHeader>
        <PageHeaderTitle>Relatório de Campanhas</PageHeaderTitle>
        <PageHeaderActions>
            <Button onClick={handleAddCampaign}>
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Campanha
            </Button>
        </PageHeaderActions>
      </PageHeader>

       {isSheetOpen && (
        <CampaignFormSheet 
            open={isSheetOpen}
            onOpenChange={setIsSheetOpen}
            campaign={editingCampaign}
            onFormSubmit={loadCampaigns}
        />
       )}

      <div className="space-y-8">
            {isLoading ? (
            <div className="flex min-h-[60vh] items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-xl font-medium">Carregando e analisando campanhas...</p>
                </div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Performance por Campanha</CardTitle>
                <CardDescription>
                  Análise do faturamento gerado durante o período de cada campanha. Clique em uma campanha para ver o ranking de vendedores.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><Tag className="inline-block h-4 w-4 mr-2" />Campanha</TableHead>
                      <TableHead><DollarSign className="inline-block h-4 w-4 mr-2" />Faturamento Gerado</TableHead>
                      <TableHead><Users className="inline-block h-4 w-4 mr-2" />Vendedores</TableHead>
                      <TableHead><Calendar className="inline-block h-4 w-4 mr-2" />Período</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.length > 0 ? campaigns.map(campaign => (
                      <Dialog key={campaign.rowId}>
                        <DialogTrigger asChild>
                          <TableRow className="cursor-pointer hover:bg-muted/50">
                            <TableCell>
                                <div className="font-medium">{campaign.name}</div>
                                {campaign.description && <div className="text-xs text-muted-foreground">{campaign.description}</div>}
                            </TableCell>
                            <TableCell className="font-bold text-primary">{formatCurrency(campaignStats.get(campaign.rowId)?.totalBilled ?? 0)}</TableCell>
                            <TableCell>{campaignStats.get(campaign.rowId)?.sellerCount ?? 0}</TableCell>
                            <TableCell>{formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditCampaign(campaign); }}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog onOpenChange={(open) => open && editingCampaign && setEditingCampaign(null)}>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta ação não pode ser desfeita. Isso excluirá permanentemente a campanha <strong>{campaign.name}</strong> da sua planilha.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteCampaign(campaign)}>Excluir</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                          </TableRow>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                           <DialogHeader>
                                <DialogTitle>{campaign.name}</DialogTitle>
                                <DialogDescription>Ranking de performance dos vendedores nesta campanha.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                {campaignStats.get(campaign.rowId)?.sellerRanking.length ? (
                                    campaignStats.get(campaign.rowId)!.sellerRanking.map((ranking, index) => (
                                         <div key={ranking.seller} className="flex items-center gap-4">
                                            <div className="font-bold text-lg w-6 text-center text-muted-foreground">{index + 1}</div>
                                            <Avatar className="h-10 w-10">
                                            <AvatarImage src={generateAvatarUrl(ranking.seller)} data-ai-hint="abstract pattern" alt={ranking.seller} />
                                            <AvatarFallback>{ranking.seller.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm">{ranking.seller}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {index === 0 && <Crown className="h-5 w-5 text-yellow-500" />}
                                                <Badge variant="secondary" className="text-base font-bold">{formatCurrency(ranking.billedInCampaign)}</Badge>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum vendedor registrou vendas nesta campanha.</p>
                                )}
                            </div>
                        </DialogContent>
                      </Dialog>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24">
                                Nenhuma campanha encontrada. Adicione uma para começar.
                            </TableCell>
                        </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
      </div>
    </>
  );
}

export default function CampaignsPage() {
  return (
    <MainLayout>
      <SalesProvider>
        <Suspense fallback={
          <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-xl font-medium">Carregando...</p>
            </div>
          </div>
        }>
          <CampaignsContent />
        </Suspense>
      </SalesProvider>
    </MainLayout>
  );
}
