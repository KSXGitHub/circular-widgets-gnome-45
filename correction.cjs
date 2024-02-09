const fs = require('fs')
const path = require('path')

console.info('Generating ambient.d.ts...')
const manifest = require('./package.json')
const types = Object.keys(manifest.dependencies).sort()
const content = types.map(name => `import '${name}'`).join('\n')
const targetFile = path.join(__dirname, 'ambient.d.ts')
fs.writeFileSync(targetFile, content + '\n')

console.info('Correcting tsconfig.json...')
const tsconfig = require('./tsconfig.json')
const files = fs.readdirSync(path.join(__dirname, 'src'))
const jsFiles = files.filter(x => x.endsWith('.js')).map(x => path.join('src', x))
tsconfig.files = jsFiles
fs.writeFileSync(path.join(__dirname, 'tsconfig.json'), JSON.stringify(tsconfig, undefined, 2) + '\n')
