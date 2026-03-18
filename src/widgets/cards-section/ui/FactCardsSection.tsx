import {Title} from "@/shared/ui/text-blocks";
import {FactCard} from "@/widgets/cards-section/ui/FactCard";
import type {FactCardProps} from "@/widgets/cards-section/ui/FactCard";

const CARD_DATA: FactCardProps[] = [
    {
        id: 'survival',
        title: <>Only <span className='text-turk'>1 in 1000</span> survives.</>,
        icon:'/media/icons/cards/turtle.png',
        description: 'Since sea turtles grow very slowly, they can take up to 50 years to reach sexual maturity–which is quite late in life! Sadly, they also have a very low natural survival rate: it is estimated that only one in 1,000 sea turtle hatchlings survive to adulthood.'
    },
    {
        id: 'plastic',
        title: <>Only <span className='text-turk'>1 in 1000</span> survives.</>,
        icon:'/media/icons/cards/turtle.png',
        description: 'Since sea turtles grow very slowly, they can take up to 50 years to reach sexual maturity–which is quite late in life! Sadly, they also have a very low natural survival rate: it is estimated that only one in 1,000 sea turtle hatchlings survive to adulthood.'
    },
    {
        id: 'hunters',
        title: <>Only <span className='text-turk'>1 in 1000</span> survives.</>,
        icon:'/media/icons/cards/turtle.png',
        description: 'Since sea turtles grow very slowly, they can take up to 50 years to reach sexual maturity–which is quite late in life! Sadly, they also have a very low natural survival rate: it is estimated that only one in 1,000 sea turtle hatchlings survive to adulthood.'
    }
]

//TODO: сделать мобильную версию - слайдер

export function FactCardsSection() {
    return (
        <section className='flex flex-col items-center gap-12 w-full'>
            <Title variant='primary' size='lg' lined centered>
                Why it is important?
            </Title>
            <div className='flex gap-8 flex-wrap justify-center max-w-[1200px]'>
                {CARD_DATA.map((card: FactCardProps) => <FactCard key={card.id} {...card} />)}
            </div>
        </section>
    )
}