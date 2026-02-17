import {Background} from "@/shared/ui/background";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16">
        <Background videoSrc='/media/video/bg/bg_1.mp4'/>
      </main>
    </div>
  );
}
