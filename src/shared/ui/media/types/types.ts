import {ReactNode} from "react";

export type TextMediaRowProps = {
    header: string | ReactNode;
    content: string | ReactNode;
    mediaType: 'image' | 'video';
    mediaSrc: string;
    reversed?: boolean;
}
