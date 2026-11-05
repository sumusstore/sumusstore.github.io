"use client";

import { useEffect, useState } from "react";
import type { FilterField } from "@/lib/catalogue";
import { supabase } from "@/lib/supabase";

type FieldRow = {
  label: string;
  field_type: "text" | "number" | "choice";
  unit: string | null;
  options: string[];
};

/** The detail fields the admin switched on as filters for one subcategory. Empty if none, or if they can't load. */
export function useFilterFields(categoryId: string | null): FilterField[] {
  const [fields, setFields] = useState<FilterField[]>([]);

  useEffect(() => {
    if (!categoryId) {
      setFields([]);
      return;
    }

    let active = true;
    supabase
      .from("category_fields")
      .select("label, field_type, unit, options")
      .eq("category_id", categoryId)
      .eq("is_filter", true)
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        setFields(
          error
            ? []
            : ((data ?? []) as FieldRow[]).map((row) => ({
                label: row.label,
                fieldType: row.field_type,
                unit: row.unit,
                options: row.options,
              }))
        );
      });

    return () => {
      active = false;
    };
  }, [categoryId]);

  return fields;
}
