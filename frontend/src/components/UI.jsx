import React, { useEffect, useRef } from 'react';

export function PageHeader({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="page-header no-animate">
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="page-header-icon text-brand-600">
            <Icon size={22} strokeWidth={2} />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}

export function StatCard({ title, value, badge, tone = 'brand', icon: Icon, delay = 0 }) {
  const toneColors = {
    brand: { accent: '#e11d48', bg: 'from-brand-50 to-rose-50', icon: 'text-brand-600' },
    green: { accent: '#059669', bg: 'from-emerald-50 to-green-50', icon: 'text-emerald-600' },
    amber: { accent: '#d97706', bg: 'from-amber-50 to-yellow-50', icon: 'text-amber-600' },
    red:   { accent: '#dc2626', bg: 'from-red-50 to-rose-50', icon: 'text-red-600' },
    blue:  { accent: '#2563eb', bg: 'from-sky-50 to-blue-50', icon: 'text-sky-600' },
  };
  const t = toneColors[tone] || toneColors.brand;
  const badgeMap = {
    brand: 'badge-brand', green: 'badge-success', amber: 'badge-warning',
    red: 'badge-danger', blue: 'badge-info',
  };

  return (
    <div
      className={`stat-card scroll-reveal bg-gradient-to-br ${t.bg}`}
      style={{ '--accent': t.accent, animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">{value}</div>
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shrink-0 shadow-sm ${t.icon}`}>
            <Icon size={20} strokeWidth={2} />
          </div>
        )}
      </div>
      {badge && (
        <div className="mt-3">
          <span className={badgeMap[tone] || 'badge-brand'}>{badge}</span>
        </div>
      )}
    </div>
  );
}

export function SectionCard({ title, action, children, className = '' }) {
  return (
    <div className={`card-3d p-5 scroll-reveal ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4 gap-3">
          {title && <h3 className="section-title">{title}</h3>}
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
      <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 text-xl">—</div>
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
