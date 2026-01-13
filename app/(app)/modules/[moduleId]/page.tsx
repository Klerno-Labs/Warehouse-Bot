"use client";

import { use } from "react";
import ModulePlaceholderPage from "@/pages/module-placeholder";
import type { ModuleId } from "@shared/schema";

export default function Page({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = use(params);
  return <ModulePlaceholderPage moduleId={moduleId as ModuleId} />;
}
