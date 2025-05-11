type XYVector = {
    x: number;
    y: number;
};

/**
 * Converts dip and dip direction into a point on the stereonet.
 */
export function dipDirectionToXY(
    dip: number,
    dipDir: number,
): XYVector {
    const azimuthRad = (dipDir * Math.PI) / 180;

    // Use dip as magnitude, direction as angle
    const magnitude = 90 - dip

    const x = magnitude * Math.sin(azimuthRad);
    const y = magnitude * Math.cos(azimuthRad);

    return { x, y };
}
