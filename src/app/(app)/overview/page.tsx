"use client";

import { SortableCardList } from "@/components/SortableCardList";
import { PageHeader } from "@/components/PageHeader";
import { useResponsiveColumns } from "@/hooks/useResponsiveColumns";
import { useDatasetsCards } from "@/app/(app)/datasets/page";
import { useNamespacesCards } from "@/app/(app)/namespaces/page";
import { useQueryCards } from "@/app/(app)/query/page";
import { useUploadCards } from "@/app/(app)/upload/page";

const DEFAULT_ORDER = [
  "namespaces-table",
  "upload-form",
  "query-input",
  "query-results",
  "datasets-selection",
  "datasets-metadata",
  "datasets-preview-schema",
];

export default function OverviewPage() {
  // Each hook owns its own independent copy of that page's state (its own
  // namespace/dataset selection, its own sql text) - separate from the
  // dedicated page's instance.
  const namespacesCards = useNamespacesCards();
  const uploadCards = useUploadCards();
  const queryCards = useQueryCards();
  const datasetsCards = useDatasetsCards();

  const cards = [...namespacesCards, ...uploadCards, ...queryCards, ...datasetsCards];
  const columns = useResponsiveColumns({ base: 1, md: 2, lg: 3 });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Playground"
        title="Overview"
        description="Every card from every page, flattened into one list. Drag any card anywhere - they're all independent, nothing is nested inside anything else."
      />

      <div className="mx-auto w-full max-w-7xl">
        <SortableCardList
          storageKey="overview-cards-order"
          defaultOrder={DEFAULT_ORDER}
          cards={cards}
          columns={columns}
        />
      </div>
    </div>
  );
}
