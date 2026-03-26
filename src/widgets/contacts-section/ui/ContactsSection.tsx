import {useSectionNavigation} from "@/app/_model/section-navigation/section-navigation.context";
import {Title} from "@/shared/ui/text-blocks";
import {ContactBlock} from "@/widgets/contacts-section/ui/ContactBlock";

export function ContactsSection() {
    const {registerSection} = useSectionNavigation();

    return (
        <section ref={registerSection('contacts')} className='w-full flex flex-col gap-4 items-center justify-center'>
            <Title  centered>Contact Us</Title>
            <ContactBlock />
        </section>
    )
}