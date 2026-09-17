import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

export function Card({
  children,
  className = "",
  onClick
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-card p-4 ${className}`} onClick={onClick} role={onClick ? "button" : undefined}>
      {children}
    </div>
  );
}

export function Field({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block mb-3">
      <span className="text-sm font-medium text-gray-700 mb-1 block">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

const baseInput =
  "w-full tap-target rounded-xl border border-gray-300 px-3 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400 bg-white";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${baseInput} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${baseInput} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${baseInput} ${props.className ?? ""}`} />;
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-brand-500 text-white active:bg-brand-600 disabled:bg-gray-300",
    secondary: "bg-brand-50 text-brand-600 active:bg-brand-100",
    ghost: "bg-transparent text-gray-600 active:bg-gray-100",
    danger: "bg-red-50 text-red-600 active:bg-red-100"
  }[variant];
  return (
    <button
      {...rest}
      className={`tap-target rounded-xl px-4 font-semibold text-[15px] transition-colors ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Chip({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "green" | "amber" | "red" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-600",
    green: "bg-brand-50 text-brand-600",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-600"
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones}`}>{children}</span>;
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="px-4 pt-12 pb-4 flex items-start justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl max-h-[88vh] flex flex-col animate-[slideup_0.2s_ease-out]">
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="tap-target px-3 text-gray-400 text-2xl leading-none">
            &times;
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  );
}
