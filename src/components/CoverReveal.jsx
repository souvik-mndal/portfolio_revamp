export default function CoverReveal({ under, over }) {
  return (
    <>
      {/* pin zone: 200vh tall; `under` stays stuck for the first 100vh of scroll */}
      <div data-pin-wrap className="relative w-full" style={{ height: "200vh" }}>
        <div className="sticky top-0 z-0 h-screen w-full overflow-hidden bg-[#121212]">{under}</div>
      </div>
      {/* pulled up one viewport so `over` slides up over the pinned `under` */}
      <div className="relative z-10" style={{ marginTop: "-100vh" }}>
        {over}
      </div>
    </>
  );
}