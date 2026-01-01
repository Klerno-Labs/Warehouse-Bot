import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/modules/inventory" },
  { label: "Items", href: "/modules/inventory/items" },
  { label: "Locations", href: "/modules/inventory/locations" },
  { label: "Balances", href: "/modules/inventory/balances" },
  { label: "Events", href: "/modules/inventory/events" },
  { label: "Reason Codes", href: "/modules/inventory/reason-codes" },
  { label: "Reports", href: "/modules/inventory/reports" },
];

export function InventoryNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2 border-b px-6 pt-4">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center rounded-md px-3 py-2 text-sm font-medium",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
