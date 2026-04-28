'use client';

import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {IconButton} from "@/shared/ui/buttons/icon-button";

export function AppNavigation() {
    const [open, setOpen] = useState<boolean>(false);
    const [host, setHost] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setHost(document.querySelector<HTMLElement>('[data-app-shell]') ?? document.body);
    }, []);

    const node = (
        <div className='app-floating-navigation'>
            <IconButton
                onClick={() => {setOpen(prev => !prev)}}
                icon='/media/icons/app-navigation/ship-wheel.svg'
                variant='primary'
            />
        </div>
    );

    return host ? createPortal(node, host) : node;
}
