export const dynamic = 'force-dynamic';

import { Suspense } from "react";
import { listProducts, listCategories } from "@/app/actions/products";
import { parsePaginationParams } from "@/lib/paginationHelper";
import ProductsTable from "./ProductsTable";

async function ProductsData({ searchParams }: { searchParams: { [key: string]: string | undefined } }) {
  const { page, pageSize } = parsePaginationParams(searchParams);
  const search = searchParams.search || '';
  const parsedCategoryId = parseInt(searchParams.categoryId || '', 10);
  const categoryId = Number.isNaN(parsedCategoryId) ? undefined : parsedCategoryId;

  const [{ data, totalCount }, categories] = await Promise.all([
    listProducts({ page, pageSize, search, categoryId }),
    listCategories(),
  ]);
  
  return (
    <ProductsTable 
      initialProducts={data} 
      categories={categories} 
      totalCount={totalCount}
      initialPage={page}
      initialPageSize={pageSize}
      initialSearch={search}
      initialCategory={categoryId}
    />
  );
}

export default async function ProductsPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams;
  const suspenseKey = JSON.stringify(searchParams);

  return (
    <div className="space-y-6 animate-[fadeInUp_0.4s_ease-out_forwards]">
      <div>
        <h1 className="text-3xl font-bold text-[#F5F5F5] tracking-tight">Products</h1>
        <p className="text-[#A3A3A3] mt-2">Manage your product catalog, categories, and stock.</p>
      </div>

      <Suspense fallback={
        <div className="w-full h-[600px] bg-[#111111] border border-[#1F1F1F] rounded-xl animate-pulse"></div>
      }>
        <ProductsData searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
