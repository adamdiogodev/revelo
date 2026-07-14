"use client";

export default function Modal({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]">
      <div className="w-full max-w-xs rounded-2xl border border-ink/10 bg-bg-raised p-6 text-center text-ink shadow-2xl">
        {icon && (
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-bg text-ink/70">
            {icon}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
