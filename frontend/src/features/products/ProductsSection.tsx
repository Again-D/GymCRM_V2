import type { ReactNode } from "react";

type ProductsSectionProps = {
  children: ReactNode;
};

export function ProductsSection({ children }: ProductsSectionProps) {
  return (
    <section className="workspace-grid" aria-label="상품 관리 화면">
      {children}
    </section>
  );
}
