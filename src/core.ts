// streont.js
import * as d3 from "d3";

import "./style.css";


const DEFAULT_STYLE = {
  "graticule": {
    fill: "none",
    stroke: " #777",
    "stroke-width": ".5px",
    "stroke-opacity": .5,
  },
  "graticule_10_deg": {
    stroke: "#000",
    "stroke-width": 0.6,
    fill: "none",
  },
  "crosshairs": {
    stroke: "#000",
    "stroke-width": 1,
    fill: "none",
  },
  "data_plane": {
    stroke: "#F00",
    "stroke-width": 3,
    fill: "none"
    // fill: "#F00",
    // "fill-opacity": 0.5,
  },
  "data_line": {
    fill: "#0328fc",
    "stroke": "#0328fc",
    "stroke-width": 2,
    "stroke-opacity": 0.5,
    "fill-opacity": 1,
  },
  "cardinal": {
    fill: "#000",
    "font-size": "12px",
    "text-anchor": "middle",
  },
}

interface StereonetOptions {
  selector: string;
  size?: number;
  style?: Record<string, Record<string, any>>;
  animations?: {
    duration: number;
  } | false
}

/**
 * The D3 path type for rendered planes.
 */
type PlanePath = d3.Selection<SVGPathElement, unknown, null, undefined>;


/**
 * The D3 path type for rendered lines (lines are rendered as the points of their poles)
 */
type LinePath = d3.Selection<SVGGElement, unknown, null, undefined>;

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
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  g: d3.Selection<SVGGElement, unknown, null, undefined>;
  projection: d3.GeoProjection;
  path: d3.GeoPath;
  cardinalValues: string[];
  styles: Record<string, Record<string, any>>;
  animations: {
    duration: number;
  } | false;
  planes: Map<string, PlanePath>;
  lines: Map<string, LinePath>;


  constructor({ selector = "body", size = 1000, style = DEFAULT_STYLE, animations = {
    duration: 300
  } }: StereonetOptions) {
    this.width = size;
    this.height = size;
    this.selector = selector;
    this.styles = style;
    this.animations = animations;

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
    this.planes = new Map(); // Internal line registry
    this.lines = new Map(); // Internal plane registry

    this.renderBaseGraticules();
    // this.renderLabels();
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

  renderBaseGraticules() {
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
      .attr("style", this.getStyle("graticule"))
      .attr("transform", `translate(${this.width / 2},${this.height / 2})`)
      .attr("d", this.path);

    this.g
      .append("path")
      .datum(graticule10)
      .attr("style", this.getStyle("graticule_10_deg"))
      .attr("transform", `translate(${this.width / 2},${this.height / 2})`)
      .attr("d", this.path);

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
      .attr("transform", `translate(${this.width / 2},${this.height / 2})`)
      .attr("d", this.path)

  }

  renderLabels() {
    const graticule10 = d3.geoGraticule()
      .extent([[-90, -90], [90.1, 90]])
      .step([10, 10])
      .precision(1);

    this.g.selectAll('.graticule-label')
      .data(graticule10.lines())
      .enter().append("text")
      .attr("class", "graticule-label")
      .text((d) => {
        d.coordinates.reverse();
        if (d.coordinates[0][0] === d.coordinates[1][0] && d.coordinates[0][0] >= 0) {
          return this.reverseDegrees(d.coordinates[0][0]);
        } else if (d.coordinates[0][1] === d.coordinates[1][1] && d.coordinates[0][1] !== -90) {
          return this.reverseDegrees(d.coordinates[0][1]);
        }
      })
      .attr("dx", this.width / 3)
      .attr("dy", this.height / 3)
      .attr("style", (d) =>
        this.reverseDegrees(d.coordinates[0][1]) > 90
          ? "alignment-baseline: hanging"
          : "alignment-baseline: alphabetic")
      .attr('transform', (d) =>
        `translate(${this.projection(d.coordinates[1])[0]},${this.projection(d.coordinates[1])[1]})`
      );

    this.g
      .selectAll<SVGTextElement, string>(".cardinal")
      .data(this.cardinalValues)
      .enter()
      .append("text")
      .attr("class", "cardinal")
      .text((d: string) => d)
      .attr("dx", this.width / 2)
      .attr("dy", this.height / 2)
      .attr("transform", (d: string) => {
        const index = this.cardinalValues.indexOf(d);
        const coords: [number, number] = [-180 + index * 90, -90 + index * 90];
        const projected = this.projection(coords);
        if (!projected) {
          throw new Error("Projection returned null");
        }
        return `translate(${projected[0]},${projected[1]})`;
      });
  }

  private _validateDipDirection(dipAngle: number, dipDirection: number) {
    if (dipAngle < 0 || dipAngle > 90) {
      console.warn(`Dip angle must be between 0 and 90 degrees (${dipAngle} provided). Skipping.`);
      return false;
    }

    if (dipDirection < 0 || dipDirection > 360) {
      console.warn(`Dip direction must be between 0 and 360 degrees (${dipDirection} provided). Skipping.`);
      return false;
    }

    return true;
  }

  private _addPlaneHoverInteraction(
    path: d3.Selection<SVGPathElement, unknown, null, undefined>,
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
      return style
    }

    path
      .on("mouseover", function () {
        d3.select(this).style("stroke-width", "8px");
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
        d3.select(this).style("stroke-width", getStyle("data_plane")["stroke-width"]); // Reset stroke width
        tooltip.style("display", "none");
      });
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


    const extentStart = 90 - dipAngle;
    const extentEnd = 90 - (dipAngle - 1);

    const graticuleInput = d3
      .geoGraticule()
      .extent([
        [extentStart, -90],
        [extentEnd, 90],
      ])
      .step([1])
      .precision(1);

    const path = this.g
      .append("path")
      .datum(graticuleInput)
      .attr("style", this.getStyle("data_plane"))
      .attr(
        "transform",
        `translate(${this.width / 2},${this.height / 2}) rotate(${dipDirection - 90})`
      )
      .attr("d", this.path)
      .attr("data-id", id)


    if (this.animations) {
      path.style("opacity", 0) // Start with opacity 0 for animation
        .transition() // Add transition for animation
        .duration(300) // Animation duration in milliseconds
        .style("opacity", 1); // Fade in the plane
    }

    this._addPlaneHoverInteraction(path, dipAngle, dipDirection);

    this.planes.set(id.toString(), path as PlanePath);
    return id;
  }

  removePlane(planeId: number) {
    const strId = planeId.toString();

    if (this.planes.has(strId)) {
      this.planes.get(strId)?.remove();
      this.planes.delete(strId);
    }
  }

  getPlanes() {
    return Array.from(this.planes).map(line => {
      return { id: line[0], path: line[1] };
    });
  }



  private _addLineHoverInteraction(
    path: d3.Selection<SVGPathElement, unknown, null, undefined>,
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

    const classPath = this.path

    path
      .on("mouseover", function () {
        d3.select(this).attr("d", classPath.pointRadius(9)); // Reset radius
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
        d3.select(this).attr("d", classPath.pointRadius(5)); // Reset radius
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

    // GeoJSON point for projection
    const point = {
      type: "Point",
      coordinates: [0, 90 - dipAngle],
    };

    const path = this.g
      .append("path")
      .datum(point)
      .attr("style", this.getStyle("data_line"))
      .attr("transform", `translate(${this.width / 2},${this.height / 2}) rotate(${dipDirection})`)
      .attr("data-id", id)

    if (this.animations) {
      path
        .attr("d", this.path.pointRadius(0))
        .style("opacity", 0) // Start with opacity 0 for animation
        .transition() // Add transition for animation
        .duration(this.animations.duration) // Animation duration in milliseconds
        .attr("d", this.path.pointRadius(5))
        .style("opacity", 1); // Fade in the plane
    }
    else {
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

  reverseDegrees(value: number) {
    return -1 * value + 90;
  }


}
