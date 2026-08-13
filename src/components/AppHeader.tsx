"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

export function AppHeader() {
  const { session, setCatalog } = useAuth();

  if (!session) {
    return null;
  }

  return (
    <header className="flex items-center gap-4 border-b px-4 py-3">
      <SidebarTrigger className="md:hidden" />

      <Select
        value={session.catalogId}
        onValueChange={(value) => setCatalog(value as string)}
      >
        <SelectTrigger className="ml-auto w-56" size="sm">
          <SelectValue placeholder="Select a catalog" />
        </SelectTrigger>
        <SelectContent>
          {session.catalogs.map((catalog) => (
            <SelectItem key={catalog.catalog} value={catalog.catalog}>
              {catalog.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </header>
  );
}
