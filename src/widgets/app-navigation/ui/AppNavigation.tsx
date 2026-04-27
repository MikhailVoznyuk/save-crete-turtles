import {useState} from 'react';
import {IconButton} from "@/shared/ui/buttons/icon-button";

export function AppNavigation() {
    const [open, setOpen] = useState<boolean>(false);
    return (
        <div className='fixed right-6 bottom-6'>
            <IconButton
                onClick={() => {setOpen(prev => !prev)}}
                icon='/media/icons/app-navigation/ship-wheel.svg'
                variant='primary'
            />
        </div>
    )
}