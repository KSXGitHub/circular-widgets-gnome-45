#! /usr/bin/env node
const fs = require('fs')
const path = require('path')

const src = path.join(__dirname, 'src')
const dst = path.join(__dirname, 'dist')

const assets = [
  'schemas/org.gnome.shell.extensions.circular.gschema.xml',
  'metadata.json',
  'stylesheet.css',
]

fs.mkdirSync(dst, { recursive: true })

for (const suffix of assets) {
  const srcFile = path.join(src, suffix)
  const dstFile = path.join(dst, suffix)
  console.info(`Copying ${suffix}...`)
  fs.mkdirSync(path.dirname(dstFile), { recursive: true })
  fs.copyFileSync(srcFile, dstFile)
}
