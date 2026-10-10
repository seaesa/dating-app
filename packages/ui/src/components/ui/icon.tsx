import type { LucideIcon, LucideProps } from "lucide-react-native";
import { cssInterop } from "nativewind";
import * as React from "react";

import { cn } from "../../lib/utils";

import { TextClassContext } from "./text";

type IconProps = LucideProps & {
  /** One Lucide icon, imported on its own: `lucide-react-native/icons/lock`. */
  as: LucideIcon;
  className?: string;
};

function IconImpl({ as: IconComponent, ...props }: IconProps) {
  return <IconComponent {...props} />;
}

// Lets `className="text-primary size-5"` colour and size the SVG from tokens.
cssInterop(IconImpl, {
  className: {
    target: "style",
    nativeStyleToProp: { height: "size", width: "size" },
  },
});

/**
 * A Lucide icon coloured by design tokens, never a literal colour.
 *
 * The icon is passed in rather than imported here, so this package has no
 * runtime dependency on the icon set and each app ships only the icons it
 * imports — Metro does not tree-shake a barrel import of the whole set.
 */
function Icon({ as, className, size = 16, ...props }: IconProps) {
  const textClass = React.useContext(TextClassContext);
  return (
    <IconImpl
      as={as}
      className={cn("text-foreground", textClass, className)}
      size={size}
      {...props}
    />
  );
}

export { Icon, type IconProps };
