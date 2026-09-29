import { NextResponse } from "next/server";
import { getPublicSupplierDirectoryPage } from "@/lib/supplier-directory-server";
import {
  SUPPLIER_LIST_PAGE_SIZE,
  parseDirectoryFilters,
} from "@/lib/supplier-directory";

export const revalidate = 300;

// Paginated public directory. First HTML only ships page 1; later pages load here.
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  try {
    const result = await getPublicSupplierDirectoryPage({
      filters: parseDirectoryFilters(sp),
      page: Number(sp.get("page")) || 1,
      pageSize: Number(sp.get("pageSize")) || SUPPLIER_LIST_PAGE_SIZE,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to load suppliers" },
      { status: 500 }
    );
  }
}
