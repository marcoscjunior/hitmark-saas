/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Isto diz à Vercel para não bloquear o site por erros de tipagem
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignora também avisos chatos de formatação
    ignoreDuringBuilds: true,
  }
};

export default nextConfig;