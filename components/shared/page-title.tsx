interface PageTitleProps {
  title: string;
  breadcrumb: string;
  action?: React.ReactNode;
}

export function PageTitle({ title, breadcrumb, action }: PageTitleProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 className="text-4xl font-semibold text-white md:text-5xl">{title}</h1>
        <p className="mt-1 text-sm text-slate-300">{breadcrumb}</p>
      </div>
      {action ? <div className="w-full md:w-auto">{action}</div> : null}
    </div>
  );
}
