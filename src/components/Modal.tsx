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
      <div className="card w-full max-w-xs p-6 text-center text-ink shadow-2xl animate-[riseIn_280ms_ease-out]">
        {icon && (
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-accent-soft">
            {icon}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
