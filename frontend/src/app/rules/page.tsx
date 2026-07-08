"use client";

import { useState } from "react";
import { Search, Filter, ShieldCheck, FileText, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Mock data for the POC UI
const MOCK_RULES = [
  { id: "R-101", canonical: "wear ID badges", type: "OBLIGATION", confidence: 96, doc: "Security Policy.pdf", section: "General Access" },
  { id: "R-102", canonical: "access confidential data", type: "PROHIBITION", confidence: 92, doc: "Data Protection.pdf", section: "Data Handling" },
  { id: "R-103", canonical: "report security incidents", type: "OBLIGATION", confidence: 99, doc: "Incident Response.pdf", section: "Reporting" },
  { id: "R-104", canonical: "use personal devices", type: "PERMISSION", confidence: 88, doc: "BYOD Policy.pdf", section: "Allowed Usage" },
  { id: "R-105", canonical: "save work regularly", type: "RECOMMENDATION", confidence: 85, doc: "Best Practices.pdf", section: "Data Loss Prevention" },
];

export default function RulesExplorerPage() {
  const [search, setSearch] = useState("");

  const filteredRules = MOCK_RULES.filter(r => 
    r.canonical.toLowerCase().includes(search.toLowerCase()) ||
    r.type.toLowerCase().includes(search.toLowerCase()) ||
    r.doc.toLowerCase().includes(search.toLowerCase())
  );

  const getTypeColor = (type: string) => {
    switch(type) {
      case "OBLIGATION": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "PROHIBITION": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "PERMISSION": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-8 overflow-auto">
      <div className="max-w-6xl w-full mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-100 mb-2">Rule Explorer</h1>
            <p className="text-zinc-400">Search and filter through all extracted and validated policies.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Export CSV
            </Button>
          </div>
        </div>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-zinc-800 bg-zinc-950/50 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search rules, documents, or types..." 
                className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-indigo-500"
              />
            </div>
          </div>
          
          <Table>
            <TableHeader className="bg-zinc-950">
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400 font-medium">Rule ID</TableHead>
                <TableHead className="text-zinc-400 font-medium">Canonical Rule</TableHead>
                <TableHead className="text-zinc-400 font-medium">Type</TableHead>
                <TableHead className="text-zinc-400 font-medium">Confidence</TableHead>
                <TableHead className="text-zinc-400 font-medium">Source Document</TableHead>
                <TableHead className="text-zinc-400 font-medium">Section</TableHead>
                <TableHead className="text-zinc-400 font-medium text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules.length > 0 ? (
                filteredRules.map((rule) => (
                  <TableRow key={rule.id} className="border-zinc-800/50 hover:bg-zinc-800/50 transition-colors">
                    <TableCell className="font-mono text-xs text-zinc-500">{rule.id}</TableCell>
                    <TableCell className="font-medium text-zinc-200">{rule.canonical}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getTypeColor(rule.type)}>
                        {rule.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-300">{rule.confidence}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <FileText className="h-3.5 w-3.5" />
                        {rule.doc}
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-sm">{rule.section}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10">
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-zinc-500">
                    No rules found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
