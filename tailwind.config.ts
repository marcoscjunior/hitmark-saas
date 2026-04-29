import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    // Se o seu arquivo se chamar page.tsx, App.tsx, etc., garanta que a pasta dele está mapeada acima.
  ],
  darkMode: 'class', // Importante já que você tem a função de dark/light mode
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config
