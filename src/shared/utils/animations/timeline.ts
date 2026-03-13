type Style = Record<string, string>;

type InitProps = {
    el: HTMLElement;
    initStyle?: Style;
    loop?: boolean;
}

type StepProps = {
    style: Style;
    duration?: number;
    delay?: number;
    stay?: number
}

export class Timeline {
    el: HTMLElement;
    stepsQueue: StepProps[];
    timeline: Promise<void>;
    stepInd: number;
    running: boolean;
    loop: boolean;
    initStyle?: Style;

   constructor({el, initStyle, loop=false}: InitProps) {
       this.el = el;
       this.stepInd = 0;
       this.stepsQueue = [];
       this.running = false;
       this.loop = loop;
       if (initStyle) {
           this.el.style.transition = `none`;
           this.initStyle = initStyle;
           this.applyStyles(this.initStyle);
       }

       this.timeline = Promise.resolve();
   }

   async run() {
       if (this.running || this.stepsQueue.length === 0) return;
       this.running = true;

       while (true) {
           if (this.stepInd >= this.stepsQueue.length) {
               if (this.loop) {
                   if (this.initStyle) this.applyStyles(this.initStyle, true);
                   this.stepInd = 0;
               } else {
                   break;
               }
           } else {


               await new Promise<void>(resolve => {
                   const step = this.stepsQueue[this.stepInd];
                   setTimeout(() => {
                       if (!step) return resolve();
                       this.el.style.transition = `${step.duration}ms ease`;
                       this.applyStyles(step.style);
                       setTimeout(() => resolve(), (step.duration ?? 0) + (step.stay ?? 0));
                   }, step.delay ?? 0)
               });

               this.stepInd++;
           }
       }
   }

   add(step: StepProps) {
       this.stepsQueue.push(step);
       this.run().catch(err => console.log(err));
       return this;
   }

   clear(reload: boolean = true) {
       this.stepsQueue = [];

       if (reload) {
           this.stepInd = 0;
       }
   }

   applyStyles(style: Style, clearTransition?: boolean): void {
       if (clearTransition) {
           this.el.style.transition = `none`;
       }
       for (const key in style) {
           const value = this.toKebabCase(style[key]);
           this.el.style.setProperty(key, value);
       }
   }

   private toKebabCase(s: string): string {
       return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
   }
}