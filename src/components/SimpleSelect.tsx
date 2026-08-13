import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SimpleSelectProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  items: string[];
  placeholder: string;
  loadingPlaceholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

export function SimpleSelect({
  id,
  value,
  onValueChange,
  items,
  placeholder,
  loadingPlaceholder = "Loading…",
  isLoading = false,
  disabled = false,
}: SimpleSelectProps) {
  return (
    <Select
      value={value || undefined}
      onValueChange={(next) => onValueChange(next as string)}
      disabled={disabled || isLoading}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder={isLoading ? loadingPlaceholder : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item} value={item}>
            {item}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
