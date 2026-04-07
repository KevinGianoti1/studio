'use client';

import { useCallback, useEffect, useState } from 'react';

export type CatalogProduct = {
  id: string;
  code: string;
  name: string;
  listPrice: number;
  salePrice: number;
};

export type CatalogCustomer = {
  id: string;
  name: string;
  segment: string;
  city: string;
};

export type CatalogPriceRule = {
  id: string;
  productId: string;
  customerId: string;
  customPrice: number;
};

const PRODUCTS_KEY = 'catalog_products_v1';
const CUSTOMERS_KEY = 'catalog_customers_v1';
const PRICING_KEY = 'catalog_pricing_v1';

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function useCatalogStore() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [customers, setCustomers] = useState<CatalogCustomer[]>([]);
  const [priceRules, setPriceRules] = useState<CatalogPriceRule[]>([]);

  useEffect(() => {
    setProducts(safeRead<CatalogProduct[]>(PRODUCTS_KEY, []));
    setCustomers(safeRead<CatalogCustomer[]>(CUSTOMERS_KEY, []));
    setPriceRules(safeRead<CatalogPriceRule[]>(PRICING_KEY, []));
  }, []);

  const addProduct = useCallback((data: Omit<CatalogProduct, 'id'>) => {
    setProducts(prev => {
      const next = [{ id: crypto.randomUUID(), ...data }, ...prev];
      safeWrite(PRODUCTS_KEY, next);
      return next;
    });
  }, []);

  const addCustomer = useCallback((data: Omit<CatalogCustomer, 'id'>) => {
    setCustomers(prev => {
      const next = [{ id: crypto.randomUUID(), ...data }, ...prev];
      safeWrite(CUSTOMERS_KEY, next);
      return next;
    });
  }, []);

  const addPriceRule = useCallback((data: Omit<CatalogPriceRule, 'id'>) => {
    setPriceRules(prev => {
      const next = [{ id: crypto.randomUUID(), ...data }, ...prev];
      safeWrite(PRICING_KEY, next);
      return next;
    });
  }, []);

  return {
    products,
    customers,
    priceRules,
    addProduct,
    addCustomer,
    addPriceRule,
  };
}

