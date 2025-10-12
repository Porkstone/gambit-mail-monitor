import { UserButton } from "@clerk/nextjs";

export function TopNav () {
    return (
    <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        Gambit mail monitor
        <UserButton />
      </header>    
    )
}
