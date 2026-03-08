import React from "react";

type Style = Record<string, string>;

type InitProps = {
    el: HTMLElement;
    initStyle?: Style;
}

type AddProps = {
    style: Style;
    duration?: number;
    delay?: number;
    stay?: number
}

export class Timeline {
    el: HTMLElement;
    timeline: Promise<void>;

   constructor({el, initStyle}: InitProps) {
       this.el = el;

       if (initStyle) {
           this.applyStyles({'transition': 'none'});
           this.applyStyles(initStyle);
       }

       this.timeline = Promise.resolve();
   }

   add({style, duration=300, delay=0, stay=1000}: AddProps) {
       const step = (resolve: () => void,) => {
           this.el.style.transition = `${duration}ms ease`;
           setTimeout(() => {
               this.applyStyles(style);
               setTimeout(() => {
                   resolve();
               }, duration + stay);
           }, delay);
       }

       this.timeline = this.timeline.then(() => new Promise(step));
       return this;
   }

   private applyStyles(style: Style): void {
       for (const key in style) {
           const value = this.toKebabCase(style[key]);
           this.el.style.setProperty(key, value);
       }
   }

   private toKebabCase(s: string): string {
       return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
   }
}