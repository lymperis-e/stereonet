import { Stereonet } from "../src"; // Adjust the import path as necessary

const streonet = new Stereonet({ selector: "body", size: 900 });

window.stereonet = streonet; // Expose the instance to the global scope for testing

const p1 = streonet.addPlane(30, 45); // Example usage
streonet.addPlane(60, 90); // Example usage
streonet.addPlane(83.2, 257)

streonet.addLine(83.2, 257)
streonet.addLine(60, 90)


console.log(p1); // Log the plane object to the console