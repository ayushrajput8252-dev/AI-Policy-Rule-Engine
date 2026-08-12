import ProductGate from "@/components/auth/ProductGate";

/** Route group — doesn't affect URLs (still /rag, /screening-agent, etc.) but
 * gates every product page behind Google sign-in in one place. */
export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <ProductGate>{children}</ProductGate>;
}
