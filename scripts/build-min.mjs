import { readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const files = [
  ['src/core/mask.mjs', 'src/core/mask.min.mjs'],
  ['src/core/mask.cjs.js', 'src/core/mask.min.cjs.js'],
]

function compact(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//'))
    .join('\n')
    .replace(/\n{2,}/g, '\n')
}

for (const [input, output] of files) {
  const minified = compact(readFileSync(input, 'utf8'))
  writeFileSync(output, `${minified}\n`)

  const rawKb = Buffer.byteLength(minified) / 1024
  const gzipKb = gzipSync(minified).byteLength / 1024
  console.log(`${output}: ${rawKb.toFixed(2)}kb, gzip ${gzipKb.toFixed(2)}kb`)
}
