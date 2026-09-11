const formatNumber = (value: string) => String(Number(value)).padStart(2, '0')

const parseEpisodeParts = (name: string) => {
  const seasonEpisode = name.match(/(?:^|[^a-z0-9])s(\d{1,2})[ ._-]*e(\d{1,3})(?=$|[^a-z0-9])/i)
  if (seasonEpisode) return { season: Number(seasonEpisode[1]), episode: Number(seasonEpisode[2]) }

  const episode = name.match(/(?:^|[\s._\-[\]()])(?:ep?|episode)[ ._-]*0*(\d{1,3})(?=$|[\s._\-[\]()])/i)
  if (episode) return { episode: Number(episode[1]) }

  const chineseEpisode = name.match(/第\s*0*(\d{1,3})\s*[集话話]/)
  if (chineseEpisode) return { episode: Number(chineseEpisode[1]) }

  return null
}

export const getEpisodeLabel = (name: string) => {
  const parts = parseEpisodeParts(name)
  if (!parts) return null
  if (parts.season) return `S${parts.season} · 第 ${formatNumber(String(parts.episode))} 集`
  return `第 ${formatNumber(String(parts.episode))} 集`
}

export const getEpisodeSortKey = (name: string) => {
  const parts = parseEpisodeParts(name)
  if (!parts) return null
  return (parts.season ?? 0) * 1000 + parts.episode
}
