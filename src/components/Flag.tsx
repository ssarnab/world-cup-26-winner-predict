// flagcdn flag image (renders everywhere, unlike emoji flags on Windows)
export function Flag({ code, size = "md" }: { code: string; size?: "sm" | "md" | "lg" }) {
  const cls =
    size === "lg" ? "h-7 w-10" : size === "sm" ? "h-3 w-4" : "h-3.5 w-5";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      width={40}
      height={30}
      alt=""
      loading="lazy"
      className={`${cls} shrink-0 rounded-[2px] object-cover ring-1 ring-black/30`}
    />
  );
}
