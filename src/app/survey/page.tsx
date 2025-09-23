// src/app/survey/page.tsx
'use client';

import { Suspense, useContext, useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { SalesContext, SalesProvider } from '@/contexts/sales-context';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { logMeeting } from '@/ai/flows/log-meeting-flow';
import { ArrowLeft, Loader2, Send, Calendar as CalendarIcon } from 'lucide-react';
import { PageHeader, PageHeaderActions, PageHeaderTitle } from '@/components/page-header';
import Link from 'next/link';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { useIsClient } from '@/hooks/use-is-client';
import { Skeleton } from '@/components/ui/skeleton';
import { MainLayout } from '@/components/main-layout';

const courseItems = [
  { id: 'tecnicas_descoberta', label: 'Técnicas de Descoberta / SPIN' },
  { id: 'apresentacao_valor', label: 'Apresentação e Proposta de Valor' },
  { id: 'tratamento_objecoes', label: 'Tratamento de Objeções' },
  { id: 'tecnicas_fechamento', label: 'Técnicas de Fechamento' },
  { id: 'organizacao_produtividade', label: 'Organização e Produtividade' },
  { id: 'prospeccao_leads', label: 'Prospecção e Leads' },
  { id: 'mindset_desenvolvimento', label: 'Mindset e Desenvolvimento' },
  { id: 'conhecimento_produto', label: 'Conhecimento de Produto' },
] as const;

const meetingFormSchema = z.object({
  seller: z.string().min(1, 'Você precisa selecionar um vendedor.'),
  evaluationDate: z.date({ required_error: 'A data da avaliação é obrigatória.' }),
  prospeccao: z.number().min(0).max(10),
  qualificacao: z.number().min(0).max(10),
  apresentacao: z.number().min(0).max(10),
  objecoes: z.number().min(0).max(10),
  fechamento: z.number().min(0).max(10),
  followUp: z.number().min(0).max(10),
  gapsIdentified: z.string().optional(),
  courseSuggestions: z.array(z.string()).optional(),
  nextEvaluationDate: z.date().optional(),
});

type MeetingFormValues = z.infer<typeof meetingFormSchema>;

type AttributeDetail = {
  label: string;
  questions: string[];
};

const attributeDetails: Record<keyof Omit<MeetingFormValues, 'seller' | 'gapsIdentified' | 'courseSuggestions' | 'evaluationDate' | 'nextEvaluationDate'>, AttributeDetail> = {
  prospeccao: { 
    label: 'Prospecção', 
    questions: [
      "Como você lida com a frustração após uma série de 'nãos'? O que você faz para se reerguer?",
      "De 0 a 10, qual seu nível de energia ao iniciar uma nova prospecção? Como você se prepara mentalmente?",
      "Você consegue perceber o estado emocional do lead no primeiro contato? Como isso muda sua abordagem?",
      "Qual foi a prospecção mais desafiadora recentemente e o que você aprendeu sobre si mesmo nesse processo?",
      "Como você equilibra a meta de quantidade com a qualidade e a empatia na prospecção?",
      "Qual é a sua principal fonte de motivação intrínseca para prospectar, além da comissão?",
      "Descreva um momento em que você sentiu que estava sendo 'inconveniente' e como gerenciou esse sentimento.",
      "Como você se certifica de que está realmente presente e focado em cada ligação, em vez de operar no piloto automático?",
      "Que tipo de 'não' é o mais difícil para você ouvir (ex: 'não tenho interesse', 'já tenho uma solução')? Por quê?",
      "Como você usa a sua curiosidade para tornar a prospecção uma descoberta, e não uma tarefa?"
    ] 
  },
  qualificacao: { 
    label: 'Qualificação', 
    questions: [
      "Você consegue ouvir mais do que fala? Como você se sente ao deixar o cliente guiar a conversa?",
      "Como você reage quando um lead parece desinteressado? Qual é sua estrategia para gerar curiosidade genuína?",
      "Qual pergunta você fez recentemente que revelou uma necessidade 'oculta' do cliente que nem ele sabia que tinha?",
      "Você consegue diferenciar uma necessidade real de um simples interesse? Como seu 'feeling' te ajuda nisso?",
      "Como você constrói confiança durante a qualificação, antes mesmo de falar do produto?",
      "Descreva uma situação em que você percebeu que a sua solução não era a ideal para o cliente. Como você conduziu isso?",
      "Como você gerencia sua própria ansiedade de 'querer vender' para focar em 'querer ajudar'?",
      "Você consegue espelhar o tom de voz e a linguagem corporal (mesmo que por telefone) do cliente para criar rapport?",
      "Como você lida com o silêncio durante uma conversa? Você se sente confortável com pausas?",
      "Qual é a diferença entre 'ouvir para responder' e 'ouvir para entender' na sua prática diária?"
    ]
  },
  apresentacao: { 
    label: 'Apresentação da Solução', 
    questions: [
      "Como você 'lê a sala' (mesmo que virtual) para ajustar o tom da sua apresentação em tempo real?",
      "Qual emoção principal você quer que o cliente sinta ao final da sua apresentação? Como você trabalha para isso?",
      "Você consegue contar uma história que conecta nosso produto à realidade do cliente, em vez de apenas listar funcionalidades?",
      "Como você lida com interrupções ou perguntas difíceis durante a apresentação sem perder a compostura?",
      "Qual foi o feedback mais valioso que você recebeu sobre sua apresentação e como você o utilizou?",
      "Como você mede o nível de engajamento do cliente durante a apresentação? Quais sinais você procura?",
      "Descreva como você personaliza sua apresentação para diferentes perfis de compradores (ex: analítico, direto, etc.).",
      "Como você gerencia seu nervosismo antes de uma apresentação importante?",
      "Qual parte da sua apresentação te deixa mais apaixonado? O cliente consegue perceber essa paixão?",
      "Como você garante que a apresentação é um diálogo, e não um monólogo?"
    ]
  },
  objecoes: { 
    label: 'Tratamento das Objeções', 
    questions: [
      "Quando ouve uma objeção, sua primeira reação é defensiva ou curiosa? Como você gerencia esse impulso inicial?",
      "Descreva um momento em que você transformou uma objeção em um ponto forte para a venda. O que você sentiu?",
      "Como você separa a objeção ao produto da objeção a você? Você consegue não levar para o lado pessoal?",
      "Qual é a objeção que mais te desestabiliza emocionalmente? O que podemos fazer para te preparar melhor?",
      "Como você usa a empatia para validar a preocupação do cliente antes de apresentar uma contraproposta?",
      "Você vê uma objeção como um sinal de 'fim de jogo' ou como um sinal de 'interesse e engajamento'?",
      "Como você responde à objeção 'preciso pensar' sem pressionar, mas mantendo o negócio em andamento?",
      "Qual é a sua estratégia para se manter calmo e confiante quando confrontado com uma objeção agressiva?",
      "Você consegue identificar a 'objeção real' por trás daquela que o cliente verbaliza?",
      "Como você usa o humor ou a leveza para desarmar a tensão durante uma negociação de objeções?"
    ]
  },
  fechamento: { 
    label: 'Fechamento', 
    questions: [
      "Como você gerencia sua própria ansiedade e a do cliente no momento crítico do fechamento?",
      "Você consegue identificar os sinais não-verbais de que o cliente está pronto para fechar, mas hesitante?",
      "Qual é a diferença entre ser persistente e ser insistente no fechamento? Onde você traça essa linha?",
      "Como você celebra um 'sim' e como você lida com um 'não' no último minuto? O que cada um te ensina?",
      "Como você garante que o cliente se sinta seguro e feliz com a decisão, em vez de pressionado?",
      "Qual é o seu 'mantra' ou pensamento positivo quando você está prestes a pedir o fechamento?",
      "Você consegue fazer a 'pergunta do fechamento' com confiança total na sua voz e postura?",
      "Como você reage se o cliente diz 'sim' e depois volta atrás? Como você gerencia sua frustração?",
      "Você sabe quando é a hora de parar de tentar fechar e deixar o negócio para um outro momento?",
      "Como você constrói um senso de urgência que é genuíno e benéfico para o cliente, em vez de ser artificial?"
    ]
  },
  followUp: { 
    label: 'Follow up', 
    questions: [
      "Como você mantém a paciência e a positividade durante um longo ciclo de follow-up sem respostas?",
      "De que forma seu follow-up agrega valor ao cliente, mesmo que ele não compre naquele momento?",
      "Como você equilibra a necessidade de acompanhar com o respeito ao tempo e espaço do cliente?",
      "Qual foi o follow-up mais criativo que você já fez e que gerou um resultado inesperado?",
      "Como você usa o follow-up para construir um relacionamento a longo prazo, em vez de apenas 'cobrar' uma resposta?",
      "Qual é o seu sistema para não esquecer de nenhum follow-up, sem deixar que isso consuma todo o seu tempo?",
      "Como você lida com o sentimento de estar 'incomodando' o cliente?",
      "Qual é a linha tênue entre ser lembrado e ser esquecido no follow-up? Como você a navega?",
      "Como você reage quando um cliente que estava 'quente' de repente para de responder?",
      "Você personaliza cada follow-up ou usa templates? Como você equilibra eficiência e personalização?"
    ]
  },
};

const getRandomQuestion = (questions: string[]) => {
    const randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
};

function SurveyContent() {
  const { sales, isLoading: isSalesLoading } = useContext(SalesContext);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [randomQuestions, setRandomQuestions] = useState<Record<string, string>>({});
  const isClient = useIsClient();

  const sellers = [...new Set(sales.map(s => s.seller))].sort();

  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      seller: '',
      evaluationDate: new Date(),
      prospeccao: 5,
      qualificacao: 5,
      apresentacao: 5,
      objecoes: 5,
      fechamento: 5,
      followUp: 5,
      gapsIdentified: '',
      courseSuggestions: [],
    },
  });

   useEffect(() => {
    const questionMap: Record<string, string> = {};
    for (const key in attributeDetails) {
        if (Object.prototype.hasOwnProperty.call(attributeDetails, key)) {
            const detailKey = key as keyof typeof attributeDetails;
            questionMap[detailKey] = getRandomQuestion(attributeDetails[detailKey].questions);
        }
    }
    setRandomQuestions(questionMap);
  }, []);

  async function onSubmit(data: MeetingFormValues) {
    setIsSubmitting(true);
    try {
      // Convert dates to ISO strings before sending to the flow
      const payload = {
        ...data,
        evaluationDate: data.evaluationDate.toISOString(),
        nextEvaluationDate: data.nextEvaluationDate?.toISOString(),
      };

      const result = await logMeeting(payload);
      if (result.success) {
        toast({
          title: 'Sucesso!',
          description: 'O relatório da reunião 1:1 foi salvo na planilha.',
        });
        form.reset();
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao salvar',
          description: result.error || 'Não foi possível salvar os dados na planilha.',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro de Conexão',
        description: error.message || 'Não foi possível conectar ao servidor.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader>
        <PageHeaderTitle>Formulário de Reunião 1:1</PageHeaderTitle>
        <PageHeaderActions>
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Avaliação de Performance</CardTitle>
          <CardDescription>
            Use a escala linear para atribuir uma nota de 0 a 10 para cada critério de venda. Os dados serão salvos na planilha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="seller"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendedor</FormLabel>
                        {!isClient || isSalesLoading ? (
                            <Skeleton className="h-10 w-full" />
                        ) : (
                            <Select onValueChange={field.onChange} value={field.value} disabled={isSalesLoading}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um vendedor" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {sellers.map(seller => (
                                        <SelectItem key={seller} value={seller}>
                                            {seller}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="evaluationDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data da Avaliação</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Escolha uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-8">
                {(Object.keys(attributeDetails) as Array<keyof typeof attributeDetails>).map((key) => {
                  return (
                    <FormField
                      key={key}
                      control={form.control}
                      name={key}
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex justify-between items-center">
                            <FormLabel>{attributeDetails[key].label}</FormLabel>
                            <span className="text-sm font-bold text-primary w-10 text-center">{field.value}</span>
                          </div>
                           <FormDescription>
                            {randomQuestions[key] || "Carregando pergunta..."}
                          </FormDescription>
                          <FormControl>
                            <Slider
                              defaultValue={[field.value]}
                              onValueChange={(value) => field.onChange(value[0])}
                              max={10}
                              step={1}
                              className={cn("w-full pt-2")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  );
                })}
              </div>


              <FormField
                control={form.control}
                name="gapsIdentified"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Identificação de Gaps para melhoria</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva os principais pontos a serem desenvolvidos e os gaps de performance identificados..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

               <FormField
                control={form.control}
                name="courseSuggestions"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Sugestão de cursos e melhorias</FormLabel>
                      <FormDescription>
                        Selecione os tópicos recomendados para o desenvolvimento do vendedor.
                      </FormDescription>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {courseItems.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="courseSuggestions"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.label)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), item.label])
                                      : field.onChange(
                                          (field.value || []).filter(
                                            (value) => value !== item.label
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {item.label}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

               <FormField
                  control={form.control}
                  name="nextEvaluationDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data da Próxima Avaliação</FormLabel>
                       <FormDescription>Selecione a data para a próxima sessão de 1:1.</FormDescription>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full md:w-1/2 pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Escolha uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Salvar Relatório
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}

export default function SurveyPage() {
  return (
    <MainLayout>
      <SalesProvider>
        <Suspense fallback={<p>Carregando...</p>}>
          <SurveyContent />
        </Suspense>
      </SalesProvider>
    </MainLayout>
  )
}
