import { Building2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Site } from "@shared/schema";

export default function SiteSelectorPage() {
  const { user, availableSites, selectSite, logout } = useAuth();

  const handleSelectSite = (site: Site) => {
    selectSite(site);
  };

  const userInitials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : "??";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">
              Welcome, {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{user?.tenantName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={logout} data-testid="button-logout-selector">
            Sign out
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Select a Site</h1>
            <p className="mt-2 text-muted-foreground">
              Choose a site to continue to your dashboard
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {availableSites.map((site) => (
              <Card
                key={site.id}
                className="cursor-pointer transition-all hover-elevate"
                onClick={() => handleSelectSite(site)}
                data-testid={`card-site-${site.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base font-medium">{site.name}</CardTitle>
                      {site.address && (
                        <CardDescription className="text-xs mt-1">
                          {site.address}
                        </CardDescription>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {availableSites.length === 0 && (
            <Card className="text-center">
              <CardContent className="py-12">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No Sites Available</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  You don't have access to any sites. Please contact your administrator.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
