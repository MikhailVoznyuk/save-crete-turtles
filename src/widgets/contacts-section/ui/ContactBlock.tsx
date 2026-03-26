'use client';

import {TextBlock} from "@/shared/ui/text-blocks";
import {GlassPanel} from "@/shared/ui/containers";
import {BlurContainer} from "@/shared/ui/containers/blur-container";
import {IconLink} from "@/shared/ui/links";

const BLOCK_MESSAGE = 'If you would like to help us in any way or have any questions, please contact us in any of these ways'
export function ContactBlock() {
    return (
        <GlassPanel
            outline={false}
            className='w-[320px] sm:w-[620px] border border-cold-white/50 bg-black/10 rounded-2xl sm:rounded-4xl'
            innerClassName='w-full p-4'
        >
            <div className='flex flex-col gap-4'>
                <TextBlock size='xl' className='text-turk'>{BLOCK_MESSAGE}</TextBlock>
                <BlurContainer>

                    <IconLink
                        href='mailto:cretevacation.villas@gmail.com'
                        icon='/media/icons/envelope.svg'
                    >
                        <span className='text-base sm:text-xl text-center'>cretevacation.villas@gmail.com</span>
                    </IconLink>
                </BlurContainer>
                <BlurContainer>
                    <div className='flex flex-col items-center gap-2 w-fit'>
                        <IconLink
                            href='mailto:cretevacation.villas@gmail.com'
                            icon='/media/icons/phone.svg'
                        >
                            <span className='text-base sm:text-xl text-center'>+306949366482</span>
                        </IconLink>
                        <span className='font-dongle font-light text-2xl sm:text-3xl sm:leading-[0.8] text-center text-cold-white'>Or chat us via:</span>
                        <div className='flex center gap-4 '>
                            <IconLink
                                href='https://wa.me/306949366482'
                                icon='/media/icons/whatsapp.svg'
                                iconSize={16}
                                containerColor='#50E761'
                                hover={false}
                            >
                                <span className='text-cold-white'>WhatsApp</span>
                            </IconLink>
                            <IconLink
                                href='viber://chat?number=%2B306949366482'
                                icon='/media/icons/viber.svg'
                                containerColor='#6F3FAA'
                                iconSize={16}
                                hover={false}
                            >
                                <span className='text-cold-white'>Viber</span>
                            </IconLink>

                        </div>
                    </div>
                </BlurContainer>
            </div>

        </GlassPanel>
    )
}