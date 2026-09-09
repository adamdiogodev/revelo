export default function CoverBackground({ url }: { url: string | null }) {
  if (!url) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-bg/40 via-bg/80 to-bg" />
      <div className="absolute inset-0 bg-[radial-gradient(80vw_60vh_at_50%_-10%,rgba(158,20,45,0.35),transparent_70%)]" />
    </div>
  );
}
