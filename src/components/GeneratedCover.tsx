const paletteFor = (name: string) => {
  let hash = 0
  for (const character of name) hash = (hash * 31 + character.codePointAt(0)!) >>> 0
  const hue = hash % 360
  return {
    backgroundImage: `linear-gradient(145deg, hsl(${hue} 58% 46%), hsl(${(hue + 52) % 360} 55% 19%))`,
  }
}

const coverMark = (name: string) => {
  const cleaned = name.replace(/^\[[^\]]+\]\s*/, '').trim()
  return Array.from(cleaned || name)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function GeneratedCover({ name }: { name: string }) {
  return (
    <div
      data-generated-cover
      aria-hidden="true"
      style={paletteFor(name)}
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden p-4 text-center text-white"
    >
      <div className="absolute -top-1/4 -right-1/4 h-3/4 w-3/4 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-1/4 -left-1/4 h-3/4 w-3/4 rounded-full bg-black/20 blur-2xl" />
      <span className="relative text-4xl font-black tracking-wider drop-shadow-md">{coverMark(name)}</span>
      <span className="relative mt-4 line-clamp-3 text-xs leading-relaxed font-semibold text-white/90">{name}</span>
    </div>
  )
}
