import { defineConfig, type Plugin } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

function figmaAssetResolver(): Plugin {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        return path.resolve(__dirname, 'src/assets', id.replace('figma:asset/', ''))
      }
    },
  }
}

/**
 * The site has three pages: the landing page (/), the patient app (/patient/*) and the
 * provider workspace (/provider/*). The apps route with real URLs, so any deep link under
 * their prefix must serve that app's page. Production does the same with vercel.json.
 */
function appRoutes(): Plugin {
  const rewrite = (url = '') => {
    const p = url.split('?')[0]
    for (const app of ['patient', 'provider']) {
      if ((p === `/${app}` || p.startsWith(`/${app}/`)) && !/\.[a-z0-9]+$/i.test(p)) return `/${app}/index.html${url.slice(p.length)}`
    }
    return url
  }
  const mw = (req: { url?: string }, _res: unknown, next: () => void) => { req.url = rewrite(req.url); next() }
  return {
    name: 'clanclast-app-routes',
    configureServer(server) { server.middlewares.use(mw) },
    configurePreviewServer(server) { server.middlewares.use(mw) },
  }
}

export default defineConfig({
  plugins: [figmaAssetResolver(), appRoutes(), react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        patient: path.resolve(__dirname, 'patient/index.html'),
        provider: path.resolve(__dirname, 'provider/index.html'),
      },
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
