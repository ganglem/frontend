"use client";

import { AppCard } from "@/components/cards/AppCard";
import { CollapseToggle, CollapsibleBody, useCollapsible } from "@/components/cards/Collapsible";
import { PageHeader } from "@/components/PageHeader";
import { SimpleSelect } from "@/components/SimpleSelect";
import { CardContent, CardHeader } from "@/components/ui/card";
import { useNamespaceDatasetOptions } from "@/hooks/useCatalog";

interface DatasetsSelectionCardProps {
  namespace: string;
  dataset: string;
  onNamespaceChange: (value: string) => void;
  onDatasetChange: (value: string) => void;
}

// Carries the page title. Owns nothing but the pickers themselves - the
// actual namespace/dataset selection state lives one level up so the
// Metadata and Preview & schema cards (independent siblings, not children)
// can react to it too.
export function DatasetsSelectionCard({
  namespace,
  dataset,
  onNamespaceChange,
  onDatasetChange,
}: DatasetsSelectionCardProps) {
  const { namespacesQuery, datasetsQuery, namespaceItems, datasetItems } =
    useNamespaceDatasetOptions(namespace);
  const { isCollapsed, toggle } = useCollapsible();

  return (
    <AppCard>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <PageHeader title="Datasets" />
          <CollapseToggle isCollapsed={isCollapsed} onToggle={toggle} label="Datasets" />
        </div>
      </CardHeader>
      <CollapsibleBody isCollapsed={isCollapsed}>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-1/2">
              <SimpleSelect
                value={namespace}
                onValueChange={(value) => {
                  onNamespaceChange(value);
                  onDatasetChange("");
                }}
                items={namespaceItems}
                placeholder="Select a namespace"
                isLoading={namespacesQuery.isLoading}
              />
            </div>

            {namespace ? (
              <div className="w-1/2 animate-in fade-in-0 zoom-in-95 duration-300 ease-bounce">
                <SimpleSelect
                  value={dataset}
                  onValueChange={onDatasetChange}
                  items={datasetItems}
                  placeholder="Select a dataset"
                  isLoading={datasetsQuery.isLoading}
                />
              </div>
            ) : null}
          </div>
        </CardContent>
      </CollapsibleBody>
    </AppCard>
  );
}
