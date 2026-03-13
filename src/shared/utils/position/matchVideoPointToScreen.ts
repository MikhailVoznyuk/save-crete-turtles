type Point = {x: number, y: number}

type MatchVideoPointsProps = {
    anchor: Point;
    containerW: number;
    containerH: number;
    videoW: number;
    videoH: number;
}

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

    return {width, height, left, top, scale};
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


export class VideoPointAnchor {
    anchor: Point;
    scale: number;
    containerW: number;
    containerH: number;
    videoW: number;
    videoH: number;

    constructor({anchor, containerW, containerH, videoW, videoH} : MatchVideoPointsProps) {
        this.anchor = anchor;
        this.containerW = containerW;
        this.containerH = containerH;
        this.videoW = videoW;
        this.videoH = videoH;

        this.scale = Math.max(containerW / videoW, containerH / videoH);
    }

    getCoverRect() {
        const width = this.videoW * this.scale;
        const height = this.videoH * this.scale;
        const left = (this.containerW - width) / 2;
        const top = (this.containerH - height) / 2;

        return {width, height, left, top, scale: this.scale};
    }

    getAnchorPos(offset: Point ={x: 0, y: 0}) {

        const rect = this.getCoverRect();
        const u = (this.anchor.x + offset.x) / this.videoW;
        const v = (this.anchor.y + offset.y) / this.videoH;

        return {
            x: rect.left + rect.width * u,
            y: rect.top + rect.height * v,
        }
    }

    setAnchor(anchor: Point) {
        this.anchor = anchor;
    }





}