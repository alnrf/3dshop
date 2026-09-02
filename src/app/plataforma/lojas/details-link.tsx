// app/plataforma/lojas/details-link.tsx
import Link from "next/link";

export function DetailsLink({ storeId }: { storeId: string }) {
  return (
    <Link
      href={`/plataforma/lojas/${storeId}`}
      title="Ver detalhes"
      aria-label="Ver detalhes"
      className="flex items-center justify-center rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    </Link>
  );
}
