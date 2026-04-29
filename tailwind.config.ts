import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;

### 2. Ficheiro `src/app/globals.css`
*Apenas estas linhas, sem mais nada, para carregar os estilos de base da framework.*
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body {
  height: 100%;
}

### 3. Ficheiro `src/app/layout.tsx`
*Este é o ficheiro que liga o CSS à sua aplicação de facto.*
```tsx
import "./globals.css";

export const metadata = {
  title: "HitMark SaaS",
  description: "Painel de Metas e Resultados",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-slate-950 text-slate-200">
        {children}
      </body>
    </html>
  );
}

Após confirmar que estes 3 ficheiros estão exatos e de ter colado o novo código no `page.tsx`, basta usar os comandos:
```bash
git add .
git commit -m "Corrigindo estilos da Vercel definitivamente"
git push

Acompanhe o carregamento ("Deploy") na Vercel e atualize a página assim que terminar. Vai ver tudo montado com o visual perfeito! Aguardo o seu feedback.