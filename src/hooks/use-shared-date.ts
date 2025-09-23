
'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type DateRange } from 'react-day-picker';
import { format, parse, startOfMonth, endOfMonth, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { UIDateSale } from '@/types';
import { useDebouncedCallback } from 'use-debounce';

export function useSharedDate(allSales: UIDateSale[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize state as undefined to ensure server and client render the same initial value.
  const [date, setDate] = useState<DateRange | undefined>(undefined);

  // Debounced function to update the URL
  const debouncedUpdateUrl = useDebouncedCallback((newDate: DateRange | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newDate?.from) {
      params.set('from', format(newDate.from, 'yyyy-MM-dd'));
      if (newDate.to) {
        params.set('to', format(newDate.to, 'yyyy-MM-dd'));
      } else {
        params.delete('to');
      }
    } else {
      params.delete('from');
      params.delete('to');
    }
    // `replace` is used to avoid adding to the browser's history stack
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, 300); // 300ms delay

  // Effect to sync URL to state or set a default date, runs only on the client.
  useEffect(() => {
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    // If URL has params, update the state
    if (fromParam) {
      const fromDate = parse(fromParam, 'yyyy-MM-dd', new Date());
      const toDate = toParam ? parse(toParam, 'yyyy-MM-dd', new Date()) : undefined;

      if (isValid(fromDate)) {
        setDate(currentDate => {
             const newFromTime = fromDate.getTime();
             const newToTime = toDate && isValid(toDate) ? toDate.getTime() : newFromTime;
             const currentFromTime = currentDate?.from?.getTime();
             const currentToTime = currentDate?.to?.getTime() ?? currentFromTime;
             
             if (newFromTime === currentFromTime && newToTime === currentToTime) {
                return currentDate; // No change needed
             }
             return { from: fromDate, to: toDate && isValid(toDate) ? toDate : undefined };
        });
      }
    } 
    // If URL has NO params AND we have sales data, set default
    else if (allSales.length > 0) {
        const mostRecentSale = allSales.reduce((a, b) => a.createdAt > b.createdAt ? a : b);
        const mostRecentDate = mostRecentSale.createdAt;
        const newDefaultDate = {
            from: startOfMonth(mostRecentDate),
            to: endOfMonth(mostRecentDate)
        };
        // Update URL, which will then trigger this effect again to set state
        const params = new URLSearchParams(searchParams.toString());
        params.set('from', format(newDefaultDate.from, 'yyyy-MM-dd'));
        params.set('to', format(newDefaultDate.to, 'yyyy-MM-dd'));
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
    // If there are no sales and no params, date remains undefined, which is fine.
  }, [searchParams, allSales, router, pathname]);

  // This is the function the UI calls. It updates the local state immediately for responsiveness
  // and then triggers the debounced URL update.
  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    debouncedUpdateUrl(newDate);
  }

  const dateString = useMemo(() => {
    if (!date?.from) return "Selecione um período";
    const from = format(date.from, "dd 'de' LLLL 'de' yyyy", { locale: ptBR });
    const to = date.to ? format(date.to, "dd 'de' LLLL 'de' yyyy", { locale: ptBR }) : from;
    if (from === to) return from;
    return `${from} a ${to}`;
  }, [date]);

  return { date, setDate: handleDateChange, dateString };
}
