import {useSectionNavigation} from "@/app/_model/section-navigation/section-navigation.context";
import {Title} from "@/shared/ui/text-blocks";
import {DropDownBlock} from "@/widgets/questions-section/ui/DropDownBlock";
import type {DropDownBlockProps} from "@/widgets/questions-section/types/types";

type QaABlock = DropDownBlockProps & {id: string};
const QaABlocks: QaABlock[] = [
    {
        id: 'qa-danger',
        header: 'Are sea turtles dangerous to people?',
        content: 'Sea turtles are generally non-aggressive by nature. They do not pose a threat to humans and usually avoid contact. When encountered while swimming or diving, they will typically move away if they feel disturbed.',
        iconSrc: '/media/icons/questions/turtle.svg'
    },
    {
        id: 'qa-food',
        header: 'What do loggerhead turtles eat?',
        content: 'Loggerhead turtles mainly feed on marine invertebrates, including mollusks like mussels and crustaceans like crabs. They also eat fish, jellyfish, sponges, and echinoderms such as sea stars.',
        iconSrc: '/media/icons/questions/squid.svg'
    },
    {
        id: 'qa-live',
        header: 'How long do loggerhead turtles live?',
        content: 'Loggerhead turtles typically have a shell length of 70 to 90 cm and can weigh between 100 and 150 kg. The answer to the question “How long do sea turtles live?” depends on the species. Loggerhead turtles can live for approximately 50 to 70 years. Although they spend most of their lives in the sea, females come ashore to lay their eggs.',
        iconSrc: '/media/icons/questions/footprint.svg'
    },
    {
        id: 'qa-enemies',
        header: 'Who are the natural enemies of turtles?',
        content: 'Turtles have many natural predators, especially when they are young. Their eggs and hatchlings are preyed upon by monitor lizards, foxes, birds, and crabs.',
        iconSrc: '/media/icons/questions/gull.svg'
    },
    {
        id: 'qa-loggerhead',
        header: 'Why are they called loggerheads?',
        content: 'These beautifully colored sea turtles are called loggerheads because of their large heads, which resemble logs. They also have powerful jaws that help them crush prey such as sea snails, horseshoe crabs, and other hard-shelled animals.',
        iconSrc: '/media/icons/questions/loggerhead.svg'
    },
    {
        id: 'qa-sleep',
        header: 'How do sea turtles sleep?',
        content: 'Sea turtles sleep underwater by slowing their heart rate to nearly zero, which helps them conserve oxygen. During this time, they can remain completely still.',
        iconSrc: '/media/icons/questions/sleep.svg',
    },
    {
        id: 'qa-hatch',
        header: 'When do loggerhead turtles hatch?',
        content: 'The nesting process lasts about 60 days, usually from May to July. Baby loggerhead turtles begin to hatch from July to September. Temperature also plays an important role: males are more likely to develop at around 28.5°C, while females need warmer conditions, closer to 32°C.',
        iconSrc: '/media/icons/questions/hatch.svg'
    },
    {
        id: 'qa-disappear',
        header: 'Where do sea turtle hatchlings go?',
        content: 'Given the predominantly land-based lifestyle of humans, coastal beaches are the places where we most often encounter sea turtles, their tracks in the sand, or the nests they leave behind. Observing sea turtles in the open ocean, especially juveniles, is an incredibly labor-intensive, logistically challenging, and costly process. As a result, most of what we know about sea turtle biology comes from studies conducted on beaches. Very little is known about sea turtles during the period between the moment hatchlings leave their nesting sites and enter oceanic waters and the time, years later, when they return as mature individuals to shallower coastal areas.',
        iconSrc: '/media/icons/questions/seaweed.svg'
    },

    {
        id: 'qa-hit',
        header: 'Why do turtles hit each other on the head?',
        content: 'A fun fact: when turtles flirt, they often tap their partner on the head with their flippers to attract attention.',
        iconSrc: '/media/icons/questions/love.svg'
    },


]
export function QuestionsSection() {
    const {registerSection} = useSectionNavigation();

    return (
        <section ref={registerSection('q&a')} className='flex flex-col items-center gap-12 w-full'>
            <Title variant='primary' size='lg' centered lined>Questions and answers</Title>
            <div className='flex flex-row justify-center gap-10 flex-wrap max-w-[1200px]'>
                {QaABlocks.map(({id, ...props}) => (
                    <DropDownBlock key={id} {...props} />
                ))}
            </div>
        </section>
    )
}