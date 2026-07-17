export default function CoverBackground({ url }: { url: string | null }) {
  if (!url) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-bg/20 via-bg/70 to-bg" />
    </div>
  );
}
