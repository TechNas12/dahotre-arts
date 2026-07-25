export const dynamic = 'force-dynamic';

import { listProducts, listCategories } from "@/app/actions/products";
import ProductsTable from "./ProductsTable";

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([
    listProducts(),
    listCategories(),
  ]);

  return (
    <div className="space-y-6 animate-[fadeInUp_0.4s_ease-out_forwards]">
      <div>
        <h1 className="text-3xl font-bold text-slate-50 tracking-tight">Products</h1>
        <p className="text-slate-400 mt-2">Manage your product catalog, categories, and stock.</p>
      </div>

      <ProductsTable initialProducts={products} categories={categories} />
    </div>
  );
}
