import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import {cva} from "class-variance-authority"
import {cn} from "@/lib/utils"

const switchVariants = cva(
    "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
    {
        variants: {
            size: {
                sm: "h-4 w-8",
                md: "h-6 w-11",
                lg: "h-8 w-14",
            },
        },
        defaultVariants: {
            size: "md",
        },
    }
)

const thumbVariants = cva(
    "pointer-events-none rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-100%)] data-[state=unchecked]:translate-x-0",
    {
        variants: {
            size: {
                sm: "h-3 w-3 data-[state=checked]:translate-x-4",
                md: "h-5 w-5 data-[state=checked]:translate-x-5",
                lg: "h-6 w-6 data-[state=checked]:translate-x-6",
            },
        },
        defaultVariants: {
            size: "md",
        },
    }
)

interface SwitchProps
    extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
    size?: "sm" | "md" | "lg"
}

const Switch = React.forwardRef<
    React.ElementRef<typeof SwitchPrimitives.Root>,
    SwitchProps
>(({className, size = "md", ...props}, ref) => (
    <SwitchPrimitives.Root
        ref={ref}
        className={cn(switchVariants({size}), className)}
        {...props}
    >
        <SwitchPrimitives.Thumb className={thumbVariants({size})}/>
    </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export {Switch}
