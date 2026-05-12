import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Send, Loader2, Sparkles, Check, X, MessageSquare, BarChart3,
  ArrowLeft, Trash2, Undo2, Flame, Search, Download, Repeat,
  AlertTriangle, Settings, ChevronRight, Plus
} from 'lucide-react';
import './storage.js';
import { callClaude } from './api.js';

const C = {
  bg: '#0F0E0C',
  panel: '#1A1815',
  panelHi: '#221F1B',
  border: '#2A2722',
  borderHi: '#3A352E',
  text: '#F2EDE4',
  textDim: '#9A938A',
  textMuted: '#5C5750',
  accent: '#E8A84C',
  accentDim: '#8C6B30',
  positive: '#7DBE93',
  negative: '#E07B7B',
  warm: '#D49C5A'
};

const FONTS_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700;9..144,800;9..144,900&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { margin: 0; background: ${C.bg}; }
  .display { font-family: 'Fraunces', Georgia, serif; font-variation-settings: 'opsz' 144; letter-spacing: -0.03em; }
  .body { font-family: 'Instrument Sans', -apple-system, sans-serif; }
  .num { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
  input, textarea, button, select { font-family: inherit; }
  input:focus, textarea:focus, button:focus, select:focus { outline: none; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
  @keyframes pop { 0% { transform: scale(0.9); opacity: 0; } 60% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
  .pop { animation: pop 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
  @keyframes flicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  .flicker { animation: flicker 2s ease-in-out infinite; }
  @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  .shimmer { background: linear-gradient(90deg, transparent, ${C.borderHi}, transparent); background-size: 200% 100%; animation: shimmer 2s linear infinite; }
  .btn-press:active { transform: scale(0.97); }
  .btn-press { transition: transform 0.1s; }
  .modal-bg { animation: fadeUp 0.2s ease-out both; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .animate-spin { animation: spin 1s linear infinite; }
`;

const today = () => new Date().toISOString().split('T')[0];
const fmt = (n) => {
  if (n == null || isNaN(n)) return '₹0';
  const abs = Math.abs(n);
  if (abs >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
};
const fmtFull = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Late night';
};

const PERSONAL_EXPENSE_CATS = ['Food', 'Transport', 'Housing', 'Shopping', 'Health', 'Entertainment', 'Subscriptions', 'Utilities', 'Personal Care', 'Education', 'Family', 'Debt/EMI', 'Other'];
const BUSINESS_EXPENSE_CATS = ['Software', 'Marketing', 'Travel', 'Office', 'Equipment', 'Professional Services', 'Salaries', 'Inventory', 'Taxes', 'Other Business'];
const PERSONAL_INCOME_CATS = ['Salary', 'Freelance', 'Investment', 'Rental', 'Gift', 'Other Personal'];
const BUSINESS_INCOME_CATS = ['Sales', 'Service Revenue', 'Recurring Revenue', 'Other Business'];

const S = {
  async get(key, def) {
    try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : def; }
    catch { return def; }
  },
  async set(key, val) {
    try { await window.storage.set(key, JSON.stringify(val)); } catch {}
  }
};

const parseTxnSystem = `Parse a financial transaction. Currency INR, India.
Output ONLY valid JSON: { "type": "income"|"expense", "amount": number, "category": string, "scope": "personal"|"business", "description": string }
Personal expense cats: ${PERSONAL_EXPENSE_CATS.join(', ')}.
Business expense cats: ${BUSINESS_EXPENSE_CATS.join(', ')}.
Personal income: ${PERSONAL_INCOME_CATS.join(', ')}.
Business income: ${BUSINESS_INCOME_CATS.join(', ')}.
Default scope personal. "client"/"work" hints business.`;

const buildCFOSystem = (todayStats, monthStats, txns, budgets) => `You are a CFO advising an ADHD entrepreneur. Currency INR. India.
Rules: ONE action per response. Under 80 words. Plain language. Lead with the headline. Push income growth over expense cutting. Indian context (PPF, NPS, ELSS, FD, mutual funds, GST). End every response with one concrete action under 10 minutes.
TODAY: ${JSON.stringify(todayStats)}
MONTH: ${JSON.stringify(monthStats)}
BUDGETS: ${JSON.stringify(budgets)}
RECENT TXNS: ${JSON.stringify(txns.slice(0, 15).map(t => ({d: t.date, type: t.type, amt: t.amount, cat: t.category, scope: t.scope})))}`;

const calcStreak = (txns) => {
  if (txns.length === 0) return 0;
  const dates = new Set(txns.map(t => t.date));
  let streak = 0;
  let d = new Date();
  if (dates.has(today())) { streak = 1; d.setDate(d.getDate() - 1); }
  else { d.setDate(d.getDate() - 1); }
  while (true) {
    const ds = d.toISOString().split('T')[0];
    if (dates.has(ds)) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
};

const processRecurring = (recurring, txns) => {
  const today_ = today();
  const newTxns = [];
  const updatedRecurring = recurring.map(r => {
    const lastDate = r.lastApplied || r.startDate;
    if (!lastDate) return r;
    let next = new Date(lastDate);
    const todayDate = new Date(today_);
    let applied = false;
    while (true) {
      const nextDate = new Date(next);
      if (r.frequency === 'daily') nextDate.setDate(nextDate.getDate() + 1);
      else if (r.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
      else if (r.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
      if (nextDate > todayDate) break;
      const dateStr = nextDate.toISOString().split('T')[0];
      const exists = txns.some(t => t.recurringId === r.id && t.date === dateStr);
      if (!exists) {
        newTxns.push({
          id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
          date: dateStr,
          type: r.type,
          scope: r.scope,
          amount: r.amount,
          category: r.category,
          classification: r.type === 'expense' ? 'need' : 'active',
          description: r.description + ' (auto)',
          recurringId: r.id,
          createdAt: Date.now()
        });
        applied = true;
      }
      next = nextDate;
    }
    return applied ? { ...r, lastApplied: today_ } : r;
  });
  return { newTxns, updatedRecurring };
};

const exportCSV = (txns) => {
  const headers = ['Date', 'Type', 'Scope', 'Amount', 'Category', 'Description'];
  const rows = txns.map(t => [
    t.date, t.type, t.scope, t.amount, t.category,
    `"${(t.description || '').replace(/"/g, '""')}"`
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cfo-ledger-${today()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ============================================================
// EDIT MODAL
// ============================================================
const EditModal = ({ txn, onSave, onClose, onDelete }) => {
  const [t, setT] = useState({ ...txn });
  if (!t) return null;
  const cats = t.type === 'income'
    ? (t.scope === 'business' ? BUSINESS_INCOME_CATS : PERSONAL_INCOME_CATS)
    : (t.scope === 'business' ? BUSINESS_EXPENSE_CATS : PERSONAL_EXPENSE_CATS);

  return (
    <div className="modal-bg" onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div onClick={(e) => e.stopPropagation()} className="pop" style={{
        background: C.panel, border: `1px solid ${C.borderHi}`, borderRadius: '14px',
        padding: '24px', maxWidth: '440px', width: '100%', maxHeight: '90vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div className="display" style={{ fontSize: '20px', color: C.text, fontWeight: 600 }}>Edit transaction</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          <button onClick={() => setT({ ...t, type: 'expense' })} className="btn-press" style={{
            padding: '10px', background: t.type === 'expense' ? C.negative : 'transparent',
            color: t.type === 'expense' ? C.bg : C.textDim, border: `1px solid ${t.type === 'expense' ? C.negative : C.border}`,
            borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em'
          }}>Expense</button>
          <button onClick={() => setT({ ...t, type: 'income' })} className="btn-press" style={{
            padding: '10px', background: t.type === 'income' ? C.positive : 'transparent',
            color: t.type === 'income' ? C.bg : C.textDim, border: `1px solid ${t.type === 'income' ? C.positive : C.border}`,
            borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em'
          }}>Income</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          <button onClick={() => setT({ ...t, scope: 'personal' })} className="btn-press" style={{
            padding: '10px', background: t.scope === 'personal' ? C.accent : 'transparent',
            color: t.scope === 'personal' ? C.bg : C.textDim, border: `1px solid ${t.scope === 'personal' ? C.accent : C.border}`,
            borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600
          }}>Personal</button>
          <button onClick={() => setT({ ...t, scope: 'business' })} className="btn-press" style={{
            padding: '10px', background: t.scope === 'business' ? C.accent : 'transparent',
            color: t.scope === 'business' ? C.bg : C.textDim, border: `1px solid ${t.scope === 'business' ? C.accent : C.border}`,
            borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600
          }}>Business</button>
        </div>

        <label style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Amount</label>
        <input type="number" value={t.amount} onChange={(e) => setT({ ...t, amount: parseFloat(e.target.value) || 0 })}
          className="num"
          style={{ width: '100%', background: C.panelHi, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px 16px', color: C.text, fontSize: '20px', marginBottom: '12px', fontWeight: 500 }} />

        <label style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Date</label>
        <input type="date" value={t.date} onChange={(e) => setT({ ...t, date: e.target.value })}
          style={{ width: '100%', background: C.panelHi, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px 16px', color: C.text, fontSize: '14px', marginBottom: '12px' }} />

        <label style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Category</label>
        <select value={t.category} onChange={(e) => setT({ ...t, category: e.target.value })}
          style={{ width: '100%', background: C.panelHi, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px 16px', color: C.text, fontSize: '14px', marginBottom: '12px' }}>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <label style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Description</label>
        <input type="text" value={t.description || ''} onChange={(e) => setT({ ...t, description: e.target.value })}
          style={{ width: '100%', background: C.panelHi, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px 16px', color: C.text, fontSize: '14px', marginBottom: '20px' }} />

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => onDelete(t.id)} className="btn-press" style={{
            padding: '14px', background: 'transparent', color: C.negative,
            border: `1px solid ${C.negative}`, borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
          }}>
            <Trash2 size={14} /> Delete
          </button>
          <button onClick={() => onSave(t)} className="btn-press" style={{
            flex: 1, padding: '14px', background: C.accent, color: C.bg,
            border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.1em'
          }}>Save changes</button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// TODAY SCREEN
// ============================================================
const Today = ({ txns, onAdd, onUndo, lastDeleted, onOpenCFO, onOpenStats, onOpenSettings, budgets, onEdit }) => {
  const [input, setInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const todayTxns = txns.filter(t => t.date === today());
  const todayIn = todayTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const todayOut = todayTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const todayNet = todayIn - todayOut;
  const streak = useMemo(() => calcStreak(txns), [txns]);
  const monthTxns = txns.filter(t => t.date.startsWith(today().slice(0, 7)));
  const monthIn = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthOut = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const budgetAlerts = useMemo(() => {
    const alerts = [];
    Object.entries(budgets || {}).forEach(([cat, limit]) => {
      if (!limit || limit <= 0) return;
      const spent = monthTxns.filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + t.amount, 0);
      const pct = spent / limit;
      if (pct >= 1) alerts.push({ cat, spent, limit, pct, level: 'over' });
      else if (pct >= 0.8) alerts.push({ cat, spent, limit, pct, level: 'warn' });
    });
    return alerts.sort((a, b) => b.pct - a.pct);
  }, [monthTxns, budgets]);

  useEffect(() => {
    if (monthTxns.length < 3 || insight || insightLoading) return;
    setInsightLoading(true);
    callClaude(
      buildCFOSystem(
        { income: todayIn, expense: todayOut, net: todayNet, count: todayTxns.length },
        { income: monthIn, expense: monthOut, net: monthIn - monthOut, count: monthTxns.length },
        txns, budgets
      ),
      [{ role: 'user', content: 'Give me the single most important thing about my money right now. Under 50 words. End with one action today.' }],
      300
    ).then(setInsight).catch(() => setInsight('')).finally(() => setInsightLoading(false));
  }, [monthTxns.length]);

  const handleParse = async () => {
    if (!input.trim() || parsing) return;
    setParsing(true); setError('');
    try {
      const result = await callClaude(parseTxnSystem, [{ role: 'user', content: input }], 250);
      const parsed = JSON.parse(result.replace(/```json|```/g, '').trim());
      if (!parsed.amount || !parsed.type) throw new Error();
      setPreview(parsed);
    } catch { setError("Couldn't read that. Try again."); }
    finally { setParsing(false); }
  };

  const confirmSave = () => {
    onAdd({
      id: Date.now().toString(),
      date: today(),
      type: preview.type,
      scope: preview.scope || 'personal',
      amount: preview.amount,
      category: preview.category || 'Other',
      classification: preview.type === 'expense' ? 'want' : 'active',
      description: preview.description || input,
      createdAt: Date.now()
    });
    setInput(''); setPreview(null); setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div style={{ minHeight: '100vh', padding: '20px 20px 60px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', marginBottom: '28px' }}>
          <div>
            <div style={{ fontSize: '13px', color: C.textDim }}>{greeting()}.</div>
            <div className="display" style={{ fontSize: '22px', color: C.text, fontWeight: 600, marginTop: '2px' }}>
              {new Date().toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {streak > 0 && (
              <div className="pop" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: C.panel, border: `1px solid ${C.border}`, borderRadius: '100px' }}>
                <Flame size={14} style={{ color: C.accent }} />
                <span className="num" style={{ fontSize: '14px', color: C.text, fontWeight: 600 }}>{streak}</span>
                <span style={{ fontSize: '11px', color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>d</span>
              </div>
            )}
            <button onClick={onOpenSettings} className="btn-press" style={{
              padding: '10px', background: C.panel, border: `1px solid ${C.border}`, borderRadius: '50%',
              color: C.textDim, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Settings size={14} />
            </button>
          </div>
        </div>

        <div className="fade-up" style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '12px', fontWeight: 600 }}>Today</div>
          {todayTxns.length === 0 ? (
            <div className="display" style={{ fontSize: '30px', color: C.textDim, fontWeight: 500 }}>Nothing yet.</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', flexWrap: 'wrap' }}>
              {todayIn > 0 && <span className="num" style={{ fontSize: '30px', color: C.positive, fontWeight: 500 }}>+{fmt(todayIn)}</span>}
              {todayOut > 0 && <span className="num" style={{ fontSize: '30px', color: C.text, fontWeight: 500 }}>−{fmt(todayOut)}</span>}
              {todayNet !== 0 && todayIn > 0 && todayOut > 0 && (
                <div className="num" style={{ fontSize: '13px', color: C.textDim }}>
                  net {todayNet >= 0 ? '+' : '−'}{fmt(Math.abs(todayNet))}
                </div>
              )}
            </div>
          )}
        </div>

        {budgetAlerts.length > 0 && (
          <div className="fade-up" style={{ marginBottom: '24px' }}>
            {budgetAlerts.slice(0, 2).map(a => (
              <div key={a.cat} style={{
                background: a.level === 'over' ? 'rgba(224, 123, 123, 0.08)' : 'rgba(212, 156, 90, 0.08)',
                border: `1px solid ${a.level === 'over' ? C.negative : C.warm}`,
                borderRadius: '12px', padding: '14px 18px', marginBottom: '8px',
                display: 'flex', alignItems: 'center', gap: '12px'
              }}>
                <AlertTriangle size={16} style={{ color: a.level === 'over' ? C.negative : C.warm, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', color: C.text, fontWeight: 500 }}>
                    {a.cat} budget {a.level === 'over' ? 'broken' : `${(a.pct * 100).toFixed(0)}% used`}
                  </div>
                  <div className="num" style={{ fontSize: '11px', color: C.textDim, marginTop: '2px' }}>
                    {fmt(a.spent)} of {fmt(a.limit)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="fade-up" style={{ marginBottom: '24px' }}>
          {!preview && !justSaved && (
            <div style={{ position: 'relative' }}>
              <input ref={inputRef} type="text" value={input}
                onChange={(e) => { setInput(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleParse()}
                placeholder="spent 500 on lunch · got paid 25000"
                disabled={parsing}
                style={{
                  width: '100%', background: C.panel,
                  border: `2px solid ${input ? C.accent : C.border}`,
                  borderRadius: '14px', color: C.text,
                  padding: '22px 70px 22px 22px', fontSize: '17px',
                  transition: 'border-color 0.2s', fontFamily: 'inherit'
                }} />
              <button onClick={handleParse} disabled={!input.trim() || parsing} className="btn-press" style={{
                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                width: '46px', height: '46px',
                background: input.trim() ? C.accent : C.border,
                color: input.trim() ? C.bg : C.textMuted,
                border: 'none', borderRadius: '10px',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {parsing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          )}

          {preview && !justSaved && (
            <div className="pop" style={{ background: C.panel, border: `2px solid ${C.accent}`, borderRadius: '14px', padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px' }}>
                    {preview.type === 'income' ? 'Received' : 'Spent'}
                  </div>
                  <div className="num display" style={{ fontSize: '34px', color: preview.type === 'income' ? C.positive : C.text, fontWeight: 600, lineHeight: 1 }}>
                    {preview.type === 'income' ? '+' : '−'}{fmtFull(preview.amount)}
                  </div>
                </div>
                <button onClick={() => setPreview(null)} style={{ background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', padding: '4px' }}>
                  <X size={18} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', padding: '4px 10px', background: C.panelHi, border: `1px solid ${C.border}`, borderRadius: '20px', color: C.textDim, textTransform: 'capitalize' }}>{preview.scope}</span>
                <span style={{ fontSize: '11px', padding: '4px 10px', background: C.panelHi, border: `1px solid ${C.border}`, borderRadius: '20px', color: C.textDim }}>{preview.category}</span>
                {preview.description && <span style={{ fontSize: '11px', padding: '4px 10px', color: C.textDim }}>"{preview.description}"</span>}
              </div>
              <button onClick={confirmSave} className="btn-press" style={{
                width: '100%', padding: '14px', background: C.accent, color: C.bg,
                border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}>
                <Check size={16} /> Save it
              </button>
            </div>
          )}

          {justSaved && (
            <div className="pop" style={{ background: C.panel, border: `2px solid ${C.positive}`, borderRadius: '14px', padding: '24px', textAlign: 'center' }}>
              <div style={{ width: '44px', height: '44px', background: C.positive, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Check size={22} style={{ color: C.bg }} strokeWidth={3} />
              </div>
              <div className="display" style={{ fontSize: '19px', color: C.text, fontWeight: 600 }}>Logged.</div>
              <div style={{ fontSize: '13px', color: C.textDim, marginTop: '4px' }}>
                {streak >= 3 ? `${streak} day streak going.` : 'Keep it going.'}
              </div>
            </div>
          )}

          {error && <div style={{ color: C.negative, fontSize: '13px', marginTop: '10px', textAlign: 'center' }}>{error}</div>}

          {lastDeleted && (
            <button onClick={onUndo} style={{
              marginTop: '12px', width: '100%', padding: '12px',
              background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '10px',
              color: C.textDim, fontSize: '13px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}>
              <Undo2 size={14} /> Undo delete
            </button>
          )}
        </div>

        {(insight || insightLoading) && monthTxns.length >= 3 && (
          <div className="fade-up" style={{
            background: C.panel, border: `1px solid ${C.border}`, borderRadius: '14px',
            padding: '20px 24px', marginBottom: '24px', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: C.accent }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <Sparkles size={12} style={{ color: C.accent }} />
              <span style={{ fontSize: '10px', color: C.accent, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 600 }}>Your CFO says</span>
            </div>
            {insightLoading ? <div style={{ height: '60px', borderRadius: '6px' }} className="shimmer" /> :
              <div className="display" style={{ fontSize: '16px', color: C.text, lineHeight: 1.5, fontWeight: 500 }}>{insight}</div>}
          </div>
        )}

        {todayTxns.length > 0 && (
          <div className="fade-up" style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '12px', fontWeight: 600 }}>Today's log</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {todayTxns.slice(0, 10).map(t => (
                <div key={t.id} onClick={() => onEdit(t)} className="btn-press" style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 16px', background: C.panel, borderRadius: '8px', cursor: 'pointer'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', color: C.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.description || t.category}
                      {t.recurringId && <Repeat size={10} style={{ marginLeft: '6px', color: C.textMuted, display: 'inline' }} />}
                    </div>
                    <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>{t.category} · {t.scope}</div>
                  </div>
                  <div className="num" style={{ fontSize: '15px', color: t.type === 'income' ? C.positive : C.text, fontWeight: 500, marginLeft: '12px' }}>
                    {t.type === 'income' ? '+' : '−'}{fmt(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '28px' }}>
          <button onClick={onOpenStats} className="btn-press" style={{
            flex: 1, padding: '14px', background: C.panel, border: `1px solid ${C.border}`,
            borderRadius: '10px', color: C.text, fontSize: '13px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}>
            <BarChart3 size={14} /> See month
          </button>
          <button onClick={onOpenCFO} className="btn-press" style={{
            flex: 1, padding: '14px', background: C.panel, border: `1px solid ${C.border}`,
            borderRadius: '10px', color: C.text, fontSize: '13px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}>
            <MessageSquare size={14} /> Ask the CFO
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// CFO CHAT
// ============================================================
const CFOChat = ({ txns, history, setHistory, onBack, budgets }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const todayTxns = txns.filter(t => t.date === today());
  const monthTxns = txns.filter(t => t.date.startsWith(today().slice(0, 7)));

  const suggestions = ['What should I focus on today?', 'Where am I leaking money?', 'How do I grow my income?', 'Grade me this month'];

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [history, loading]);

  const send = async (msg) => {
    const m = msg || input;
    if (!m.trim() || loading) return;
    const newHist = [...history, { role: 'user', content: m }];
    setHistory(newHist); setInput(''); setLoading(true);
    try {
      const todayIn = todayTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const todayOut = todayTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const monthIn = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const monthOut = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      const sys = buildCFOSystem(
        { income: todayIn, expense: todayOut, net: todayIn - todayOut, count: todayTxns.length },
        { income: monthIn, expense: monthOut, net: monthIn - monthOut, count: monthTxns.length },
        txns, budgets
      );
      const r = await callClaude(sys, newHist, 600);
      setHistory([...newHist, { role: 'assistant', content: r }]);
    } catch { setHistory([...newHist, { role: 'assistant', content: 'Lost connection. Try again.' }]); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button onClick={onBack} className="btn-press" style={{ background: 'transparent', border: 'none', color: C.text, cursor: 'pointer', padding: '4px' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="display" style={{ fontSize: '18px', color: C.text, fontWeight: 600 }}>Your CFO</div>
          <div style={{ fontSize: '11px', color: C.textDim }}>Sees every transaction. Says what matters.</div>
        </div>
        {history.length > 0 && (
          <button onClick={() => setHistory([])} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: C.textMuted, fontSize: '12px', cursor: 'pointer' }}>Clear</button>
        )}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          {history.length === 0 ? (
            <div style={{ paddingTop: '40px' }}>
              <div className="display" style={{ fontSize: '26px', color: C.text, marginBottom: '8px', fontWeight: 600, lineHeight: 1.2 }}>Ask one question.</div>
              <div style={{ fontSize: '14px', color: C.textDim, marginBottom: '28px' }}>Get one straight answer with one action.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {suggestions.map(s => (
                  <button key={s} onClick={() => send(s)} className="btn-press" style={{
                    padding: '16px 20px', background: C.panel, border: `1px solid ${C.border}`,
                    borderRadius: '12px', color: C.text, fontSize: '15px', textAlign: 'left',
                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    {s} <ChevronRight size={16} style={{ color: C.textMuted }} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {history.map((m, i) => (
                <div key={i} className="fade-up" style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '85%', padding: '14px 18px',
                    background: m.role === 'user' ? C.accent : C.panel,
                    color: m.role === 'user' ? C.bg : C.text,
                    borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    fontSize: '15px', lineHeight: 1.5, whiteSpace: 'pre-wrap',
                    fontWeight: m.role === 'user' ? 500 : 400
                  }}>{m.content}</div>
                </div>
              ))}
              {loading && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: C.textDim, fontSize: '13px' }}><div className="flicker">●</div> thinking</div>}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 20px', borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', display: 'flex', gap: '8px' }}>
          <input ref={inputRef} type="text" value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Type your question..."
            style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`, borderRadius: '12px', color: C.text, padding: '14px 18px', fontSize: '15px' }} />
          <button onClick={() => send()} disabled={loading || !input.trim()} className="btn-press" style={{
            width: '52px', background: input.trim() ? C.accent : C.border,
            color: input.trim() ? C.bg : C.textMuted, border: 'none', borderRadius: '12px',
            cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// STATS
// ============================================================
const Stats = ({ txns, onDelete, onBack, onEdit, budgets }) => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const mk = today().slice(0, 7);
  const monthTxns = txns.filter(t => t.date.startsWith(mk));

  const income = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = income - expense;
  const rate = income > 0 ? net / income : 0;

  const businessIn = monthTxns.filter(t => t.type === 'income' && t.scope === 'business').reduce((s, t) => s + t.amount, 0);
  const businessOut = monthTxns.filter(t => t.type === 'expense' && t.scope === 'business').reduce((s, t) => s + t.amount, 0);
  const personalIn = monthTxns.filter(t => t.type === 'income' && t.scope === 'personal').reduce((s, t) => s + t.amount, 0);
  const personalOut = monthTxns.filter(t => t.type === 'expense' && t.scope === 'personal').reduce((s, t) => s + t.amount, 0);

  const byCat = monthTxns.filter(t => t.type === 'expense').reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
  const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const filtered = useMemo(() => {
    let base = search.trim() ? txns : monthTxns;
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(t =>
        (t.description || '').toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.scope.toLowerCase().includes(q)
      );
    }
    if (filter === 'income') base = base.filter(t => t.type === 'income');
    else if (filter === 'expense') base = base.filter(t => t.type === 'expense');
    return base;
  }, [txns, monthTxns, filter, search]);

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ padding: '20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button onClick={onBack} className="btn-press" style={{ background: 'transparent', border: 'none', color: C.text, cursor: 'pointer', padding: '4px' }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div className="display" style={{ fontSize: '18px', color: C.text, fontWeight: 600 }}>{new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' })}</div>
          <div style={{ fontSize: '11px', color: C.textDim }}>{monthTxns.length} this month · {txns.length} all-time</div>
        </div>
        <button onClick={() => exportCSV(txns)} className="btn-press" style={{
          padding: '8px 12px', background: C.panel, border: `1px solid ${C.border}`,
          borderRadius: '8px', color: C.textDim, cursor: 'pointer', fontSize: '12px',
          display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <Download size={12} /> CSV
        </button>
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '20px' }}>
        <div className="fade-up" style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px', marginBottom: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '10px', fontWeight: 600 }}>Savings rate this month</div>
          <div className="num display" style={{ fontSize: '56px', color: rate >= 0.2 ? C.positive : rate >= 0.1 ? C.warm : C.negative, fontWeight: 600, lineHeight: 1 }}>
            {(rate * 100).toFixed(0)}%
          </div>
          <div style={{ fontSize: '12px', color: C.textDim, marginTop: '10px' }}>
            {rate >= 0.3 ? 'Excellent. Now invest it.' :
             rate >= 0.2 ? 'Solid. Push for 30%.' :
             rate >= 0.1 ? 'Fragile. Tighten this week.' :
             rate > 0 ? 'Weak. Find one leak today.' :
             income === 0 ? 'No income logged yet.' :
             'Danger. Spending beats earning.'}
          </div>
        </div>

        <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' }}>In</div>
            <div className="num" style={{ fontSize: '17px', color: C.positive, fontWeight: 500 }}>{fmt(income)}</div>
          </div>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' }}>Out</div>
            <div className="num" style={{ fontSize: '17px', color: C.text, fontWeight: 500 }}>{fmt(expense)}</div>
          </div>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' }}>Net</div>
            <div className="num" style={{ fontSize: '17px', color: net >= 0 ? C.positive : C.negative, fontWeight: 500 }}>{fmt(net)}</div>
          </div>
        </div>

        {(businessIn + businessOut > 0) && (
          <div className="fade-up" style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '10px', fontWeight: 600 }}>Split</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '11px', color: C.textDim, marginBottom: '8px' }}>Business</div>
                <div className="num" style={{ fontSize: '19px', color: businessIn - businessOut >= 0 ? C.positive : C.negative, fontWeight: 500 }}>{fmt(businessIn - businessOut)}</div>
                <div className="num" style={{ fontSize: '11px', color: C.textMuted, marginTop: '4px' }}>{fmt(businessIn)} in · {fmt(businessOut)} out</div>
              </div>
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '11px', color: C.textDim, marginBottom: '8px' }}>Personal</div>
                <div className="num" style={{ fontSize: '19px', color: personalIn - personalOut >= 0 ? C.positive : C.negative, fontWeight: 500 }}>{fmt(personalIn - personalOut)}</div>
                <div className="num" style={{ fontSize: '11px', color: C.textMuted, marginTop: '4px' }}>{fmt(personalIn)} in · {fmt(personalOut)} out</div>
              </div>
            </div>
          </div>
        )}

        {topCats.length > 0 && (
          <div className="fade-up" style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '10px', fontWeight: 600 }}>Where your money went</div>
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px' }}>
              {topCats.map(([cat, amt], i) => {
                const pct = (amt / expense) * 100;
                const budget = budgets?.[cat];
                const budgetPct = budget > 0 ? (amt / budget) * 100 : null;
                return (
                  <div key={cat} style={{ marginBottom: i < topCats.length - 1 ? '14px' : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                      <span style={{ color: C.text }}>{cat}</span>
                      <span className="num" style={{ color: budgetPct >= 100 ? C.negative : budgetPct >= 80 ? C.warm : C.textDim }}>
                        {fmt(amt)}{budget > 0 && <span style={{ color: C.textMuted }}> / {fmt(budget)}</span>}
                      </span>
                    </div>
                    <div style={{ height: '4px', background: C.panelHi, borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: budgetPct >= 100 ? C.negative : budgetPct >= 80 ? C.warm : C.accent, transition: 'width 0.6s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="fade-up">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search all transactions..."
                style={{
                  width: '100%', background: C.panel, border: `1px solid ${C.border}`,
                  borderRadius: '10px', padding: '10px 12px 10px 36px', color: C.text, fontSize: '13px'
                }} />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', padding: '4px' }}>
                  <X size={14} />
                </button>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 600 }}>
                {search ? `${filtered.length} matches` : 'Transactions'}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['all', 'income', 'expense'].map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    padding: '4px 10px', fontSize: '11px',
                    background: filter === f ? C.accent : 'transparent',
                    color: filter === f ? C.bg : C.textDim,
                    border: `1px solid ${filter === f ? C.accent : C.border}`,
                    borderRadius: '20px', cursor: 'pointer', textTransform: 'capitalize'
                  }}>{f}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: C.textMuted, fontSize: '13px', background: C.panel, borderRadius: '12px' }}>
                {search ? `Nothing matches "${search}"` : 'Nothing here'}
              </div>
            ) : (
              filtered.slice(0, 200).map(t => (
                <div key={t.id} onClick={() => onEdit(t)} className="btn-press" style={{
                  display: 'flex', alignItems: 'center', padding: '12px 14px',
                  background: C.panel, borderRadius: '8px', gap: '10px', cursor: 'pointer'
                }}>
                  <div className="num" style={{ fontSize: '10px', color: C.textMuted, minWidth: '50px' }}>
                    {t.date.slice(5).replace('-', '/')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.description || t.category}
                      {t.recurringId && <Repeat size={10} style={{ marginLeft: '6px', color: C.textMuted, display: 'inline' }} />}
                    </div>
                    <div style={{ fontSize: '11px', color: C.textMuted }}>{t.category} · {t.scope}</div>
                  </div>
                  <div className="num" style={{ fontSize: '14px', color: t.type === 'income' ? C.positive : C.text, fontWeight: 500 }}>
                    {t.type === 'income' ? '+' : '−'}{fmt(t.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
          {filtered.length > 200 && (
            <div style={{ textAlign: 'center', padding: '12px', fontSize: '11px', color: C.textMuted }}>
              Showing first 200 of {filtered.length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// SETTINGS
// ============================================================
const SettingsScreen = ({ budgets, setBudgets, recurring, setRecurring, txns, onBack }) => {
  const [tab, setTab] = useState('budgets');
  const [showAddRec, setShowAddRec] = useState(false);
  const [newRec, setNewRec] = useState({ type: 'expense', scope: 'personal', amount: '', category: '', description: '', frequency: 'monthly', startDate: today() });

  const allCats = [...PERSONAL_EXPENSE_CATS, ...BUSINESS_EXPENSE_CATS];

  const updateBudget = (cat, value) => {
    const v = parseFloat(value);
    setBudgets({ ...budgets, [cat]: isNaN(v) ? 0 : v });
  };

  const addRecurring = () => {
    if (!newRec.amount || !newRec.description) return;
    const cats = newRec.type === 'income'
      ? (newRec.scope === 'business' ? BUSINESS_INCOME_CATS : PERSONAL_INCOME_CATS)
      : (newRec.scope === 'business' ? BUSINESS_EXPENSE_CATS : PERSONAL_EXPENSE_CATS);
    setRecurring([...recurring, {
      id: Date.now().toString(),
      type: newRec.type, scope: newRec.scope,
      amount: parseFloat(newRec.amount),
      category: newRec.category || cats[0],
      description: newRec.description,
      frequency: newRec.frequency, startDate: newRec.startDate,
      lastApplied: null, createdAt: Date.now()
    }]);
    setNewRec({ type: 'expense', scope: 'personal', amount: '', category: '', description: '', frequency: 'monthly', startDate: today() });
    setShowAddRec(false);
  };

  const deleteRecurring = (id) => setRecurring(recurring.filter(r => r.id !== id));

  const newRecCats = newRec.type === 'income'
    ? (newRec.scope === 'business' ? BUSINESS_INCOME_CATS : PERSONAL_INCOME_CATS)
    : (newRec.scope === 'business' ? BUSINESS_EXPENSE_CATS : PERSONAL_EXPENSE_CATS);

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ padding: '20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button onClick={onBack} className="btn-press" style={{ background: 'transparent', border: 'none', color: C.text, cursor: 'pointer', padding: '4px' }}>
          <ArrowLeft size={20} />
        </button>
        <div className="display" style={{ fontSize: '18px', color: C.text, fontWeight: 600 }}>Settings</div>
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button onClick={() => setTab('budgets')} className="btn-press" style={{
            flex: 1, padding: '12px', background: tab === 'budgets' ? C.accent : C.panel,
            color: tab === 'budgets' ? C.bg : C.text, border: `1px solid ${tab === 'budgets' ? C.accent : C.border}`,
            borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em'
          }}>Budgets</button>
          <button onClick={() => setTab('recurring')} className="btn-press" style={{
            flex: 1, padding: '12px', background: tab === 'recurring' ? C.accent : C.panel,
            color: tab === 'recurring' ? C.bg : C.text, border: `1px solid ${tab === 'recurring' ? C.accent : C.border}`,
            borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em'
          }}>Recurring</button>
        </div>

        {tab === 'budgets' && (
          <div className="fade-up">
            <div style={{ fontSize: '13px', color: C.textDim, marginBottom: '16px', lineHeight: 1.5 }}>
              Set a monthly cap per category. Warning at 80%, alert at 100%. Leave blank to skip.
            </div>
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
              {allCats.map((cat, i) => (
                <div key={cat} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderBottom: i < allCats.length - 1 ? `1px solid ${C.border}` : 'none'
                }}>
                  <span style={{ fontSize: '14px', color: C.text }}>{cat}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="num" style={{ fontSize: '13px', color: C.textMuted }}>₹</span>
                    <input type="number" value={budgets[cat] || ''} onChange={(e) => updateBudget(cat, e.target.value)}
                      placeholder="0" className="num"
                      style={{
                        width: '100px', background: C.panelHi, border: `1px solid ${C.border}`,
                        borderRadius: '6px', padding: '6px 10px', color: C.text, fontSize: '13px', textAlign: 'right'
                      }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'recurring' && (
          <div className="fade-up">
            <div style={{ fontSize: '13px', color: C.textDim, marginBottom: '16px', lineHeight: 1.5 }}>
              Rent, EMIs, salary, subscriptions. These log automatically when you open the app.
            </div>

            {recurring.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {recurring.map(r => (
                  <div key={r.id} style={{
                    background: C.panel, border: `1px solid ${C.border}`, borderRadius: '10px',
                    padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px'
                  }}>
                    <Repeat size={14} style={{ color: C.accent }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', color: C.text, fontWeight: 500 }}>{r.description}</div>
                      <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '2px' }}>{r.category} · {r.scope} · {r.frequency}</div>
                    </div>
                    <div className="num" style={{ fontSize: '14px', color: r.type === 'income' ? C.positive : C.text, fontWeight: 500 }}>
                      {r.type === 'income' ? '+' : '−'}{fmt(r.amount)}
                    </div>
                    <button onClick={() => deleteRecurring(r.id)} style={{ background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', padding: '4px' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!showAddRec ? (
              <button onClick={() => setShowAddRec(true)} className="btn-press" style={{
                width: '100%', padding: '14px', background: 'transparent',
                border: `1px dashed ${C.border}`, borderRadius: '10px', color: C.textDim,
                fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}>
                <Plus size={14} /> Add recurring transaction
              </button>
            ) : (
              <div className="pop" style={{ background: C.panel, border: `1px solid ${C.borderHi}`, borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  <button onClick={() => setNewRec({...newRec, type: 'expense'})} style={{
                    padding: '8px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em',
                    background: newRec.type === 'expense' ? C.negative : 'transparent',
                    color: newRec.type === 'expense' ? C.bg : C.textDim,
                    border: `1px solid ${newRec.type === 'expense' ? C.negative : C.border}`,
                    borderRadius: '6px', cursor: 'pointer'
                  }}>Expense</button>
                  <button onClick={() => setNewRec({...newRec, type: 'income'})} style={{
                    padding: '8px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em',
                    background: newRec.type === 'income' ? C.positive : 'transparent',
                    color: newRec.type === 'income' ? C.bg : C.textDim,
                    border: `1px solid ${newRec.type === 'income' ? C.positive : C.border}`,
                    borderRadius: '6px', cursor: 'pointer'
                  }}>Income</button>
                </div>

                <input type="text" placeholder="Description (e.g., House rent)" value={newRec.description}
                  onChange={(e) => setNewRec({...newRec, description: e.target.value})}
                  style={{ width: '100%', background: C.panelHi, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 12px', color: C.text, fontSize: '14px', marginBottom: '8px' }} />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <input type="number" placeholder="Amount" value={newRec.amount}
                    onChange={(e) => setNewRec({...newRec, amount: e.target.value})} className="num"
                    style={{ background: C.panelHi, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 12px', color: C.text, fontSize: '14px' }} />
                  <select value={newRec.scope} onChange={(e) => setNewRec({...newRec, scope: e.target.value})}
                    style={{ background: C.panelHi, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 12px', color: C.text, fontSize: '14px' }}>
                    <option value="personal">Personal</option>
                    <option value="business">Business</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <select value={newRec.category} onChange={(e) => setNewRec({...newRec, category: e.target.value})}
                    style={{ background: C.panelHi, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 12px', color: C.text, fontSize: '14px' }}>
                    <option value="">Category...</option>
                    {newRecCats.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={newRec.frequency} onChange={(e) => setNewRec({...newRec, frequency: e.target.value})}
                    style={{ background: C.panelHi, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 12px', color: C.text, fontSize: '14px' }}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px', display: 'block', fontWeight: 600 }}>Start date</label>
                  <input type="date" value={newRec.startDate} onChange={(e) => setNewRec({...newRec, startDate: e.target.value})}
                    style={{ width: '100%', background: C.panelHi, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 12px', color: C.text, fontSize: '14px' }} />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowAddRec(false)} style={{
                    padding: '10px 16px', background: 'transparent', color: C.textDim,
                    border: `1px solid ${C.border}`, borderRadius: '8px', cursor: 'pointer', fontSize: '13px'
                  }}>Cancel</button>
                  <button onClick={addRecurring} className="btn-press" style={{
                    flex: 1, padding: '10px', background: C.accent, color: C.bg,
                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600
                  }}>Save</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '32px', padding: '20px', background: C.panel, border: `1px solid ${C.border}`, borderRadius: '12px' }}>
          <div style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '12px', fontWeight: 600 }}>Your data</div>
          <button onClick={() => exportCSV(txns)} className="btn-press" style={{
            width: '100%', padding: '12px', background: 'transparent',
            border: `1px solid ${C.border}`, borderRadius: '8px', color: C.text,
            fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}>
            <Download size={14} /> Export all transactions to CSV
          </button>
          <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '10px', textAlign: 'center' }}>
            {txns.length} transactions in total
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN
// ============================================================
export default function App() {
  const [screen, setScreen] = useState('today');
  const [txns, setTxns] = useState([]);
  const [history, setHistory] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [recurring, setRecurring] = useState([]);
  const [lastDeleted, setLastDeleted] = useState(null);
  const [editingTxn, setEditingTxn] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = FONTS_CSS;
    document.head.appendChild(style);

    (async () => {
      const [t, h, b, r] = await Promise.all([
        S.get('cfo:transactions', []),
        S.get('cfo:chat', []),
        S.get('cfo:budgets', {}),
        S.get('cfo:recurring', [])
      ]);
      const { newTxns, updatedRecurring } = processRecurring(r, t);
      const allTxns = [...newTxns, ...t];
      setTxns(allTxns);
      setHistory(h);
      setBudgets(b);
      setRecurring(updatedRecurring);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) S.set('cfo:transactions', txns); }, [txns, loaded]);
  useEffect(() => { if (loaded) S.set('cfo:chat', history); }, [history, loaded]);
  useEffect(() => { if (loaded) S.set('cfo:budgets', budgets); }, [budgets, loaded]);
  useEffect(() => { if (loaded) S.set('cfo:recurring', recurring); }, [recurring, loaded]);

  const addTxn = (t) => setTxns([t, ...txns]);
  const updateTxn = (updated) => { setTxns(txns.map(t => t.id === updated.id ? updated : t)); setEditingTxn(null); };
  const deleteTxn = (id) => {
    const t = txns.find(x => x.id === id);
    if (t) setLastDeleted(t);
    setTxns(txns.filter(x => x.id !== id));
    setEditingTxn(null);
    setTimeout(() => setLastDeleted(null), 8000);
  };
  const undoDelete = () => {
    if (lastDeleted) { setTxns([lastDeleted, ...txns]); setLastDeleted(null); }
  };

  if (!loaded) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" style={{ color: C.textDim }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Instrument Sans', -apple-system, sans-serif", fontSize: '14px' }}>
      {screen === 'today' && (
        <Today txns={txns} onAdd={addTxn} onUndo={undoDelete} lastDeleted={lastDeleted}
          onOpenCFO={() => setScreen('cfo')} onOpenStats={() => setScreen('stats')}
          onOpenSettings={() => setScreen('settings')} budgets={budgets} onEdit={setEditingTxn} />
      )}
      {screen === 'cfo' && (
        <CFOChat txns={txns} history={history} setHistory={setHistory} onBack={() => setScreen('today')} budgets={budgets} />
      )}
      {screen === 'stats' && (
        <Stats txns={txns} onDelete={deleteTxn} onBack={() => setScreen('today')} onEdit={setEditingTxn} budgets={budgets} />
      )}
      {screen === 'settings' && (
        <SettingsScreen budgets={budgets} setBudgets={setBudgets} recurring={recurring} setRecurring={setRecurring} txns={txns} onBack={() => setScreen('today')} />
      )}
      {editingTxn && (
        <EditModal txn={editingTxn} onSave={updateTxn} onClose={() => setEditingTxn(null)} onDelete={deleteTxn} />
      )}
    </div>
  );
}
