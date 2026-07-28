import { CodeIcon } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FaRust, FaJava } from "react-icons/fa";
import { SiTypescript, SiDart, SiPython } from "react-icons/si";
import { TbBrandCSharp } from "react-icons/tb";
import { Language } from "../utils/codeGenerator";

interface Props {
  onCopy: (lang: Language) => void;
}

export function CopyCodeMenu({ onCopy }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 px-2 py-1.5 rounded transition-colors outline-none cursor-pointer">
        <CodeIcon size={16} /> Copy as Code
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 z-50">
        <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => onCopy('rust')}>
          <FaRust className="text-[#dea584]" size={14} /> Rust Struct
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => onCopy('typescript')}>
          <SiTypescript className="text-[#3178c6]" size={14} /> TypeScript Interface
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => onCopy('csharp')}>
          <TbBrandCSharp className="text-[#9b4f96]" size={14} /> C# Record
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => onCopy('dart')}>
          <SiDart className="text-[#0175c2]" size={14} /> Flutter (Dart)
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => onCopy('python')}>
          <SiPython className="text-[#3776ab]" size={14} /> Python Dataclass
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => onCopy('java')}>
          <FaJava className="text-[#f89820]" size={14} /> Java Class
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
