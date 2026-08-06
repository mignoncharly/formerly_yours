import * as React from "react";

/** Surface container. Wraps the `.owy-card` token class. */
export function Card({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`owy-card ${className}`} {...props} />;
}
