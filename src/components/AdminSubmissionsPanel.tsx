import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Check,
  Download,
  ExternalLink,
  Inbox,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus
} from 'lucide-react';
import {
  deleteFormSubmission,
  exportSubmissionsToCsv,
  fetchFormSubmissions,
  FORM_TYPE_COLORS,
  FORM_TYPE_LABELS,
  FormSubmissionRecord,
  FormSubmissionStatus,
  FormSubmissionType,
  STATUS_COLORS,
  STATUS_LABELS,
  updateFormSubmission
} from '../lib/formSubmissions';

interface AdminSubmissionsPanelProps {
  onQuickInviteEmail?: (email: string, memo: string) => void;
  onCountUpdate?: (newCount: number, totalCount: number) => void;
}

const ALL_FORM_TYPES: FormSubmissionType[] = [
  'class_apply',
  'class_inquiry',
  'project_inquiry',
  'instructor_recruit'
];

const ALL_STATUSES: FormSubmissionStatus[] = [
  'new',
  'contacted',
  'in_progress',
  'completed',
  'archived'
];

function computeBreakdown(items: string[]): { label: string; count: number; pct: number }[] {
  const map = new Map<string, number>();
  items.forEach((raw) => {
    const clean = raw.trim();
    if (!clean) return;
    map.set(clean, (map.get(clean) || 0) + 1);
  });
  const total = Array.from(map.values()).reduce((sum, n) => sum + n, 0) || 1;
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count]) => ({
      label,
      count,
      pct: Math.round((count / total) * 100)
    }));
}

export default function AdminSubmissionsPanel({
  onQuickInviteEmail,
  onCountUpdate
}: AdminSubmissionsPanelProps) {
  const [items, setItems] = useState<FormSubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | FormSubmissionType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | FormSubmissionStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [memoDrafts, setMemoDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedMemoId, setSavedMemoId] = useState<string | null>(null);

  const loadSubmissions = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const list = await fetchFormSubmissions();
      setItems(list);
      const drafts: Record<string, string> = {};
      list.forEach((row) => {
        drafts[row.id] = row.adminMemo;
      });
      setMemoDrafts(drafts);
      onCountUpdate?.(
        list.filter((row) => row.status === 'new').length,
        list.length
      );
    } catch (err) {
      console.error('Failed to load submissions:', err);
      setErrorMsg(
        '접수 내역을 불러오지 못했습니다. Firebase Console에 최신 firestore.rules가 게시되었는지 확인해 주세요.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== 'ALL' && item.formType !== typeFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.contact.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.organization.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q) ||
        item.adminMemo.toLowerCase().includes(q)
      );
    });
  }, [items, typeFilter, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    const total = items.length;
    const newCount = items.filter((i) => i.status === 'new').length;
    const activeCount = items.filter(
      (i) => i.status === 'contacted' || i.status === 'in_progress'
    ).length;
    const completedCount = items.filter((i) => i.status === 'completed').length;

    const byType = ALL_FORM_TYPES.map((t) => {
      const count = items.filter((i) => i.formType === t).length;
      return {
        type: t,
        label: FORM_TYPE_LABELS[t],
        color: FORM_TYPE_COLORS[t],
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0
      };
    });

    const scopeItems = typeFilter === 'ALL' ? items : items.filter((i) => i.formType === typeFilter);
    const tierOrBudgetBreakdown =
      typeFilter === 'project_inquiry'
        ? computeBreakdown(scopeItems.map((i) => i.budget))
        : computeBreakdown(scopeItems.map((i) => i.tier));

    const categoryBreakdown = computeBreakdown(
      scopeItems.flatMap((i) => i.categories || [])
    );

    return {
      total,
      newCount,
      activeCount,
      completedCount,
      byType,
      tierOrBudgetBreakdown,
      categoryBreakdown
    };
  }, [items, typeFilter]);

  const handleStatusChange = async (id: string, nextStatus: FormSubmissionStatus) => {
    setSavingId(id);
    try {
      await updateFormSubmission(id, { status: nextStatus });
      const nextList = items.map((row) =>
        row.id === id ? { ...row, status: nextStatus } : row
      );
      setItems(nextList);
      onCountUpdate?.(
        nextList.filter((row) => row.status === 'new').length,
        nextList.length
      );
    } catch (err) {
      console.error('Status update failed:', err);
      alert('상태 변경 중 오류가 발생했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveMemo = async (id: string) => {
    setSavingId(id);
    try {
      const nextMemo = memoDrafts[id] || '';
      await updateFormSubmission(id, { adminMemo: nextMemo });
      setItems((prev) =>
        prev.map((row) => (row.id === id ? { ...row, adminMemo: nextMemo } : row))
      );
      setSavedMemoId(id);
      window.setTimeout(() => setSavedMemoId((cur) => (cur === id ? null : cur)), 1800);
    } catch (err) {
      console.error('Memo update failed:', err);
      alert('메모 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`"${name}"님의 접수 내역을 영구 삭제하시겠습니까?`)) return;
    try {
      await deleteFormSubmission(id);
      const nextList = items.filter((row) => row.id !== id);
      setItems(nextList);
      onCountUpdate?.(
        nextList.filter((row) => row.status === 'new').length,
        nextList.length
      );
    } catch (err) {
      console.error('Delete submission failed:', err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Free Tier & Security Info Banner */}
      <div className="p-4 bg-[#0d1208] border border-[#ccff00]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5 text-[#f4f4f0]/85 leading-relaxed">
          <ShieldCheck size={16} className="text-[#ccff00] shrink-0 mt-0.5" />
          <div>
            <strong className="text-[#ccff00]">0원 무료 요금제(Spark)</strong> · Firestore 무료 한도(일 2만 건 접수 · 1GiB 저장 ≈ 텍스트 50만 건+) 내에서 과금 없이 운영되며, 고객 정보는{' '}
            <strong className="text-white">대표님 관리자 계정만</strong> 조회·관리할 수 있습니다.
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadSubmissions}
            disabled={loading}
            className="px-3 py-2 border border-white/20 hover:border-[#ccff00] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>새로고침</span>
          </button>
          <button
            type="button"
            onClick={() => exportSubmissionsToCsv(filteredItems)}
            disabled={filteredItems.length === 0}
            className="px-3.5 py-2 bg-[#ccff00] text-black hover:bg-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Download size={13} />
            <span>엑셀(CSV) 다운로드</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-[#0d0d0d] border border-white/15">
          <div className="text-[10px] font-extrabold tracking-widest text-white/50 mb-1">
            전체 접수
          </div>
          <div className="text-3xl font-black text-white">{stats.total}건</div>
        </div>
        <div className="p-4 bg-[#0d0d0d] border border-[#ccff00]/45">
          <div className="text-[10px] font-extrabold tracking-widest text-[#ccff00] mb-1">
            신규 미확인
          </div>
          <div className="text-3xl font-black text-[#ccff00]">{stats.newCount}건</div>
        </div>
        <div className="p-4 bg-[#0d0d0d] border border-[#28B8E8]/35">
          <div className="text-[10px] font-extrabold tracking-widest text-[#28B8E8] mb-1">
            연락 · 상담 중
          </div>
          <div className="text-3xl font-black text-[#28B8E8]">{stats.activeCount}건</div>
        </div>
        <div className="p-4 bg-[#0d0d0d] border border-[#34D17A]/35">
          <div className="text-[10px] font-extrabold tracking-widest text-[#34D17A] mb-1">
            등록 · 계약 완료
          </div>
          <div className="text-3xl font-black text-[#34D17A]">{stats.completedCount}건</div>
        </div>
      </div>

      {/* Visual Statistics Panel (Google Forms Summary Style) */}
      <div className="border-[3px] border-[#f4f4f0] bg-[#0d0d0d] p-6 space-y-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold uppercase tracking-wider text-[#ccff00] flex items-center gap-2">
            <BarChart3 size={18} /> 접수 통계 요약
          </h2>
          <span className="text-[11px] text-white/50">
            {typeFilter === 'ALL' ? '전체 폼 기준' : `${FORM_TYPE_LABELS[typeFilter]} 필터 기준`}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: By Form Type */}
          <div className="p-4 bg-black border border-white/10 space-y-3">
            <div className="text-xs font-extrabold text-white/80">폼 유형별 접수 현황</div>
            {stats.byType.map((row) => (
              <div key={row.type} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-white/85 font-semibold">{row.label}</span>
                  <span className="font-bold tabular-nums" style={{ color: row.color }}>
                    {row.count}건 ({row.pct}%)
                  </span>
                </div>
                <div className="h-2 bg-white/10 overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${row.pct}%`, backgroundColor: row.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Chart 2: Tier or Budget Breakdown */}
          <div className="p-4 bg-black border border-white/10 space-y-3">
            <div className="text-xs font-extrabold text-white/80">
              {typeFilter === 'project_inquiry'
                ? '제작 의뢰 예산 구간 분포'
                : '희망 수강 규모 / 인원 분포'}
            </div>
            {stats.tierOrBudgetBreakdown.length === 0 ? (
              <div className="text-xs text-white/40 py-6 text-center">아직 응답 데이터가 없습니다.</div>
            ) : (
              stats.tierOrBudgetBreakdown.map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex justify-between gap-2 text-xs">
                    <span className="text-white/80 truncate">{row.label}</span>
                    <span className="font-bold text-[#ccff00] shrink-0 tabular-nums">
                      {row.count}건 ({row.pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 overflow-hidden">
                    <div className="h-full bg-[#ccff00]" style={{ width: `${row.pct}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chart 3: Selected Categories / Specialties */}
          <div className="p-4 bg-black border border-white/10 space-y-3">
            <div className="text-xs font-extrabold text-white/80">
              관심 · 의뢰 · 전문 분야 TOP 분포
            </div>
            {stats.categoryBreakdown.length === 0 ? (
              <div className="text-xs text-white/40 py-6 text-center">아직 응답 데이터가 없습니다.</div>
            ) : (
              stats.categoryBreakdown.map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex justify-between gap-2 text-xs">
                    <span className="text-white/80 truncate">{row.label}</span>
                    <span className="font-bold text-[#28B8E8] shrink-0 tabular-nums">
                      {row.count}건 ({row.pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 overflow-hidden">
                    <div className="h-full bg-[#28B8E8]" style={{ width: `${row.pct}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="p-4 bg-[#0d0d0d] border border-white/15 space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-extrabold border cursor-pointer ${
              typeFilter === 'ALL'
                ? 'bg-[#ccff00] text-black border-[#ccff00]'
                : 'bg-black text-white/70 border-white/20 hover:border-[#ccff00]'
            }`}
          >
            전체 ({items.length})
          </button>
          {ALL_FORM_TYPES.map((t) => {
            const count = items.filter((i) => i.formType === t).length;
            const active = typeFilter === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 text-xs font-extrabold border cursor-pointer ${
                  active
                    ? 'bg-[#ccff00] text-black border-[#ccff00]'
                    : 'bg-black text-white/70 border-white/20 hover:border-[#ccff00]'
                }`}
              >
                {FORM_TYPE_LABELS[t]} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 text-[11px] font-bold border cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'border-white text-white bg-white/10'
                  : 'border-white/15 text-white/50 hover:text-white'
              }`}
            >
              모든 상태
            </button>
            {ALL_STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-[11px] font-bold border cursor-pointer ${
                  statusFilter === st
                    ? 'border-[#ccff00] text-[#ccff00] bg-[#ccff00]/10'
                    : 'border-white/15 text-white/50 hover:text-white'
                }`}
              >
                {STATUS_LABELS[st]}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="이름, 연락처, 이메일, 내용 검색"
              className="w-full pl-9 pr-3 py-2 bg-black border border-white/20 text-xs text-white outline-none focus:border-[#ccff00]"
            />
          </div>
        </div>
      </div>

      {/* Submission List */}
      {errorMsg && (
        <div className="p-4 border border-red-400/50 bg-red-950/30 text-red-200 text-xs">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="p-12 border border-white/10 bg-[#0d0d0d] flex items-center justify-center gap-3 text-xs text-white/60">
          <Loader2 size={16} className="animate-spin text-[#ccff00]" />
          <span>접수 내역을 불러오는 중입니다...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 border border-white/10 bg-[#0d0d0d] text-center space-y-2">
          <Inbox size={28} className="mx-auto text-white/25" />
          <p className="text-sm font-bold text-white/65">조건에 해당하는 접수 내역이 없습니다.</p>
          <p className="text-xs text-white/40">
            방문자가 사이트 내 신청·문의 폼을 제출하면 이 목록에 실시간으로 쌓입니다.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const typeColor = FORM_TYPE_COLORS[item.formType];
            const statusColor = STATUS_COLORS[item.status];
            return (
              <div
                key={item.id}
                className="p-5 sm:p-6 bg-[#0d0d0d] border border-white/15 hover:border-white/30 transition-colors space-y-4"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="text-[10px] font-extrabold px-2.5 py-1 border"
                      style={{ borderColor: typeColor, color: typeColor }}
                    >
                      {FORM_TYPE_LABELS[item.formType]}
                    </span>
                    <span
                      className="text-[10px] font-extrabold px-2 py-1 text-black"
                      style={{ backgroundColor: statusColor }}
                    >
                      {STATUS_LABELS[item.status]}
                    </span>
                    <span className="text-xs text-white/45 font-mono">{item.createdAtLabel}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      aria-label={`${item.name} 진행 상태 변경`}
                      value={item.status}
                      disabled={savingId === item.id}
                      onChange={(e) =>
                        handleStatusChange(item.id, e.target.value as FormSubmissionStatus)
                      }
                      className="bg-black border border-white/25 px-2.5 py-1.5 text-xs font-bold text-white outline-none focus:border-[#ccff00]"
                    >
                      {ALL_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {STATUS_LABELS[st]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.name)}
                      title="삭제"
                      className="p-2 border border-white/15 text-white/45 hover:text-red-400 hover:border-red-400/50 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Applicant Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-lg font-extrabold text-white">{item.name}</span>
                      {item.organization && (
                        <span className="text-xs font-bold text-[#ccff00]">
                          ({item.organization})
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-white/75">
                      <a
                        href={`tel:${item.contact.replace(/[^0-9+]/g, '')}`}
                        className="inline-flex items-center gap-1 hover:text-[#ccff00]"
                      >
                        <Phone size={12} className="text-[#ccff00]" />
                        <span>{item.contact}</span>
                      </a>
                      {item.email && (
                        <a
                          href={`mailto:${item.email}`}
                          className="inline-flex items-center gap-1 hover:text-[#28B8E8]"
                        >
                          <Mail size={12} className="text-[#28B8E8]" />
                          <span>{item.email}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="text-xs space-y-1 text-white/75">
                    {item.tier && (
                      <div>
                        <strong className="text-white/45 mr-1.5">규모/유형:</strong>
                        <span>{item.tier}</span>
                      </div>
                    )}
                    {item.sessions && (
                      <div>
                        <strong className="text-white/45 mr-1.5">희망 회차:</strong>
                        <span>{item.sessions}</span>
                      </div>
                    )}
                    {item.budget && (
                      <div>
                        <strong className="text-white/45 mr-1.5">예상 예산:</strong>
                        <span className="text-[#E02898] font-bold">{item.budget}</span>
                      </div>
                    )}
                    {item.schedulePref && (
                      <div>
                        <strong className="text-white/45 mr-1.5">일정/납기:</strong>
                        <span>{item.schedulePref}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Categories / Portfolio */}
                {(item.categories.length > 0 || item.portfolioUrl) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {item.categories.map((cat) => (
                      <span
                        key={cat}
                        className="text-[11px] font-bold px-2.5 py-1 bg-white/5 border border-white/15 text-white/85"
                      >
                        {cat}
                      </span>
                    ))}
                    {item.portfolioUrl && (
                      <a
                        href={item.portfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#28B8E8] hover:underline ml-auto"
                      >
                        <span>참고 / 포트폴리오 링크</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                )}

                {/* Message */}
                {item.message && (
                  <div className="p-3.5 bg-black border border-white/10 text-xs sm:text-sm text-white/85 leading-relaxed whitespace-pre-wrap break-words">
                    {item.message}
                  </div>
                )}

                {/* Quick Actions + Admin Memo */}
                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <input
                    type="text"
                    value={memoDrafts[item.id] ?? item.adminMemo}
                    onChange={(e) =>
                      setMemoDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    placeholder="상담 메모 (예: 12/1 통화 완료, 오후반 희망)"
                    className="flex-1 bg-black border border-white/20 px-3 py-2 text-xs text-white outline-none focus:border-[#ccff00]"
                  />
                  <button
                    type="button"
                    disabled={savingId === item.id}
                    onClick={() => handleSaveMemo(item.id)}
                    className="px-4 py-2 border border-[#ccff00] text-[#ccff00] hover:bg-[#ccff00] hover:text-black text-xs font-extrabold cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {savedMemoId === item.id ? (
                      <>
                        <Check size={13} />
                        <span>메모 저장됨</span>
                      </>
                    ) : (
                      <span>메모 저장</span>
                    )}
                  </button>

                  {item.formType === 'instructor_recruit' && item.email && onQuickInviteEmail && (
                    <button
                      type="button"
                      onClick={() => onQuickInviteEmail(item.email, `${item.name} 강사`)}
                      className="px-4 py-2 bg-[#28B8E8] text-black hover:bg-white text-xs font-extrabold cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <UserPlus size={13} />
                      <span>강사 초대 링크 바로 발급 →</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
