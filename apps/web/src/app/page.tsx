'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, NavTab } from '@/components/Navbar';
import { KpiCard } from '@/components/KpiCard';
import { PipelineStageBar } from '@/components/PipelineStageBar';
import { RecoveryTable, RecoveryCaseRecord } from '@/components/RecoveryTable';
import { RecoveryDrawer } from '@/components/RecoveryDrawer';
import { ApprovalsView, PendingApproval } from '@/components/ApprovalsView';
import { PoliciesView } from '@/components/PoliciesView';
import { AuditView, AuditEventRecord } from '@/components/AuditView';
import { WebhooksView, WebhookEventRecord } from '@/components/WebhooksView';
import { ReconciliationView, ReconciliationSummary, ReconciliationLog } from '@/components/ReconciliationView';
import { SystemHealthView, ServiceHealth } from '@/components/SystemHealthView';
import {
  DollarSign,
  Clock,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function MerchantDashboard() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);

  // Table state
  const [cases, setCases] = useState<RecoveryCaseRecord[]>([]);
  const [totalCases, setTotalCases] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingCases, setIsLoadingCases] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [reasonFilter, setReasonFilter] = useState('ALL');
  const [strategyFilter, setStrategyFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Metrics state (Live Database Driven - Zero Initial State)
  const [metrics, setMetrics] = useState({
    revenueAtRisk: 0,
    revenueRecovered: 0,
    activeCases: 0,
    recoveryRate: 0,
    pendingApprovals: 0,
    failedJobs: 0,
    totalCases: 0,
    pipeline: {
      failed: 0,
      analyzing: 0,
      policyCheck: 0,
      actionRunning: 0,
      recovered: 0,
      escalated: 0,
    },
  });

  const [apiError, setApiError] = useState<string | null>(null);

  // Auxiliary tab data
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEventRecord[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActorFilter, setAuditActorFilter] = useState('ALL');

  const [webhooks, setWebhooks] = useState<WebhookEventRecord[]>([]);

  const [reconciliationSummary, setReconciliationSummary] = useState<ReconciliationSummary>({
    paymentsChecked: 0,
    matched: 0,
    mismatches: 0,
    resolved: 0,
    needsReview: 0,
    lastReconciliationAt: new Date().toISOString(),
  });
  const [reconciliationLogs, setReconciliationLogs] = useState<ReconciliationLog[]>([]);
  const [healthServices, setHealthServices] = useState<ServiceHealth[]>([]);

  // 1. Fetch Metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const url = `${API_BASE}/recovery/metrics`;
      const res = await fetch(url, {
        headers: { 'x-demo-mode': isDemoMode.toString() },
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
        setApiError(null);
      } else {
        setApiError(`API returned HTTP ${res.status} from ${url}`);
      }
    } catch (err: any) {
      setApiError(`Unable to reach backend at ${API_BASE}/recovery/metrics`);
    }
  }, [isDemoMode]);

  // 2. Fetch Cases List
  const fetchCases = useCallback(async () => {
    setIsLoadingCases(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        status: statusFilter,
        reasonCode: reasonFilter,
        strategy: strategyFilter,
        search,
        sortBy,
        sortOrder,
      });

      const url = `${API_BASE}/recovery/cases?${params.toString()}`;
      const res = await fetch(url, {
        headers: { 'x-demo-mode': isDemoMode.toString() },
      });

      if (res.ok) {
        const json = await res.json();
        setCases(json.data || []);
        setTotalCases(json.meta?.total || 0);
        setTotalPages(json.meta?.totalPages || 1);
        setApiError(null);
      } else {
        setApiError(`API returned HTTP ${res.status} from ${url}`);
      }
    } catch (err: any) {
      setApiError(`Unable to reach backend at ${API_BASE}/recovery/cases`);
    } finally {
      setIsLoadingCases(false);
    }
  }, [page, pageSize, statusFilter, reasonFilter, strategyFilter, search, sortBy, sortOrder, isDemoMode]);

  // 3. Fetch Approvals
  const fetchApprovals = useCallback(async () => {
    try {
      const url = `${API_BASE}/approvals/pending`;
      const res = await fetch(url, {
        headers: { 'x-demo-mode': isDemoMode.toString() },
      });
      if (res.ok) {
        const data = await res.json();
        setApprovals(data || []);
        setApiError(null);
      }
    } catch {
      // Resilient
    }
  }, [isDemoMode]);

  // 4. Fetch Details for Drawer
  const fetchCaseDetails = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/recovery/cases/${id}`, {
        headers: { 'x-demo-mode': isDemoMode.toString() },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedCase(data);
      }
    } catch {
      // Resilient
    }
  }, [isDemoMode]);

  // 5. Fetch Policies
  const fetchPolicies = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/policies`, {
        headers: { 'x-demo-mode': isDemoMode.toString() },
      });
      if (res.ok) {
        const data = await res.json();
        setPolicies(data || []);
      }
    } catch {
      // Resilient
    }
  }, [isDemoMode]);

  // 6. Fetch Audit
  const fetchAudit = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: auditPage.toString(),
        limit: '25',
        search: auditSearch,
        actor: auditActorFilter,
      });
      const res = await fetch(`${API_BASE}/audit?${params.toString()}`, {
        headers: { 'x-demo-mode': isDemoMode.toString() },
      });
      if (res.ok) {
        const json = await res.json();
        setAuditEvents(json.data || []);
        setAuditTotal(json.meta?.total || 0);
      }
    } catch {
      // Resilient
    }
  }, [auditPage, auditSearch, auditActorFilter, isDemoMode]);

  // 7. Fetch Webhooks
  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/webhooks/events?limit=25`, {
        headers: { 'x-demo-mode': isDemoMode.toString() },
      });
      if (res.ok) {
        const json = await res.json();
        setWebhooks(json.data || []);
      }
    } catch {
      // Resilient
    }
  }, [isDemoMode]);

  // 8. Fetch Reconciliation
  const fetchReconciliation = useCallback(async () => {
    try {
      const [sumRes, logsRes] = await Promise.all([
        fetch(`${API_BASE}/reconciliation/summary`, {
          headers: { 'x-demo-mode': isDemoMode.toString() },
        }),
        fetch(`${API_BASE}/reconciliation/logs`, {
          headers: { 'x-demo-mode': isDemoMode.toString() },
        }),
      ]);

      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setReconciliationSummary(sumData);
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setReconciliationLogs(logsData || []);
      }
    } catch {
      // Resilient
    }
  }, [isDemoMode]);

  // 9. Fetch Health
  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/health/services`);
      if (res.ok) {
        const data = await res.json();
        setHealthServices(data.services || []);
      }
    } catch {
      // Resilient
    }
  }, []);

  // Approvals Actions
  const handleApprove = async (id: string, notes: string) => {
    try {
      await fetch(`${API_BASE}/approvals/${id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-mode': isDemoMode.toString(),
        },
        body: JSON.stringify({ action: 'APPROVE', reviewNotes: notes }),
      });
      fetchApprovals();
      fetchCases();
      fetchMetrics();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (id: string, notes: string) => {
    try {
      await fetch(`${API_BASE}/approvals/${id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-mode': isDemoMode.toString(),
        },
        body: JSON.stringify({ action: 'REJECT', reviewNotes: notes }),
      });
      fetchApprovals();
      fetchCases();
      fetchMetrics();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolveReconciliation = async (id: string) => {
    try {
      await fetch(`${API_BASE}/reconciliation/${id}/resolve`, {
        method: 'POST',
      });
      fetchReconciliation();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRetryEvaluation = async (id: string) => {
    try {
      await fetch(`${API_BASE}/recovery/cases/${id}/retry`, {
        method: 'POST',
        headers: { 'x-demo-mode': isDemoMode.toString() },
      });
      fetchCaseDetails(id);
      fetchCases();
    } catch (e) {
      console.error(e);
    }
  };

  // Initial Seed & Polling
  useEffect(() => {
    fetchMetrics();
    fetchCases();
    fetchApprovals();
    fetchPolicies();
    fetchAudit();
    fetchWebhooks();
    fetchReconciliation();
    fetchHealth();
  }, [fetchMetrics, fetchCases, fetchApprovals, fetchPolicies, fetchAudit, fetchWebhooks, fetchReconciliation, fetchHealth]);

  // Periodic Polling (Every 3-4s)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMetrics();
      fetchCases();
      fetchApprovals();
      if (selectedCase?.id) {
        fetchCaseDetails(selectedCase.id);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [fetchMetrics, fetchCases, fetchApprovals, fetchCaseDetails, selectedCase]);

  // Handle Sort
  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-brand-500">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingApprovalsCount={approvals.length}
        isDemoMode={isDemoMode}
        onToggleDemoMode={() => setIsDemoMode(!isDemoMode)}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {apiError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />
              <span>{apiError}</span>
            </div>
            <button
              onClick={() => {
                fetchMetrics();
                fetchCases();
                fetchApprovals();
              }}
              className="rounded-lg bg-rose-500/20 border border-rose-500/30 px-2.5 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-500/30"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Main Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Live Ingestion Alert Banner */}
            <div className="flex items-center justify-between rounded-xl bg-indigo-950/40 border border-indigo-500/20 px-4 py-2.5 text-xs text-indigo-300">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-white font-mono">
                  REAL-TIME INGESTION ACTIVE
                </span>
                <span className="hidden sm:inline text-slate-400 font-sans">
                  • Ingesting Razorpay payment failures, executing AI strategy evaluations & deterministic policy checks.
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Auto-refresh: 3s
              </div>
            </div>

            {/* PART 7: KPI STRIP (6 Operational Summary Cards) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <KpiCard
                title="Revenue At Risk"
                value={`₹${metrics.revenueAtRisk.toLocaleString('en-IN')}`}
                subtitle="Active failed volume"
                badge="Live"
                icon={DollarSign}
                variant="rose"
              />
              <KpiCard
                title="Recovered Revenue"
                value={`₹${metrics.revenueRecovered.toLocaleString('en-IN')}`}
                subtitle={`${metrics.recoveryRate}% conversion`}
                badge="Captured"
                icon={CheckCircle2}
                variant="emerald"
              />
              <KpiCard
                title="Active Cases"
                value={metrics.activeCases.toLocaleString('en-IN')}
                subtitle="Automated in flight"
                badge="Processing"
                icon={Clock}
                variant="sky"
              />
              <KpiCard
                title="Recovery Rate"
                value={`${metrics.recoveryRate}%`}
                subtitle="Single Orchestrator v1"
                badge="Adaptive"
                icon={Sparkles}
                variant="purple"
              />
              <KpiCard
                title="Awaiting Approval"
                value={approvals.length || metrics.pendingApprovals}
                subtitle="Maker-Checker queue"
                badge="High-Risk"
                icon={ShieldAlert}
                variant="amber"
              />
              <KpiCard
                title="Failed Jobs / DLQ"
                value={metrics.failedJobs}
                subtitle="Circuit breaker safe"
                badge="Nominal"
                icon={AlertTriangle}
                variant="indigo"
              />
            </div>

            {/* PART 8: Horizontal Recovery Pipeline Stage Bar */}
            <PipelineStageBar
              counts={metrics.pipeline}
              activeFilter={statusFilter}
              onSelectFilter={(st) => {
                setStatusFilter(st);
                setPage(1);
              }}
            />

            {/* PART 9: Main Recovery Case Table with 25+ Rows & Server Pagination */}
            <RecoveryTable
              cases={cases}
              total={totalCases}
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              isLoading={isLoadingCases}
              search={search}
              statusFilter={statusFilter}
              reasonFilter={reasonFilter}
              strategyFilter={strategyFilter}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSearchChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              onStatusFilterChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              onReasonFilterChange={(val) => {
                setReasonFilter(val);
                setPage(1);
              }}
              onStrategyFilterChange={(val) => {
                setStrategyFilter(val);
                setPage(1);
              }}
              onSortChange={handleSortChange}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              onSelectCase={(c) => fetchCaseDetails(c.id)}
              onRefresh={() => {
                fetchCases();
                fetchMetrics();
              }}
            />
          </>
        )}

        {/* Tab 2: Maker-Checker Approvals */}
        {activeTab === 'approvals' && (
          <ApprovalsView
            approvals={approvals}
            isLoading={false}
            onApprove={handleApprove}
            onReject={handleReject}
            onRefresh={fetchApprovals}
          />
        )}

        {/* Tab 3: Policies DSL */}
        {activeTab === 'policies' && <PoliciesView policies={policies} />}

        {/* Tab 4: Audit Trail */}
        {activeTab === 'audit' && (
          <AuditView
            events={auditEvents}
            total={auditTotal}
            page={auditPage}
            pageSize={25}
            totalPages={Math.ceil(auditTotal / 25) || 1}
            isLoading={false}
            search={auditSearch}
            actorFilter={auditActorFilter}
            onSearchChange={setAuditSearch}
            onActorFilterChange={setAuditActorFilter}
            onPageChange={setAuditPage}
          />
        )}

        {/* Tab 5: Webhooks Ledger */}
        {activeTab === 'webhooks' && (
          <WebhooksView
            events={webhooks}
            isLoading={false}
            onRefresh={fetchWebhooks}
          />
        )}

        {/* Tab 6: Reconciliation */}
        {activeTab === 'reconciliation' && (
          <ReconciliationView
            summary={reconciliationSummary}
            logs={reconciliationLogs}
            isLoading={false}
            onResolve={handleResolveReconciliation}
            onRefresh={fetchReconciliation}
          />
        )}

        {/* Tab 7: System Health */}
        {activeTab === 'health' && (
          <SystemHealthView
            services={healthServices}
            isLoading={false}
            onRefresh={fetchHealth}
          />
        )}
      </main>

      {/* Centerpiece Detail Drawer */}
      {selectedCase && (
        <RecoveryDrawer
          recoveryCase={selectedCase}
          onClose={() => setSelectedCase(null)}
          onRetryEvaluation={handleRetryEvaluation}
        />
      )}
    </div>
  );
}
