export type LayoutType = "grid_2x2" | "grid_2x3" | "grid_3x3" | "grid_3x4";

export type LayoutSpec = {
  type: LayoutType;
  rows: number;
  cols: number;
  count: number;
  label: string;
  tagline: string;
  gridClass: string;
};

export const LAYOUTS: Record<LayoutType, LayoutSpec> = {
  grid_2x2: {
    type: "grid_2x2",
    rows: 2,
    cols: 2,
    count: 4,
    label: "Découverte",
    tagline: "4 cases — histoire courte",
    gridClass: "grid grid-cols-2 grid-rows-2",
  },
  grid_2x3: {
    type: "grid_2x3",
    rows: 2,
    cols: 3,
    count: 6,
    label: "Standard",
    tagline: "6 cases — équilibré",
    gridClass: "grid grid-cols-3 grid-rows-2",
  },
  grid_3x3: {
    type: "grid_3x3",
    rows: 3,
    cols: 3,
    count: 9,
    label: "Aventure",
    tagline: "9 cases — récit développé",
    gridClass: "grid grid-cols-3 grid-rows-3",
  },
  grid_3x4: {
    type: "grid_3x4",
    rows: 3,
    cols: 4,
    count: 12,
    label: "Épique",
    tagline: "12 cases — album complet",
    gridClass: "grid grid-cols-4 grid-rows-3",
  },
};

export const LAYOUT_LIST: LayoutSpec[] = Object.values(LAYOUTS);
