export interface PoleRepresentation {
  type: "Point";
  coordinates: [number, number];
}

/**
 * The D3 path type for rendered planes.
 */
export type PlanePath = d3.Selection<
  SVGPathElement,
  GeoJSON.MultiLineString,
  HTMLElement,
  undefined
>;

/**
 * The D3 path type for rendered lines (lines are rendered as the points of their poles)
 */
export type LinePath = d3.Selection<
  SVGPathElement,
  PoleRepresentation,
  HTMLElement,
  undefined
>;

export type PlaneData = {
  dipAngle: number;
  dipDirection: number;
  path: PlanePath;
};

export type LineData = {
  dipAngle: number;
  dipDirection: number;
  path: LinePath;
};

export type StyleProperty = string | number | boolean;

export type StereonetStyle = Record<string, Record<string, StyleProperty>>;
