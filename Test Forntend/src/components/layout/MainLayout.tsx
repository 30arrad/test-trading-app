import { Sidebar, SidebarContent } from "./Sidebar";
import { ReactNode } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { ChatWidget } from "@/components/chat/ChatWidget";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Navigation */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-border bg-background/80 backdrop-blur-md z-40 flex items-center px-4">
        <Sheet>
          <SheetTrigger className="p-2 hover:bg-accent rounded-md transition-colors">
            <Menu className="w-5 h-5" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 border-r border-sidebar-border w-64 bg-sidebar">
            <SidebarContent />
          </SheetContent>
        </Sheet>
        <span className="ml-3 font-semibold text-lg">A30 ScalpingPro</span>
      </div>

      <Sidebar />
      <main className="md:pl-64 pt-16 md:pt-0 transition-all duration-300">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
      <ChatWidget />
    </div>
  );
}
