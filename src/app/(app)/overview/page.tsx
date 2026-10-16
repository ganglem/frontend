"use client";

import { SortableCardList } from "@/components/SortableCardList";
import { PageHeader } from "@/components/PageHeader";
import { useChatVisualizationCardsForPath } from "@/hooks/useGeneratedCards";
import { useResponsiveColumns } from "@/hooks/useResponsiveColumns";
import { useDatasetsCards } from "@/app/(app)/datasets/page";
import { useNamespacesCards } from "@/app/(app)/namespaces/page";
import { useQueryCards } from "@/app/(app)/query/page";
import { useUploadCards } from "@/app/(app)/upload/page";
import { Badge } from "@/components/ui/badge";

const STATIC_DEFAULT_ORDER = [
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
  // namespace/dataset selection, its own sql text) and already folds in that
  // page's own chat cards (useChatVisualizationCardsForPath), so this list is
  // genuinely everything - the only thing not already covered is a card
  // created while chatting from this page itself.
  const namespacesCards = useNamespacesCards();
  const uploadCards = useUploadCards();
  const queryCards = useQueryCards();
  const datasetsCards = useDatasetsCards();
  const overviewChatCards = useChatVisualizationCardsForPath("/overview");

  const cards = [...namespacesCards, ...uploadCards, ...queryCards, ...datasetsCards, ...overviewChatCards];
  // Chat-generated cards don't exist until runtime, so defaultOrder is
  // recomputed here rather than a static literal - useSectionOrder's second
  // effect (see its own comment) picks up ids newly appearing in this array.
  const defaultOrder = [
    ...STATIC_DEFAULT_ORDER,
    ...cards.map((c) => c.id).filter((id) => !STATIC_DEFAULT_ORDER.includes(id)),
  ];
  const columns = useResponsiveColumns({ base: 1, md: 2, lg: 3 });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Playground"
        title="Overview"
        description="Every card from every page, flattened into one list. Drag any card anywhere - they're all independent, nothing is nested inside anything else."
        action={<Badge variant="outline">Beta</Badge>}
      />

      <div className="mx-auto w-full max-w-7xl">
        <SortableCardList
          storageKey="overview-cards-order"
          defaultOrder={defaultOrder}
          cards={cards}
          columns={columns}
        />
      </div>
    </div>
  );
}
