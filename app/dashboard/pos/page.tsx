export const dynamic = 'force-dynamic';

import { listProducts, listCategories } from "@/app/actions/products";
import { listCustomers } from "@/app/actions/customers";
import POSTerminal from "./POSTerminal";

export default async function POSPage() {
  const [products, categories, customers] = await Promise.all([
    listProducts(),
    listCategories(),
    listCustomers(),
  ]);

  return (
    <div className="animate-[fadeInUp_0.4s_ease-out_forwards]">
      <POSTerminal 
        initialProducts={products} 
        categories={categories} 
        initialCustomers={customers} 
      />
    </div>
  );
}
