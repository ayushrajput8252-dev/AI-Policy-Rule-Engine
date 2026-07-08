import Link from "next/link";
import { 
  FileText, 
  Settings, 
  MessageSquare, 
  ShieldCheck, 
  BarChart3, 
  Upload
} from "lucide-react";

export function Sidebar() {
  return (
    <div className="flex h-full w-64 flex-col border-r bg-zinc-950 text-zinc-100">
      <div className="flex h-14 items-center border-b border-zinc-800 px-4">
        <ShieldCheck className="mr-2 h-6 w-6 text-indigo-500" />
        <span className="font-semibold text-lg tracking-tight">Policy Intel</span>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid gap-1 px-2">
          <SidebarItem href="/" icon={<MessageSquare className="h-4 w-4" />} label="Chat" />
          <SidebarItem href="/documents" icon={<FileText className="h-4 w-4" />} label="Documents" />
          <SidebarItem href="/upload" icon={<Upload className="h-4 w-4" />} label="Upload" />
          <SidebarItem href="/rules" icon={<ShieldCheck className="h-4 w-4" />} label="Rules Explorer" />
          <SidebarItem href="/analytics" icon={<BarChart3 className="h-4 w-4" />} label="Analytics" />
        </nav>
      </div>
      <div className="border-t border-zinc-800 p-4">
        <SidebarItem href="/settings" icon={<Settings className="h-4 w-4" />} label="Settings" />
      </div>
    </div>
  );
}

function SidebarItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}
