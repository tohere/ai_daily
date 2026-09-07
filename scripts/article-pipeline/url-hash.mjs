// FNV-1a 32 位哈希：为无 HN 来源的 URL 生成稳定短标识（slug 后缀与文件名使用）
export function urlHashHex(value) {
  let hash = 0x811c9dc5
  const text = String(value)
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = (hash * 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}
