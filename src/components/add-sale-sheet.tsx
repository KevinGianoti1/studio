"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Sale } from "@/types";
import { useToast } from "@/hooks/use-toast";
import React, { type ReactNode, useState, useCallback } from "react";
import { useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const saleSchema = z.object({
  company: z.enum(['Maxiforce', 'Pyramid'], { required_error: "Selecione uma empresa." }),
  seller: z.string().min(2, { message: "Nome do vendedor deve ter pelo menos 2 caracteres." }),
  group: z.string().min(1, { message: "Nome do grupo é obrigatório." }),
  projection: z.coerce.number().positive({ message: "Projeção deve ser um número positivo." }),
  billed: z.coerce.number().min(0, { message: "Vendas não pode ser negativo." }),
  openBudget: z.coerce.number().min(0, { message: "Orçamento não pode ser negativo." }),
  dailyGoal: z.coerce.number().positive({ message: "Meta diária deve ser um número positivo." }),
  monthlyGoal: z.coerce.number().positive({ message: "Meta mensal deve ser um número positivo." }),
  createdAt: z.date({
    required_error: "A data de criação é obrigatória.",
  }),
});

type AddSaleSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddSale: (data: Omit<Sale, 'id' | 'createdAt' | 'monthlyGoalPercentage' | 'campaign'> & { createdAt: Date }) => Promise<{ success: boolean }>;
}

function AddSaleForm({ onAddSale, setSheetOpen }: { onAddSale: AddSaleSheetProps['onAddSale'], setSheetOpen: (open: boolean) => void }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof saleSchema>>({
        resolver: zodResolver(saleSchema),
        defaultValues: {
            seller: "",
            group: "",
            projection: 0,
            billed: 0,
            openBudget: 0,
            dailyGoal: 0,
            monthlyGoal: 0,
            createdAt: new Date(),
        },
    });

    const company = useWatch({
        control: form.control,
        name: 'company'
    });

    useEffect(() => {
        if (company === 'Maxiforce') {
            form.setValue('group', 'Maxiforce');
        } else if (company === 'Pyramid') {
            form.setValue('group', 'Pyramid');
        } else {
             form.setValue('group', '');
        }
    }, [company, form]);


    const onSubmit = useCallback(async (values: z.infer<typeof saleSchema>) => {
        setIsSubmitting(true);
        try {
            const result = await onAddSale(values);
            if(result.success) {
                form.reset();
                setSheetOpen(false);
            }
        } catch (error) {
             toast({
                variant: "destructive",
                title: "Erro Inesperado",
                description: "Ocorreu um erro ao submeter o formulário.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [onAddSale, form, setSheetOpen, toast]);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Empresa</FormLabel>
                            <FormControl>
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex space-x-4"
                                    disabled={isSubmitting}
                                >
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <RadioGroupItem value="Maxiforce" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Maxiforce</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <RadioGroupItem value="Pyramid" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Pyramid</FormLabel>
                                    </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                <FormField
                    control={form.control}
                    name="group"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Equipe</FormLabel>
                            <FormControl>
                                <Input placeholder="Selecione uma empresa para definir a equipe" {...field} disabled />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                <FormField
                    control={form.control}
                    name="seller"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Vendedor</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: João Silva" {...field} disabled={isSubmitting}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                <FormField
                    control={form.control}
                    name="createdAt"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Data de Lançamento</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                disabled={isSubmitting}
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
                                disabled={(date) => date > new Date()}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormDescription>
                            Esta é a data em que a venda será registrada.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="projection"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Projeção</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} disabled={isSubmitting}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                <FormField
                    control={form.control}
                    name="billed"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Vendas</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} disabled={isSubmitting}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                <FormField
                    control={form.control}
                    name="openBudget"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Orçamento em Aberto</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} disabled={isSubmitting}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                <FormField
                    control={form.control}
                    name="dailyGoal"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Meta Diária</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} disabled={isSubmitting}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                <FormField
                    control={form.control}
                    name="monthlyGoal"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Meta Mensal</FormLabel>
                            <FormControl>
                                <Input type="number" {...field} disabled={isSubmitting}/>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                <SheetFooter className="pt-4">
                    <SheetClose asChild>
                        <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
                    </SheetClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? 'Salvando...' : 'Salvar Venda'}
                    </Button>
                </SheetFooter>
            </form>
        </Form>
    );
}

export function AddSaleSheet({ open, onOpenChange, onAddSale }: AddSaleSheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col">
                <SheetHeader>
                    <SheetTitle>Registrar Nova Venda</SheetTitle>
                    <SheetDescription>
                        Preencha os dados abaixo para adicionar um novo registro de venda.
                    </SheetDescription>
                </SheetHeader>
                <ScrollArea className="flex-grow pr-6">
                    <AddSaleForm onAddSale={onAddSale} setSheetOpen={onOpenChange} />
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
