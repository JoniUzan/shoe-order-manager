import { PageHeaderSkeleton } from "@/components/skeletons/page-header-skeleton";

/**
 * Only the header's shape: until the page has counted orders, Customers and
 * models it may turn out to be GetStarted, not the dashboard (ADR 0012).
 */
export default function DashboardLoading() {
  return <PageHeaderSkeleton />;
}
