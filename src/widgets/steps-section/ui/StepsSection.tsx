import {Title, TextMediaRow} from "@/shared/ui/text-blocks";
import type {TextMediaRowProps} from "@/shared/ui/media/types/types";

type Step = {id: string} & TextMediaRowProps
const STEPS_ROWS: Step[] = [
    {
        id: '1',
        header: 'Step title',
        content: 'Why we do this and spend our time and money, our logic is simple and clear: we live in Crete in Almyrida, we have children here, we want our beach to be clean, so that the ecology and ecosystems will be preserved for a very, very long time, unfortunately, the pollution of our planet is going crazy, and Crete is one of the few islands with clean ecology, air and water, because by helping sea turtles, we first of all help ourselves. And it is clear: all people want to live long and be healthy, and only a clean environment can help us with this, well, and we believe that you can’t always just take and take from nature, you need to give something in return',
        mediaType: 'image',
        mediaSrc: '/media/img/steps-section/sand_turtle.png',
        reversed: false,
    },
    {
        id: '2',
        header: 'Step title',
        content: 'Why we do this and spend our time and money, our logic is simple and clear: we live in Crete in Almyrida, we have children here, we want our beach to be clean, so that the ecology and ecosystems will be preserved for a very, very long time, unfortunately, the pollution of our planet is going crazy, and Crete is one of the few islands with clean ecology, air and water, because by helping sea turtles, we first of all help ourselves. And it is clear: all people want to live long and be healthy, and only a clean environment can help us with this, well, and we believe that you can’t always just take and take from nature, you need to give something in return',
        mediaType: 'image',
        mediaSrc: '/media/img/steps-section/sand_turtle.png',
        reversed: true,
    },
    {
        id: '3',
        header: 'Step title',
        content: 'Why we do this and spend our time and money, our logic is simple and clear: we live in Crete in Almyrida, we have children here, we want our beach to be clean, so that the ecology and ecosystems will be preserved for a very, very long time, unfortunately, the pollution of our planet is going crazy, and Crete is one of the few islands with clean ecology, air and water, because by helping sea turtles, we first of all help ourselves. And it is clear: all people want to live long and be healthy, and only a clean environment can help us with this, well, and we believe that you can’t always just take and take from nature, you need to give something in return',
        mediaType: 'image',
        mediaSrc: '/media/img/steps-section/sand_turtle.png',
        reversed: false,
    }
]
export function StepsSection() {
    return (
        <section className='flex flex-col justify-center items-center gap-12 w-full'>
            <Title variant='primary' size='lg' lined centered>
                What can we do?
            </Title>
            <div className='flex flex-col items-center gap-36 max-w-[1200px]'>
                {STEPS_ROWS.map(({id, ...step}) => (
                    <TextMediaRow key={id} {...step} />
                ))}
            </div>
        </section>
    )
}