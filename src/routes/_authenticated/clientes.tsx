import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Pencil, Search, FileText, Receipt } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { validarRNC, validarCedula } from "@/lib/format";
import { fmtMoney, fmtDate } from "@/lib/format";
import { PROVINCIAS_RD } from "@/lib/provincias-rd";

export const Route = createFileRoute("/_authenticated/clientes")({ component: Clientes });

const empty = { tipo_documento: "rnc_empresa", documento: "", razon_social: "", direccion: "", provincia: "", telefono: "", email: "" };

function Clientes() {
  const qc = useQueryClient();
  const auth = useAuth();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [f, setF] = useState<any>(empty);
  const { data } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => (await supabase.from("clientes").select("*").order("razon_social")).data ?? [],
  });
  const { data: cotizaciones } = useQuery({
    queryKey: ["clientes-cotizaciones"],
    queryFn: async () => (await supabase.from("cotizaciones").select("id, numero, fecha, total, estado, cliente_id").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: facturas } = useQuery({
    queryKey: ["clientes-facturas"],
    queryFn: async () => (await supabase.from("facturas").select("id, ncf, fecha, total, estado, monto_pagado, cliente_id").order("created_at", { ascending: false })).data ?? [],
  });

  const cotsPor = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const c of (cotizaciones ?? []) as any[]) {
      if (!m.has(c.cliente_id)) m.set(c.cliente_id, []);
      m.get(c.cliente_id)!.push(c);
    }
    return m;
  }, [cotizaciones]);
  const facsPor = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const f of (facturas ?? []) as any[]) {
      if (!m.has(f.cliente_id)) m.set(f.cliente_id, []);
      m.get(f.cliente_id)!.push(f);
    }
    return m;
  }, [facturas]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data ?? [];
    return (data ?? []).filter((c: any) =>
      [c.razon_social, c.documento, c.email, c.telefono, c.provincia]
        .filter(Boolean).some((v: string) => v.toLowerCase().includes(q)),
    );
  }, [data, search]);

  const abrirNuevo = () => { setEditId(null); setF(empty); setOpen(true); };
  const abrirEditar = (c: any) => {
    setEditId(c.id);
    setF({
      tipo_documento: c.tipo_documento, documento: c.documento ?? "", razon_social: c.razon_social ?? "",
      direccion: c.direccion ?? "", provincia: c.provincia ?? "", telefono: c.telefono ?? "", email: c.email ?? "",
    });
    setOpen(true);
  };

  const guardar = async () => {
    if (!f.razon_social || !f.documento) return toast.error("Razón social y documento obligatorios");
    if ((f.tipo_documento === "rnc_empresa" && !validarRNC(f.documento)) ||
        (f.tipo_documento === "rnc_persona" && !validarRNC(f.documento)) ||
        (f.tipo_documento === "cedula" && !validarCedula(f.documento))) {
      return toast.error("Documento con formato inválido");
    }
    if (editId) {
      const { error } = await supabase.from("clientes").update(f).eq("id", editId);
      if (error) return toast.error(error.message);
      toast.success("Cliente actualizado");
    } else {
      const { error } = await supabase.from("clientes").insert({ ...f, tenant_id: auth.tenantId });
      if (error) return toast.error(error.message);
      toast.success("Cliente creado");
    }
    setOpen(false);
    setEditId(null);
    setF(empty);
    qc.invalidateQueries({ queryKey: ["clientes"] });
  };

  return (
    <div>
      <PageHeader title="Clientes" description="Gestiona tu cartera de clientes"
        action={
          <Button onClick={abrirNuevo}><Plus className="h-4 w-4 mr-2" />Nuevo cliente</Button>
        } />

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditId(null); setF(empty); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar cliente" : "Nuevo cliente"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                <div>
                  <Label>Tipo de documento</Label>
                  <Select value={f.tipo_documento} onValueChange={(v) => setF({ ...f, tipo_documento: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rnc_empresa">RNC Empresa (9 dígitos)</SelectItem>
                      <SelectItem value="rnc_persona">RNC Persona Física (11)</SelectItem>
                      <SelectItem value="cedula">Cédula (11)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Documento</Label><Input value={f.documento} onChange={(e) => setF({ ...f, documento: e.target.value })} /></div>
                <div><Label>Razón social</Label><Input value={f.razon_social} onChange={(e) => setF({ ...f, razon_social: e.target.value })} /></div>
                <div><Label>Dirección</Label><Input value={f.direccion} onChange={(e) => setF({ ...f, direccion: e.target.value })} /></div>
                <div>
                  <Label>Provincia</Label>
                  <Select value={f.provincia || undefined} onValueChange={(v) => setF({ ...f, provincia: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecciona una provincia" /></SelectTrigger>
                    <SelectContent>
                      {PROVINCIAS_RD.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Teléfono</Label><Input value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
                <Button onClick={guardar} className="w-full">{editId ? "Actualizar" : "Guardar"}</Button>
              </div>
            </DialogContent>
          </Dialog>

      <div className="relative mb-3 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por razón social, documento, email, provincia…"
          value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_2fr_auto] gap-3 px-3 py-2 border-b bg-muted/40 text-xs font-semibold text-muted-foreground">
          <div>Razón social</div>
          <div>Documento</div>
          <div>Teléfono</div>
          <div>Email</div>
          <div className="w-8" />
        </div>
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">Sin clientes</div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {filtered.map((c: any) => {
              const cots = cotsPor.get(c.id) ?? [];
              const facs = facsPor.get(c.id) ?? [];
              return (
                <AccordionItem key={c.id} value={c.id} className="border-b border-border last:border-b-0">
                  <div className="grid grid-cols-[2fr_1fr_1fr_2fr_auto] gap-3 items-center px-3">
                    <AccordionTrigger className="col-span-4 grid grid-cols-subgrid py-3 hover:no-underline">
                      <div className="font-medium truncate text-left">{c.razon_social}</div>
                      <div className="font-mono text-xs text-muted-foreground truncate text-left">{c.documento}</div>
                      <div className="text-xs text-muted-foreground truncate text-left">{c.telefono ?? ""}</div>
                      <div className="text-xs text-muted-foreground truncate text-left">{c.email ?? ""}</div>
                    </AccordionTrigger>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); abrirEditar(c); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                  <AccordionContent className="px-4 pb-4 bg-muted/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                      <div><span className="text-muted-foreground">Tipo documento:</span> {c.tipo_documento}</div>
                      <div><span className="text-muted-foreground">Provincia:</span> {c.provincia ?? "—"}</div>
                      <div className="md:col-span-2"><span className="text-muted-foreground">Dirección:</span> {c.direccion ?? "—"}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                          <FileText className="h-4 w-4" />Cotizaciones ({cots.length})
                        </div>
                        {cots.length === 0 ? (
                          <div className="text-xs text-muted-foreground">Sin cotizaciones</div>
                        ) : (
                          <ul className="space-y-1">
                            {cots.map((q: any) => (
                              <li key={q.id}>
                                <Link to="/cotizaciones/nueva" search={{ id: q.id }}
                                  className="flex justify-between items-center text-sm px-2 py-1 rounded hover:bg-background">
                                  <span className="font-mono">{q.numero}</span>
                                  <span className="text-muted-foreground text-xs">{fmtDate(q.fecha)}</span>
                                  <span className="text-xs">{q.estado}</span>
                                  <span className="font-semibold">{fmtMoney(q.total)}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                          <Receipt className="h-4 w-4" />Facturas ({facs.length})
                        </div>
                        {facs.length === 0 ? (
                          <div className="text-xs text-muted-foreground">Sin facturas</div>
                        ) : (
                          <ul className="space-y-1">
                            {facs.map((f: any) => (
                              <li key={f.id}>
                                <Link to="/facturas/nueva" search={{ id: f.id }}
                                  className="flex justify-between items-center text-sm px-2 py-1 rounded hover:bg-background">
                                  <span className="font-mono">{f.ncf}</span>
                                  <span className="text-muted-foreground text-xs">{fmtDate(f.fecha)}</span>
                                  <span className="text-xs">{f.estado}</span>
                                  <span className="font-semibold">{fmtMoney(f.total)}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </Card>
    </div>
  );
}