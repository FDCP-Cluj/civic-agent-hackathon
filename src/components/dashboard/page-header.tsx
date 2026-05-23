import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export function PageHeader({ title, description, children }: Props) {
  return (
    <div className="-mt-3 flex w-full flex-col gap-3 border-b border-border pb-4 md:-mt-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[1.9rem] font-semibold tracking-[-0.02em] sm:text-[2.25rem]">
          {title}
        </h1>
        {description ? <p className="mt-1 text-base text-muted-foreground">{description}</p> : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}
