import { Users, Plus, Search, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const sampleUsers = [
  { id: "1", firstName: "John", lastName: "Admin", email: "admin@example.com", role: "Admin", status: "Active" },
  { id: "2", firstName: "Sarah", lastName: "Johnson", email: "sarah.j@example.com", role: "Supervisor", status: "Active" },
  { id: "3", firstName: "Mike", lastName: "Wilson", email: "mike.w@example.com", role: "Inventory", status: "Active" },
  { id: "4", firstName: "Emily", lastName: "Davis", email: "emily.d@example.com", role: "Operator", status: "Active" },
  { id: "5", firstName: "Tom", lastName: "Brown", email: "tom.b@example.com", role: "Viewer", status: "Inactive" },
];

export default function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-users-title">
              Users
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage user accounts and role assignments
            </p>
          </div>
        </div>
        <Button data-testid="button-add-user">
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">All Users</CardTitle>
              <CardDescription>{sampleUsers.length} users total</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="w-[250px] pl-9"
                data-testid="input-search-users"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-medium uppercase tracking-wide">User</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide">Email</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide">Role</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide">Status</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleUsers.map((user) => (
                  <TableRow key={user.id} className="hover-elevate" data-testid={`row-user-${user.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === "Active" ? "default" : "outline"}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-user-menu-${user.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Change Role</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
