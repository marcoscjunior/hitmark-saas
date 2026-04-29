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