export default function Footer() {
  return (
    <footer className="border-t border-neutral-800 mt-8 print-hidden">
      <div className="max-w-5xl mx-auto px-4 py-4 text-xs text-neutral-500 flex flex-col sm:flex-row justify-between gap-2">
        <span>&copy; {new Date().getFullYear()} Baio Systems. Todos os direitos reservados.</span>
        <span>
          Feito com Next.js & Tailwind -{" "}
          <a
            href="https://github.com/IgorBaio"
            target="_blank"
            rel="noreferrer"
            className="hover:text-emerald-400"
          >
            @IgorBaio
          </a>
        </span>
      </div>
    </footer>
  );
}
