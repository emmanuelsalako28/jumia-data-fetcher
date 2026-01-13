import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JUMIA_COUNTRIES, JumiaCountry } from "@/types/product";
import { Globe } from "lucide-react";

interface CountrySelectorProps {
  value: string;
  onChange: (domain: string) => void;
}

export function CountrySelector({ value, onChange }: CountrySelectorProps) {
  const selectedCountry = JUMIA_COUNTRIES.find((c) => c.domain === value);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground flex items-center gap-2">
        <Globe className="w-4 h-4" />
        Select Country
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full md:w-[200px] bg-card">
          <SelectValue placeholder="Select country">
            {selectedCountry
              ? `${selectedCountry.code} - ${selectedCountry.name}`
              : "Select country"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {JUMIA_COUNTRIES.map((country) => (
            <SelectItem key={country.code} value={country.domain}>
              <span className="font-medium">{country.code}</span>
              <span className="ml-2 text-muted-foreground">{country.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
