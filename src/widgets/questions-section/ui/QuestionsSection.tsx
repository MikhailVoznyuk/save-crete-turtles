import {useSectionNavigation} from "@/app/_model/section-navigation/section-navigation.context";
import {Title} from "@/shared/ui/text-blocks";
import {DropDownBlock} from "@/widgets/questions-section/ui/DropDownBlock";
import type {DropDownBlockProps} from "@/widgets/questions-section/types/types";

type QaABlock = DropDownBlockProps & {id: string};
const QaABlocks: QaABlock[] = [
    {
        id: 'qa-0',
        header: 'Why is the main eney of turtles',
        content: 'The main enemy of sea turtles are plastic bags, which they mistake for jellyfish and swallow them. Unfortunately, the turtle\'s intestines cannot digest a plastic bag. It gets stuck, clogs the intestines, and can only be removed by surgery, otherwise the turtle dies. Therefore, we created this site and kindly ask everyone not to throw bags on the beach because the wind blows them out to sea. If you see plastic bags in the water, as did those in our habitat in Souda Bay, Chania, Crete: please take plastic garbage out of the water and throw it in the trash. Think about it: by doing so, you may have saved one or maybe two turtles, and then these sea turtles will give birth to offspring.',
        iconSrc: '/media/icons/cards/turtle.png'
    },
    {
        id: 'qa-1',
        header: 'Why is the main eney of turtles',
        content: 'The main enemy of sea turtles are plastic bags, which they mistake for jellyfish and swallow them. Unfortunately, the turtle\'s intestines cannot digest a plastic bag. It gets stuck, clogs the intestines, and can only be removed by surgery, otherwise the turtle dies. Therefore, we created this site and kindly ask everyone not to throw bags on the beach because the wind blows them out to sea. If you see plastic bags in the water, as did those in our habitat in Souda Bay, Chania, Crete: please take plastic garbage out of the water and throw it in the trash. Think about it: by doing so, you may have saved one or maybe two turtles, and then these sea turtles will give birth to offspring.',
        iconSrc: '/media/icons/cards/plastic.png'
    },
    {
        id: 'qa-2',
        header: 'Why is the main eney of turtles',
        content: 'The main enemy of sea turtles are plastic bags, which they mistake for jellyfish and swallow them. Unfortunately, the turtle\'s intestines cannot digest a plastic bag. It gets stuck, clogs the intestines, and can only be removed by surgery, otherwise the turtle dies. Therefore, we created this site and kindly ask everyone not to throw bags on the beach because the wind blows them out to sea. If you see plastic bags in the water, as did those in our habitat in Souda Bay, Chania, Crete: please take plastic garbage out of the water and throw it in the trash. Think about it: by doing so, you may have saved one or maybe two turtles, and then these sea turtles will give birth to offspring.',
        iconSrc: '/media/icons/cards/turtle.png'
    },
    {
        id: 'qa-3',
        header: 'Why is the main eney of turtles',
        content: 'The main enemy of sea turtles are plastic bags, which they mistake for jellyfish and swallow them. Unfortunately, the turtle\'s intestines cannot digest a plastic bag. It gets stuck, clogs the intestines, and can only be removed by surgery, otherwise the turtle dies. Therefore, we created this site and kindly ask everyone not to throw bags on the beach because the wind blows them out to sea. If you see plastic bags in the water, as did those in our habitat in Souda Bay, Chania, Crete: please take plastic garbage out of the water and throw it in the trash. Think about it: by doing so, you may have saved one or maybe two turtles, and then these sea turtles will give birth to offspring.',
        iconSrc: '/media/icons/cards/turtle.png'
    }
]
export function QuestionsSection() {
    const {registerSection} = useSectionNavigation();

    return (
        <section ref={registerSection('q&a')} className='flex flex-col items-center gap-6 w-full pb-40'>
            <Title variant='primary' size='lg' centered lined>Q&A</Title>
            <div className='flex flex-row justify-center gap-10 flex-wrap max-w-[1200px]'>
                {QaABlocks.map(({id, ...props}) => (
                    <DropDownBlock key={id} {...props} />
                ))}
            </div>
        </section>
    )
}