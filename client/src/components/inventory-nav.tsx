import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/modules/inventory" },
  { label: "Items", href: "/modules/inventory/items" },
  { label: "Alerts", href: "/modules/inventory/alerts" },
  { label: "Costs", href: "/modules/inventory/costs" },
  { label: "Locations", href: "/modules/inventory/locations" },
  { label: "Balances", href: "/modules/inventory/balances" },
  { label: "Events", href: "/modules/inventory/events" },
  { label: "Reason Codes", href: "/modules/inventory/reason-codes" },
  { label: "Reports", href: "/modules/inventory/reports" },
];

export function InventoryNav() {
  const pathname = usePathname();

  return (
    <div className="border-b bg-card/50 -mx-6 md:-mx-8 px-6 md:px-8 mb-6 md:mb-8">
      <div className="flex flex-wrap gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center px-4 py-3 text-sm font-medium transition-all relative",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
