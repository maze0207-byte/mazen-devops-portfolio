import type { Metadata } from 'next'

import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: 'Mazen Ahmed — DevOps Engineer',
  description: 'Mid DevOps Engineer specializing in AWS, Terraform, Docker & Kubernetes. Building resilient cloud infrastructure and automated CI/CD pipelines.',
  keywords: ['DevOps', 'AWS', 'Terraform', 'Kubernetes', 'Docker', 'CI/CD', 'Cloud Engineer'],
  authors: [{ name: 'Mazen Ahmed' }],
  openGraph: {
    title: 'Mazen Ahmed — DevOps Engineer',
    description: 'Mid DevOps Engineer specializing in AWS, Terraform, Docker & Kubernetes.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark bg-[#0a0a0f]">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
