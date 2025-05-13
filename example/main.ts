import { Stereonet } from "../src"

const streonet = new Stereonet({ selector: "body", size: 900 });

window.stereonet = streonet; // Expose the instance to the global scope for testing

streonet.addPlane(30, 45); // Example usage
streonet.addLine(30, 45); // Example usage

streonet.addPlane(60, 90); // Example usage
streonet.addLine(60, 90);

streonet.addPlane(83.2, 257);
streonet.addLine(83.2, 257);

streonet.addLine(45, 336.6546);
streonet.addPlane(336.6546, 45);
