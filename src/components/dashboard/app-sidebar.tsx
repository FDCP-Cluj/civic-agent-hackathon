import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  FolderLock,
  ListChecks,
  MessageCircle,
  ScanLine,
  ScrollText,
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
import logoImage from "@/assets/images/logo.png";

const NAV_ITEMS = [
  { to: "/", label: "Acasă", icon: Home },
  { to: "/services", label: "Servicii", icon: ScrollText },
  { to: "/vault", label: "Seif", icon: FolderLock },
  { to: "/tasks", label: "Sarcini", icon: ListChecks },
  { to: "/scan", label: "Scanare", icon: ScanLine },
  { to: "/chat", label: "Chat", icon: MessageCircle },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <Sidebar collapsible="none" className="h-svh border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border/70 pb-3">
        <div className="px-5">
          <img src={logoImage} alt="ActeAI" className="h-10 w-auto object-contain" />
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto">
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
                  <SidebarMenuButton
                    asChild
                    isActive={active}
                    tooltip={item.label}
                    className="h-9 rounded-lg px-2.5 text-[0.95rem] font-medium"
                  >
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
        <div className="rounded-lg border border-sidebar-border/70 bg-sidebar-accent/20 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-sidebar-foreground">
            <Sparkles className="size-4 text-primary/90" />
            Ai nevoie de ajutor?
          </div>
          <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/75">
            Deschide Chat pentru recomandari rapide de proceduri.
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
