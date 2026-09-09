const formatNumber = (value: string) => String(Number(value)).padStart(2, '0')

export const getEpisodeLabel = (name: string) => {
  const seasonEpisode = name.match(/(?:^|[^a-z0-9])s(\d{1,2})[ ._-]*e(\d{1,3})(?=$|[^a-z0-9])/i)
  if (seasonEpisode) return `S${Number(seasonEpisode[1])} · 第 ${formatNumber(seasonEpisode[2])} 集`

  const episode = name.match(/(?:^|[\s._\-[\]()])(?:ep?|episode)[ ._-]*0*(\d{1,3})(?=$|[\s._\-[\]()])/i)
  if (episode) return `第 ${formatNumber(episode[1])} 集`

  const chineseEpisode = name.match(/第\s*0*(\d{1,3})\s*[集话話]/)
  if (chineseEpisode) return `第 ${formatNumber(chineseEpisode[1])} 集`

  return null
}
