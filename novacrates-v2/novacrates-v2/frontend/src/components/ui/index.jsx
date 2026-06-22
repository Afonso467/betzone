import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', loading, className = '', ...props }) {
  const base = 'btn font-semibold transition-all inline-flex items-center justify-center gap-2';
  const variants = {
    primary:   'bg-orange text-black hover:bg-orange2',
    secondary: 'bg-bg4 text-white border border-border2 hover:bg-border',
    ghost:     'text-text2 hover:text-white hover:bg-bg3',
    danger:    'bg-red/10 text-red border border-red/20 hover:bg-red hover:text-white',
    success:   'bg-success/10 text-success border border-success/20 hover:bg-success hover:text-white',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2 text-sm rounded-[10px]',
    lg: 'px-6 py-3 text-base rounded-[10px]',
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${props.disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading && <div className="spinner" style={{ width: 14, height: 14 }} />}
      {children}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', hover = false, glow = false, ...props }) {
  return (
    <motion.div
      className={`card ${hover ? 'card-hover cursor-pointer' : ''} ${glow ? 'glow-orange' : ''} ${className}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
const BADGE_STYLES = {
  orange: 'bg-orange/10 text-orange border border-orange/20',
  green:  'bg-success/10 text-success border border-success/20',
  red:    'bg-red/10 text-red border border-red/20',
  blue:   'bg-info/10 text-info border border-info/20',
  purple: 'bg-purple/10 text-purple border border-purple/20',
  gray:   'bg-bg4 text-text2 border border-border2',
};
export function Badge({ children, color = 'gray', className = '' }) {
  return (
    <span className={`badge ${BADGE_STYLES[color] || BADGE_STYLES.gray} ${className}`}>
      {children}
    </span>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="mb-4">
      {label && <label className="block text-xs font-medium text-text2 mb-1.5">{label}</label>}
      <input
        className={`w-full bg-bg3 border border-border2 text-white rounded-[10px] px-3.5 py-2.5 text-sm
          focus:outline-none focus:border-orange placeholder:text-text3 transition-colors ${className}`}
        {...props}
      />
      {error && <p className="text-red text-xs mt-1">{error}</p>}
    </div>
  );
}

export function Select({ label, children, className = '', ...props }) {
  return (
    <div className="mb-4">
      {label && <label className="block text-xs font-medium text-text2 mb-1.5">{label}</label>}
      <select
        className={`w-full bg-bg3 border border-border2 text-white rounded-[10px] px-3.5 py-2.5 text-sm
          focus:outline-none focus:border-orange transition-colors ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }) {
  return <div className="spinner" style={{ width: size, height: size }} />;
}

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center gap-4 z-50">
      <div className="text-4xl">🎮</div>
      <div className="text-xl font-bold">
        Nova<span className="text-orange">Crates</span>
      </div>
      <Spinner size={28} />
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className={`relative bg-bg2 border border-border rounded-card2 p-6 w-full ${maxWidth} z-10`}
            initial={{ scale: .95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: .95, y: 10 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold">{title}</h3>
              <button onClick={onClose} className="text-text2 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
export function ProgressBar({ value, max, color = 'var(--orange)', className = '' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={`progress ${className}`}>
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
export function StatCard({ icon, label, value, change, changeUp, color = 'var(--orange)' }) {
  return (
    <Card className="animate-slide-up">
      <div className="text-xs text-text2 font-medium mb-2 flex items-center gap-1.5">
        <span>{icon}</span> {label}
      </div>
      <div className="text-2xl font-extrabold tracking-tight" style={{ color }}>{value}</div>
      {change && (
        <div className={`text-xs mt-1 flex items-center gap-1 ${changeUp ? 'text-success' : 'text-red'}`}>
          {changeUp ? '↑' : '↓'} {change}
        </div>
      )}
    </Card>
  );
}
