import glob from 'glob'
import svelte from 'rollup-plugin-svelte'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import livereload from 'rollup-plugin-livereload'
import { terser } from 'rollup-plugin-terser'
import sveltePreprocess from 'svelte-preprocess'
import typescript from '@rollup/plugin-typescript'
import css from 'rollup-plugin-css-only'
import dayjs from 'dayjs'
const production = !process.env.ROLLUP_WATCH
const DATE = dayjs().format('YYYY-MM-DD HH:mm:ss')
const preprocessOptions = {
  replace: [
    ['process.env.ROLLUP_WATCH', JSON.stringify(process.env.ROLLUP_WATCH)]],
  postcss: {
    plugins: [
      require('autoprefixer'),
    ],
  },
}

let exportArr = [
  {
    input: 'src/main.ts',
    output: {
      sourcemap: !production,
      format: 'iife',
      name: 'app',
      file: 'public/build/bundle.js',
    },
    plugins: [
      svelte({
        preprocess: sveltePreprocess({ sourceMap: !production }),
        compilerOptions: {
          // enable run-time checks when not in production
          dev: !production,
        },
      }),
      // we'll extract any component CSS out into
      // a separate file - better for performance
      css({ output: 'bundle.css' }),

      // If you have external dependencies installed from
      // npm, you'll most likely need these plugins. In
      // some cases you'll need additional configuration -
      // consult the documentation for details:
      // https://github.com/rollup/plugins/tree/master/packages/commonjs
      resolve({
        browser: true,
        dedupe: ['svelte'],
      }),
      commonjs(),
      typescript({
        sourceMap: !production,
        inlineSources: !production,
      }),

      // In dev mode, call `npm run start` once
      // the bundle has been generated
      !production && serve(),

      // Watch the `public` directory and refresh the
      // browser on changes when not in production
      !production && livereload('public'),

      // If we're building for production (npm run build
      // instead of npm run dev), minify
      production && terser(),
    ],
    watch: {
      clearScreen: false,
    },
  }]
glob.sync('./src/Widgets/**/index.ts').forEach(filePath => {
  let widgetName = filePath.split('Widgets/')[1].replace('/index.ts', '')
  console.log(`更新${widgetName}组件`)

  let widgetTemplate = {
    input: `src/Widgets/${widgetName}/index.ts`,
    output: [
      // { file: 'public/build/Widgets/Weather/index.mjs', 'format': 'es' },
      {
        file: `public/Widgets/${widgetName}/index.js`,
        'format': 'umd',
        name: widgetName,
      },
    ],
    plugins: [
      svelte({
        preprocess: sveltePreprocess(preprocessOptions),
        compilerOptions: {
          // enable run-time checks when not in production
          dev: !production,
          customElement: true,
        },
      }),
      resolve({
        browser: true,
        dedupe: ['svelte'],
      }),
      commonjs(),
      // If we're building for production (npm run build
      // instead of npm run dev), minify
      production && terser({
        compress: {
          // remove console.log
          drop_console: true,
          drop_debugger: true,
        },
        output: {
          // add comment on the top
          preamble: `/*! ${widgetName} ${DATE} https://huchundong.github.io */`,
        },
      }),
      copy({
        targets: [
          {
            src: `src/Widgets/${widgetName}/assets`,
            dest: `public/Widgets/${widgetName}`,
          },
        ],
      }),
    ],
  }
  exportArr.push(widgetTemplate)
})

function serve () {
  let server

  function toExit () {
    if (server) server.kill(0)
  }

  return {
    writeBundle () {
      if (server) return
      server = require('child_process').
        spawn('npm', ['run', 'start', '--', '--dev'], {
          stdio: ['ignore', 'inherit', 'inherit'],
          shell: true,
        })

      process.on('SIGTERM', toExit)
      process.on('exit', toExit)
    },
  }
}

export default exportArr
