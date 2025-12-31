"use client";

import ModulePlaceholderPage from "@/pages/module-placeholder";
import type { ModuleId } from "@shared/schema";

export default function Page({ params }: { params: { moduleId: string } }) {
  return <ModulePlaceholderPage moduleId={params.moduleId as ModuleId} />;
}
