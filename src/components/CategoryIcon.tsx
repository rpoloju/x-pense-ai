import * as Icons from "lucide-react";

interface CategoryIconProps {
  name: string;
  className?: string;
}

export function CategoryIcon({ name, className = "w-5 h-5" }: CategoryIconProps) {
  // Safely look up the iconic representation, fallback if unmatched
  const IconComponent = (Icons as any)[name] || Icons.HelpCircle;
  return <IconComponent className={className} />;
}
