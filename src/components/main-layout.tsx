// src/components/main-layout.tsx
'use client';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';
import { LayoutDashboard, Users, User, Tag, ClipboardList, Menu, Radar, ShoppingCart, ClipboardCheck, Trophy, Rocket, Activity } from 'lucide-react';
import React from 'react';

export function MainLayout({ children }: { children: React.ReactNode }) {
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
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Visão Geral">
                        <Link href="/">
                          <LayoutDashboard />
                          <span>Visão Geral</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                       <SidebarMenuButton asChild tooltip="Aceleradores">
                        <Link href="/accelerators">
                          <Rocket />
                          <span>Aceleradores</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                       <SidebarMenuButton asChild tooltip="Competição">
                        <Link href="/competition">
                          <Trophy />
                          <span>Competição</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                       <SidebarMenuButton asChild tooltip="Análise de Equipes">
                        <Link href="/teams">
                          <Users />
                          <span>Equipes</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                       <SidebarMenuButton asChild tooltip="Análise de Vendedores">
                        <Link href="/sellers">
                          <User />
                          <span>Vendedores</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                       <SidebarMenuButton asChild tooltip="Campanhas">
                        <Link href="/campaigns">
                          <Tag />
                          <span>Campanhas</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                       <SidebarMenuButton asChild tooltip="Reunião 1:1">
                        <Link href="/survey">
                          <ClipboardList />
                          <span>Reunião 1:1</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                       <SidebarMenuButton asChild tooltip="Entregáveis">
                        <Link href="/deliverables">
                          <ClipboardCheck />
                          <span>Entregáveis</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                       <SidebarMenuButton asChild tooltip="Atributos">
                        <Link href="/attributes">
                          <Radar />
                          <span>Atributos</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                       <SidebarMenuButton asChild tooltip="Sell Out">
                        <Link href="/sellout">
                          <ShoppingCart />
                          <span>Sell Out</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Saúde do Sistema">
                        <Link href="/health">
                          <Activity />
                          <span>Saúde</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarContent>
              </Sidebar>
              <div className="flex flex-1 flex-col">
                 <header className="sticky top-0 z-40 w-full border-b bg-card">
                    <div className="container flex h-16 items-center">
                        <SidebarTrigger className="md:hidden"/>
                        <div className="ml-auto flex items-center gap-2">
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
