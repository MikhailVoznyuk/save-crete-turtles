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
           this.initStyle = initStyle;
           this.applyStyles(this.initStyle);
       }

       this.timeline = Promise.resolve();
   }

   async run() {
       if (this.running || this.stepsQueue.length === 0) return;

       while (true) {

           if (this.stepInd >= this.stepsQueue.length) {
               if (this.loop) {
                   if (this.initStyle) this.applyStyles(this.initStyle);
                   this.stepInd = 0;
               } else {
                   console.log('done')
                   break;
               }
           } else {


               await new Promise<void>(resolve => {
                   setTimeout(() => {
                       console.log('we workin');
                       const step = this.stepsQueue[this.stepInd];
                       if (!step) return resolve();
                       this.el.style.transition = `${step.duration}ms ease`;
                       this.applyStyles(step.style);
                       setTimeout(() => resolve(), (step.duration ?? 0) + (step.stay ?? 0));
                   }, this.stepsQueue[this.stepInd].delay ?? 0)
               });

               this.stepInd++;
           }
       }
   }

   add(step: StepProps) {
       this.stepsQueue.push(step);
       this.run().catch(err => console.log(err));
       console.log('added', this.stepsQueue)
       return this;
   }

   clear(reload: boolean = true) {
       this.stepsQueue = [];
       if (reload) {
           this.stepInd = 0;
       }
   }

   applyStyles(style: Style): void {
       for (const key in style) {
           const value = this.toKebabCase(style[key]);
           this.el.style.setProperty(key, value);
       }
   }

   private toKebabCase(s: string): string {
       return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
   }
}