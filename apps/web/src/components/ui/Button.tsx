import * as React from "react";

type Variant = "primary" | "ghost" | "chapter";

const VARIANT: Record<Variant, string> = {
  primary: "owy-btn owy-btn-primary",
  ghost: "owy-btn owy-btn-ghost",
  chapter: "owy-btn owy-btn-chapter",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/** Design-system button. Wraps the `.owy-btn*` token classes. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "primary", className = "", ...props }, ref) {
    return (
      <button ref={ref} className={`${VARIANT[variant]} ${className}`} {...props} />
    );
  },
);
