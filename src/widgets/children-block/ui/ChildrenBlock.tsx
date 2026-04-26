import Image from "next/image";
import {GlassPanel} from "@/shared/ui/containers";
import {Title, TextBlock} from "@/shared/ui/text-blocks";

const BLOCK_CONTENT = <span>Caretta caretta sea turtles live in their own special turtle universe, going about their turtle business and not caring about humans. They probably think we're strange bipeds that they see everywhere. Please don't touch the turtles, don't pet them, and don't feed them, as they might bite. Don't dig up the sand where the turtle has laid its eggs. If you remove the eggs from the clutch, the hatchlings may not hatch. What exactly can you do to help turtles? Take out  from the our sea a plastic bag, plastic lid, or piece of clear polyethylene, which turtles might mistake for a jellyfish and eat. Take out a plastic bag or other trash from the sea. Save a sea turtle. Even a very small piece of a clear bag will harm a baby turtle and it will die if eaten. Baby turtles are very hungry and eat indiscriminately. Take out trash and plastic from coastal waters and put it in the trash. <br /><span className='text-turk text-3xl sm:text-4xl underline underline-offset-4 decoration-2'>BECAME A SUPERHERO!</span></span>

export function ChildrenBlock() {
    return (
        <GlassPanel
            outline={false}
            className='relative rounded-4xl border-2 border-cold-white/50 w-[96vw] sm:w-[480px] md:w-[640px] '
            innerClassName='w-full'
        >
            <div className='flex flex-col gap-8 items-center py-8 px-4 sm:px-8'>
                <Image src='/media/img/steps-section/children/child_hero.webp' width={256} height={256} className='size-36 sm:size-36 md:size-44 rounded-full border-2 border-cold-white/50 overflow-hidden object-cover' alt='Children image' />
                <Title
                    variant='secondary'
                    size='md'
                    containerClassName='bg-cold-white/20 border-2 border-turk/50 rounded-full px-4 py-2 backdrop-blur-md'
                    titleClassName='text-turk font-normal translate-y-1/12'
                    centered
                    lined={false}
                >Dear Children</Title>
                <TextBlock size={'md'} centered >{BLOCK_CONTENT}</TextBlock>
            </div>

        </GlassPanel>
    )
}