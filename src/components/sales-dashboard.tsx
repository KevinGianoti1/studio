
"use client";

import { useState, useMemo } from "react";
import type { UIDateSale } from "@/types";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Users, TrendingUp, CircleDollarSign, FileText, Goal, Target, Percent, Building, Calendar, Tag } from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { Badge } from "@/components/ui/badge";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export function SalesDashboard({ data }: { data: UIDateSale[] }) {
  const [activeTab, setActiveTab] = useState<string>("Todas");
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);

  const filteredByTab = useMemo(() => {
    if (activeTab === "Todas") {
      return data;
    }
    return data.filter((sale) => sale.group === activeTab);
  }, [data, activeTab]);
  
  const columns = useMemo<ColumnDef<UIDateSale>[]>(() => [
    {
        accessorKey: 'createdAt',
        header: ({ column }) => (
             <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                <Calendar className="mr-2 h-4 w-4" />
                Data
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
        accessorKey: 'seller',
        header: ({ column }) => (
             <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                <Users className="mr-2 h-4 w-4" />
                Vendedor
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <div className="font-medium">{row.original.seller}</div>
    },
    {
        accessorKey: 'group',
         header: ({ column }) => (
             <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                <Building className="mr-2 h-4 w-4" />
                Equipe
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
    },
    {
        accessorKey: 'campaign',
         header: ({ column }) => (
             <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                <Tag className="mr-2 h-4 w-4" />
                Campanha
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => row.original.campaign ? <Badge variant="secondary">{row.original.campaign}</Badge> : '-',
    },
    {
        accessorKey: 'billed',
        header: ({ column }) => (
             <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                <CircleDollarSign className="mr-2 h-4 w-4" />
                Vendas
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => formatCurrency(row.original.billed),
    },
     {
        accessorKey: 'monthlyGoalPercentage',
        header: ({ column }) => (
             <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                <Percent className="mr-2 h-4 w-4" />
                % Meta Mensal
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const percentage = row.original.monthlyGoalPercentage;
            const color = percentage >= 100 ? 'text-green-600' : 'text-orange-500';
            return <span className={`font-semibold ${color}`}>{percentage.toFixed(2)}%</span>
        },
    },
    {
        accessorKey: 'monthlyGoal',
        header: ({ column }) => (
             <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                <Target className="mr-2 h-4 w-4" />
                Meta Mensal
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => formatCurrency(row.original.monthlyGoal),
    },
    {
        accessorKey: 'projection',
         header: ({ column }) => (
             <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                <TrendingUp className="mr-2 h-4 w-4" />
                Projeção
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => formatCurrency(row.original.projection),
    },
    {
        accessorKey: 'openBudget',
        header: ({ column }) => (
             <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                <FileText className="mr-2 h-4 w-4" />
                Orçamento Aberto
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => formatCurrency(row.original.openBudget),
    },
    {
        accessorKey: 'dailyGoal',
        header: ({ column }) => (
             <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                <Goal className="mr-2 h-4 w-4" />
                Meta Diária
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => formatCurrency(row.original.dailyGoal),
    },
  ], []);

  const table = useReactTable({
    data: filteredByTab,
    columns,
    state: {
        sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="Todas">Todas</TabsTrigger>
        <TabsTrigger value="Maxiforce">Maxiforce</TabsTrigger>
        <TabsTrigger value="Pyramid">Pyramid</TabsTrigger>
      </TabsList>
      <TabsContent value={activeTab}>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map(headerGroup => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <TableHead key={header.id} className="p-0">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map(row => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        className={row.original.group === 'Pyramid' ? 'bg-secondary/40' : ''}
                      >
                        {row.getVisibleCells().map(cell => (
                          <TableCell key={cell.id} className="px-4 py-2">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        Nenhum resultado encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
