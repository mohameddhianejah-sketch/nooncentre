export default function WhatsAppFloat({ whatsapp = '21629909099' }) {
  return (
    <a className="wa-float" href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" aria-label="Contactez-nous sur WhatsApp">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.5 11.2a8.2 8.2 0 0 1-12.2 7.1L4 19.5l1.2-4.1A8.2 8.2 0 1 1 20.5 11.2Z" />
        <path d="M8.7 8.1c.4-.4 1-.4 1.4 0l1 1c.3.3.3.7.1 1l-.6.8c.7 1.3 1.8 2.4 3.1 3.1l.8-.6c.3-.2.7-.2 1 .1l1 1c.4.4.4 1 0 1.4l-.3.3c-.4.4-1.1.6-1.7.4-3.1-.9-5.5-3.3-6.4-6.4-.2-.6 0-1.3.4-1.7Z" />
      </svg>
      <span>Contactez-nous</span>
    </a>
  );
}
