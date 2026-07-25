export const dynamic = 'force-dynamic';

import { listOrders } from "@/app/actions/orders";
import OrdersTable from "./OrdersTable";

export default async function OrdersPage() {
  const orders = await listOrders();

  return (
    <div className="space-y-6 animate-[fadeInUp_0.4s_ease-out_forwards]">
      <div>
        <h1 className="text-3xl font-bold text-slate-50 tracking-tight">Orders</h1>
        <p className="text-slate-400 mt-2">View and manage all orders placed from the POS terminal.</p>
      </div>

      <OrdersTable initialOrders={orders} />
    </div>
  );
}
