import { PageLoading } from "@/components/layout/page-loading";

export default function ProductLoading() {
  return (
    <div className="min-h-screen">
      <PageLoading label="Carregando produto..." />
    </div>
  );
}
