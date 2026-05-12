import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Send, Check, X, MessageSquare, BarChart3, ArrowLeft, Trash2, Undo2,
  Flame, Search, Download, Repeat, AlertTriangle, Settings,
  ChevronRight, Plus, Calculator, BookOpen, Sparkles, TrendingUp, Loader2
} from 'lucide-react';
import { S } from './storage.js';
import { parseTransaction } from './parser.js';
import * as F from './formulas.js';
import { analyze, brief, answer, getSuggestedQuestions } from './cfo.js';
import { KNOWLEDGE } from './knowledge.js';

const C = {
  bg: '#0F0E0C', panel: '#1A1815', panelHi: '#221F1B',
  border: '#2A2722', borderHi: '#3A352E',
  text: '#F2EDE4', textDim: '#9A938A', textMuted: '#5C5750',
  accent: '#E8A84C', accentDim: '#8C6B30',
  positive: '#7DBE93', negative: '#E07B7B', warm: '#D49C5A',
  info: '#7A9DC8'
};

const FONTS_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700;9..144,800&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { margin: 0; background: ${C.bg}; }
  .display { font-family: 'Fraunces', Georgia, serif; font-variation-settings: 'opsz' 144; letter-spacing: -0.03em; }
  .num { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
  input, textarea, button, select { font-family: inherit; }
  input:focus, textarea:focus, button:focus, select:focus { outline: none; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .fade-up { animation: fadeUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
  @keyframes pop { 0% { transform: scale(0.9); opacity: 0; } 60% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
  .pop { animation: pop 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
  .btn-press:active { transform: scale(0.97); }
  .btn-press { transition: transform 0.1s; }
  .modal-bg { animation: fadeUp 0.2s ease-out both; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .animate-spin { animation: spin 1s linear infinite; }
`;

const today = () => new Date().toISOString().split('T')[0];
const fmt = F.inr;
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

const calcStreak = (txns) => {
  if (txns.length === 0) return 0;
  const dates = new Set(txns.map(t => t.date));
  let streak = 0;
  let d = new Date();
  if (dates.has(today())) { streak = 1; d.setDate(d.getDate() - 1); }
  else { d.setDate(d.getDate() - 1); }
  while (true) {
    const ds = d.toISOString().split('T')[0];
    if (dates.has(ds)) { streak++; d.setDate(d.getDate() - 1); } else break;
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
          date: dateStr, type: r.type, scope: r.scope, amount: r.amount,
          category: r.category, classification: r.type === 'expense' ? 'need' : 'active',
          description: r.description + ' (auto)', recurringId: r.id, createdAt: Date.now()
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
  const rows = txns.map(t => [t.date, t.type, t.scope, t.amount, t.category, `"${(t.description || '').replace(/"/g, '""')}"`]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `cfo-ledger-${today()}.csv`; a.click();
  URL.revokeObjectURL(url);
};

const severityColor = {
  critical: C.negative, warning: C.warm, info: C.info, positive: C.positive
};
const severityLabel = {
  critical: 'CRITICAL', warning: 'WARNING', info: 'INFO', positive: 'STRENGTH'
};

// ============================================================
// FINDING CARD (used by CFO and Insights)
// ============================================================
const FindingCard = ({ finding }) => (
  <div className="fade-up" style={{
    background: C.panel, border: `1px solid ${C.border}`, borderRadius: '12px',
    padding: '18px 20px', marginBottom: '10px', position: 'relative', overflow: 'hidden'
  }}>
    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: severityColor[finding.severity] }} />
    <div style={{ fontSize: '9px', color: severityColor[finding.severity], textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginBottom: '8px' }}>
      {severityLabel[finding.severity]}
    </div>
    <div className="display" style={{ fontSize: '16px', color: C.text, fontWeight: 600, lineHeight: 1.3, marginBottom: '8px' }}>
      {finding.headline}
    </div>
    {finding.detail && (
      <div style={{ fontSize: '13px', color: C.textDim, lineHeight: 1.5, marginBottom: '10px' }}>{finding.detail}</div>
    )}
    {finding.action && (
      <div style={{ background: C.panelHi, borderRadius: '8px', padding: '12px 14px', borderLeft: `2px solid ${C.accent}` }}>
        <div style={{ fontSize: '9px', color: C.accent, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginBottom: '4px' }}>Do this</div>
        <div style={{ fontSize: '13px', color: C.text, lineHeight: 1.5 }}>{finding.action}</div>
      </div>
    )}
  </div>
);

// ============================================================
// EDIT MODAL
// ============================================================
const EditModal = ({ txn, onSave, onClose, onDelete }) => {
  const [t, setT] = useState({ ...txn });
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
          <div className="display" style={{ fontSize: '20px', color: C.text, fontWeight: 600 }}>
            {txn.id === '__NEW__' ? 'Add transaction' : 'Edit transaction'}
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          {['expense', 'income'].map(tp => (
            <button key={tp} onClick={() => setT({ ...t, type: tp })} className="btn-press" style={{
              padding: '10px', background: t.type === tp ? (tp === 'income' ? C.positive : C.negative) : 'transparent',
              color: t.type === tp ? C.bg : C.textDim,
              border: `1px solid ${t.type === tp ? (tp === 'income' ? C.positive : C.negative) : C.border}`,
              borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em'
            }}>{tp}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          {['personal', 'business'].map(sc => (
            <button key={sc} onClick={() => setT({ ...t, scope: sc })} className="btn-press" style={{
              padding: '10px', background: t.scope === sc ? C.accent : 'transparent',
              color: t.scope === sc ? C.bg : C.textDim,
              border: `1px solid ${t.scope === sc ? C.accent : C.border}`,
              borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize'
            }}>{sc}</button>
          ))}
        </div>
        {[
          { label: 'Amount', el: <input type="number" value={t.amount} onChange={(e) => setT({ ...t, amount: parseFloat(e.target.value) || 0 })} className="num"
              style={{ width: '100%', background: C.panelHi, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px 16px', color: C.text, fontSize: '20px', fontWeight: 500 }} /> },
          { label: 'Date', el: <input type="date" value={t.date} onChange={(e) => setT({ ...t, date: e.target.value })}
              style={{ width: '100%', background: C.panelHi, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px 16px', color: C.text, fontSize: '14px' }} /> },
          { label: 'Category', el: <select value={t.category} onChange={(e) => setT({ ...t, category: e.target.value })}
              style={{ width: '100%', background: C.panelHi, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px 16px', color: C.text, fontSize: '14px' }}>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select> },
          { label: 'Description', el: <input type="text" value={t.description || ''} onChange={(e) => setT({ ...t, description: e.target.value })}
              style={{ width: '100%', background: C.panelHi, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '12px 16px', color: C.text, fontSize: '14px' }} /> }
        ].map(({ label, el }) => (
          <div key={label} style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px', display: 'block', fontWeight: 600 }}>{label}</label>
            {el}
          </div>
        ))}
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          {txn.id !== '__NEW__' && (
            <button onClick={() => onDelete(t.id)} className="btn-press" style={{
              padding: '14px', background: 'transparent', color: C.negative,
              border: `1px solid ${C.negative}`, borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}>
              <Trash2 size={14} /> Delete
            </button>
          )}
          <button onClick={() => onSave(t)} disabled={!t.amount || t.amount <= 0 || !t.category} className="btn-press" style={{
            flex: 1, padding: '14px',
            background: (!t.amount || t.amount <= 0 || !t.category) ? C.border : C.accent,
            color: (!t.amount || t.amount <= 0 || !t.category) ? C.textMuted : C.bg,
            border: 'none', borderRadius: '10px',
            cursor: (!t.amount || t.amount <= 0 || !t.category) ? 'not-allowed' : 'pointer',
            fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em'
          }}>{txn.id === '__NEW__' ? 'Add transaction' : 'Save changes'}</button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// TODAY SCREEN
// ============================================================
const Today = ({ txns, onAdd, onUndo, lastDeleted, onNav, budgets, onEdit, onManualAdd }) => {
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const month = today().slice(0, 7);
  const todayTxns = txns.filter(t => t.date === today());
  const todayIn = todayTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const todayOut = todayTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const todayNet = todayIn - todayOut;
  const streak = useMemo(() => calcStreak(txns), [txns]);
  const monthTxns = txns.filter(t => t.date.startsWith(month));

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

  const cfoBrief = useMemo(() => brief(txns, month, budgets), [txns, month, budgets]);

  const handleParse = () => {
    if (!input.trim()) return;
    setError('');
    const parsed = parseTransaction(input);
    if (parsed.error) { setError(parsed.error); return; }
    setPreview(parsed);
  };

  const confirmSave = () => {
    onAdd({
      id: Date.now().toString(),
      date: today(),
      type: preview.type, scope: preview.scope, amount: preview.amount,
      category: preview.category,
      classification: preview.type === 'expense' ? 'want' : 'active',
      description: preview.description,
      createdAt: Date.now()
    });
    setInput(''); setPreview(null); setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div style={{ minHeight: '100vh', padding: '20px 20px 100px' }}>
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
            <button onClick={() => onNav('settings')} className="btn-press" style={{
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
          <div className="fade-up" style={{ marginBottom: '20px' }}>
            {budgetAlerts.slice(0, 2).map(a => (
              <div key={a.cat} style={{
                background: a.level === 'over' ? 'rgba(224,123,123,0.08)' : 'rgba(212,156,90,0.08)',
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
            <>
              <div style={{ position: 'relative' }}>
                <input ref={inputRef} type="text" value={input}
                  onChange={(e) => { setInput(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleParse()}
                  placeholder="spent 500 on lunch · got paid 25000"
                  style={{
                    width: '100%', background: C.panel,
                    border: `2px solid ${input ? C.accent : C.border}`,
                    borderRadius: '14px', color: C.text,
                    padding: '22px 70px 22px 22px', fontSize: '17px',
                    transition: 'border-color 0.2s'
                  }} />
                <button onClick={handleParse} disabled={!input.trim()} className="btn-press" style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  width: '46px', height: '46px',
                  background: input.trim() ? C.accent : C.border,
                  color: input.trim() ? C.bg : C.textMuted,
                  border: 'none', borderRadius: '10px',
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Send size={18} />
                </button>
              </div>
              <button onClick={onManualAdd} className="btn-press" style={{
                marginTop: '10px', width: '100%', padding: '12px',
                background: 'transparent', border: `1px dashed ${C.border}`,
                borderRadius: '10px', color: C.textDim,
                fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}>
                <Plus size={14} /> Add manually (pick from list)
              </button>
            </>
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
                width: '100%', padding: '14px', background: C.accent, color: C.bg, border: 'none', borderRadius: '10px',
                fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
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

        {/* CFO Brief */}
        <div className="fade-up" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <Sparkles size={12} style={{ color: C.accent }} />
            <span style={{ fontSize: '10px', color: C.accent, textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 600 }}>Your CFO says</span>
          </div>
          <FindingCard finding={{ ...cfoBrief, severity: cfoBrief.severity || 'info' }} />
        </div>

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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '24px' }}>
          {[
            { id: 'stats', icon: BarChart3, label: 'Month' },
            { id: 'cfo', icon: MessageSquare, label: 'CFO' },
            { id: 'tools', icon: Calculator, label: 'Tools' },
            { id: 'learn', icon: BookOpen, label: 'Learn' }
          ].map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => onNav(id)} className="btn-press" style={{
              padding: '14px', background: C.panel, border: `1px solid ${C.border}`,
              borderRadius: '10px', color: C.text, fontSize: '13px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// CFO ASK SCREEN
// ============================================================
const CFOAsk = ({ txns, budgets, onBack }) => {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const month = today().slice(0, 7);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [history]);

  const ask = (q) => {
    const question = q || input;
    if (!question.trim()) return;
    const reply = answer(question, txns, month, budgets);
    setHistory([...history, { question, reply }]);
    setInput('');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button onClick={onBack} className="btn-press" style={{ background: 'transparent', border: 'none', color: C.text, cursor: 'pointer', padding: '4px' }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div className="display" style={{ fontSize: '18px', color: C.text, fontWeight: 600 }}>Your CFO</div>
          <div style={{ fontSize: '11px', color: C.textDim }}>Rules-based. Offline. Sees every transaction.</div>
        </div>
        {history.length > 0 && (
          <button onClick={() => setHistory([])} style={{ background: 'transparent', border: 'none', color: C.textMuted, fontSize: '12px', cursor: 'pointer' }}>Clear</button>
        )}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          {history.length === 0 ? (
            <div style={{ paddingTop: '24px' }}>
              <div className="display" style={{ fontSize: '24px', color: C.text, marginBottom: '8px', fontWeight: 600, lineHeight: 1.2 }}>Pick a question.</div>
              <div style={{ fontSize: '13px', color: C.textDim, marginBottom: '24px' }}>Or type your own. Get one direct answer with one action.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {getSuggestedQuestions().map(q => (
                  <button key={q} onClick={() => ask(q)} className="btn-press" style={{
                    padding: '14px 18px', background: C.panel, border: `1px solid ${C.border}`,
                    borderRadius: '10px', color: C.text, fontSize: '14px', textAlign: 'left',
                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    {q} <ChevronRight size={14} style={{ color: C.textMuted }} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {history.map((h, i) => (
                <div key={i} className="fade-up">
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                    <div style={{
                      maxWidth: '85%', padding: '12px 16px', background: C.accent, color: C.bg,
                      borderRadius: '14px 14px 4px 14px', fontSize: '14px', fontWeight: 500
                    }}>{h.question}</div>
                  </div>
                  <FindingCard finding={{ ...h.reply, severity: h.reply.severity || 'info' }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '16px 20px', borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', display: 'flex', gap: '8px' }}>
          <input ref={inputRef} type="text" value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
            placeholder="Ask about your money..."
            style={{ flex: 1, background: C.panel, border: `1px solid ${C.border}`, borderRadius: '12px', color: C.text, padding: '14px 18px', fontSize: '14px' }} />
          <button onClick={() => ask()} disabled={!input.trim()} className="btn-press" style={{
            width: '52px', background: input.trim() ? C.accent : C.border, color: input.trim() ? C.bg : C.textMuted,
            border: 'none', borderRadius: '12px', cursor: input.trim() ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// INSIGHTS (full analysis)
// ============================================================
const Insights = ({ txns, budgets, onBack }) => {
  const month = today().slice(0, 7);
  const { findings } = analyze(txns, month, budgets);

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ padding: '20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button onClick={onBack} className="btn-press" style={{ background: 'transparent', border: 'none', color: C.text, cursor: 'pointer', padding: '4px' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="display" style={{ fontSize: '18px', color: C.text, fontWeight: 600 }}>All insights</div>
          <div style={{ fontSize: '11px', color: C.textDim }}>{findings.length} findings this month</div>
        </div>
      </div>
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '20px' }}>
        {findings.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: C.textMuted, fontSize: '13px' }}>
            Log a few more transactions and the CFO will have something to say.
          </div>
        ) : findings.map((f, i) => <FindingCard key={i} finding={f} />)}
      </div>
    </div>
  );
};

// ============================================================
// STATS / MONTH VIEW
// ============================================================
const Stats = ({ txns, onBack, onEdit, budgets, onNav }) => {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const month = today().slice(0, 7);
  const monthTxns = txns.filter(t => t.date.startsWith(month));

  const income = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = income - expense;
  const rate = F.savingsRate(income, expense);

  const byCat = monthTxns.filter(t => t.type === 'expense').reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
  const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const filtered = useMemo(() => {
    let base = search.trim() ? txns : monthTxns;
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(t => (t.description || '').toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.scope.toLowerCase().includes(q));
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
          <div style={{ fontSize: '11px', color: C.textDim }}>{monthTxns.length} this month · {txns.length} total</div>
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
          <div style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '10px', fontWeight: 600 }}>Savings rate</div>
          <div className="num display" style={{ fontSize: '56px', color: rate >= 0.2 ? C.positive : rate >= 0.1 ? C.warm : C.negative, fontWeight: 600, lineHeight: 1 }}>
            {(rate * 100).toFixed(0)}%
          </div>
        </div>

        <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
          {[
            { label: 'In', value: income, color: C.positive },
            { label: 'Out', value: expense, color: C.text },
            { label: 'Net', value: net, color: net >= 0 ? C.positive : C.negative }
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px' }}>{label}</div>
              <div className="num" style={{ fontSize: '17px', color, fontWeight: 500 }}>{fmt(value)}</div>
            </div>
          ))}
        </div>

        {topCats.length > 0 && (
          <div className="fade-up" style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '10px', fontWeight: 600 }}>Top spend</div>
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
                      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: budgetPct >= 100 ? C.negative : budgetPct >= 80 ? C.warm : C.accent }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button onClick={() => onNav('insights')} className="btn-press" style={{
          width: '100%', marginBottom: '20px', padding: '14px', background: C.panel,
          border: `1px solid ${C.border}`, borderRadius: '10px', color: C.text, fontSize: '13px',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
        }}>
          <TrendingUp size={14} /> See all insights
        </button>

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
            ) : filtered.slice(0, 200).map(t => (
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
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// TOOLS / CALCULATORS
// ============================================================
const Tools = ({ onBack }) => {
  const [tool, setTool] = useState('sip');
  // SIP calculator state
  const [sipMonthly, setSipMonthly] = useState(10000);
  const [sipYears, setSipYears] = useState(10);
  const [sipRate, setSipRate] = useState(12);
  // EMI calculator
  const [emiPrincipal, setEmiPrincipal] = useState(1000000);
  const [emiRate, setEmiRate] = useState(9);
  const [emiYears, setEmiYears] = useState(10);
  // Retirement
  const [retAge, setRetAge] = useState(30);
  const [retTargetAge, setRetTargetAge] = useState(60);
  const [retMonthlyExp, setRetMonthlyExp] = useState(50000);
  // Tax
  const [taxIncome, setTaxIncome] = useState(1500000);

  const tools = [
    { id: 'sip', label: 'SIP', icon: TrendingUp },
    { id: 'emi', label: 'EMI', icon: Calculator },
    { id: 'retire', label: 'Retire', icon: Flame },
    { id: 'tax', label: 'Tax', icon: Calculator }
  ];

  const inputStyle = {
    width: '100%', background: C.panelHi, border: `1px solid ${C.border}`,
    borderRadius: '8px', padding: '12px 14px', color: C.text, fontSize: '14px'
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ padding: '20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button onClick={onBack} className="btn-press" style={{ background: 'transparent', border: 'none', color: C.text, cursor: 'pointer', padding: '4px' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="display" style={{ fontSize: '18px', color: C.text, fontWeight: 600 }}>Financial calculators</div>
          <div style={{ fontSize: '11px', color: C.textDim }}>Run the numbers before you commit.</div>
        </div>
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '24px' }}>
          {tools.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTool(id)} className="btn-press" style={{
              padding: '12px 8px', background: tool === id ? C.accent : C.panel,
              color: tool === id ? C.bg : C.text,
              border: `1px solid ${tool === id ? C.accent : C.border}`,
              borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px'
            }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {tool === 'sip' && (
          <div className="fade-up">
            <div className="display" style={{ fontSize: '20px', color: C.text, fontWeight: 600, marginBottom: '4px' }}>SIP Calculator</div>
            <div style={{ fontSize: '13px', color: C.textDim, marginBottom: '20px' }}>How big will your monthly SIP grow over time?</div>

            {[
              { label: 'Monthly investment (₹)', value: sipMonthly, set: setSipMonthly },
              { label: 'Number of years', value: sipYears, set: setSipYears },
              { label: 'Expected annual return (%)', value: sipRate, set: setSipRate, step: 0.5 }
            ].map(({ label, value, set, step }) => (
              <div key={label} style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px', display: 'block', fontWeight: 600 }}>{label}</label>
                <input type="number" value={value} step={step || 1} onChange={(e) => set(parseFloat(e.target.value) || 0)} className="num" style={inputStyle} />
              </div>
            ))}

            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px', marginTop: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '8px', fontWeight: 600 }}>Future value</div>
              <div className="num display" style={{ fontSize: '36px', color: C.accent, fontWeight: 600 }}>
                {fmt(F.sipFV(sipMonthly, sipRate / 100, sipYears))}
              </div>
              <div className="num" style={{ fontSize: '12px', color: C.textDim, marginTop: '8px' }}>
                Invested: {fmt(sipMonthly * sipYears * 12)} · Gain: {fmt(F.sipFV(sipMonthly, sipRate / 100, sipYears) - sipMonthly * sipYears * 12)}
              </div>
              <div className="num" style={{ fontSize: '11px', color: C.textMuted, marginTop: '12px' }}>
                Real return (after 6% inflation): {fmt(F.sipFV(sipMonthly, F.realReturn(sipRate / 100, 0.06), sipYears))}
              </div>
            </div>
          </div>
        )}

        {tool === 'emi' && (
          <div className="fade-up">
            <div className="display" style={{ fontSize: '20px', color: C.text, fontWeight: 600, marginBottom: '4px' }}>EMI Calculator</div>
            <div style={{ fontSize: '13px', color: C.textDim, marginBottom: '20px' }}>Before you sign a loan, know the real cost.</div>

            {[
              { label: 'Loan amount (₹)', value: emiPrincipal, set: setEmiPrincipal },
              { label: 'Annual interest rate (%)', value: emiRate, set: setEmiRate, step: 0.1 },
              { label: 'Tenure (years)', value: emiYears, set: setEmiYears }
            ].map(({ label, value, set, step }) => (
              <div key={label} style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px', display: 'block', fontWeight: 600 }}>{label}</label>
                <input type="number" value={value} step={step || 1} onChange={(e) => set(parseFloat(e.target.value) || 0)} className="num" style={inputStyle} />
              </div>
            ))}

            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px', marginTop: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '8px', fontWeight: 600 }}>Monthly EMI</div>
              <div className="num display" style={{ fontSize: '36px', color: C.accent, fontWeight: 600 }}>
                {fmt(F.calculateEMI(emiPrincipal, emiRate / 100, emiYears))}
              </div>
              <div className="num" style={{ fontSize: '12px', color: C.textDim, marginTop: '8px' }}>
                Total interest: {fmt(F.totalInterestPaid(emiPrincipal, emiRate / 100, emiYears))}
              </div>
              <div className="num" style={{ fontSize: '11px', color: C.textMuted, marginTop: '4px' }}>
                Total repayment: {fmt(emiPrincipal + F.totalInterestPaid(emiPrincipal, emiRate / 100, emiYears))}
              </div>
            </div>
          </div>
        )}

        {tool === 'retire' && (
          <div className="fade-up">
            <div className="display" style={{ fontSize: '20px', color: C.text, fontWeight: 600, marginBottom: '4px' }}>Retirement Calculator</div>
            <div style={{ fontSize: '13px', color: C.textDim, marginBottom: '20px' }}>How much do you need, and what SIP gets you there?</div>

            {[
              { label: 'Your age now', value: retAge, set: setRetAge },
              { label: 'Target retirement age', value: retTargetAge, set: setRetTargetAge },
              { label: 'Current monthly expense (₹)', value: retMonthlyExp, set: setRetMonthlyExp }
            ].map(({ label, value, set }) => (
              <div key={label} style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px', display: 'block', fontWeight: 600 }}>{label}</label>
                <input type="number" value={value} onChange={(e) => set(parseFloat(e.target.value) || 0)} className="num" style={inputStyle} />
              </div>
            ))}

            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px', marginTop: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '8px', fontWeight: 600 }}>Corpus needed at {retTargetAge}</div>
              <div className="num display" style={{ fontSize: '32px', color: C.accent, fontWeight: 600 }}>
                {fmt(F.retirementCorpus(retMonthlyExp, retTargetAge - retAge))}
              </div>
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${C.border}` }}>
                <div style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '8px', fontWeight: 600 }}>Required monthly SIP</div>
                <div className="num" style={{ fontSize: '24px', color: C.text, fontWeight: 600 }}>
                  {fmt(F.retirementSipRequired(retMonthlyExp, retAge, retTargetAge) || 0)}
                </div>
                <div className="num" style={{ fontSize: '11px', color: C.textMuted, marginTop: '6px' }}>
                  Assumes 12% return, 6% inflation, 25x rule
                </div>
              </div>
            </div>
          </div>
        )}

        {tool === 'tax' && (
          <div className="fade-up">
            <div className="display" style={{ fontSize: '20px', color: C.text, fontWeight: 600, marginBottom: '4px' }}>Tax Calculator</div>
            <div style={{ fontSize: '13px', color: C.textDim, marginBottom: '20px' }}>India FY 2024-25 new regime (indicative).</div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Annual income (₹)</label>
              <input type="number" value={taxIncome} onChange={(e) => setTaxIncome(parseFloat(e.target.value) || 0)} className="num" style={inputStyle} />
            </div>

            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px', marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', color: C.textDim }}>Gross income</span>
                <span className="num" style={{ fontSize: '14px', color: C.text }}>{fmt(taxIncome)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', color: C.textDim }}>Standard deduction</span>
                <span className="num" style={{ fontSize: '14px', color: C.text }}>−₹75,000</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: `1px solid ${C.border}`, marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', color: C.textDim }}>Tax payable (with cess)</span>
                <span className="num" style={{ fontSize: '18px', color: C.negative, fontWeight: 600 }}>{fmt(F.calculateTaxNewRegime(taxIncome))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', color: C.textDim }}>Effective tax rate</span>
                <span className="num" style={{ fontSize: '14px', color: C.text }}>
                  {taxIncome > 0 ? ((F.calculateTaxNewRegime(taxIncome) / taxIncome) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontSize: '13px', color: C.textDim }}>Take-home (post tax)</span>
                <span className="num" style={{ fontSize: '16px', color: C.positive, fontWeight: 600 }}>
                  {fmt(taxIncome - F.calculateTaxNewRegime(taxIncome))}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// LEARN (knowledge base)
// ============================================================
const Learn = ({ onBack }) => {
  const [open, setOpen] = useState(null);
  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ padding: '20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button onClick={onBack} className="btn-press" style={{ background: 'transparent', border: 'none', color: C.text, cursor: 'pointer', padding: '4px' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="display" style={{ fontSize: '18px', color: C.text, fontWeight: 600 }}>Money principles</div>
          <div style={{ fontSize: '11px', color: C.textDim }}>The foundations the CFO uses.</div>
        </div>
      </div>
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '20px' }}>
        {KNOWLEDGE.map(k => (
          <div key={k.id} style={{ marginBottom: '8px' }}>
            <button onClick={() => setOpen(open === k.id ? null : k.id)} className="btn-press" style={{
              width: '100%', padding: '16px 18px', background: C.panel, border: `1px solid ${C.border}`,
              borderRadius: '10px', color: C.text, fontSize: '14px', textAlign: 'left', cursor: 'pointer',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div className="display" style={{ fontSize: '16px', fontWeight: 600, marginBottom: '2px' }}>{k.topic}</div>
                <div style={{ fontSize: '12px', color: C.textDim }}>{k.short}</div>
              </div>
              <ChevronRight size={16} style={{ color: C.textMuted, transform: open === k.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {open === k.id && (
              <div className="fade-up" style={{
                padding: '18px 20px', background: C.panelHi, border: `1px solid ${C.border}`, borderTop: 'none',
                borderRadius: '0 0 10px 10px', marginTop: '-1px',
                fontSize: '14px', color: C.text, lineHeight: 1.6, whiteSpace: 'pre-wrap'
              }}>
                {k.body}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// SETTINGS (budgets + recurring)
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
      id: Date.now().toString(), type: newRec.type, scope: newRec.scope,
      amount: parseFloat(newRec.amount), category: newRec.category || cats[0],
      description: newRec.description, frequency: newRec.frequency, startDate: newRec.startDate,
      lastApplied: null, createdAt: Date.now()
    }]);
    setNewRec({ type: 'expense', scope: 'personal', amount: '', category: '', description: '', frequency: 'monthly', startDate: today() });
    setShowAddRec(false);
  };

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
          {['budgets', 'recurring'].map(t => (
            <button key={t} onClick={() => setTab(t)} className="btn-press" style={{
              flex: 1, padding: '12px', background: tab === t ? C.accent : C.panel,
              color: tab === t ? C.bg : C.text, border: `1px solid ${tab === t ? C.accent : C.border}`,
              borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.1em'
            }}>{t}</button>
          ))}
        </div>

        {tab === 'budgets' && (
          <div className="fade-up">
            <div style={{ fontSize: '13px', color: C.textDim, marginBottom: '16px', lineHeight: 1.5 }}>
              Set a monthly cap per category. Warning at 80%, alert at 100%.
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
              Rent, EMIs, salary, subscriptions. Auto-logs when you open the app.
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
                    <button onClick={() => setRecurring(recurring.filter(x => x.id !== r.id))}
                      style={{ background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', padding: '4px' }}>
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
                <Plus size={14} /> Add recurring
              </button>
            ) : (
              <div className="pop" style={{ background: C.panel, border: `1px solid ${C.borderHi}`, borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  {['expense', 'income'].map(tp => (
                    <button key={tp} onClick={() => setNewRec({...newRec, type: tp})} style={{
                      padding: '8px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em',
                      background: newRec.type === tp ? (tp === 'income' ? C.positive : C.negative) : 'transparent',
                      color: newRec.type === tp ? C.bg : C.textDim,
                      border: `1px solid ${newRec.type === tp ? (tp === 'income' ? C.positive : C.negative) : C.border}`,
                      borderRadius: '6px', cursor: 'pointer'
                    }}>{tp}</button>
                  ))}
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
                <input type="date" value={newRec.startDate} onChange={(e) => setNewRec({...newRec, startDate: e.target.value})}
                  style={{ width: '100%', background: C.panelHi, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 12px', color: C.text, fontSize: '14px', marginBottom: '14px' }} />
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
            <Download size={14} /> Export to CSV
          </button>
          <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '10px', textAlign: 'center' }}>
            {txns.length} transactions stored locally
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [screen, setScreen] = useState('today');
  const [txns, setTxns] = useState([]);
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
      const [t, b, r] = await Promise.all([
        S.get('transactions', []),
        S.get('budgets', {}),
        S.get('recurring', [])
      ]);
      const { newTxns, updatedRecurring } = processRecurring(r, t);
      setTxns([...newTxns, ...t]);
      setBudgets(b);
      setRecurring(updatedRecurring);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) S.set('transactions', txns); }, [txns, loaded]);
  useEffect(() => { if (loaded) S.set('budgets', budgets); }, [budgets, loaded]);
  useEffect(() => { if (loaded) S.set('recurring', recurring); }, [recurring, loaded]);

  const addTxn = (t) => setTxns([t, ...txns]);
  const updateTxn = (u) => {
    if (u.id === '__NEW__') {
      const newTxn = { ...u, id: Date.now().toString() + Math.random().toString(36).substring(2, 6), createdAt: Date.now() };
      setTxns([newTxn, ...txns]);
    } else {
      setTxns(txns.map(t => t.id === u.id ? u : t));
    }
    setEditingTxn(null);
  };
  const deleteTxn = (id) => {
    if (id === '__NEW__') { setEditingTxn(null); return; }
    const t = txns.find(x => x.id === id);
    if (t) setLastDeleted(t);
    setTxns(txns.filter(x => x.id !== id));
    setEditingTxn(null);
    setTimeout(() => setLastDeleted(null), 8000);
  };
  const undoDelete = () => { if (lastDeleted) { setTxns([lastDeleted, ...txns]); setLastDeleted(null); } };
  const startManualAdd = () => {
    setEditingTxn({
      id: '__NEW__',
      type: 'expense',
      scope: 'personal',
      amount: 0,
      category: 'Food',
      date: new Date().toISOString().split('T')[0],
      description: '',
      classification: 'want'
    });
  };

  if (!loaded) {
    return <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 className="animate-spin" style={{ color: C.textDim }} />
    </div>;
  }

  const nav = (id) => setScreen(id);
  const back = () => setScreen('today');

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Instrument Sans', -apple-system, sans-serif", fontSize: '14px' }}>
      {screen === 'today' && <Today txns={txns} onAdd={addTxn} onUndo={undoDelete} lastDeleted={lastDeleted} onNav={nav} budgets={budgets} onEdit={setEditingTxn} onManualAdd={startManualAdd} />}
      {screen === 'cfo' && <CFOAsk txns={txns} budgets={budgets} onBack={back} />}
      {screen === 'stats' && <Stats txns={txns} onBack={back} onEdit={setEditingTxn} budgets={budgets} onNav={nav} />}
      {screen === 'insights' && <Insights txns={txns} budgets={budgets} onBack={() => setScreen('stats')} />}
      {screen === 'tools' && <Tools onBack={back} />}
      {screen === 'learn' && <Learn onBack={back} />}
      {screen === 'settings' && <SettingsScreen budgets={budgets} setBudgets={setBudgets} recurring={recurring} setRecurring={setRecurring} txns={txns} onBack={back} />}
      {editingTxn && <EditModal txn={editingTxn} onSave={updateTxn} onClose={() => setEditingTxn(null)} onDelete={deleteTxn} />}
    </div>
  );
}
