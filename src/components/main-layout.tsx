// src/components/main-layout.tsx
'use client';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';
import { LayoutDashboard, Users, User, Tag, ClipboardList, Radar, ShoppingCart, ClipboardCheck, Trophy, Rocket, Activity } from 'lucide-react';
import React from 'react';
import { usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';

export function MainLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const environmentLabel = process.env.NODE_ENV === 'production' ? 'PROD' : process.env.NODE_ENV === 'development' ? 'DEV' : 'HML';
    const [menuSearch, setMenuSearch] = React.useState('');
    const menuItems = [
      { href: '/', label: 'Visão Geral', icon: <LayoutDashboard />, match: (path: string) => path === '/' },
      { href: '/accelerators', label: 'Aceleradores', icon: <Rocket />, match: (path: string) => path.startsWith('/accelerators') },
      { href: '/competition', label: 'Competição', icon: <Trophy />, match: (path: string) => path.startsWith('/competition') },
      { href: '/teams', label: 'Equipes', icon: <Users />, match: (path: string) => path.startsWith('/teams') },
      { href: '/sellers', label: 'Vendedores', icon: <User />, match: (path: string) => path.startsWith('/sellers') || path.startsWith('/history/') },
      { href: '/campaigns', label: 'Campanhas', icon: <Tag />, match: (path: string) => path.startsWith('/campaigns') },
      { href: '/survey', label: 'Reunião 1:1', icon: <ClipboardList />, match: (path: string) => path.startsWith('/survey') },
      { href: '/deliverables', label: 'Entregáveis', icon: <ClipboardCheck />, match: (path: string) => path.startsWith('/deliverables') },
      { href: '/attributes', label: 'Atributos', icon: <Radar />, match: (path: string) => path.startsWith('/attributes') },
      { href: '/sellout', label: 'Sell Out', icon: <ShoppingCart />, match: (path: string) => path.startsWith('/sellout') },
      { href: '/health', label: 'Saúde', icon: <Activity />, match: (path: string) => path.startsWith('/health') },
    ];

    const normalizedSearch = menuSearch.trim().toLowerCase();
    const visibleMenuItems = normalizedSearch
      ? menuItems.filter((item) => item.label.toLowerCase().includes(normalizedSearch))
      : menuItems;

    return (
        <SidebarProvider>
            <div className="flex min-h-screen">
              <Sidebar>
                <SidebarContent>
                  <SidebarHeader>
                     <div className="flex items-center gap-2 p-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 256 256"
                          className="h-6 w-6 text-primary"
                        >
                          <rect width="256" height="256" fill="none"></rect>
                          <path
                            d="M88,140a7.8,7.8,0,0,1-3.9-1.2L40.9,112.5a8,8,0,0,1,0-13l43.2-26.3a7.8,7.8,0,0,1,7.8,0L135.1,99.5a8,8,0,0,1,0,13L91.9,138.8A7.8,7.8,0,0,1,88,140Z"
                            opacity="0.2"
                          ></path>
                          <path
                            d="M168,228a7.8,7.8,0,0,1-3.9-1.2l-43.2-26.3a8,8,0,0,1,0-13l43.2-26.3a7.8,7.8,0,0,1,7.8,0l43.2,26.3a8,8,0,0,1,0,13l-43.2,26.3A7.8,7.8,0,0,1,168,228Z"
                            opacity="0.2"
                          ></path>
                          <line
                            x1="88"
                            y1="140"
                            x2="88"
                            y2="212"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="16"
                          ></line>
                          <path
                            d="M88,140a7.8,7.8,0,0,1-3.9-1.2L40.9,112.5a8,8,0,0,1,0-13L84.1,73.2a7.8,7.8,0,0,1,7.8,0l43.2,26.3a8,8,0,0,1,0,13L91.9,138.8A7.8,7.8,0,0,1,88,140Z"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="16"
                          ></path>
                          <path
                            d="M168,140a7.8,7.8,0,0,1-3.9-1.2l-43.2-26.3a8,8,0,0,1,0-13L164.1,73.2a7.8,7.8,0,0,1,7.8,0l43.2,26.3a8,8,0,0,1,0,13l-43.2,26.3A7.8,7.8,0,0,1,168,140Z"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="16"
                          ></path>
                          <line
                            x1="44"
                            y1="110"
                            x2="44"
                            y2="44"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="16"
                          ></line>
                          <path
                            d="M44,44a7.8,7.8,0,0,1,3.9-1.2L91.1,16.5a8,8,0,0,1,7.8,0l43.2,26.3a8,8,0,0,1,0,13L98.9,82.1a7.8,7.8,0,0,1-7.8,0L47.9,55.8A7.8,7.8,0,0,1,44,52Z"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="16"
                          ></path>
                          <path
                            d="M168,228a7.8,7.8,0,0,1-3.9-1.2l-43.2-26.3a8,8,0,0,1,0-13l43.2-26.3a7.8,7.8,0,0,1,7.8,0l43.2,26.3a8,8,0,0,1,0,13l-43.2,26.3A7.8,7.8,0,0,1,168,228Z"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="16"
                          ></path>
                        </svg>
                        <span className="text-lg font-bold tracking-tight text-primary">VendasControl</span>
                      </div>
                  </SidebarHeader>
                  <div className="px-2 pb-2">
                    <Input
                      placeholder="Buscar seção..."
                      value={menuSearch}
                      onChange={(event) => setMenuSearch(event.target.value)}
                      className="h-8"
                    />
                  </div>
                  <SidebarMenu>
                    {visibleMenuItems.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild tooltip={item.label} isActive={item.match(pathname)}>
                          <Link href={item.href}>
                            {item.icon}
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                    {visibleMenuItems.length === 0 && (
                      <SidebarMenuItem>
                        <div className="text-xs text-muted-foreground px-2 py-1">
                          Nenhuma seção encontrada.
                        </div>
                      </SidebarMenuItem>
                    )}
                  </SidebarMenu>
                </SidebarContent>
              </Sidebar>
              <div className="flex flex-1 flex-col">
                 <header className="sticky top-0 z-40 w-full border-b bg-card">
                    <div className="container flex h-16 items-center">
                        <SidebarTrigger className="md:hidden"/>
                        <div className="ml-auto flex items-center gap-2">
                            <span className="text-xs font-semibold px-2 py-1 rounded-md bg-muted text-muted-foreground">
                              {environmentLabel}
                            </span>
                            <ThemeToggle />
                        </div>
                    </div>
                </header>
                <main className="flex-1 space-y-8 p-4 md:p-6 lg:p-8 container">
                  {children}
                </main>
              </div>
            </div>
        </SidebarProvider>
    );
}
