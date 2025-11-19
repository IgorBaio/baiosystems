"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Início" },
  { href: "/apps", label: "Apps" },
  { href: "/privacy", label: "Privacidade" },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
      <nav className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg">
          <span className="text-emerald-400">Baio</span>Systems
        </Link>
        <div className="flex gap-4 text-sm">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition ${
                  active
                    ? "text-emerald-400"
                    : "text-neutral-300 hover:text-emerald-300"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
