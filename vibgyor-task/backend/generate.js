#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { parseDrawing } from './dxfParser.js'
import { generateModel3D } from './modelGenerator.js'
import { generateRender } from './renderEngine.js'
import path from 'path'
import fs from 'fs-extra'

async function main() {
  const argv = yargs(hideBin(process.argv))
    .command('generate', 'Generate 3D model from DXF/DWG file', (yargs) => {
      return yargs
        .option('input', {
          alias: 'i',
          describe: 'Input DXF or DWG file',
          type: 'string',
          demandOption: true
        })
        .option('output', {
          alias: 'o',
          describe: 'Output directory',
          type: 'string',
          default: './output'
        })
        .option('renders', {
          alias: 'r',
          describe: 'Generate renders',
          type: 'boolean',
          default: true
        })
    })
    .help()
    .alias('help', 'h')
    .parse()

  try {
    if (argv._[0] === 'generate') {
      console.log('🏗️  Vibgyor Building Automation CLI')
      console.log('====================================\n')

      const inputFile = argv.input
      const outputDir = argv.output
      const generateRenders = argv.renders

      // Validate input file
      if (!fs.existsSync(inputFile)) {
        console.error(`❌ Error: Input file not found: ${inputFile}`)
        process.exit(1)
      }

      console.log(`📂 Input file: ${inputFile}`)
      console.log(`📁 Output directory: ${outputDir}\n`)

      // Create output directory
      await fs.ensureDir(outputDir)

      // Parse drawing
      console.log('📐 Parsing drawing...')
      const drawingData = await parseDrawing(inputFile)
      console.log(`   ✓ Found ${drawingData.entities.length} entities`)
      console.log(`   ✓ Found ${Object.keys(drawingData.layers).length} layers\n`)

      // Generate 3D model
      console.log('🏗️  Generating 3D model...')
      const model3D = await generateModel3D(drawingData, outputDir)
      console.log('   ✓ Model generated successfully\n')

      // Generate renders
      if (generateRenders) {
        console.log('🎨 Generating renders...')
        const renders = await generateRender(model3D, outputDir)
        console.log(`   ✓ Generated ${renders.length} renders\n`)
      }

      // Summary
      console.log('✅ Conversion Complete!')
      console.log('====================================')
      console.log(`📊 Summary:`)
      console.log(`   • 3D Model: ${path.join(outputDir, 'model.gltf')}`)
      console.log(`   • Metadata: ${path.join(outputDir, 'metadata.json')}`)
      if (generateRenders) {
        console.log(`   • Renders: ${path.join(outputDir, 'renders')}`)
      }
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`)
    process.exit(1)
  }
}

main()
