import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative z-20 py-8 px-6 text-center border-t border-gray-100 bg-gray-50">
      <p className="text-gray-500 text-sm">
        By using Gambit Technologies Ltd, you agree to our{" "}
        <Link
          href="/terms"
          className="text-gray-700 hover:text-gray-900 underline underline-offset-4 transition-colors inline-block py-1 px-1 pointer-events-auto"
        >
          Terms
        </Link>{" "}
        and have read our{" "}
        <Link
          href="/privacy"
          className="text-gray-700 hover:text-gray-900 underline underline-offset-4 transition-colors inline-block py-1 px-1 pointer-events-auto"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </footer>
  );
}


