import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  FolderLock,
  ListChecks,
  MessageCircle,
  ScanLine,
  Settings,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const NAV_ITEMS = [
  { to: "/", label: "Acasă", icon: Home },
  { to: "/services", label: "Servicii", icon: ScrollText },
  { to: "/vault", label: "Seif", icon: FolderLock },
  { to: "/tasks", label: "Sarcini", icon: ListChecks },
  { to: "/scan", label: "Scanare", icon: ScanLine },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/settings", label: "Setări", icon: Settings },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <Sidebar collapsible="none" className="border-r border-sidebar-border">
      <SidebarHeader>
        <div className="rounded-lg border border-sidebar-border/70 bg-sidebar-accent/35 p-3">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-primary flex items-center justify-center">
              <ShieldCheck className="size-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-sidebar-foreground">Civis</div>
              <div className="truncate text-[10px] uppercase tracking-wider text-sidebar-foreground/70">
                Agent civic AI
              </div>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {NAV_ITEMS.map((item) => {
              const active =
                item.to === "/"
                  ? path === "/" || path.startsWith("/workflow/")
                  : path.startsWith(item.to);
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                    <Link to={item.to}>
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="rounded-lg border border-sidebar-border/70 bg-sidebar-accent/35 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-sidebar-foreground">
            <Sparkles className="size-4 text-primary" />
            Obiectiv nou
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-sidebar-foreground/75">
            Folosește chatul Civis pentru a porni rapid o procedură.
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
