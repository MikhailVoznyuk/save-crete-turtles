type Point = {x: number, y: number}

function getCoverRect(
    containerW: number,
    containerH: number,
    videoW: number,
    videoH: number
) {
    const scale = Math.max(containerW / videoW, containerH / videoH);
    const width = videoW * scale;
    const height = videoH * scale;
    const left = (containerW - width) / 2;
    const top = (containerH - height) / 2;

    return {width, height, left, top};
}

export function mapVideoPointToScreen(
    point: Point,
    containerW: number,
    containerH: number,
    videoW: number,
    videoH: number
) {

    const rect = getCoverRect(containerW, containerH, videoW, videoH);
    const u = point.x / videoW;
    const v = point.y / videoH;

    return {
        x: rect.left + rect.width * u,
        y: rect.top + rect.height * v,
    }
}
