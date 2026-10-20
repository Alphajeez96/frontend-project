import {forwardRef, type ButtonHTMLAttributes} from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "tertiary" | "danger";
  size?: "default" | "icon";
};

const variants = {
  primary:
    "border-transparent bg-accent text-white enabled:hover:bg-accent-hover enabled:active:bg-accent-pressed disabled:bg-raised",
  secondary:
    "border-border-strong bg-border text-text enabled:hover:border-accent enabled:hover:bg-accent enabled:hover:text-white enabled:active:bg-accent-pressed disabled:bg-raised",
  tertiary:
    "border-transparent bg-transparent text-muted enabled:hover:bg-border enabled:hover:text-text enabled:active:bg-border-strong",
  danger:
    "border-transparent bg-transparent text-muted enabled:hover:bg-raised enabled:hover:text-danger enabled:active:bg-border focus-visible:outline-danger",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "secondary",
      size = "default",
      className,
      type = "button",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        {...props}
        ref={ref}
        type={type}
        className={[
          "inline-flex items-center justify-center gap-2 min-h-9 border rounded-control text-[12px] font-medium leading-[1.4] cursor-pointer no-underline transition-[transform,background-color,border-color,color] duration-160 ease-out enabled:active:scale-97 disabled:text-subtle disabled:cursor-not-allowed focus-visible:outline-accent-hover pointer-coarse:min-h-11 motion-reduce:transition-none motion-reduce:active:scale-100 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.75]",
          variants[variant],
          size === "icon"
            ? "w-9 p-2 shrink-0 pointer-coarse:w-11"
            : "px-3 py-2",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      />
    );
  },
);

Button.displayName = "Button";
