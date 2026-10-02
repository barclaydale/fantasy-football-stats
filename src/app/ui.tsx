import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-5 ${className}`}>
      {children}
    </div>
  );
}

export function InjuryBadge({
  status,
  bodyPart,
}: {
  status: string;
  bodyPart?: string | null;
}) {
  return (
    <span className="inline-flex items-center rounded-full bg-danger-bg px-2 py-0.5 text-xs font-medium whitespace-nowrap text-danger">
      {status}
      {bodyPart ? ` · ${bodyPart}` : ""}
    </span>
  );
}

const baseControl =
  "rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export function TextInput(props: ComponentProps<"input">) {
  const { className = "", ...rest } = props;
  return <input {...rest} className={`${baseControl} ${className}`} />;
}

export function Select(props: ComponentProps<"select">) {
  const { className = "", ...rest } = props;
  return <select {...rest} className={`${baseControl} ${className}`} />;
}

export function Button(props: ComponentProps<"button">) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
}

export function GhostButton(props: ComponentProps<"button">) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center rounded-lg border border-border px-4 py-1.5 text-sm font-medium text-muted transition-colors hover:border-danger hover:text-danger ${className}`}
    />
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
    >
      ← {children}
    </Link>
  );
}

export const th = "px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-muted uppercase";
export const td = "px-4 py-2.5";
export const tr = "border-t border-border transition-colors hover:bg-surface-hover";

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
      {children}
    </div>
  );
}
