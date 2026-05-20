import { Github, Linkedin, Mail } from "lucide-react"

const socialLinks = [
  { icon: Github, href: "https://github.com/maze0207", label: "GitHub" },
  { icon: Linkedin, href: "https://linkedin.com/in/mazenahmed", label: "LinkedIn" },
  { icon: Mail, href: "mailto:mazenahmed02071@gmail.com", label: "Email" },
]

export function Footer() {
  return (
    <footer className="py-8 border-t border-zinc-800/50 bg-[#0a0a0f]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <span className="font-mono text-xs font-bold text-white">MA</span>
            </div>
            <span className="text-sm text-zinc-500">
              Built by <span className="text-zinc-400">Mazen Ahmed</span> · Cairo, Egypt · {new Date().getFullYear()}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {socialLinks.map((link, i) => (
              <a
                key={i}
                href={link.href}
                target={link.href.startsWith("mailto") ? undefined : "_blank"}
                rel={link.href.startsWith("mailto") ? undefined : "noopener noreferrer"}
                className="p-2 text-zinc-500 hover:text-cyan-400 transition-colors"
                aria-label={link.label}
              >
                <link.icon size={18} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
