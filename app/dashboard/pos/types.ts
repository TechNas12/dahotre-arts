import { Product } from "@/app/actions/products";
import { Customer } from "@/app/actions/customers";

export type CartItem = {
  product: Product;
  quantity: number;
  sellingPrice: number | "";
  variantIndex?: number;
};

export type SaleType = "RETAIL" | "WHOLESALE";
export type OrderType = "BOOKING" | "PURCHASE";
export type PaymentMode = "CASH" | "ONLINE";
export type PaymentType = "FULL" | "ADVANCE";

export type POSCustomerSelection = {
  type: "WALK_IN" | "EXISTING" | "NEW";
  customer?: Customer;
  name: string;
  phone: string;
  email: string;
  address: string;
};

export type POSDraftState = {
  selectedCustomer: POSCustomerSelection;
  cart: CartItem[];
  saleType: SaleType;
  orderType: OrderType;
  paymentMode: PaymentMode;
  paymentType: PaymentType;
  advanceAmountStr: string;
  orderNotes: string;
};
