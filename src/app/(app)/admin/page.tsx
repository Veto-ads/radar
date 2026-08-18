import AdminStatsCards from "@/components/admin/AdminStatsCards";
import EntityListManager from "@/components/admin/EntityListManager";
import BoardsCatalog from "@/components/admin/BoardsCatalog";
import UsersManager from "@/components/admin/UsersManager";
import ExportDataSection from "@/components/admin/ExportDataSection";
import ApiKeysManager from "@/components/admin/ApiKeysManager";

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <AdminStatsCards />
      <EntityListManager
        title="إدارة القطاعات"
        placeholder="اسم قطاع جديد"
        basePath="/api/sectors"
        listKey="sectors"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EntityListManager
          title="أنواع اللوحات"
          placeholder="نوع جديد"
          basePath="/api/board-types"
          listKey="types"
        />
        <EntityListManager
          title="تصنيفات اللوحات"
          placeholder="تصنيف جديد"
          basePath="/api/board-categories"
          listKey="categories"
        />
      </div>
      <BoardsCatalog />
      <UsersManager />
      <ExportDataSection />
      <ApiKeysManager />
    </div>
  );
}
