import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/60 px-8 py-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="text-[26px] font-semibold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 text-[13.5px] text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
