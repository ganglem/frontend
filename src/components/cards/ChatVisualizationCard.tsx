"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { AppCard } from "@/components/cards/AppCard";
import { CollapseToggle, CollapsibleBody, useCollapsible } from "@/components/cards/Collapsible";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useGeneratedCards } from "@/hooks/useGeneratedCards";
import type { ChatVisualizationPayload } from "@/types/chat";

// Validated 8-hue categorical order (dataviz skill's reference palette) for
// genuinely multi-series charts. This app's own --chart-1..5 tokens are a
// single-hue lightness ramp meant for sequential/ordinal magnitude, not
// categorical identity - cycling it across series would fail CVD separation,
// so a multi-series chart borrows this fixed order instead.
const CATEGORICAL_PALETTE = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
];

const AXIS_PROPS = {
  tickLine: false,
  axisLine: false,
  stroke: "var(--muted-foreground)",
  fontSize: 12,
} as const;

function buildChartConfig(series: ChatVisualizationPayload["series"]): ChartConfig {
  const config: ChartConfig = {};

  series.forEach((s, index) => {
    config[s.key] = {
      label: s.label ?? s.key,
      // A single series has nothing to distinguish by hue - use the app's
      // own brand blue (the same one every button/badge already uses)
      // rather than reaching for the categorical palette unnecessarily.
      color:
        series.length === 1
          ? "var(--primary)"
          : CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length],
    };
  });

  return config;
}

function renderChart(record: ChatVisualizationPayload, showLegend: boolean) {
  const seriesKeys = record.series.map((s) => s.key);

  switch (record.chartType) {
    case "bar":
      return (
        <BarChart data={record.data} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey={record.xKey} {...AXIS_PROPS} />
          <YAxis width={40} {...AXIS_PROPS} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {showLegend ? <ChartLegend content={<ChartLegendContent />} /> : null}
          {seriesKeys.map((key) => (
            <Bar key={key} dataKey={key} fill={`var(--color-${key})`} radius={[4, 4, 0, 0]} maxBarSize={24} />
          ))}
        </BarChart>
      );
    case "line":
      return (
        <LineChart data={record.data}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey={record.xKey} {...AXIS_PROPS} />
          <YAxis width={40} {...AXIS_PROPS} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {showLegend ? <ChartLegend content={<ChartLegendContent />} /> : null}
          {seriesKeys.map((key) => (
            <Line
              key={key}
              dataKey={key}
              type="monotone"
              stroke={`var(--color-${key})`}
              strokeWidth={2}
              dot={{ r: 4, fill: `var(--color-${key})`, stroke: "var(--card)", strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      );
    case "area":
      return (
        <AreaChart data={record.data}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey={record.xKey} {...AXIS_PROPS} />
          <YAxis width={40} {...AXIS_PROPS} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {showLegend ? <ChartLegend content={<ChartLegendContent />} /> : null}
          {seriesKeys.map((key) => (
            <Area
              key={key}
              dataKey={key}
              type="monotone"
              stroke={`var(--color-${key})`}
              strokeWidth={2}
              fill={`var(--color-${key})`}
              fillOpacity={0.1}
            />
          ))}
        </AreaChart>
      );
    case "pie": {
      const key = seriesKeys[0];

      return (
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Pie
            data={record.data}
            dataKey={key}
            nameKey={record.xKey}
            innerRadius={48}
            outerRadius={80}
            paddingAngle={2}
          >
            {record.data.map((_, index) => (
              <Cell
                key={index}
                fill={CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length]}
                stroke="var(--card)"
                strokeWidth={2}
              />
            ))}
          </Pie>
        </PieChart>
      );
    }
  }
}

interface ChatVisualizationCardProps {
  record: ChatVisualizationPayload;
}

// Same shape as every other dashboard card (AppCard > CardHeader > Collapsible
// body > CardContent, see QueryResultCard.tsx) - this one just happens to be
// created at runtime by the chat feature instead of a page's own state.
export function ChatVisualizationCard({ record }: ChatVisualizationCardProps) {
  const { isCollapsed, toggle } = useCollapsible();
  const { removeCard } = useGeneratedCards();
  const config = buildChartConfig(record.series);
  const showLegend = record.series.length > 1;

  return (
    <AppCard className="animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-6 duration-500 ease-bounce">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <PageHeader eyebrow="From chat" title={record.title} description={record.description} />
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="secondary">{record.chartType} chart</Badge>
            <CollapseToggle isCollapsed={isCollapsed} onToggle={toggle} label={record.title} />
          </div>
        </div>
      </CardHeader>
      <CollapsibleBody isCollapsed={isCollapsed}>
        <CardContent className="space-y-4">
          <ChartContainer config={config} className="aspect-auto h-64 w-full">
            {renderChart(record, showLegend)}
          </ChartContainer>
          {record.sourceQuery ? (
            <p className="truncate font-mono text-xs text-muted-foreground" title={record.sourceQuery}>
              {record.sourceQuery}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => removeCard(record.id)}>
              Remove from dashboard
            </Button>
          </div>
        </CardContent>
      </CollapsibleBody>
    </AppCard>
  );
}
