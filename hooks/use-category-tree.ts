"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  isPopular: boolean;
  children: CategoryNode[];
};

type CategoryRow = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  is_popular: boolean;
};

export type CategoryStatus = "loading" | "ready" | "error";

/** Turns a flat list of categories into a tree, keeping the sort order. */
export function buildCategoryTree(rows: CategoryRow[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>();
  rows.forEach((row) => {
    nodes.set(row.id, {
      id: row.id,
      name: row.name,
      slug: row.slug,
      isPopular: row.is_popular,
      children: [],
    });
  });

  const roots: CategoryNode[] = [];
  rows.forEach((row) => {
    const node = nodes.get(row.id);
    if (!node) return;
    const parent = row.parent_id ? nodes.get(row.parent_id) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

/** Main categories marked as popular, in sort order. Subcategories are never popular. */
export function popularCategories(tree: CategoryNode[]): CategoryNode[] {
  return tree.filter((node) => node.isPopular);
}

/** Loads every category from Supabase. Returns the full tree and the popular main categories. */
export function useCategoryTree() {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [status, setStatus] = useState<CategoryStatus>("loading");

  useEffect(() => {
    let active = true;

    async function load() {
      const { data, error } = await supabase
        .from("categories")
        .select("id, parent_id, name, slug, is_popular")
        .order("sort_order", { ascending: true });

      if (!active) return;
      if (error) {
        setStatus("error");
        return;
      }
      setTree(buildCategoryTree((data ?? []) as CategoryRow[]));
      setStatus("ready");
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return { tree, popular: popularCategories(tree), status };
}
