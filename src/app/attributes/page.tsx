// src/app/attributes/page.tsx
'use client';

import React, { Suspense, useContext, useMemo, useState, memo } from 'react';
import { MeetingsContext, MeetingsProvider, type UIMeeting } from '@/contexts/meetings-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, Radar, BookOpen, Search, Calendar, Lightbulb, GraduationCap } from 'lucide-react';
import { PageHeader, PageHeaderTitle, PageHeaderDescription } from '@/components/page-header';
import {
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RechartsRadar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsClient } from '@/hooks/use-is-client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { MainLayout } from '@/components/main-layout';

type SellerAttributeData = {
  seller: string;
  attributes: {
    subject: string;
    score: number;
    fullMark: number;
  }[];
  lastMeeting: UIMeeting | null;
};

const PageSkeleton = () => (
    <>
        <PageHeader>
            <PageHeaderTitle>Atributos de Performance</PageHeaderTitle>
            <PageHeaderDescription>
            Média das notas de cada vendedor nos 6 principais atributos de venda, com base nos formulários 1:1.
            </PageHeaderDescription>
        </PageHeader>
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <Card key={i} className="shadow-lg">
                        <CardHeader>
                            <Skeleton className="h-6 w-1/2" />
                            <Skeleton className="h-4 w-1/3" />
                        </CardHeader>
                        <CardContent>
                           <Skeleton className="aspect-square w-full max-h-[300px] rounded-full" />
                        </CardContent>
                        <CardFooter>
                            <Skeleton className="h-10 w-full" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    </>
);


const AttributesContent = memo(() => {
  const { meetings, isLoading, error } = useContext(MeetingsContext);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSellerData, setSelectedSellerData] = useState<SellerAttributeData | null>(null);

  const attributeAverages = useMemo((): SellerAttributeData[] => {
    if (!meetings || meetings.length === 0) return [];

    const sellers = [...new Set(meetings.map((m) => m.seller))];

    return sellers.map((seller) => {
      const sellerMeetings = meetings.filter((m) => m.seller === seller);
      const meetingCount = sellerMeetings.length;

      const lastMeeting = sellerMeetings.sort((a,b) => b.evaluationDate.getTime() - a.evaluationDate.getTime())[0] || null;

      const avgProspeccao = sellerMeetings.reduce((sum, m) => sum + m.prospeccao, 0) / meetingCount;
      const avgQualificacao = sellerMeetings.reduce((sum, m) => sum + m.qualificacao, 0) / meetingCount;
      const avgApresentacao = sellerMeetings.reduce((sum, m) => sum + m.apresentacao, 0) / meetingCount;
      const avgObjecoes = sellerMeetings.reduce((sum, m) => sum + m.objecoes, 0) / meetingCount;
      const avgFechamento = sellerMeetings.reduce((sum, m) => sum + m.fechamento, 0) / meetingCount;
      const avgFollowUp = sellerMeetings.reduce((sum, m) => sum + m.followUp, 0) / meetingCount;

      return {
        seller,
        attributes: [
          { subject: 'PRS', score: avgProspeccao, fullMark: 10 },
          { subject: 'QLF', score: avgQualificacao, fullMark: 10 },
          { subject: 'SOL', score: avgApresentacao, fullMark: 10 },
          { subject: 'OBJ', score: avgObjecoes, fullMark: 10 },
          { subject: 'CLT', score: avgFechamento, fullMark: 10 },
          { subject: 'FUP', score: avgFollowUp, fullMark: 10 },
        ],
        lastMeeting,
      };
    });
  }, [meetings]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-8 text-center text-red-500">
        <Card className="p-8">
          <CardHeader>
            <CardTitle>Ocorreu um Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-mono bg-muted p-4 rounded-md text-destructive-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <PageHeader>
        <PageHeaderTitle>Atributos de Performance</PageHeaderTitle>
        <PageHeaderDescription>
          Média das notas de cada vendedor nos 6 principais atributos de venda, com base nos formulários 1:1.
        </PageHeaderDescription>
      </PageHeader>
      
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        {meetings.length === 0 ? (
            <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                    <Radar className="mx-auto h-12 w-12 mb-4" />
                    <h3 className="text-xl font-semibold">Nenhum dado de reunião encontrado</h3>
                    <p>Preencha o formulário de Reunião 1:1 para começar a ver as análises de atributos aqui.</p>
                </CardContent>
            </Card>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {attributeAverages.map((data) => (
                <Card key={data.seller} className="shadow-lg flex flex-col">
                <CardHeader>
                    <CardTitle>{data.seller}</CardTitle>
                    <CardDescription>Média de Performance</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                    <ChartContainer config={{}} className="mx-auto aspect-square h-full w-full max-h-[300px]">
                    <RadarChart data={data.attributes}>
                        <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" formatter={(value) => `${(value as number).toFixed(2)}`} />}
                        />
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis angle={30} domain={[0, 10]} tickCount={6}/>
                        <RechartsRadar
                        name={data.seller}
                        dataKey="score"
                        fill="var(--color-chart-1)"
                        fillOpacity={0.6}
                        stroke="var(--color-chart-1)"
                        />
                    </RadarChart>
                    </ChartContainer>
                </CardContent>
                <CardFooter>
                    <DialogTrigger asChild>
                         <Button className="w-full" variant="outline" onClick={() => setSelectedSellerData(data)} disabled={!data.lastMeeting}>
                            <BookOpen className="mr-2 h-4 w-4" />
                            Ver Recomendações
                        </Button>
                    </DialogTrigger>
                </CardFooter>
                </Card>
            ))}
            </div>
        )}
         {selectedSellerData && selectedSellerData.lastMeeting && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Recomendações para {selectedSellerData.seller}</DialogTitle>
              <DialogDescription>
                Baseado na última reunião 1:1 em {format(selectedSellerData.lastMeeting.evaluationDate, 'dd/MM/yyyy')}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-6">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                        <Search className="h-5 w-5 text-primary" />
                        Gaps Identificados
                    </h3>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                        {selectedSellerData.lastMeeting.gapsIdentified || 'Nenhum gap identificado nesta reunião.'}
                    </p>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                        <GraduationCap className="h-5 w-5 text-primary" />
                        Cursos e Melhorias Sugeridas
                    </h3>
                     {selectedSellerData.lastMeeting.courseSuggestions ? (
                        <div className="flex flex-wrap gap-2">
                            {selectedSellerData.lastMeeting.courseSuggestions.split(',').map((course, i) => (
                                <Badge key={i} variant="secondary">{course.trim()}</Badge>
                            ))}
                        </div>
                     ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma sugestão de curso nesta reunião.</p>
                     )}
                </div>
                 {selectedSellerData.lastMeeting.nextEvaluationDate && (
                    <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            Próxima Avaliação
                        </h3>
                        <p className="text-sm font-bold">
                            {format(new Date(selectedSellerData.lastMeeting.nextEvaluationDate), 'PPP')}
                        </p>
                    </div>
                 )}
            </div>
          </DialogContent>
         )}
      </Dialog>
    </>
  );
});
AttributesContent.displayName = 'AttributesContent';

export default function AttributesPage() {
  const isClient = useIsClient();

  return (
    <MainLayout>
      <MeetingsProvider>
        <Suspense fallback={<PageSkeleton />}>
          {isClient ? <AttributesContent /> : <PageSkeleton />}
        </Suspense>
      </MeetingsProvider>
    </MainLayout>
  );
}
