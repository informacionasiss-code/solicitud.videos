// El listado que usa el inspector en terreno. Lo que se comprueba aquí no es
// estético: si un bus sin disco se cuela, alguien camina hasta el terminal para
// descubrir que no hay nada que extraer.
import { agruparPendientes, construirPDFPendientes } from "@/lib/pdfGenerator";
import { ok, fin } from "./_ayuda";

const r = agruparPendientes([
    { ppu: "SKPK27", case_number: "C1" },
    { ppu: "SKPK27", case_number: "C2" },
    { ppu: "LXWP77", case_number: "C3", sin_disco: true },
    { ppu: "PFVH14", case_number: "C4" },
    { ppu: "AAAA11", case_number: "C5", sin_disco: true },
]);
ok("excluye los buses sin disco", !r.ppus.some(p => ["LXWP77", "AAAA11"].includes(p.ppu)), r.ppus.map(p => p.ppu));
ok("cuenta cuántos excluyó", r.descartados === 2, r.descartados);
ok("agrupa por patente", r.ppus.length === 2, r.ppus);
ok("suma los casos del mismo bus", r.ppus.find(p => p.ppu === "SKPK27")?.count === 2, r.ppus);
ok("no cuenta los excluidos como casos", r.casos === 3, r.casos);
ok("ordena alfabéticamente", r.ppus[0].ppu === "PFVH14" && r.ppus[1].ppu === "SKPK27", r.ppus.map(p => p.ppu));
ok("sin_disco null NO excluye", agruparPendientes([{ ppu: "X1", sin_disco: null }]).ppus.length === 1);
ok("sin_disco false NO excluye", agruparPendientes([{ ppu: "X1", sin_disco: false }]).ppus.length === 1);
ok("lista vacía no rompe", agruparPendientes([]).ppus.length === 0);
ok("normaliza a mayúsculas", agruparPendientes([{ ppu: "skpk27" }]).ppus[0].ppu === "SKPK27");

ok("sin impugnaciones: una sola hoja", construirPDFPendientes([{ ppu: "SKPK27" }], []).getNumberOfPages() === 1);
const ambas = construirPDFPendientes([{ ppu: "SKPK27" }], [{ ppu: "PFVH14" }]);
ok("con impugnaciones: segunda hoja", ambas.getNumberOfPages() === 2, ambas.getNumberOfPages());
const muchas = Array.from({ length: 300 }, (_, i) => ({ ppu: `AA${String(i).padStart(4, "0")}` }));
ok("pagina cuando no cabe", construirPDFPendientes(muchas, [{ ppu: "PFVH14" }]).getNumberOfPages() > 2);

// Contenido real del archivo generado, no sólo la estructura.
const pdf = construirPDFPendientes(
    [{ ppu: "SKPK27" }, { ppu: "LXWP77", sin_disco: true }],
    [{ ppu: "PFVH14" }, { ppu: "BBBB22", sin_disco: true }]
);
const bytes = Buffer.from(pdf.output("arraybuffer") as ArrayBuffer).toString("latin1");
const contiene = (s: string) => bytes.includes(s);

ok("el PDF rotula la sección de impugnación", contiene("Impugna"));
ok("el PDF rotula las solicitudes de video", contiene("Solicitudes de Video"));
ok("aparece el bus con disco de solicitudes", contiene("SKPK27"));
ok("aparece el bus con disco de impugnación", contiene("PFVH14"));
ok("NO aparece el bus sin disco de solicitudes", !contiene("LXWP77"));
ok("NO aparece el bus sin disco de impugnación", !contiene("BBBB22"));
ok("deja constancia de lo excluido", contiene("sin disco duro excluidos"));
ok("numera las páginas de verdad", contiene("gina 1 de 2"));

fin();
