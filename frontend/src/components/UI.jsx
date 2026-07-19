import React, { useEffect, useRef } from 'react';

export function PageHeader({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="page-header no-animate">
      <div className="flex min-w-0 items-center gap-4">
        {Icon && (
          <div className="page-header-icon text-brand-600">
            <Icon size={22} strokeWidth={2} />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{children}</div>}
    </div>
  );
}

export function StatCard({ title, value, badge, tone = 'brand', icon: Icon, delay = 0 }) {
  const toneColors = {
    brand: { accent: '#e11d48', bg: 'from-white to-rose-50/30', border: 'border-rose-100/60', icon: 'text-brand-600 bg-rose-50/70', glow: 'rgba(225, 29, 72, 0.12)' },
    green: { accent: '#059669', bg: 'from-white to-emerald-50/30', border: 'border-emerald-100/60', icon: 'text-emerald-600 bg-emerald-50/70', glow: 'rgba(5, 150, 105, 0.12)' },
    amber: { accent: '#d97706', bg: 'from-white to-amber-50/30', border: 'border-amber-100/60', icon: 'text-amber-600 bg-amber-50/70', glow: 'rgba(217, 119, 6, 0.12)' },
    red:   { accent: '#dc2626', bg: 'from-white to-red-50/30', border: 'border-red-100/60', icon: 'text-red-600 bg-red-50/70', glow: 'rgba(220, 38, 38, 0.12)' },
    blue:  { accent: '#2563eb', bg: 'from-white to-sky-50/30', border: 'border-sky-100/60', icon: 'text-sky-600 bg-sky-50/70', glow: 'rgba(37, 99, 235, 0.12)' },
  };
  const t = toneColors[tone] || toneColors.brand;
  const badgeMap = {
    brand: 'badge-brand', green: 'badge-success', amber: 'badge-warning',
    red: 'badge-danger', blue: 'badge-info',
  };

  return (
    <div
      className={`stat-card-glowing card p-5 overflow-hidden bg-gradient-to-br ${t.bg} ${t.border}`}
      style={{ 
        '--accent-color': t.accent, 
        '--glow-color': t.glow,
        animationDelay: `${delay}ms` 
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="mt-2 text-3xl font-extrabold tracking-tight text-slate-800">{value}</div>
        </div>
        {Icon && (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-slate-100/50 ${t.icon}`}>
            <Icon size={22} strokeWidth={2.2} />
          </div>
        )}
      </div>
      {badge && (
        <div className="mt-4 flex items-center justify-between">
          <span className={`${badgeMap[tone] || 'badge-brand'} px-2 py-0.5 rounded-md font-bold uppercase text-[9px] tracking-wide`}>
            {badge}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">Real-time</span>
        </div>
      )}
    </div>
  );
}

export function SectionCard({ title, action, children, className = '' }) {
  return (
    <div className={`card bg-white p-5 md:p-6 scroll-reveal border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all duration-300 rounded-2xl ${className}`}>
      {(title || action) && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-50 pb-4">
          {title && <h3 className="section-title text-base font-bold text-slate-800 flex items-center gap-2">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function EmptyState({ message = 'No records found' }) {
  return (
    <div className="py-10 text-center text-sm text-slate-400">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-xl text-slate-300">-</div>
      {message}
    </div>
  );
}

export function ScrollReveal({ children, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed');
          observer.unobserve(el);
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`scroll-reveal ${className}`}>
      {children}
    </div>
  );
}

export function useScrollReveal() {
  useEffect(() => {
    document.querySelectorAll('.scroll-reveal:not(.revealed)').forEach((el) => {
      el.classList.add('revealed');
    });
  }, []);
}
