// streont.js
import * as d3 from "d3";
import "./style.css";

import { PlanePath, LinePath, PoleRepresentation, PlaneData } from "./types";

const DEFAULT_STYLE = {
  outline: {
    fill: "none",
    stroke: "#000",
    "stroke-width": "4px",
    "stroke-opacity": 0.5,
  },
  graticule: {
    fill: "none",
    stroke: " #777",
    "stroke-width": ".5px",
    "stroke-opacity": 0.5,
  },
  graticule_10_deg: {
    stroke: "#000",
    "stroke-width": 0.6,
    fill: "none",
  },
  crosshairs: {
    stroke: "#000",
    "stroke-width": 1,
    fill: "none",
  },
  data_plane: {
    stroke: "#d14747",
    "stroke-width": 3,
    fill: "none",
    // fill: "#d14747",
    // "fill-opacity": 0.5,
  },
  data_plane_pole: {
    fill: "#d14747",
    stroke: "#d14747",
    "stroke-width": 2,
    "stroke-opacity": 0.5,
    "fill-opacity": 1,
  },
  data_line: {
    fill: "#0328fc",
    stroke: "#0328fc",
    "stroke-width": 2,
    "stroke-opacity": 0.5,
    "fill-opacity": 1,
  },
  cardinal: {
    fill: "#000",
    "font-size": "12px",
    "text-anchor": "middle",
  },
};

interface StereonetOptions {
  selector: string;
  size?: number;
  style?: Record<string, Record<string, any>>;
  animations?:
  | {
    duration: number;
  }
  | false;
  showGraticules?: boolean; // New option to control graticules visibility
  planeRepresentation?: "pole" | "line"; // Style for planes, default is "line"
}

/**
 * Stereonet class for creating a stereonet plot using D3.js.
 * @class Stereonet
 * @param {Object} options - Configuration options for the stereonet.
 * @param {string} options.selector - The CSS selector for the container element.
 * @param {number} options.width - The width of the SVG element.
 * @param {number} options.height - The height of the SVG element.
 */
export class Stereonet {
  width: number;
  height: number;
  selector: string;
  svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, undefined>;
  g: d3.Selection<SVGGElement, unknown, HTMLElement, undefined>;
  projection: d3.GeoProjection;
  path: d3.GeoPath;
  cardinalValues: string[];
  styles: Record<string, Record<string, any>>;
  animations:
    | {
      duration: number;
    }
    | false;
  planes: Map<string, PlaneData>;
  lines: Map<string, LinePath>;
  graticulesVisible: boolean; // State to track graticules visibility
  planeRepresentation: "pole" | "arc"; // Representation style for planes

  constructor({
    selector = "body",
    size = 1000,
    style = DEFAULT_STYLE,
    animations = {
      duration: 300,
    },
    showGraticules = true, // Default to showing graticules
    planeRepresentation: planeRepresentation = "arc",
  }: StereonetOptions) {
    this.width = size;
    this.height = size;
    this.selector = selector;
    this.styles = style;
    this.animations = animations;
    this.graticulesVisible = showGraticules;
    this.planeRepresentation = planeRepresentation;

    this.svg = d3
      .select(selector)
      .append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .attr("viewBox", `0 0 ${this.width} ${this.height}`)
      .attr("preserveAspectRatio", "xMinYMin meet");

    this.g = this.svg.append("g");

    this.projection = d3
      .geoAzimuthalEqualArea()
      .scale(this.width / Math.PI)
      .translate([0, 0])
      .precision(0.1);

    this.path = d3.geoPath().projection(this.projection);

    this.cardinalValues = ["S", "W", "N", "E"];
    this.planes = new Map();
    this.lines = new Map();

    if (this.graticulesVisible) {
      this._renderBaseGraticules();
    }
    this._renderOutlineCrosshairs();
  }

  setPlaneRepresentation(
    representation: "pole" | "arc"
  ) {
    if (representation !== "pole" && representation !== "arc") {
      throw new Error(
        `Invalid representation type: ${representation}. Use "pole" or "arc".`
      );
    }
    this.planeRepresentation = representation;

    // Clear existing planes
    const _cachedPlanes = Array.from(this.planes);
    this.planes.forEach((plane, id) => {
      this.planes.get(id)?.path.remove();
      this.planes.delete(id);
    });

    // Re-render existing planes with the new representation
    _cachedPlanes.forEach(([id, planeData]) => {
      let path = null;
      if (this.planeRepresentation === "arc") {
        path = this._renderPlaneAsLine(
          planeData.dipAngle,
          planeData.dipDirection,
          parseInt(id, 10)
        );
      }
      if (this.planeRepresentation === "pole") {
        path = this._renderPlaneAsPole(
          planeData.dipAngle,
          planeData.dipDirection,
          parseInt(id, 10)
        );
      }

      this.planes.set(id, {
        dipAngle: planeData.dipAngle,
        dipDirection: planeData.dipDirection,
        path: path as PlanePath,
      });
    })
  }
    

    /**
     * Returns the style for a given class name from this.styles object.
     * It returns a string representation of the style object.
     */
    getStyle(className: string) {
      const style = this.styles[className];
      if (!style) {
        throw new Error(`Style for class "${className}" not found.`);
      }
      return Object.entries(style)
        .map(([key, value]) => `${key}: ${value};`)
        .join(" ");
    }

    setStyle(className: string, style: Record<string, any>) {
      this.styles[className] = style;
    }

  private _elementTransformString() {
    return `translate(${this.width / 2},${this.height / 2})`;
  }

  private _renderBaseGraticules() {
    const graticule2 = d3
      .geoGraticule()
      .extent([
        [-90, -90],
        [90.1, 90],
      ])
      .step([2, 2])
      .precision(1);

    const graticule10 = d3
      .geoGraticule()
      .extent([
        [-90, -90],
        [90.1, 90],
      ])
      .step([10, 10])
      .precision(1);

    this.g
      .append("path")
      .datum(graticule2)
      .attr("class", "graticule")
      .attr("style", this.getStyle("graticule"))
      .attr("transform", `${this._elementTransformString()} `)
      .attr("d", this.path);

    this.g
      .append("path")
      .datum(graticule10)
      .attr("class", "graticule-10")
      .attr("style", this.getStyle("graticule_10_deg"))
      .attr("transform", `${this._elementTransformString()} `)
      .attr("d", this.path);

    const outline = d3.geoCircle().center([0, 0]).radius(90);
    this.g
      .append("path")
      .datum(outline)
      .attr("class", "outline")
      .attr("style", this.getStyle("outline"))
      .attr("transform", `${this._elementTransformString()} `)
      .attr("d", this.path);
  }

  private _renderOutlineCrosshairs() {
    // Add a 10x10 degree crosshair in the center
    const crosshairs = d3
      .geoGraticule()
      .extent([
        // lon, lat
        [-5.49, -5.49], //min
        [5.49, 5.49], //max
      ])
      .step([10, 10])
      .precision(1);

    this.g
      .append("path")
      .datum(crosshairs)
      .attr("style", this.getStyle("crosshairs"))
      .attr("transform", `${this._elementTransformString()} `)
      .attr("d", this.path);

    // Add outline circle
    const outline = d3.geoCircle().center([0, 0]).radius(90);
    this.g
      .append("path")
      .datum(outline)
      .attr("style", this.getStyle("outline"))
      .attr("transform", `${this._elementTransformString()} `)
      .attr("d", this.path);
  }

  toggleGraticules(v: boolean | undefined) {
    const show = v === undefined ? !this.graticulesVisible : v;
    this.graticulesVisible = show;
    this.g
      .selectAll(".graticule, .graticule-10, .outline")
      .style("display", show ? "block" : "none");
  }

  showGraticules() {
    this.toggleGraticules(true);
  }

  hideGraticules() {
    this.toggleGraticules(false);
  }


  private _validateDipDirection(dipAngle: number, dipDirection: number) {
    if (dipAngle < 0 || dipAngle > 90) {
      console.warn(
        `Dip angle must be between 0 and 90 degrees (${dipAngle} provided). Skipping.`
      );
      return false;
    }

    if (dipDirection < 0 || dipDirection > 360) {
      console.warn(
        `Dip direction must be between 0 and 360 degrees (${dipDirection} provided). Skipping.`
      );
      return false;
    }

    return true;
  }

  private _addPlaneHoverInteraction(
    path: PlanePath,
    dipAngle: number,
    dipDirection: number
  ) {
    // Add tooltip element if it doesn't exist
    if (!d3.select("#plane-tooltip").node()) {
      d3.select("body")
        .append("div")
        .attr("id", "plane-tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0,0,0,0.7)")
        .style("color", "#fff")
        .style("padding", "4px 8px")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("font-size", "18px")
        .style("display", "none");
    }

    const tooltip = d3.select("#plane-tooltip");

    const getStyle = (className: string) => {
      const style = this.styles[className];
      if (!style) {
        throw new Error(`Style for class "${className}" not found.`);
      }
      return style;
    };

    path
      .on("mouseover", function () {
        d3.select(this).style("stroke-width", "10px");
        d3.select(this).style("opacity", 0.6);
        tooltip
          .html(`Dip: ${dipAngle}°, Dip Direction: ${dipDirection}°`)
          .style("display", "block");
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + 10 + "px");
      })
      .on("mouseout", function () {
        d3.select(this).style(
          "stroke-width",
          getStyle("data_plane")["stroke-width"]
        ); // Reset stroke width
        d3.select(this).style("opacity", 1);
        tooltip.style("display", "none");
      });
  }


  private _calculatePoleCoordinates(dipAngle: number, dipDirection: number): [number, number] {
    let dd = dipDirection + 180; //% 360; // strike = dipDirection - 90°

    if (dd >= 360) {
      dd = dipDirection + 180 - 360; // Normalize to [0, 360)
    }

    const d = 90 - dipAngle;
    return [d, dd];
  }


  private _renderPlaneAsLine(dipAngle: number, dipDirection: number, id: number) {
    const extentStart = 90 - dipAngle;
    const extentEnd = 90 - (dipAngle - 1);

    const graticuleInput = d3
      .geoGraticule()
      .extent([
        [extentStart, -90],
        [extentEnd, 90],
      ])
      // @ts-ignore
      .step([1])
      .precision(1);

    const path = this.g
      .append("path")
      .datum(graticuleInput)
      .attr("style", this.getStyle("data_plane"))
      .attr(
        "transform",
        `${this._elementTransformString()} rotate(${dipDirection - 90})`
      )
      .attr("d", this.path)
      .attr("data-id", id);

    if (this.animations) {
      path
        .style("opacity", 0)
        .transition()
        .duration(this.animations.duration)
        .style("opacity", 1);
    }

    this._addPlaneHoverInteraction(path, dipAngle, dipDirection);
    this.planes.set(id.toString(), path as PlanePath);

    return path

  }

  private _renderPlaneAsPole(dipAngle: number, dipDirection: number, id: number) {
    const poleCoords = this._calculatePoleCoordinates(dipAngle, dipDirection);
    const point = {
      type: "Point",
      coordinates: [0, 90 - poleCoords[0]],
    } as PoleRepresentation;

    const path = this.g
      .append("path")
      .datum(point)
      .attr("style", this.getStyle("data_plane_pole"))
      .attr(
        "transform",
        `${this._elementTransformString()} rotate(${poleCoords[1]})`
      )
      .attr("data-id", id);

    if (this.animations) {
      // @ts-ignore
      path
        .attr("d", this.path.pointRadius(0))
        .style("opacity", 0)
        .transition()
        .duration(this.animations.duration)
        // @ts-ignore
        .attr("d", this.path.pointRadius(5))
        .style("opacity", 1);
    } else {
      // @ts-ignore
      path.attr("d", this.path.pointRadius(5));
    }

    this._addPlaneHoverInteraction(path, dipAngle, dipDirection);
    this.planes.set(id.toString(), path as PlanePath);

    return path

  }

  /**
   * Plots a line on the stereonet based on the given dip angle and dip direction.
   */
  addPlane(dipAngle: number, dipDirection: number) {
    // Validate the dip angle and dip direction
    if (!this._validateDipDirection(dipAngle, dipDirection)) {
      return;
    }

    const id = this.planes.size;
    let path = null;

    if (this.planeRepresentation === "arc") {
      path = this._renderPlaneAsLine(dipAngle, dipDirection, id);
    }

    if (this.planeRepresentation === "pole") {
      path = this._renderPlaneAsPole(dipAngle, dipDirection, id);
    }

    this.planes.set(id.toString(), {
      dipAngle,
      dipDirection,
      path: path as PlanePath,
    });


    return id;
  }


  removePlane(planeId: number) {
    const strId = planeId.toString();

    if (this.planes.has(strId)) {
      this.planes.get(strId)?.path.remove();
      this.planes.delete(strId);
    }
  }

  getPlanes() {
    return Array.from(this.planes).map(line => {
      return { id: line[0], path: line[1] };
    });
  }

  private _addLineHoverInteraction(
    path: LinePath,
    dipAngle: number,
    dipDirection: number
  ) {
    if (!d3.select("#line-tooltip").node()) {
      d3.select("body")
        .append("div")
        .attr("id", "line-tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0,0,0,0.7)")
        .style("color", "#fff")
        .style("padding", "4px 8px")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("font-size", "18px")
        .style("display", "none");
    }

    const tooltip = d3.select("#line-tooltip");

    const classPath = this.path;

    path
      .on("mouseover", function () {
        // @ts-ignore
        d3.select(this).attr("d", classPath.pointRadius(9)); // Reset radius
        d3.select(this).style("stroke-width", "10px");
        tooltip
          .html(`Dip: ${dipAngle}°, Dip Direction: ${dipDirection}°`)
          .style("display", "block");
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + 10 + "px");
      })
      .on("mouseout", function () {
        // @ts-ignore
        d3.select(this).attr("d", classPath.pointRadius(5)); // Reset radius
        d3.select(this).style("stroke-width", "2px");
        tooltip.style("display", "none");
      });
  }

  /**
   * Plot a linear measurement as a Point on the stereonet.
   */
  addLine(dipAngle: number, dipDirection: number) {
    // Validate the dip angle and dip direction
    if (!this._validateDipDirection(dipAngle, dipDirection)) {
      return;
    }

    const id = this.lines.size;

    const point = {
      type: "Point",
      coordinates: [0, 90 - dipAngle],
    } as PoleRepresentation;

    const path = this.g
      .append("path")
      .datum(point)
      .attr("style", this.getStyle("data_line"))
      .attr(
        "transform",
        `${this._elementTransformString()}  rotate(${dipDirection})`
      )
      .attr("data-id", id);

    if (this.animations) {
      path
        // @ts-ignore
        .attr("d", this.path.pointRadius(0))
        .style("opacity", 0) // Start with opacity 0 for animation
        .transition() // Add transition for animation
        .duration(this.animations.duration) // Animation duration in milliseconds
        // @ts-ignore
        .attr("d", this.path.pointRadius(5))
        .style("opacity", 1); // Fade in the plane
    } else {
      // @ts-ignore
      path.attr("d", this.path.pointRadius(5));
    }

    this._addLineHoverInteraction(path, dipAngle, dipDirection);

    this.lines.set(id.toString(), path as LinePath);
    return id;
  }

  removeLine(lineId: number) {
    const strId = lineId.toString();

    if (this.lines.has(strId)) {
      this.lines.get(strId)?.remove();
      this.lines.delete(strId);
    }
  }

  getLines() {
    return Array.from(this.lines).map(line => {
      return { id: line[0], path: line[1] };
    });
  }
}
