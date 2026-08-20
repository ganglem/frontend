"use client";

import { useState, type ReactNode } from "react";
import { DatasetsMetadataCard } from "@/components/cards/DatasetsMetadataCard";
import { DatasetsPreviewSchemaCard } from "@/components/cards/DatasetsPreviewSchemaCard";
import { DatasetsSelectionCard } from "@/components/cards/DatasetsSelectionCard";
import { SortableCardList } from "@/components/SortableCardList";
import { useDatasetQuery } from "@/hooks/useCatalog";

const DEFAULT_ORDER = ["datasets-selection", "datasets-metadata", "datasets-preview-schema"];

// Owns the shared namespace/dataset selection and produces the cards that
// depend on it. Called by both this page and Overview, each getting its own
// separate instance of the selection state.
export function useDatasetsCards(): { id: string; node: ReactNode }[] {
  const [namespace, setNamespace] = useState("");
  const [dataset, setDataset] = useState("");
  const datasetInfoQuery = useDatasetQuery(namespace, dataset);

  const cards: { id: string; node: ReactNode }[] = [
    {
      id: "datasets-selection",
      node: (
        <DatasetsSelectionCard
          namespace={namespace}
          dataset={dataset}
          onNamespaceChange={(value) => {
            setNamespace(value);
            setDataset("");
          }}
          onDatasetChange={setDataset}
        />
      ),
    },
  ];

  if (dataset) {
    cards.push({
      id: "datasets-metadata",
      node: (
        <DatasetsMetadataCard namespace={namespace} dataset={dataset} onDeleted={() => setDataset("")} />
      ),
    });
  }

  if (dataset && datasetInfoQuery.data) {
    cards.push({
      id: "datasets-preview-schema",
      node: <DatasetsPreviewSchemaCard namespace={namespace} dataset={dataset} />,
    });
  }

  return cards;
}

export default function DatasetsPage() {
  const cards = useDatasetsCards();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center">
      <div className="w-full max-w-3xl">
        <SortableCardList storageKey="datasets-cards-order" defaultOrder={DEFAULT_ORDER} cards={cards} />
      </div>
    </div>
  );
}
