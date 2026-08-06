import * as React from "react";

/** Small pill/badge. Wraps the `.owy-chip` token class. */
export function Badge({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={`owy-chip ${className}`} {...props} />;
}
