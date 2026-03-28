import {useState} from "react";
import {useSectionNavigation} from "@/app/_model/section-navigation/section-navigation.context";
import {Title, TextBlock, TextMediaRow} from "@/shared/ui/text-blocks";
import type {TextMediaRowProps} from "@/shared/ui/media/types/types";
import {Toggler} from "@/shared/ui/buttons/toggler/Toggler";

type Step = {id: string} & TextMediaRowProps

const HOW_YOU_CAN_HELP_INTRO = `Saving sea turtles does not always require something dramatic. Sometimes it starts with very ordinary choices: the trash you pick up, the lights you turn off, the distance you keep, and the habits you change for a single day at the beach. Small actions may feel insignificant, but for a nesting female, a hatchling, or an injured turtle, they can be the difference between reaching the ocean and not making it at all.`;

const TOURIST_ACTIONS_DATA: Step[] = [
    {
        id: 'ac-trash',
        header: 'Leave No Trash Behind',
        content: 'A clean beach is not just more beautiful. It is safer for turtles at every stage of life. Plastic bags, wrappers, bottle caps, cigarette butts, leftover food, and fishing line can all become a threat once the wind or tide carries them into the water. Turtles may swallow plastic by mistake, become tangled in debris, or struggle to cross littered sand. The rule is simple: take everything with you when you leave, and if you notice trash that is not yours, pick up a little extra. For us it is a few seconds. For a turtle, it can mean one less deadly obstacle.',
        mediaType: 'image',
        mediaSrc: '/media/img/steps-section/tourists/plastic_on_beach.png',
        reversed: false,
    },
    {
        id: 'ac-plastic',
        header: 'Choose Reusables Over Single-Use Plastic',
        content: 'Many of the items people use for a few minutes stay in the environment for years. Plastic straws, takeaway containers, shopping bags, disposable cutlery, and balloon releases often end up in the sea, where they break into smaller pieces but do not truly disappear. Turtles can mistake drifting plastic for prey, especially when it moves like jellyfish in the water. Carry a reusable bottle, say no to unnecessary plastic, and choose products you can use again. It is one of the easiest ways to reduce the slow flood of waste that turns the ocean into a trap.',
        mediaType: 'video',
        mediaSrc: 'https://pub-fb50e14352e04cce8019675f0d1f59cf.r2.dev/media/video/steps-section/tourists/turtle_eats_plastic_pocket.mp4',
        reversed: true,
    },
    {
        id: 'ac-sunscreen',
        header: 'Protect Your Skin Without Harming the Sea',
        content: 'Sun protection matters, but so does what washes off your body into the water. Try to choose mineral-based sunscreen when possible, avoid overusing products right before swimming, and use UV-protective clothing like rash guards, swim shirts, hats, or cover-ups whenever you can. The point is not perfection. The point is reducing the chemical load that enters fragile coastal ecosystems. Healthy reefs, cleaner shallows, and less pollution mean a better feeding and resting environment for marine life, including sea turtles.',
        mediaType: 'image',
        mediaSrc: '/media/img/steps-section/tourists/reef_turtle.png',
        reversed: false,
    },
    {
        id: 'ac-lights',
        header: 'Keep the Beach Dark at Night',
        content: 'For sea turtles, artificial light can be deadly. Nesting females may feel unsafe and turn back without laying eggs, while hatchlings can crawl toward hotel lights, roads, and promenades instead of the moonlit sea. If you are near the beach at night, avoid flash photography, keep phone lights to a minimum, and switch off unnecessary outdoor lights if you can. Close curtains in beachfront rooms and respect “lights out” rules in nesting areas. A dark beach may seem inconvenient for people. For baby turtles, it is how they find their way home.',
        mediaType: 'image',
        mediaSrc: '/media/img/steps-section/tourists/night_baby_turtle.png',
        reversed: true,
    },
    {
        id: 'ac-space',
        header: 'Give Turtles Space and Stay Quiet',
        content: 'A sea turtle on the beach is not a photo prop, not a pet, and not a moment to crowd for social media. If you see a nesting turtle or hatchlings, keep your distance, stay quiet, and never touch, chase, block, or surround them. Even a few people standing too close can cause stress and interrupt nesting. Hatchlings are even more vulnerable: they can be disoriented, delayed, or crushed in the confusion. The best way to respect wildlife is often the least exciting one for humans: step back, stay calm, and let the animal do what it came there to do.',
        mediaType: 'image',
        mediaSrc: '/media/img/steps-section/tourists/turtle_nesting.png',
        reversed: false,
    },
    {
        id: 'ac-nests',
        header: 'Keep Nesting Beaches Clear and Safe',
        content: 'What people leave behind on the sand can become a barrier by night. Beach chairs, umbrellas, toys, coolers, sandcastles, and deep holes may seem harmless during the day, but they can block nesting females or trap hatchlings trying to reach the water. Before you leave, remove your gear, flatten sand structures, and fill in any holes your group made. Never enter marked nesting areas, move protective barriers, or let children dig nearby. A turtle may wait decades to return and lay eggs on a beach. It would be a miserable joke if a plastic shovel or a beach chair stopped her.',
        mediaType: 'video',
        mediaSrc: 'https://pub-fb50e14352e04cce8019675f0d1f59cf.r2.dev/media/video/steps-section/tourists/baby_tutle_runs.mp4',
        reversed: true,
    },
    {
        id: 'ac-help',
        header: 'Support Rescue, Cleanups, and Local Conservation',
        content: 'You do not need to be a scientist to make a real difference. Join a beach cleanup, support trusted turtle conservation groups, follow local nesting season rules, and report injured, stranded, or entangled turtles to local wildlife authorities instead of trying to handle them yourself. If you live near the coast, learn who to call before an emergency happens. If you are just visiting, share accurate information with the people around you. Not every act of help looks dramatic, but conservation is built on ordinary people doing the right thing repeatedly.',
        mediaType: 'image',
        mediaSrc: '/media/img/steps-section/tourists/beach_cleaning.png',
        reversed: false,
    }
];

const BOATERS_SECTION_INTRO = `If you fish, boat, or spend time around piers and coastal waters, your choices matter even more than you think. A lost hook, a length of line, a drifting net, or a fast-moving propeller can injure a turtle in seconds and haunt it for far longer. The good news is painfully simple: some of the most serious threats are also some of the most preventable.`;

const BOATERS_ACTIONS_DATA: Step[] = [
    {
        id: 'fb-line',
        header: 'Never Leave Line, Hooks, or Nets Behind',
        content: 'What looks small to us can become a deadly trap in the water. Fishing line, hooks, rope, and netting can wrap around a turtle’s flippers, neck, or mouth, or be swallowed by mistake. Always collect every piece of gear before you leave. If you lose something, retrieve it safely if you can. If you find abandoned line or netting, remove it and dispose of it properly instead of leaving the problem for the next animal.',
        mediaType: 'video',
        mediaSrc: 'https://pub-fb50e14352e04cce8019675f0d1f59cf.r2.dev/media/video/steps-section/boaters-fishers/net_save.mp4',
        reversed: false,
    },
    {
        id: 'fb-disposal',
        header: 'Dispose of Fishing Gear Properly',
        content: 'Do not throw unwanted line, bait packaging, or damaged tackle into the sea, on the sand, or near the pier. Monofilament can remain in the environment for a very long time, and because it is thin and hard to see, animals do not avoid it until it is too late. Use designated recycling bins for fishing line where available, or store used gear securely until you can throw it away on land.',
        mediaType: 'video',
        mediaSrc: '/media/video/bg/bg_2.mp4',
        reversed: true,
    },
    {
        id: 'fb-speed',
        header: 'Slow Down and Watch the Water',
        content: 'Sea turtles often surface to breathe, especially in shallow coastal areas. A fast-moving boat can strike a turtle before the driver even realizes it was there. Reduce speed near beaches, in shallow water, around seagrass beds, and anywhere turtles are likely to surface. Stay alert, keep a sharp lookout ahead, and remember that giving wildlife a few extra seconds can save it from a life-changing injury.',
        mediaType: 'image',
        mediaSrc: '/media/img/steps-section/sand_turtle.png',
        reversed: false,
    },
    {
        id: 'fb-help',
        header: 'If a Turtle Is Hooked or Entangled, Do Not Panic',
        content: 'Do not yank the line, cut blindly, or try to “fix” a serious entanglement by force. Mishandling can make internal injuries worse or reduce the turtle’s chance of survival. The safest response is to contact local wildlife rescue authorities or the appropriate marine animal hotline and follow professional guidance. Helping badly does not become helping just because the intention was good.',
        mediaType: 'image',
        mediaSrc: '/media/img/steps-section/sand_turtle.png',
        reversed: true,
    },
    {
        id: 'fb-respect',
        header: 'Do Not Attract Turtles to Busy Fishing Areas',
        content: 'Do not feed turtles, do not encourage them to approach boats or piers, and do not leave fish scraps where wildlife learns to associate people with food. When turtles begin coming closer to human activity, the risk of hooks, propellers, entanglement, and repeated injury goes up. Wild animals survive better when they stay wary of us, which, to be fair, is one of the smartest instincts in nature.',
        mediaType: 'video',
        mediaSrc: '/media/video/bg/bg_2.mp4',
        reversed: false,
    }
];

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
        mediaType: 'video',
        mediaSrc: '/media/video/bg/bg_2.mp4',
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
];

export function StepsSection() {
    const [actionsType, setActionsType] = useState<number>(0);
    const {registerSection} = useSectionNavigation();

    const actions = (actionsType === 0) ? TOURIST_ACTIONS_DATA : BOATERS_ACTIONS_DATA
    return (
        <section ref={registerSection('steps')} className='flex flex-col justify-center items-center gap-12 w-full'>
            <Title variant='primary' size='lg' lined centered>
                How you can help
            </Title>
            <TextBlock size={'xl'} centered>{HOW_YOU_CAN_HELP_INTRO}</TextBlock>
            <Toggler sides={[{header: 'Beach visitors'}, {header: 'Boaters & fishers'}]} onClick={setActionsType} />

            <div className='flex flex-col items-center gap-36 max-w-[1200px]'>
                {actions.map(({id, ...step}) => (
                    <TextMediaRow key={id} {...step} />
                ))}
            </div>
        </section>
    )
}