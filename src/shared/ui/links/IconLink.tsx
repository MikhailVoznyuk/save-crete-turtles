import Link from "next/link";
import Image from "next/image";
import {twMerge} from "tailwind-merge";
import type {ReactNode} from "react";

type Props = {
    href: string;
    icon?: string;
    iconSize?: number;
    containerColor?: string;
    containerClassName?: string;
    linkClassName?: string;
    hover?: boolean;
    children: ReactNode;

}
export function IconLink({
        href,
        icon,
        iconSize=24,
        containerColor='turk',
        containerClassName,
        linkClassName,
        hover = true,
        children}: Props) {

    return (
        <Link href={href}>
            <div className={twMerge(
                    'flex items-center justify-center gap-2 px-2 py-1  bg-turk rounded-full shadow-md',
                    hover && 'hover:bg-abyss group/iconlink transition-colors duration-300',
                    containerClassName
                )}
                 style={{backgroundColor: containerColor}}
            >

                {icon && <Image src={icon} alt={'link icon'} width={iconSize} height={iconSize} />}
                <div className={twMerge(
                        'text-sm sm:text-base text-abyss  ',
                        hover && 'group-hover/iconlink:text-cold-white duration-300 transition-colors',
                    )}
                >
                    {children}
                </div>
            </div>
        </Link>

    )
}