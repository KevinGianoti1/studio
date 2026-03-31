'use client';

import { useCallback, useEffect, useState } from 'react';
import { MainLayout } from '@/components/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader, PageHeaderDescription, PageHeaderTitle } from '@/components/page-header';
import { Activity, CheckCircle2, Loader2, XCircle } from 'lucide-react';

type HealthCheck = { name: string; ok: boolean };
type HealthPayload = {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptimeSeconds: number;
  checks: HealthCheck[];
  failedChecks: string[];
};

export default function HealthPage() {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/health', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Falha ao carregar status de saúde.');
      }
      setData(payload as HealthPayload);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar status de saúde.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
    const id = setInterval(loadHealth, 30000);
    return () => clearInterval(id);
  }, [loadHealth]);

  return (
    <MainLayout>
      <PageHeader>
        <PageHeaderTitle>Saúde do Sistema</PageHeaderTitle>
        <PageHeaderDescription>
          Monitoramento básico de ambiente e disponibilidade da aplicação (auto-refresh: 30s).
        </PageHeaderDescription>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Status Operacional
          </CardTitle>
          <CardDescription>
            Confira rapidamente se as variáveis essenciais e o serviço estão saudáveis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando status...
            </div>
          )}

          {!isLoading && error && (
            <div className="text-destructive font-medium">{error}</div>
          )}

          {!isLoading && data && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`text-sm px-3 py-1 rounded-full ${data.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {data.status === 'ok' ? 'Saudável' : 'Degradado'}
                </span>
                <span className="text-sm text-muted-foreground">
                  Uptime: {data.uptimeSeconds}s
                </span>
                <span className="text-sm text-muted-foreground">
                  Última checagem: {new Date(data.timestamp).toLocaleString('pt-BR')}
                </span>
              </div>

              <div className="space-y-2">
                {data.checks.map((check) => (
                  <div key={check.name} className="flex items-center gap-2 text-sm">
                    {check.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>{check.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <Button variant="outline" onClick={loadHealth} disabled={isLoading}>
            Atualizar agora
          </Button>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
