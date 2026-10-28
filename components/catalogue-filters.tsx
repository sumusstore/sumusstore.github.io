import { PRICE_BANDS, type CatalogueFilters, type Facets } from "@/lib/catalogue";

type FilterPanelProps = {
  facets: Facets;
  filters: CatalogueFilters;
  onChange: (next: CatalogueFilters) => void;
};

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

type CheckboxGroupProps = {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
};

function CheckboxGroup({ title, options, selected, onToggle }: CheckboxGroupProps) {
  if (options.length === 0) return null;

  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-900">{title}</legend>
      <ul className="mt-2 space-y-2">
        {options.map((option) => (
          <li key={option}>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => onToggle(option)}
                className="h-4 w-4 rounded border-slate-300 accent-blue-700"
              />
              {option}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

export function FilterPanel({ facets, filters, onChange }: FilterPanelProps) {
  return (
    <div className="space-y-6">
      <CheckboxGroup
        title="Brand"
        options={facets.brands}
        selected={filters.brands}
        onToggle={(value) => onChange({ ...filters, brands: toggle(filters.brands, value) })}
      />

      <fieldset>
        <legend className="text-sm font-semibold text-slate-900">Price</legend>
        <ul className="mt-2 space-y-2">
          {PRICE_BANDS.map((band) => (
            <li key={band.value}>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="price-band"
                  checked={filters.priceBand === band.value}
                  onChange={() => onChange({ ...filters, priceBand: band.value })}
                  className="h-4 w-4 accent-blue-700"
                />
                {band.label}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <CheckboxGroup
        title="Storage"
        options={facets.storages}
        selected={filters.storages}
        onToggle={(value) => onChange({ ...filters, storages: toggle(filters.storages, value) })}
      />

      <CheckboxGroup
        title="Colour"
        options={facets.colours}
        selected={filters.colours}
        onToggle={(value) => onChange({ ...filters, colours: toggle(filters.colours, value) })}
      />

      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-900">
        <input
          type="checkbox"
          checked={filters.inStockOnly}
          onChange={() => onChange({ ...filters, inStockOnly: !filters.inStockOnly })}
          className="h-4 w-4 accent-blue-700"
        />
        In stock only
      </label>
    </div>
  );
}
