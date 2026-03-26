import {useState} from 'react'
import {useSectionNavigation} from "@/app/_model/section-navigation/section-navigation.context";
import {Title} from "@/shared/ui/text-blocks";
import {FactCard} from "@/widgets/cards-section/ui/FactCard";
import {MobileSlider} from "@/shared/ui/mobile-slider";
import type {FactCardProps} from "@/widgets/cards-section/ui/FactCard";
import {useIsMobile} from "@/shared/hooks/adaptive";

const CARD_DATA: FactCardProps[] = [
    {
        id: 'fc-survival',
        title: <>Only <span className='text-turk'>1 In 1000</span> Survives.</>,
        icon:'/media/icons/cards/turtle.png',
        description: 'Since sea turtles grow very slowly, they can take up to 50 years to reach sexual maturity–which is quite late in life! Sadly, they also have a very low natural survival rate: it is estimated that only one in 1,000 sea turtle hatchlings survive to adulthood.'
    },
    {
        id: 'fc-plastic',
        title: <>More Than <span className='text-turk'>Half</span> Have Eaten Plastic</>,
        icon:'/media/icons/cards/plastic.svg',
        description: 'Research suggests that about 52% of sea turtles worldwide have ingested plastic. Floating bags often look like jellyfish, turning a simple feeding mistake into a death sentence: blocked intestines, internal injury, false fullness, and slow starvation.'
    },
    {
        id: 'fc-caught',
        title: <>Over <span className='text-turk'>250,000</span> Are Caught Each Year</>,
        icon:'/media/icons/cards/net.svg',
        description: 'Every year, more than 250,000 sea turtles are accidentally caught in fishing gear. Many never make it back to the surface to breathe. What humans call “bycatch” often means a long, silent drowning for an animal that did nothing except swim through the wrong stretch of ocean.'
    },
    {
        id: 'fc-light',
        title: <><span className='text-turk'>97.8%</span> of Nesting Areas Face Light Pollution</>,
        icon:'/media/icons/cards/lights.svg',
        description: 'Nearly all major sea turtle nesting areas are exposed to artificial light. For hatchlings, that glow can be fatal: instead of crawling toward the moonlit ocean, they are drawn inland toward roads, hotels, and streets, where exhaustion, dehydration, and predators finish what humans started.'
    },
    {
        id: 'fc-trade',
        title: <><span className='text-turk'>1.1 Million</span> Taken in 30 Years</>,
        icon:'/media/icons/cards/fishing-boat.svg',
        description: 'Between 1990 and 2020, more than 1.1 million sea turtles were illegally killed or trafficked across 65 countries and territories. Even now, tens of thousands are still exploited every year. For an animal that can take decades to mature, this is not just cruelty. It is the slow erasure of entire populations.'
    },
]

//TODO: сделать мобильную версию - слайдер

export function FactCardsSection() {
    const [isCardOpen, setIsCardOpen] = useState<boolean>(false);
    const {registerSection} = useSectionNavigation();
    const isMobile = useIsMobile();

    const toggleCard = () => {
        setIsCardOpen(prev => !prev);
    }


    return (
        <section ref={registerSection('cards')} className='flex flex-col items-center gap-12 w-full'>
            <Title variant='primary' size='lg' lined centered>
                Why it is important?
            </Title>
            {isMobile ?
                (<MobileSlider
                    isCardOpen={isCardOpen}
                    slides={
                        CARD_DATA.map((card: FactCardProps) => <FactCard key={card.id} cardToggler={toggleCard} {...card} />)}
                />) :
                <div className='flex gap-8 flex-wrap justify-center max-w-[1200px]'>
                    {CARD_DATA.map((card: FactCardProps) => <FactCard key={card.id} {...card} />)}
                </div>
            }
        </section>
    )
}