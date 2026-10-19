import { CustomerFormSkeleton } from "@/components/skeletons/form-skeleton";

export default function CustomerFormLoading() {
  return <CustomerFormSkeleton editing={false} />;
}
