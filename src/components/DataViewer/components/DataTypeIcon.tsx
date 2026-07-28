import {
  TextAaIcon,
  HashIcon,
  CalendarBlankIcon,
  BracketsCurlyIcon,
  ShapesIcon,
  ToggleLeftIcon,
  FingerprintIcon,
} from "@phosphor-icons/react";
import { getPostgresTypeFamily } from "@/lib/postgresTypes";

export function DataTypeIcon({ type, className }: { type: string, className?: string }) {
  const family = getPostgresTypeFamily(type.toLowerCase());
  
  if (family === "uuid") return <FingerprintIcon className={className} weight="bold" />;
  if (family === "numeric") return <HashIcon className={className} weight="bold" />;
  if (family === "string") return <TextAaIcon className={className} weight="bold" />;
  if (family === "json") return <BracketsCurlyIcon className={className} weight="bold" />;
  if (family === "date") return <CalendarBlankIcon className={className} weight="bold" />;
  if (family === "boolean") return <ToggleLeftIcon className={className} weight="bold" />;
  
  return <ShapesIcon className={className} weight="bold" />;
}
