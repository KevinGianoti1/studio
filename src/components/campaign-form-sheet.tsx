// src/components/campaign-form-sheet.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Campaign } from "@/types";
import { useToast } from "@/hooks/use-toast";
import React, { useState, useEffect } from "react";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { addCampaign, updateCampaign, type AddCampaignInput, type UpdateCampaignInput } from "@/ai/flows/campaigns-flow";
import { DateRange } from "react-day-picker";

const formSchema = z.object({
  name: z.string().min(2, { message: "Nome da campanha deve ter pelo menos 2 caracteres." }),
  dates: z.object({
      from: z.date({ required_error: "Data de início é obrigatória."}),
      to: z.date({ required_error: "Data de término é obrigatória."}),
  }),
  description: z.string().optional(),
});

type CampaignFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign | null;
  onFormSubmit: () => Promise<void>; // To refresh the list
}

export function CampaignFormSheet({ open, onOpenChange, campaign, onFormSubmit }: CampaignFormSheetProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const formTitle = campaign ? "Editar Campanha" : "Adicionar Nova Campanha";
    const formDescription = campaign ? "Altere os dados da campanha abaixo." : "Preencha os dados para criar uma nova campanha.";
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            dates: { from: new Date(), to: new Date() },
            description: '',
        }
    });

    useEffect(() => {
        if (campaign) {
            form.reset({
                name: campaign.name,
                dates: { from: campaign.startDate, to: campaign.endDate },
                description: campaign.description,
            });
        } else {
            form.reset({
                name: '',
                dates: undefined,
                description: '',
            });
        }
    }, [campaign, form, open]);


    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            let result;
            if (campaign) { // Editing existing campaign
                const updateData: UpdateCampaignInput = {
                    rowId: campaign.rowId,
                    name: values.name,
                    startDate: values.dates.from,
                    endDate: values.dates.to,
                    description: values.description,
                };
                result = await updateCampaign(updateData);
            } else { // Adding new campaign
                 const addData: AddCampaignInput = {
                    name: values.name,
                    startDate: values.dates.from,
                    endDate: values.dates.to,
                    description: values.description,
                };
                result = await addCampaign(addData);
            }

            if(result.success) {
                toast({ title: "Sucesso!", description: result.message });
                await onFormSubmit(); // Refresh campaign list
                onOpenChange(false); // Close sheet
            } else {
                 toast({ variant: "destructive", title: "Erro", description: result.error });
            }
        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "Erro de Conexão",
                description: error.message || "Ocorreu um erro ao submeter o formulário.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col">
                <SheetHeader>
                    <SheetTitle>{formTitle}</SheetTitle>
                    <SheetDescription>{formDescription}</SheetDescription>
                </SheetHeader>
                <ScrollArea className="flex-grow pr-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                           <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome da Campanha</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: Campanha de Verão" {...field} disabled={isSubmitting}/>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                             <FormField
                                control={form.control}
                                name="dates"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Período da Campanha</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full pl-3 text-left font-normal",
                                                !field.value?.from && "text-muted-foreground"
                                            )}
                                            disabled={isSubmitting}
                                            >
                                            {field.value?.from ? (
                                                field.value.to ? (
                                                <>
                                                    {format(field.value.from, "dd/MM/yy")} -{" "}
                                                    {format(field.value.to, "dd/MM/yy")}
                                                </>
                                                ) : (
                                                format(field.value.from, "dd/MM/yy")
                                                )
                                            ) : (
                                                <span>Escolha um período</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="range"
                                            selected={field.value as DateRange}
                                            onSelect={field.onChange}
                                            initialFocus
                                            numberOfMonths={2}
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />

                             <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descrição / Anotações</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Descreva o foco da campanha, produtos alvo, etc."
                                                className="resize-none"
                                                {...field}
                                                disabled={isSubmitting}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <SheetFooter className="pt-8">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isSubmitting ? 'Salvando...' : 'Salvar Campanha'}
                                </Button>
                            </SheetFooter>
                        </form>
                    </Form>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
