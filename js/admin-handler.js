import { db, auth } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, query, orderBy, onSnapshot, doc, getDoc, getDocs, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. AUTENTICACIÓN ---
window.loginAdmin = () => {
    const email = document.getElementById('adminEmail').value.trim();
    const pass = document.getElementById('adminPass').value;
    signInWithEmailAndPassword(auth, email, pass).catch(error => alert("Error: " + error.message));
};

window.logoutAdmin = () => signOut(auth);

// Función para regresar a la vista del formulario del cliente
window.irAFormularioCliente = () => window.location.href = 'index.html';

// --- EXPORTACIÓN GENERAL A EXCEL ---
window.exportarListaCompletaExcel = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "cotizaciones"));
        const data = querySnapshot.docs.map(docSnap => {
            const d = docSnap.data();
            return {
                ID: docSnap.id,
                Empresa: d.razon_social || '',
                RUC: d.ruc || '',
                Estado: d.estado || '',
                Contacto: `${d.contacto?.nombre || ''} ${d.contacto?.apellido || ''}`,
                Correo: d.contacto?.correo || '',
                Celular: d.contacto?.celular || '',
                Participantes: d.cantidad_colaboradores || 0,
                Total_Facturado: d.total_facturado || '0.00',
                Margen: d.margen_rentabilidad || '0%'
            };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Requerimientos");
        XLSX.writeFile(wb, "Lista_Completa_Cotizaciones.xlsx");
    } catch (e) { alert("Error al exportar: " + e.message); }
};

// --- 2. AUDITORÍA Y MODALES ---
const generarCodigoAuditoria = (index, prefijo) => {
    const correlativo = String(index + 1).padStart(4, '0');
    return `${prefijo}-${correlativo}-26`;
};

window.cerrarModal = () => document.getElementById('modalGestion').classList.add('hidden');

const abrirModal = (titulo, contenido) => {
    document.getElementById('modalTitle').innerText = titulo;
    document.getElementById('modalBody').innerHTML = contenido;
    document.getElementById('modalGestion').classList.remove('hidden');
};

// --- 3. DINÁMICA DE TABLAS Y MÓDULOS ---
let moduloCount = 0;

// CORRECCIÓN: Ahora acepta un objeto 'f' para autocompletar los campos
function generarFilaHTML(f = { h: '', o: '', c: '', a: '' }) {
    return `
        <tr>
            <td class="border p-1"><input type="text" class="w-full p-1 text-center h_row" value="${f.h || ''}"></td>
            <td class="border p-1"><textarea class="w-full p-1 obj_row" rows="2">${f.o || ''}</textarea></td>
            <td class="border p-1"><textarea class="w-full p-1 con_row" rows="2">${f.c || ''}</textarea></td>
            <td class="border p-1"><textarea class="w-full p-1 act_row" rows="2">${f.a || ''}</textarea></td>
        </tr>`;
}

function crearTablaContenido(titulo, idTabla, datosFilas = null) {
    let filasHTML = "";
    // Si tenemos datos, generamos las filas con esa info; si no, una fila vacía
    if (datosFilas && datosFilas.length > 0) {
        filasHTML = datosFilas.map(f => generarFilaHTML(f)).join('');
    } else {
        filasHTML = generarFilaHTML(); 
    }

    return `
        <div class="border rounded-lg overflow-hidden border-slate-200 bg-white">
            <div class="bg-slate-50 p-2 font-bold text-xs border-b text-slate-600">${titulo}</div>
            <table class="w-full text-[11px]" id="${idTabla}">
                <thead class="bg-slate-100 text-slate-700 font-bold border-b">
                    <tr>
                        <th class="border-r p-2 w-16">Horas</th>
                        <th class="border-r p-2">Objetivos Específicos</th>
                        <th class="border-r p-2">Conocimientos</th>
                        <th class="border p-2">Actividades</th>
                    </tr>
                </thead>
                <tbody class="divide-y">${filasHTML}</tbody>
            </table>
        </div>`;
}

window.agregarFilaContenido = (idTabla) => {
    const tbody = document.querySelector(`#${idTabla} tbody`);
    const tr = document.createElement('tr');
    tr.innerHTML = generarFilaHTML();
    tbody.appendChild(tr);
};

// CORRECCIÓN: Ahora acepta 'datosMod' para reconstruir el módulo guardado
window.agregarModuloPrograma = (datosMod = null) => {
    moduloCount++;
    const contenedor = document.getElementById('contenedor_dinamico');
    const idTabla = `tabla_modulo_${moduloCount}`;
    
    // Si hay datos previos, los usamos; si no, valores por defecto
    const nombreMod = datosMod ? datosMod.modulo : `Nombre del Módulo ${moduloCount}`;
    const contenidoMod = datosMod ? datosMod.contenido : null;

    const divModulo = document.createElement('div');
    divModulo.className = "bg-slate-50 border-2 border-indigo-100 rounded-xl p-4 mb-6 shadow-sm modulo-contenedor";
    divModulo.innerHTML = `
        <div class="flex justify-between items-center mb-3">
            <input type="text" value="${nombreMod}" class="nombre-modulo font-bold text-indigo-700 border-b-2 border-indigo-200 outline-none w-2/3 bg-transparent">
            <button onclick="this.closest('.modulo-contenedor').remove()" class="text-red-500 text-xs font-bold hover:underline">Eliminar Módulo</button>
        </div>
        ${crearTablaContenido(`Estructura del Módulo`, idTabla, contenidoMod)}
        <div class="mt-2 text-right">
            <button onclick="agregarFilaContenido('${idTabla}')" class="text-[10px] bg-indigo-600 text-white px-3 py-1 rounded shadow-sm font-bold">
                + Agregar Fila a este Módulo
            </button>
        </div>`;
    contenedor.appendChild(divModulo);
};

window.renderizarFormularioTipo = (datosGuardados = null) => {
    const tipo = document.getElementById('tipo_servicio').value;
    const contenedor = document.getElementById('contenedor_dinamico');
    const areaBotones = document.getElementById('area_botones_extra');
    
    contenedor.innerHTML = '';
    areaBotones.innerHTML = '';
    moduloCount = 0;

    if (tipo === 'CURSO' || tipo === 'ASISTENCIA') {
        // Si hay datos, extraemos el contenido del primer bloque
        const contenidoPrevio = (datosGuardados && datosGuardados[0]) ? datosGuardados[0].contenido : null;
        contenedor.innerHTML = crearTablaContenido("Tabla de Contenido", "tabla_unica", contenidoPrevio);
        areaBotones.innerHTML = `<button onclick="agregarFilaContenido('tabla_unica')" class="text-sm bg-slate-800 text-white px-3 py-1 rounded">+ Agregar Fila</button>`;
    } else if (tipo === 'PROGRAMA') {
        areaBotones.innerHTML = `<button onclick="agregarModuloPrograma()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold"> + AGREGAR NUEVO MÓDULO </button>`;
        
        // Si hay datos, recorremos cada módulo guardado
        if (datosGuardados && datosGuardados.length > 0) {
            datosGuardados.forEach(mod => agregarModuloPrograma(mod));
        } else {
            agregarModuloPrograma(); // Uno vacío por defecto
        }
    }
};

// --- 4. ACCIÓN 1: DISEÑO Y GUARDADO ---
window.accionDisenoCurricular = async (id, codigo) => {
    const docRef = doc(db, "cotizaciones", id, "gestiones", "diseno_curricular");
    const docSnap = await getDoc(docRef);
    const prev = docSnap.exists() ? docSnap.data() : {};

    const html = `
        <div class="space-y-6">
            <div class="flex justify-end">
                <button onclick="verRequerimientoCompleto('${id}')" class="text-[10px] font-bold text-blue-600 hover:underline">
                    📄 VER REQUERIMIENTO ORIGINAL
                </button>
            </div>
            <div class="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-100">
                <span class="text-lg font-black text-blue-700">${codigo}</span>
                <select id="tipo_servicio" onchange="renderizarFormularioTipo()" class="p-2 border rounded font-bold bg-white">
                    <option value="">Tipo de Servicio...</option>
                    <option value="CURSO" ${prev.tipo === 'CURSO' ? 'selected' : ''}>CURSO</option>
                    <option value="PROGRAMA" ${prev.tipo === 'PROGRAMA' ? 'selected' : ''}>PROGRAMA</option>
                    <option value="ASISTENCIA" ${prev.tipo === 'ASISTENCIA' ? 'selected' : ''}>ASISTENCIA TÉCNICA</option>
                </select>
            </div>
            <input type="text" id="nombre_diseno" placeholder="Nombre Comercial del Servicio" class="w-full p-2 border rounded font-bold" value="${prev.nombre || ''}">
            <textarea id="obj_general" placeholder="Objetivo General" class="w-full p-2 border rounded" rows="2">${prev.objetivo_general || ''}</textarea>
            <div id="contenedor_dinamico" class="space-y-4"></div>
            <div id="area_botones_extra" class="flex justify-center"></div>
            <div class="flex gap-3 pt-4 border-t">
                <button onclick="guardarDisenoCurricular('${id}')" class="flex-1 bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg">GUARDAR DISEÑO</button>
                <button onclick="cerrarModal()" class="px-6 py-3 border rounded-xl hover:bg-gray-50">Regresar a la Lista</button>
            </div>
        </div>`;
    
    abrirModal("1. DISEÑO CURRICULAR Y CONTENIDO", html);
    
    // CORRECCIÓN: Pasar la estructura guardada para que no cargue vacío
    if(prev.tipo) {
        renderizarFormularioTipo(prev.estructura);
    }
};

window.guardarDisenoCurricular = async (id) => {
    const tipo = document.getElementById('tipo_servicio').value;
    const nombre = document.getElementById('nombre_diseno').value;
    const objetivo = document.getElementById('obj_general').value;

    if (!tipo) return alert("Por favor, selecciona un Tipo de Servicio");

    const estructura = [];
    const modulos = document.querySelectorAll('.modulo-contenedor');

    // Lógica para extraer datos de las tablas (CURSO o PROGRAMA)
    if (modulos.length > 0) {
        modulos.forEach(mod => {
            const filas = [];
            const tabla = mod.querySelector('table');
            tabla.querySelectorAll('tbody tr').forEach(tr => {
                filas.push({
                    h: tr.querySelector('.h_row').value,
                    o: tr.querySelector('.obj_row').value,
                    c: tr.querySelector('.con_row').value,
                    a: tr.querySelector('.act_row').value
                });
            });
            estructura.push({
                modulo: mod.querySelector('.nombre-modulo')?.value || "Módulo Único",
                contenido: filas
            });
        });
    } else {
        const filas = [];
        const tablaUnica = document.getElementById('tabla_unica');
        if (tablaUnica) {
            tablaUnica.querySelectorAll('tbody tr').forEach(tr => {
                filas.push({
                    h: tr.querySelector('.h_row').value,
                    o: tr.querySelector('.obj_row').value,
                    c: tr.querySelector('.con_row').value,
                    a: tr.querySelector('.act_row').value
                });
            });
            estructura.push({ modulo: "General", contenido: filas });
        }
    }

    try {
        // SOLUCIÓN AL ERROR DE SEGMENTOS:
        // 1. Guardar detalle técnico (4 segmentos: coleccion/doc/subcoleccion/doc)
        const docRefDetalle = doc(db, "cotizaciones", id, "gestiones", "diseno_curricular");
        await setDoc(docRefDetalle, {
            tipo,
            nombre,
            objetivo_general: objetivo,
            estructura,
            ultima_modificacion: new Date()
        });

        // 2. Actualizar estado y nombre en el principal para persistencia
        const docRefPrincipal = doc(db, "cotizaciones", id);
        await updateDoc(docRefPrincipal, {
            estado: "Curriculo_Listo",
            nombre_servicio_diseno: nombre
        });

        alert("¡Estructura curricular guardada con éxito!");
        cerrarModal();
    } catch (e) {
        console.error("Error detallado al guardar:", e);
        alert("Error al guardar los datos: " + e.message);
    }
};

// --- 5. RENDER TABLA PRINCIPAL ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('loginSection').classList.add('hidden');
        const adminTable = document.getElementById('adminTable');
        adminTable.classList.remove('hidden');
        
        // Inyectar barra de navegación dinámica si no existe
        if (!document.getElementById('navButtonsAdmin')) {
            const navDiv = document.createElement('div');
            navDiv.id = 'navButtonsAdmin';
            navDiv.className = "flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100";
            navDiv.innerHTML = `
                <div class="flex gap-3">
                    <button onclick="irAFormularioCliente()" class="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-slate-900 transition flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        VISTA CLIENTE (FORMULARIO)
                    </button>
                    <button onclick="exportarListaCompletaExcel()" class="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-emerald-700 transition flex items-center gap-2">
                        📥 EXPORTAR TODO (EXCEL)
                    </button>
                </div>
                <button onclick="logoutAdmin()" class="text-red-500 font-bold text-xs hover:underline">CERRAR SESIÓN</button>
            `;
            adminTable.prepend(navDiv);

            // Inyectar contenedor de KPIs
            const kpiDiv = document.createElement('div');
            kpiDiv.id = 'kpiContainer';
            kpiDiv.className = "grid grid-cols-1 md:grid-cols-3 gap-4 mb-6";
            // Insertar después de la navegación
            navDiv.after(kpiDiv);
        }

        renderCotizaciones();
    } else {
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('adminTable').classList.add('hidden');
    }
});

function renderCotizaciones() {
    const q = query(collection(db, "cotizaciones"), orderBy("fecha_creacion", "desc"));
    onSnapshot(q, (snapshot) => {
        const container = document.getElementById('listaCotizaciones');
        const kpiContainer = document.getElementById('kpiContainer');
        container.innerHTML = '';

        // --- CÁLCULO DE KPIs ---
        const stats = {
            total: snapshot.size,
            aceptadas: 0,
            tiempos: [],
            empresas: {}
        };

        snapshot.docs.forEach((docSnap, index) => {
            const data = docSnap.data();
            
            // 1. Para Tasa de Conversión
            if (data.estado === 'Aceptada_Cliente') stats.aceptadas++;

            // 2. Para Tiempo de Respuesta (Días entre creación y decisión)
            if (data.fecha_decision && data.fecha_creacion) {
                const inicio = data.fecha_creacion.toMillis();
                const fin = data.fecha_decision.toMillis ? data.fecha_decision.toMillis() : data.fecha_decision.getTime();
                const dias = (fin - inicio) / (1000 * 60 * 60 * 24);
                stats.tiempos.push(dias);
            }

            // 3. Para Ranking de Empresas
            const emp = data.razon_social || 'Desconocida';
            stats.empresas[emp] = (stats.empresas[emp] || 0) + 1;

            const id = docSnap.id;
            const codREQ = generarCodigoAuditoria(snapshot.size - 1 - index, "REQ");
            
            // Estandarizamos el estado para las validaciones
            const estado = data.estado || "Pendiente";

            // --- LÓGICA DE HABILITACIÓN DE BOTONES ---
            
            // Acción 2 (HC): Se habilita si el currículo está listo o en pasos posteriores
            const canCotizar = (estado === "Curriculo_Listo" || estado === "CURRICULO LISTO" || estado === "HC_Lista" || estado === "PTE_Listo" || estado === "PTE LISTO");
            
            // Acción 3 (PTE): Se habilita si la HC está lista o en pasos posteriores
            const canPTE = (estado === "HC_Lista" || estado === "PTE_Listo" || estado === "PTE LISTO");
            
            // Acción 4 (Aprobación): Solo si la PTE ya fue guardada
            const canAccion4 = (estado === "PTE_Listo" || estado === "PTE LISTO");

            // Acción 5 (Aprobación Cliente): Solo si la aprobación interna fue aceptada
            const canAccion5 = (estado === "PTE_Aceptada" || estado === "Aceptada_Cliente" || estado === "Rechazada_Cliente");

            container.innerHTML += `
                <tr class="hover:bg-gray-50 border-b">
                    <td class="p-4">
                        <div class="font-bold text-blue-700 text-sm">${codREQ}</div>
                        <div class="font-medium text-gray-800">${data.razon_social}</div>
                        <div class="text-xs text-gray-400">RUC: ${data.ruc}</div>
                    </td>
                    <td class="p-4">
                        <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase 
                            ${estado === 'Pendiente' ? 'bg-orange-100 text-orange-600' : 
                              estado === 'Aceptada_Cliente' ? 'bg-emerald-600 text-white' :
                              estado === 'Rechazada_Cliente' ? 'bg-rose-600 text-white' :
                              'bg-green-100 text-green-600'}">
                            ${estado.replace('_', ' ')}
                        </span>
                    </td>
                    <td class="p-4 text-sm font-medium text-gray-600">${data.contacto?.nombre || 'N/A'}</td>
                    <td class="p-4">
                        <div class="flex flex-col gap-1">
                            
                            <button onclick="verRequerimientoCompleto('${id}')" 
                                class="text-left text-[11px] font-bold text-emerald-600 hover:underline mb-1">
                                0. VER REQUERIMIENTO COMPLETO
                            </button>                         
                        
                            <button onclick="accionDisenoCurricular('${id}', '${codREQ}')" 
                                class="text-left text-[11px] font-bold text-blue-600 hover:underline">
                                1. DISEÑO CURRICULAR
                            </button>

                            <button onclick="accionCotizarHC('${id}', '${codREQ}')" 
                                class="text-left text-[11px] font-bold ${canCotizar ? 'text-purple-600 hover:underline' : 'text-gray-300 pointer-events-none'}">
                                2. COTIZAR HC
                            </button>

                            <button onclick="accionElaborarPTE('${id}', '${codREQ}')" 
                                class="text-left text-[11px] font-bold ${canPTE ? 'text-indigo-600 hover:underline' : 'text-gray-300 pointer-events-none'}">
                                3. ELABORAR PTE
                            </button>

                            <button onclick="accionAprobacionCliente('${id}', '${codREQ}')" 
                                class="text-left text-[11px] font-bold ${canAccion4 ? 'text-rose-600 hover:underline' : 'text-gray-300 pointer-events-none'}">
                                4. GESTIONAR APROBACIÓN
                            </button>

                            <button onclick="accionAprobacionFinalCliente('${id}', '${codREQ}')" 
                                class="text-left text-[11px] font-bold ${canAccion5 ? 'text-emerald-600 hover:underline' : 'text-gray-300 pointer-events-none'}">
                                5. APROBACIÓN CLIENTE
                            </button>

                        </div>
                    </td>
                </tr>`;
        });

        // --- RENDERIZADO DE KPIs ---
        if (kpiContainer) {
            const conversion = stats.total > 0 ? ((stats.aceptadas / stats.total) * 100).toFixed(1) : 0;
            const tiempoPromedio = stats.tiempos.length > 0 
                ? (stats.tiempos.reduce((a, b) => a + b, 0) / stats.tiempos.length).toFixed(1) 
                : "---";
            
            const ranking = Object.entries(stats.empresas)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);

            kpiContainer.innerHTML = `
                <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <p class="text-[10px] font-bold text-slate-400 uppercase">Tasa de Conversión</p>
                    <p class="text-2xl font-black text-emerald-600">${conversion}% <span class="text-[10px] text-slate-400 font-medium">Cierres</span></p>
                </div>
                <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <p class="text-[10px] font-bold text-slate-400 uppercase">Tiempo de Respuesta</p>
                    <p class="text-2xl font-black text-blue-600">${tiempoPromedio} <span class="text-[10px] text-slate-400 font-medium">Días promedio</span></p>
                </div>
                <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <p class="text-[10px] font-bold text-slate-400 uppercase">Ranking Empresas (Top 3)</p>
                    <div class="text-[11px] font-bold text-slate-700 truncate">
                        ${ranking.map(([name, count], i) => `${i+1}. ${name} (${count})`).join('<br>')}
                    </div>
                </div>
            `;
        }
    });
}
window.accionCotizarHC = async (id, codigo) => {
    const codHC = codigo.replace('REQ', 'HC');
    
    // 1. RECUPERACIÓN DE DATOS MULTIFUENTE
    const docPrincipal = await getDoc(doc(db, "cotizaciones", id));
    const reqData = docPrincipal.data(); // Datos del Requerimiento original
    
    const docDiseno = await getDoc(doc(db, "cotizaciones", id, "gestiones", "diseno_curricular"));
    const disenoData = docDiseno.exists() ? docDiseno.data() : {}; // Datos del Diseño
    
    const horasReales = await obtenerTotalHorasDiseno(id); // Suma real de horas del diseño

    const docHC = await getDoc(doc(db, "cotizaciones", id, "gestiones", "hoja_costos"));
    const prev = docHC.exists() ? docHC.data() : { ingresos: {}, egresos: [], metadata: {} };

    // Valores por defecto: Se definen en la HC, no se jalan del requerimiento del cliente
    const modalidadDefault = prev.metadata?.modalidad || 'Presencial';
    const participantesDefault = prev.ingresos?.cantidad || 1;
    const locacionDefault = prev.metadata?.locacion || 'I';

    const html = `
        <div class="space-y-8">
            <div class="flex justify-end">
                <button onclick="verRequerimientoCompleto('${id}')" class="text-[10px] font-bold text-blue-600 hover:underline">
                    📄 VER REQUERIMIENTO ORIGINAL
                </button>
            </div>
            <div class="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 class="text-indigo-800 font-black text-sm uppercase mb-4 flex items-center gap-2">
                    <span class="w-2 h-5 bg-indigo-600 rounded-full"></span> 1. Información General del Servicio
                </h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-5 gap-x-4 text-[11px]">
                    <div class="col-span-1 md:col-span-2">
                        <label class="font-bold text-slate-500 uppercase block mb-1">Nombre del Servicio</label>
                        <div class="p-2 bg-white border rounded-lg font-bold text-indigo-700 shadow-sm">
                            ${disenoData.nombre || 'No definido en Diseño Curricular'}
                        </div>
                    </div>
                    <div>
                        <label class="font-bold text-slate-500 uppercase block mb-1">Cliente</label>
                        <div class="p-2 bg-white border rounded-lg font-bold shadow-sm">
                            ${reqData.razon_social || 'N/A'}
                        </div>
                    </div>
                    
                    <div>
                        <label class="font-bold text-slate-500 uppercase block mb-1">Área / Centro de Costos</label>
                        <div class="p-2 bg-slate-100 border rounded-lg font-bold text-slate-500 italic">CTTC SENATI</div>
                    </div>
                    <div>
                        <label class="font-bold text-slate-500 uppercase block mb-1">Responsable</label>
                        <input type="text" id="hc_responsable" class="w-full p-2 border rounded-lg font-medium" placeholder="Nombre del responsable" value="${prev.metadata?.responsable || ''}">
                    </div>
                    <div>
                        <label class="font-bold text-slate-500 uppercase block mb-1">Duración del Curso</label>
                        <div class="p-2 bg-blue-50 border border-blue-200 rounded-lg font-black text-blue-700">${horasReales} HORAS</div>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="font-bold text-slate-500 uppercase block mb-1">Locación</label>
                            <select id="hc_locacion" class="w-full p-2 border rounded-lg font-bold bg-white">
                                <option value="I" ${locacionDefault === 'I' ? 'selected' : ''}>(I) NTERNA</option>
                                <option value="E" ${locacionDefault === 'E' ? 'selected' : ''}>(E) XTERNA</option>
                            </select>
                        </div>
                        <div>
                            <label class="font-bold text-slate-500 uppercase block mb-1">Modalidad</label>
                            <select id="hc_modalidad" class="w-full p-2 border rounded-lg font-bold bg-white">
                                <option value="Presencial" ${modalidadDefault === 'Presencial' ? 'selected' : ''}>PRESENCIAL</option>
                                <option value="Online" ${modalidadDefault === 'Online' ? 'selected' : ''}>ONLINE</option>
                                <option value="Semipresencial" ${modalidadDefault === 'Semipresencial' ? 'selected' : ''}>SEMIPRESENCIAL</option>
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="font-bold text-slate-500 uppercase block mb-1">Empresas</label>
                            <input type="number" id="hc_nro_empresas" class="w-full p-2 border rounded-lg font-bold" value="${prev.metadata?.nro_empresas || 1}">
                        </div>
                        <div>
                            <label class="font-bold text-slate-500 uppercase block mb-1">Tipo Evento</label>
                            <select id="hc_tipo_evento" class="w-full p-2 border rounded-lg font-bold bg-white">
                                <option value="Taller" ${prev.metadata?.tipo_evento === 'Taller' ? 'selected' : ''}>TALLER</option>
                                <option value="Aula" ${prev.metadata?.tipo_evento === 'Aula' ? 'selected' : ''}>AULA</option>
                                <option value="Ambas" ${prev.metadata?.tipo_evento === 'Ambas' ? 'selected' : ''}>AMBAS</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="font-bold text-slate-500 uppercase block mb-1">Nro. de Participantes</label>
                        <div id="display_participantes_seccion1" class="p-2 bg-indigo-50 border border-indigo-100 rounded-lg font-black text-indigo-700 text-center text-lg">
                            ${participantesDefault}
                        </div>
                    </div>
                </div>

                <hr class="my-6 border-slate-200">

            </div>

            <div class="p-1">
                <h3 class="text-blue-800 font-black text-sm uppercase mb-3">2. Proyección de Ingresos (Ventas)</h3>
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-blue-100 items-end">
                    <div>
                        <label class="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Precio Base p/ Alumno</label>
                        <input type="number" id="ingreso_unitario" oninput="calcularTotalesHC(${horasReales})" class="w-full p-2 border rounded-lg font-bold" value="${prev.ingresos?.unitario || 0}">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Cantidad de Alumnos</label>
                        <input type="number" id="ingreso_cantidad" oninput="calcularTotalesHC()" class="w-full p-2 border rounded-lg font-bold" value="${participantesDefault}">
                    </div>
                    <div class="flex items-center gap-2 pb-2">
                        <input type="checkbox" id="activar_igv" onchange="calcularTotalesHC(${horasReales})" class="w-5 h-5 accent-blue-600" ${prev.ingresos?.conIGV ? 'checked' : ''}>
                        <label for="activar_igv" class="text-xs font-black text-slate-700 cursor-pointer">CARGAR IGV (18%)</label>
                    </div>
                    <div class="bg-blue-50 p-2 rounded-lg text-right border border-blue-200">
                        <label class="text-[9px] font-bold text-blue-600 block">TOTAL FACTURADO</label>
                        <span id="total_ingresos_final" class="text-xl font-black text-blue-900 font-mono">S/ 0.00</span>
                    </div>
                </div>
                
                <div class="mt-3 flex justify-end gap-6 px-4">
                    <div class="text-right">
                        <span class="text-[10px] text-slate-400 font-bold block uppercase tracking-tighter">Venta Neta (Subtotal)</span>
                        <span id="total_ingresos_sub" class="font-bold text-slate-600">S/ 0.00</span>
                    </div>
                    <div class="text-right">
                        <span class="text-[10px] text-slate-400 font-bold block uppercase tracking-tighter">Impuesto IGV</span>
                        <span id="monto_igv_calc" class="font-bold text-slate-600">S/ 0.00</span>
                    </div>
                </div>

                <div class="bg-blue-50 p-2 rounded-xl border border-blue-100">
                    <label class="block text-[10px] font-bold text-blue-600 mb-1 tracking-tighter text-center uppercase italic">
                        Ingreso Real p/ Hora/Alumno
                    </label>
                    <div id="indicador_costo_hora" class="text-2xl font-black text-blue-800 text-center">S/ 0.00</div>
                    <p class="text-[9px] text-blue-400 text-center font-bold mt-1 uppercase">
                        Facturado / (${horasReales} hrs × Participantes)
                    </p>
                </div>
            </div>

            <div>
                <h3 class="text-red-800 font-black text-sm uppercase mb-3">3. Esquema de Costos (Egresos)</h3>
                <div class="border rounded-xl overflow-hidden shadow-sm">
                    <table class="w-full text-left text-xs" id="tabla_egresos">
                        <thead class="bg-slate-800 text-white uppercase font-bold">
                            <tr>
                                <th class="p-3">Descripción del Gasto</th>
                                <th class="p-3 w-20 text-center">Cant.</th>
                                <th class="p-3 w-32 text-center">Costo Unit.</th>
                                <th class="p-3 w-32 text-center">Total</th>
                            </tr>
                        </thead>
                        <tbody id="body_egresos" class="divide-y"></tbody>
                    </table>
                    <div class="p-3 bg-slate-50 flex justify-between items-center border-t">
                        <button onclick="agregarFilaEgreso()" class="text-indigo-600 font-bold hover:underline">+ Agregar ítem de costo</button>
                        <div class="text-right font-black text-slate-700">
                            TOTAL EGRESOS: <span id="total_egresos">S/ 0.00</span>
                        </div>
                    </div>
                </div>
            </div>


                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 mb-1 tracking-tighter text-center uppercase">Utilidad Bruta (S/)</label>
                        <div id="hc_utilidad_soles" class="text-2xl font-black text-slate-800 text-center">S/ 0.00</div>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 mb-1 tracking-tighter text-center uppercase">Margen de Rentabilidad</label>
                        <div id="hc_margen_perc" class="text-2xl font-black text-green-600 text-center">0%</div>
                    </div>
                    <div class="flex items-center justify-end">
                        <button onclick="exportarExcelHC('${codHC}')" class="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-emerald-700 transition shadow-md">
                            EXPORTAR EXCEL
                        </button>
                    </div>
                </div>

            <div class="flex gap-4 pt-6 border-t">
                <button onclick="guardarHC('${id}')" class="flex-1 bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-indigo-800 transition uppercase tracking-wider">
                    Guardar Hoja de Costos
                </button>
                <button onclick="cerrarModal()" class="px-8 py-4 border-2 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition">
                    Regresar a la Lista
                </button>
            </div>
        </div>
    `;
    abrirModal("ESTRUCTURA TÉCNICO-ECONÓMICA (HC)", html);
    renderizarFilasEgresos(prev.egresos);
    calcularTotalesHC(horasReales);
};

function generarFilaHC(data = { desc: "", cant: 1, precio: 0 }) {
    return `
        <tr>
            <td class="p-2"><input type="text" class="w-full p-2 border-none bg-transparent focus:ring-0 desc_hc" placeholder="Ej: Honorarios de Instructor" value="${data.desc}"></td>
            <td class="p-2"><input type="number" oninput="calcularTotalesHC()" class="w-full p-2 text-center border-none bg-transparent focus:ring-0 cant_hc" value="${data.cant}"></td>
            <td class="p-2"><input type="number" oninput="calcularTotalesHC()" class="w-full p-2 text-center border-none bg-transparent focus:ring-0 unit_hc" value="${data.precio}"></td>
            <td class="p-2 text-right font-medium pr-4 total_row_hc">S/ 0.00</td>
        </tr>
    `;
}

window.agregarFilaHC = () => {
    const body = document.getElementById('body_hc');
    body.insertAdjacentHTML('beforeend', generarFilaHC());
};

// Recibe horasTotales sumadas previamente desde el diseño curricular
// --- LÓGICA DE CÁLCULO UNIFICADA Y AUTÓNOMA ---
window.calcularTotalesHC = () => {
    // 1. Extraer horas reales directamente del párrafo del modal (ej: "45 hrs")
    const pTexto = document.querySelector('p.text-blue-400')?.innerText || "";
    const horasMatch = pTexto.match(/(\d+)/);
    const horasReales = horasMatch ? parseFloat(horasMatch[0]) : 0;

    // 2. Captura de Variables de Ingreso
    const iCant = parseFloat(document.getElementById('ingreso_cantidad')?.value) || 0;
    const iUnit = parseFloat(document.getElementById('ingreso_unitario')?.value) || 0;
    const conIGV = document.getElementById('activar_igv')?.checked || false;

    // 3. Cálculos de Venta (A)
    const subtotalVenta = iCant * iUnit;
    const montoIGV = conIGV ? (subtotalVenta * 0.18) : 0;
    const ventaFinal = subtotalVenta + montoIGV; // TOTAL FACTURADO

    // 4. CÁLCULO DEL INDICADOR
    const denominador = horasReales * iCant;
    const indicadorFinal = denominador > 0 ? (ventaFinal / denominador) : 0;

    // 5. RENDERIZADO DE SECCIÓN 2
    document.getElementById('total_ingresos_sub').innerText = `S/ ${subtotalVenta.toFixed(2)}`;
    document.getElementById('monto_igv_calc').innerText = `S/ ${montoIGV.toFixed(2)}`;
    document.getElementById('total_ingresos_final').innerText = `S/ ${ventaFinal.toFixed(2)}`;
    
    const elemIndicador = document.getElementById('indicador_costo_hora');
    if (elemIndicador) {
        elemIndicador.innerText = `S/ ${indicadorFinal.toFixed(2)}`;
    }

    // --- INTEGRACIÓN DE LÓGICA DE VALORES POR DEFECTO ---
    let subtotalEgresos = 0;
    let costoHoraCapacitacion = 0;
    const filas = document.querySelectorAll('#body_egresos tr');

    // Paso A: Obtener el precio base de capacitación para calcular beneficios
    filas.forEach(tr => {
        const desc = tr.querySelector('.desc_e')?.value || "";
        if (desc.includes("Horas de Capacitación")) {
            costoHoraCapacitacion = parseFloat(tr.querySelector('.unit_e')?.value) || 0;
        }
    });

    // Paso B: Aplicar reglas automáticas y sumar
    filas.forEach(tr => {
        const descInput = tr.querySelector('.desc_e');
        const unitInput = tr.querySelector('.unit_e');
        const cantInput = tr.querySelector('.cant_e');
        const desc = descInput?.value || "";

        // Regla: Beneficios (30% de la hora de capacitación)
        if (desc.includes("Beneficios sociales")) {
            unitInput.value = (costoHoraCapacitacion * 0.30).toFixed(2);
        } 
        // Regla: SCTR Docente (150)
        else if (desc.includes("SCTR") || desc.includes("Seguro (SCTR)")) {
            if (parseFloat(unitInput.value) === 0 || !unitInput.value) {
                unitInput.value = 150;
            }
        }
        // Regla: Supervisión e Imprevistos (5% del Subtotal Venta A)
        else if (desc.includes("Imprevistos") || desc.includes("Supervisión Directa")) {
            cantInput.value = 1;
            unitInput.value = (subtotalVenta * 0.05).toFixed(2);
        }
        // Regla: Plataforma Digital (15)
        else if (desc.includes("Plataforma digital")) {
            if (parseFloat(unitInput.value) === 0 || !unitInput.value) {
                unitInput.value = 15;
            }
        }
        // Regla: Equipos y Mobiliario (5)
        else if (desc.includes("Equipos") || desc.includes("Mobiliario")) {
            if (parseFloat(unitInput.value) === 0 || !unitInput.value) {
                unitInput.value = 5;
            }
        }
        // Regla: Seguro Alumnos (15)
        else if (desc.includes("Seguro de vida alumnos")) {
            if (parseFloat(unitInput.value) === 0 || !unitInput.value) {
                unitInput.value = 15;
            }
        }
        // Regla: Certificado (20)
        else if (desc.includes("Certificado Curso")) {
            if (parseFloat(unitInput.value) === 0 || !unitInput.value) {
                unitInput.value = 20;
            }
        }
        // Regla: Servicios Luz/Agua (1.2)
        else if (desc.includes("Servicios-(")) {
            if (parseFloat(unitInput.value) === 0 || !unitInput.value) {
                unitInput.value = 1.2;
            }
        }

        const c = parseFloat(cantInput?.value) || 0;
        const u = parseFloat(unitInput?.value) || 0;
        const sub = c * u;
        subtotalEgresos += sub;
        tr.querySelector('.subtotal_e').innerText = `S/ ${sub.toFixed(2)}`;
        
    });

    // 6.1 Cálculo de Gastos Administrativos (15%)
    const gastosAdm = subtotalEgresos * 0.15;
    const totalEgresosFinal = subtotalEgresos + gastosAdm;

    if(document.getElementById('total_egresos')) {
        document.getElementById('total_egresos').innerHTML = `
            <div class="text-[10px] text-slate-400 font-normal">Subtotal: S/ ${subtotalEgresos.toFixed(2)}</div>
            <div class="text-[10px] text-slate-400 font-normal">Gastos Adm. (15%): S/ ${gastosAdm.toFixed(2)}</div>
            <div class="text-indigo-700 font-black uppercase">Total Egresos (B): S/ ${totalEgresosFinal.toFixed(2)}</div>
        `;
    }

    // 7. RESUMEN EJECUTIVO (Utilidad A - B)
    const utilidad = subtotalVenta - totalEgresosFinal;
    const margen = subtotalVenta > 0 ? (utilidad / subtotalVenta) * 100 : 0;

    document.getElementById('hc_utilidad_soles').innerText = `S/ ${utilidad.toFixed(2)}`;
    document.getElementById('hc_margen_perc').innerText = `${margen.toFixed(1)}%`;
    
    const badge = document.getElementById('hc_margen_perc');
    if (badge) {
        badge.className = margen >= 30 
            ? "text-2xl font-black text-green-600 text-center" 
            : "text-2xl font-black text-amber-600 text-center";
    }

    const nroPartSeccion1 = document.getElementById('display_participantes_seccion1');
    if (nroPartSeccion1) nroPartSeccion1.innerText = iCant;
};


window.guardarHC = async (id) => {
    try {
        // 1. CAPTURA DE METADATA (SECCIÓN 1)
        // Datos informativos y administrativos solicitados
        const metadata = {
            responsable: document.getElementById('hc_responsable').value,
            locacion: document.getElementById('hc_locacion').value,
            modalidad: document.getElementById('hc_modalidad').value,
            tipo_evento: document.getElementById('hc_tipo_evento').value,
            nro_empresas: parseInt(document.getElementById('hc_nro_empresas').value) || 1,
            area: "CTTC", // Por defecto CTTC
            centro_costos: "CTTC" // Por defecto CTTC
        };

        // 2. LÓGICA DE INGRESOS (SE mantiene igual)
        const ingresos = {
            cantidad: parseFloat(document.getElementById('ingreso_cantidad').value) || 0,
            unitario: parseFloat(document.getElementById('ingreso_unitario').value) || 0,
            conIGV: document.getElementById('activar_igv').checked
        };

        // 3. LÓGICA DE EGRESOS (Se mantiene igual)
        const egresos = [];
        document.querySelectorAll('#body_egresos tr').forEach(tr => {
            egresos.push({
                desc: tr.querySelector('.desc_e').value,
                cant: parseFloat(tr.querySelector('.cant_e').value) || 0,
                unit: parseFloat(tr.querySelector('.unit_e').value) || 0
            });
        });

        // 4. PERSISTENCIA EN FIRESTORE
        const docRef = doc(db, "cotizaciones", id, "gestiones", "hoja_costos");
        await setDoc(docRef, { 
            metadata, // Integramos el nuevo objeto de datos generales
            ingresos, 
            egresos, 
            indicador_hora_alumno: document.getElementById('indicador_costo_hora').innerText,
            fecha: new Date() 
        });
        
        // 5. SINCRONIZACIÓN CON DOCUMENTO PRINCIPAL (Para correos y reportes)
        const totalFacturado = document.getElementById('total_ingresos_final').innerText;
        const utilidad = document.getElementById('hc_utilidad_soles').innerText;
        const margen = document.getElementById('hc_margen_perc').innerText;
        const indicador = document.getElementById('indicador_costo_hora').innerText;

        await updateDoc(doc(db, "cotizaciones", id), { 
            estado: "HC_Lista",
            total_facturado: totalFacturado,
            utilidad_bruta: utilidad,
            margen_rentabilidad: margen,
            ingreso_real_hora_alumno: indicador,
            modalidad_hc: metadata.modalidad,
            cantidad_alumnos_hc: ingresos.cantidad
        });
        
        alert("¡Hoja de Costos guardada con éxito!");
        cerrarModal();
    } catch (e) {
        alert("Error al guardar: " + e.message);
    }
};

window.exportarExcelHC = (codigo) => {
    // 1. CAPTURA DE DATOS - SECCIÓN 1 (GENERAL)
    const servicio = document.querySelector('.text-indigo-700')?.innerText || "N/A";
    const cliente = document.querySelectorAll('.bg-white.border.rounded-lg.font-bold')[1]?.innerText || "N/A";
    const responsable = document.getElementById('hc_responsable')?.value || "N/A";
    const duracion = document.querySelector('.text-blue-700.font-black')?.innerText || "0 HORAS";
    const locacion = document.getElementById('hc_locacion')?.options[document.getElementById('hc_locacion').selectedIndex].text || "N/A";
    const modalidad = document.getElementById('hc_modalidad')?.value || "N/A";

    // 2. CAPTURA DE DATOS - SECCIÓN 2 (INGRESOS)
    const precioAlumno = document.getElementById('ingreso_unitario')?.value || "0";
    const cantAlumnos = document.getElementById('ingreso_cantidad')?.value || "0";
    const ventaNeta = document.getElementById('total_ingresos_sub')?.innerText || "S/ 0.00";
    const igvVenta = document.getElementById('monto_igv_calc')?.innerText || "S/ 0.00";
    const totalFacturado = document.getElementById('total_ingresos_final')?.innerText || "S/ 0.00";
    const indicadorHora = document.getElementById('indicador_costo_hora')?.innerText || "S/ 0.00";

    // 3. CAPTURA DE DATOS - SECCIÓN 3 (EGRESOS Y RESUMEN)
    const tablaEgresos = document.getElementById('tabla_egresos');
    const subtotalEgresos = document.getElementById('hc_subtotal_egresos')?.innerText || "S/ 0.00";
    const gastosAdm = document.getElementById('hc_gastos_adm')?.innerText || "S/ 0.00";
    const totalCostosB = document.getElementById('total_egresos')?.innerText || "S/ 0.00";
    const utilidad = document.getElementById('hc_utilidad_soles')?.innerText || "S/ 0.00";
    const margen = document.getElementById('hc_margen_perc')?.innerText || "0%";

    // 4. CONSTRUCCIÓN DE LA TABLA TEMPORAL PARA EXCEL
    const tableTmp = document.createElement('table');
    let html = `
        <thead>
            <tr><th colspan="4" style="font-size: 16px; font-weight: bold;">HOJA DE COSTOS - ${codigo}</th></tr>
            <tr><th colspan="4" style="background-color: #1e40af; color: white;">1. INFORMACIÓN GENERAL DEL SERVICIO</th></tr>
            <tr><td><b>Servicio:</b></td><td colspan="3">${servicio}</td></tr>
            <tr><td><b>Cliente:</b></td><td colspan="3">${cliente}</td></tr>
            <tr><td><b>Responsable:</b></td><td>${responsable}</td><td><b>Duración:</b></td><td>${duracion}</td></tr>
            <tr><td><b>Locación:</b></td><td>${locacion}</td><td><b>Modalidad:</b></td><td>${modalidad}</td></tr>
            
            <tr><th colspan="4"></th></tr>
            <tr><th colspan="4" style="background-color: #1e40af; color: white;">2. PROYECCIÓN DE INGRESOS (VENTAS)</th></tr>
            <tr><td><b>Precio p/ Alumno:</b></td><td>S/ ${precioAlumno}</td><td><b>Cantidad Alumnos:</b></td><td>${cantAlumnos}</td></tr>
            <tr><td><b>Venta Neta (Subtotal):</b></td><td>${ventaNeta}</td><td><b>Impuesto IGV:</b></td><td>${igvVenta}</td></tr>
            <tr><td><b>TOTAL FACTURADO (A):</b></td><td style="font-weight: bold; color: #1e40af;">${totalFacturado}</td><td><b>Ingreso Real p/ Hora/Alumno:</b></td><td>${indicadorHora}</td></tr>

            <tr><th colspan="4"></th></tr>
            <tr><th colspan="4" style="background-color: #1e40af; color: white;">3. ESQUEMA DE COSTOS (EGRESOS)</th></tr>
            <tr style="font-weight: bold; background-color: #f1f5f9;">
                <td>Descripción</td><td>Cant.</td><td>Costo Unit.</td><td>Total</td>
            </tr>
    `;

    // Añadir filas de la tabla de egresos
    tablaEgresos.querySelectorAll('tbody tr').forEach(tr => {
        const desc = tr.querySelector('.desc_e')?.value || "";
        const cant = tr.querySelector('.cant_e')?.value || "0";
        const unit = tr.querySelector('.unit_e')?.value || "0";
        const sub = tr.querySelector('.subtotal_e')?.innerText || "S/ 0.00";
        html += `<tr><td>${desc}</td><td style="text-align:center;">${cant}</td><td style="text-align:right;">S/ ${unit}</td><td style="text-align:right;">${sub}</td></tr>`;
    });

    // Añadir totales de costos y Utilidad final
    html += `
            <tr style="border-top: 2px solid black;"><td colspan="3" style="text-align: right;"><b>Sub Total Costos:</b></td><td style="text-align: right;">${subtotalEgresos}</td></tr>
            <tr><td colspan="3" style="text-align: right;"><b>Gastos Administrativos (15%):</b></td><td style="text-align: right;">${gastosAdm}</td></tr>
            <tr style="background-color: #fef9c3; font-weight: bold;"><td colspan="3" style="text-align: right;">TOTAL COSTOS (B):</td><td style="text-align: right;">${totalCostosB}</td></tr>
            
            <tr><th colspan="4"></th></tr>
            <tr style="background-color: #1e293b; color: white; font-weight: bold;">
                <td colspan="3" style="text-align: right;">UTILIDAD FINAL (A - B):</td>
                <td style="text-align: right;">${utilidad}</td>
            </tr>
            <tr style="background-color: #1e293b; color: #4ade80; font-weight: bold;">
                <td colspan="3" style="text-align: right;">MARGEN DE RENTABILIDAD:</td>
                <td style="text-align: right;">${margen}</td>
            </tr>
        </thead>
    `;

    tableTmp.innerHTML = html;

    // 5. GENERAR EXCEL
    const wb = XLSX.utils.table_to_book(tableTmp, { sheet: "HC Detallada" });
    XLSX.writeFile(wb, `${codigo}_HC_COMPLETA_CTTC.xlsx`);
};
// Lista oficial de categorías solicitadas
const CATEGORIAS_EGRESOS = [
    "Horas de Capacitación","Elaboración de material didactico", "Beneficios sociales ( 30%)", "Plataforma digital", "Equipos","Mobiliario", "Seguro de vida alumnos", "Seguro  (SCTR)-docente", "Certificado Curso", "Certificado programa", "Imprevistos(5%)", "Servicios de Marketing", 
    "Supervisión Directa del Jefe", "Materiales (Tintas, tejidos)", "Tejidos textiles para taller", "Publicidad", "Movilidad local-Supervisión seguimiento Jefe Capacitación", "Movilidad local-Docente", "Pasajes Terrestres/Aéreos", "Viáticos (Alojamiento y Alimentación)", "Material Didáctico", "Servicios-(Luz, Agua, Tlf., Limpieza, Vigilancia, etc.)", "Servicios de Laboratorio"
];

window.renderizarFilasEgresos = (egresosPrevios = []) => {
    const body = document.getElementById('body_egresos');
    body.innerHTML = '';

    // Si no hay datos guardados, generamos las categorías por defecto
    if (!egresosPrevios || egresosPrevios.length === 0) {
        CATEGORIAS_EGRESOS.forEach(cat => {
            body.insertAdjacentHTML('beforeend', generarFilaEgresoHTML({ desc: cat, cant: 0, unit: 0 }));
        });
    } else {
        egresosPrevios.forEach(e => body.insertAdjacentHTML('beforeend', generarFilaEgresoHTML(e)));
    }
};

function generarFilaEgresoHTML(e = { desc: '', cant: 0, unit: 0 }) {
    return `
        <tr class="bg-white hover:bg-slate-50 transition border-b border-slate-100">
            <td class="p-2 border-r">
                <input type="text" class="w-full p-1 desc_e text-[11px] font-medium text-slate-700 bg-transparent focus:bg-white" value="${e.desc}">
            </td>
            <td class="p-2 border-r text-center">
                <input type="number" oninput="calcularTotalesHC()" class="w-full p-1 text-center cant_e font-mono" value="${e.cant}">
            </td>
            <td class="p-2 border-r text-center">
                <input type="number" oninput="calcularTotalesHC()" class="w-full p-1 text-center unit_e font-mono" value="${e.unit}">
            </td>
            <td class="p-3 font-bold text-slate-600 text-right subtotal_e bg-slate-50/50">S/ 0.00</td>
        </tr>`;
}

window.agregarFilaEgreso = () => {
    document.getElementById('body_egresos').insertAdjacentHTML('beforeend', generarFilaEgresoHTML());
};


const obtenerTotalHorasDiseno = async (id) => {
    const docRef = doc(db, "cotizaciones", id, "gestiones", "diseno_curricular");
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return 0;

    const data = docSnap.data();
    let sumaTotal = 0;

    // Recorremos cada bloque (Módulo o General)
    data.estructura.forEach(bloque => {
        // Recorremos cada fila del contenido de ese bloque
        bloque.contenido.forEach(fila => {
            const horasFila = parseFloat(fila.h) || 0;
            sumaTotal += horasFila;
        });
    });

    return sumaTotal;
};

window.verRequerimientoCompleto = async (id) => {
    const docSnap = await getDoc(doc(db, "cotizaciones", id));
    if (!docSnap.exists()) return alert("No se encontró la información");
    
    const data = docSnap.data();
    
    const html = `
        <div class="space-y-6 text-sm">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 class="text-blue-700 font-bold uppercase text-xs mb-2">Datos de la Empresa</h4>
                    <p class="text-lg font-black text-slate-800">${data.razon_social}</p>
                    <p class="text-slate-500 font-medium">RUC: ${data.ruc}</p>
                </div>
                <div class="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 class="text-blue-700 font-bold uppercase text-xs mb-2">Persona de Contacto</h4>
                    <p class="font-bold text-slate-800">${data.contacto?.nombre} ${data.contacto?.apellido}</p>
                    <p class="text-slate-600">${data.contacto?.correo}</p>
                    <p class="text-slate-600">${data.contacto?.celular}</p>
                </div>
            </div>

            <div class="p-4 border rounded-xl space-y-4">
                <h4 class="text-indigo-700 font-bold uppercase text-xs border-b pb-2">Especificaciones del Servicio</h4>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p class="text-[10px] text-slate-400 font-bold uppercase">Nivel</p>
                        <p class="font-semibold">${data.nivel}</p>
                    </div>
                    <div>
                        <p class="text-[10px] text-slate-400 font-bold uppercase">Modalidad</p>
                        <p class="font-semibold">${data.modalidad}</p>
                    </div>
                    <div>
                        <p class="text-[10px] text-slate-400 font-bold uppercase">Duración (Horas)</p>
                        <p class="font-semibold">${data.duracion_horas || 'A proponer'}</p>
                    </div>
                    <div>
                        <p class="text-[10px] text-slate-400 font-bold uppercase">Participantes</p>
                        <p class="font-semibold">${data.cantidad_colaboradores} personas</p>
                    </div>
                </div>

                <div>
                    <p class="text-[10px] text-slate-400 font-bold uppercase">Objetivo / Descripción</p>
                    <p class="text-slate-700 italic bg-blue-50 p-2 rounded">${data.objetivo}</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p class="text-[10px] text-slate-400 font-bold uppercase">Perfil del Personal</p>
                        <p class="font-medium">${data.perfil_personal}</p>
                    </div>
                    <div>
                        <p class="text-[10px] text-slate-400 font-bold uppercase">Lugar y Horario</p>
                        <p class="font-medium">${data.lugar} / ${data.horario_frecuencia}</p>
                    </div>
                </div>
            </div>

            <div class="flex justify-end gap-3">
                <button onclick="cerrarModal()" class="px-6 py-2 bg-slate-800 text-white rounded-lg font-bold uppercase text-xs">Cerrar</button>
            </div>
        </div>
    `;
    
    abrirModal("DETALLE COMPLETO DEL REQUERIMIENTO", html);
};


window.accionElaborarPTE = async (id, codigo) => {
    // 1. Recuperación de datos del flujo
    const docCot = await getDoc(doc(db, "cotizaciones", id));
    const docDiseno = await getDoc(doc(db, "cotizaciones", id, "gestiones", "diseno_curricular"));
    const docHC = await getDoc(doc(db, "cotizaciones", id, "gestiones", "hoja_costos"));


    // Nueva recuperación: Datos guardados de la PTE
    const docPTEExistente = await getDoc(doc(db, "cotizaciones", id, "gestiones", "propuesta_tecnica"));
    const ptePrevia = docPTEExistente.exists() ? docPTEExistente.data() : {};


    if (!docDiseno.exists() || !docHC.exists()) {
        return alert("Error: Debe completar el Diseño y la HC antes de generar la PTE.");
    }

    const cot = docCot.data();
    const diseno = docDiseno.data();
    const hc = docHC.data();
    const codPTE = codigo.replace('REQ', 'PTE');

    // --- Lógica de Prorrateo ---
    const totalFinal = hc.ingresos.unitario * hc.ingresos.cantidad * (hc.ingresos.conIGV ? 1.18 : 1);
    const subTotalSimulado = totalFinal / 0.8; 
    const descuentoMonto = subTotalSimulado * 0.2;

    // 1. Calcular horas totales del diseño para usar como base del prorrateo
    const totalHorasDiseno = diseno.estructura.reduce((acc, mod) => {
        return acc + mod.contenido.reduce((sum, f) => sum + (parseFloat(f.h) || 0), 0);
    }, 0);

    // 2. Generar filas prorrateadas
    const filasModulosHTML = diseno.estructura.map((mod, index) => {
        const horasModulo = mod.contenido.reduce((sum, f) => sum + (parseFloat(f.h) || 0), 0);
        
        // Prorrateo: (Horas Modulo / Total Horas) * Subtotal Simulado
        const costoProrrateado = totalHorasDiseno > 0 ? (horasModulo / totalHorasDiseno) * subTotalSimulado: 0;
        return `
            <tr>
                <td class="border p-2 text-center text-gray-500">${String(index + 1).padStart(2, '0')}</td>
                <td class="border p-2 font-medium uppercase">${mod.modulo}</td>
                <td class="border p-2 text-center">${horasModulo} hrs.</td>
                <td class="border p-2 text-center">${hc.ingresos.cantidad}</td>
                <td class="border p-2 text-right">
                    ${costoProrrateado.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}
                </td>
            </tr>`;
    }).join('');



    const html = `
        <div id="documento_pte" class="bg-white p-12 text-gray-800 shadow-inner" style="font-family: 'Arial', sans-serif; font-size: 11px; line-height: 1.5;">
            <div class="flex justify-end no-print mb-4">
                <button onclick="verRequerimientoCompleto('${id}')" class="text-[10px] font-bold text-blue-600 hover:underline">
                    📄 VER REQUERIMIENTO ORIGINAL
                </button>
            </div>
            
            <div class="flex justify-between items-center border-b-2 border-blue-900 pb-8 mb-6">
                <img src="https://i.postimg.cc/8zmgNmp7/LOGOCTTC-20.jpg" style="height: 90px;">
                <div class="text-right">
                    <h1 class="text-xl font-black text-blue-900 uppercase">Propuesta Técnica-Económica</h1>
                    <p class="font-bold text-gray-600">${codPTE}</p>
                </div>
            </div>

            <section class="mb-6">
                <h3 class="bg-blue-900 text-white px-2 py-1 font-bold uppercase mb-2 italic">I. Entidad Capacitadora: SENATI</h3>
                <p class="text-justify mb-2">
                    El SERVICIO NACIONAL DE ADIESTRAMIENTO EN TRABAJO INDUSTRIAL
                    SENATI con RUC N°: 20131376503, cuenta con más de 60 años de experiencia en el mercado laboral, con el propósito de proporcionar formación y capacitación profesional para la actividad industrial manufacturera.
                    Además, brinda servicios técnicos y empresariales, CAPACITACIONES en todos los perfiles de acuerdo al mercado laboral, asesorías y consultorías a empresas nacionales y privadas, servicio de laboratorio textil y bolsa de trabajo.
                    Los empresarios fundadores instituyeron una organización educativa dinámica y flexible, dirigida y solventada por el sector productivo, con el fin de responder con pertinencia y eficacia a las demandas de calificación profesional del mercado laboral, así como la activa participación de los empresarios en los órganos de dirección (consejo Nacional y Consejos Zonales) y órganos de apoyo (comisiones consultivas de Empleadores y Comités de apoyo a Centros de Formación Profesional).
                    SENATI a nivel Nacional desarrolla programas de aprendizaje Dual, Calificación de Trabajadores en Servicio (CTS) y Capacitación continua en atención a la Pequeña y Mediana Empresa.
                </p>
                    <strong>Certificaciones institucionales del SENATI</strong>
                </p>
                </p>
                    <strong>Sistema Integrado de Gestión</strong>
                </p>
                </p>
                    El SENATI ha culminado satisfactoriamente, el proceso de auditoría de certificación de su Sistema Integrado de Gestión habiendo sido recomendada la Certificación en todas sus sedes a nivel nacional. La empresa SGS del Perú, tuvo a su cargo el proceso de certificación y las auditorias de seguimiento semestrales. El SENATI cuenta con las siguientes certificaciones:Gestión de Calidad bajo la norma ISO 9001, Gestión Ambiental bajo la norma ISO 14001.
                </p>
                </p>
                    <strong>Convenios institucionales</strong>
                </p>
                </p>
                    <strong>AUDACES, WGSN, BROWZWEAR</strong>
                </p>
            </section>

            <section class="mb-6">
                <h3 class="bg-blue-900 text-white px-2 py-1 font-bold uppercase mb-2 italic">II. Programa de Capacitación Propuesto</h3>
                <p class="text-lg font-bold text-blue-800 mb-1">${diseno.nombre}</p>
                <p class="italic mb-3 text-gray-600">${diseno.objetivo_general}</p>
                
                <table class="w-full border-collapse border border-gray-400 text-[10px]">
                    <thead>
                        <tr class="bg-gray-100">
                            <th class="border border-gray-400 p-2 text-left">Estructura Curricular / Módulos</th>
                            <th class="border border-gray-400 p-2 text-center w-24">Horas Académicas</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${diseno.estructura.map(mod => `
                            <tr>
                                <td class="border border-gray-400 p-2 font-medium">${mod.modulo}</td>
                                <td class="border border-gray-400 p-2 text-center font-bold">
                                    ${mod.contenido.reduce((acc, f) => acc + (parseFloat(f.h) || 0), 0)} hrs.
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p class="text-[9px] mt-1 text-gray-500">* Consideramos 1 hora académica equivalente a 45 minutos.</p>
            </section>

            <section class="mb-6">
                <h3 class="bg-blue-900 text-white px-2 py-1 font-bold uppercase mb-2 italic">III. Sistema de Evaluación y Certificación</h3>
                </p> La evaluación del curso busca proporcionar información acerca del aprendizaje, permitiendo comprender y valorar el proceso y resultados de la formación de competencias, a fin de tomar decisiones que contribuyan a su mejoramiento.</p>
                <ul class="list-disc ml-5 space-y-1">
                    <li>Registro de asistencia y notas mediante la plataforma <strong>BLACKBOARD</strong> y <strong>SINFO</strong>.</li>
                    <li>Calificación basada en: Examen final, Participación/foro y Trabajo final.</li>
                    <li>Nota mínima aprobatoria: <strong>12</strong> con una asistencia mínima del <strong>80%</strong>.</li>
                    <li>Emisión de certificados digitales tras 15 días útiles de finalizado el programa.</li>
                </ul>
            </section>

            <section class="mb-6">
                <h3 class="bg-blue-900 text-white px-2 py-1 font-bold uppercase mb-2 italic">IV. Condiciones generales</h3>
                <ul class="list-disc ml-5 space-y-1">
                    <li>Los participantes al programa deberán respetar el reglamento de seguridad y salud ocupacional y medio ambiente de SENATI, durante el desarrollo de sus actividades académicas.</li>
                    <li>SENATI garantizará la confidencialidad de los resultados, temarios, información y demás aspectos que generen el desarrollo de este programa.</li>
                    <li>Cualquier requerimiento adicional no estipulado en esta propuesta será presupuestado y adicionado al precio inicial, previo informe.</li>
                    <li>Consideramos 1 hora académica equivalente a 45 minutos.</li>
                </ul>
            </section>

            <section class="mb-8">
                <h3 class="bg-blue-900 text-white px-2 py-1 font-bold uppercase mb-2 italic">V. Propuesta Económica</h3>
                
                <div class="overflow-x-auto">
                    <table class="w-full border-collapse border border-blue-900 mb-4 text-[10px]">
                        <thead>
                            <tr class="bg-blue-900 text-white uppercase italic">
                                <th class="border p-1 w-8">Ítem</th>
                                <th class="border p-1 text-left">Módulo / Componente</th>
                                <th class="border p-1 w-16">Horas</th>
                                <th class="border p-1 w-16">Partic.</th>
                                <th class="border p-1 text-right w-24">Total S/</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filasModulosHTML}
                        </tbody>
                        <tfoot class="text-[11px]">
                            <tr>
                                <td colspan="4" class="text-right p-1 font-bold bg-gray-50 uppercase tracking-tighter">Sub Total Bruto S/</td>
                                <td class="text-right p-1 font-bold bg-gray-50 border border-gray-300">
                                    ${subTotalSimulado.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}
                                </td>
                            </tr>
                            <tr class="text-emerald-700">
                                <td colspan="4" class="text-right p-1 font-bold italic uppercase tracking-tighter">Dcto. Especial Cliente CTTC (20%) (-)</td>
                                <td class="text-right p-1 font-bold border border-gray-300 bg-emerald-50">
                                    ${descuentoMonto.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}
                                </td>
                            </tr>
                            <tr class="bg-blue-900 text-white">
                                <td colspan="4" class="text-right p-2 font-black uppercase text-sm italic">Inversión Total del Servicio S/</td>
                                <td class="text-right p-2 font-black border border-blue-900 text-sm">
                                    ${totalFinal.toLocaleString('es-PE', { style: 'currency', currency: 'PEN' })}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div class="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-900 mb-4">
                    <p class="text-[9px] font-bold uppercase text-blue-900">Son:</p>
                    <p class="text-[10px] font-black uppercase italic">${montoALetras(totalFinal)}</p>
                </div>
            </section>


            <section class="mb-6">
                <h3 class="bg-blue-900 text-white px-2 py-1 font-bold uppercase mb-2 italic">El servicio incluye</h3>
                <ul class="list-disc ml-5 space-y-1">
                    <li>Docente especializado en el tema solicitado por el cliente </li>
                    <li>Material Audiovisual</li>
                    <li>Acceso al sistema SINFO para la descarga de CERTIFICADOS</li>
                    <li>Acceso al sistema BLACKBOARD</li>
                    <li>Acceso al correo institucional</li>
                </ul>
            </section>
            
            <section class="mb-6">
                <h3 class="bg-blue-900 text-white px-2 py-1 font-bold uppercase mb-2 italic">Condiciones del servicio:</h3>
                <ul class="list-disc ml-5 space-y-1">
                    <li>Se considera el programa en la modalidad solicitada en el requerimiento</li>
                    <li>Se considera un número de participantes detallado en la seccion VI </li>
                    <li>Enviar la ficha (Excel) con los datos de las participantes (ANEXO N°1) y registrar sus datos en el link: https://forms.gle/hJYcYNJ1YCsprvgo6</li>
                    <li>Una vez iniciado un módulo, no se podrá solicitar la devolución/reducción del monto total pagado por este concepto.</li>
                    <li>El CTTC-SENATI se reserva el derecho de modificar la plana docente, por motivos de fuerza mayor o por disponibilidad del profesor, garantizando que la calidad del curso no se vea afectada.</li>
                    <li>La presente PTE está sujeta a variaciones de acuerdo a cambios climáticos y/o contextos políticos-económicos que afecten fehacientemente el normal y continuo desarrollo del programa de capacitación.</li>            
                </ul>
                <div class="mt-4 no-print">
                    <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Observaciones o Condiciones Adicionales:</label>
                    <textarea id="pte_obs_final" 
                              class="w-full p-2 border border-dashed border-gray-300 rounded text-[11px] bg-blue-50/30 focus:bg-white outline-none" 
                              rows="2" 
                              placeholder="Escriba aquí condiciones específicas si es necesario...">${ptePrevia.observaciones_adicionales || ''}</textarea>
                </div>

                            
            </section>

            <section class="mb-6">
                <h3 class="bg-blue-900 text-white px-2 py-1 font-bold uppercase mb-2 italic">Consideraciones de pago</h3>
                <ul class="list-disc ml-5 space-y-1">
                    <li><strong>Para pagos nacionales considerar</strong>:DEPÓSITO BANCARIO EN BANCO BCP
                    A nivel nacional Cuenta Bancaria: 1931883799070
                    Código de Cuenta Bancaria: 00219300188379907016
                    POR TRANSFERENCIA BANCARIA (Vía Web o Aplicativo):
                    La ruta es: Pago de servicios/Buscas SENATI/Opción SENATI CONVENIOS/Digitas el monto
                    NOTA: Deben adjuntar los datos de la empresa para la emisión de la factura (RUC y RAZON SOCIAL)
                    </li>
                    <li><strong>Para pago internacionales considerar</strong>: Realizar el pago correspondiente según el ANEXO 2
                    El monto total de la presente PTE no incluye los impuestos no domiciliados ni cargos por envío o recepción de la transferencia.
                    </li>
 
                </ul>
            </section>

            <section class="mb-6">
                <h3 class="bg-blue-900 text-white px-2 py-1 font-bold uppercase mb-2 italic">Fecha y hora</h3>
                <div class="mt-4 no-print">
                    <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Horario y frecuencia de ejecución:</label>
                    <textarea id="pte_horario_frecuencia" 
                              class="w-full p-2 border border-dashed border-gray-300 rounded text-[11px] bg-blue-50/30 focus:bg-white outline-none" 
                              rows="2" 
                              placeholder="Escriba aquí condiciones específicas si es necesario...">${ptePrevia.horario_frecuencia || ''}</textarea>
                </div>
                
            </section>

            <section class="mb-6">
                <h3 class="bg-blue-900 text-white px-2 py-1 font-bold uppercase mb-2 italic">Consideraciones adicionales para ejecutar el servicio.</h3>
                <ul class="list-disc ml-5 space-y-1">
                    <li>Una vez aceptada la propuesta deberá confirmar con carta de aceptación</li>
                    <li>Las partes convienen en respetar la programación planteada en frecuencia y horario, siendo flexible en la postergación de las clases sincrónicas debido circunstancias externas.</li>
                    <li>No existe la posibilidad de que la cantidad de alumnos sea mayor a 30 por políticas internas de SENATI.</li>
                    <li>Los participantes son acreditados por el solicitante, para lo cual debe alcanzar la lista respectiva. No se admiten cambios luego de iniciado el curso</li>
                    <li>El costo del servicio es variable en caso aumente el número de participantes</li>
                </ul>
            </section>

            <section class="mb-6">
                <h3 class="bg-blue-900 text-white px-2 py-1 font-bold uppercase mb-2 italic">Sobre la suspensión del servicio</h3>
                <ul class="list-disc ml-5 space-y-1">
                    <li>El CTTC_SENATI podría solicitar reprogramaciones en el desarrollo del curso debido a circunstancias ajenas a nuestra voluntad (salud u otros que afecten de forma física al docente) En caso el cliente decida suspender el servicio durante su ejecución se procederá a facturar el servicio de acuerdo a la cotización aceptada</li>
                </ul>
            </section>


            <section class="mb-6">
                <h3 class="bg-blue-900 text-white px-2 py-1 font-bold uppercase mb-2 italic">Sobre la coordinación del servicio</h3>
                <ul class="list-disc ml-5 space-y-1">
                    <li>Ilse Rivas M. / Jean Carlo Rodriguez (telf. 208-9937 / 954622231/ 950670359)- irivas@senati.edu.pe /jrodriguezf@senati.edu.pe</li>
                </ul>
            </section>


            <section class="mb-6">
                <h3 class="bg-blue-900 text-white px-2 py-1 font-bold uppercase mb-2 italic">Sobre la metodología del servicio</h3>
                <ul class="list-disc ml-5 space-y-1">
                    <li>Expositiva, participativa, con aplicación de casos enfocados a la empresa</li>
                </ul>
            </section>

            <section class="mb-6">
                <h3 class="bg-blue-900 text-white px-2 py-1 font-bold uppercase mb-2 italic">Sobre los requisitos tecnológicos del servicio</h3>
                <ul class="list-disc ml-5 space-y-1">
                    <li>Proyector multimedia</li>
                </ul>
                <div class="mt-4 no-print">
                    <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Observaciones o Condiciones Adicionales:</label>
                    <textarea id="pte_obs_tecnologicas" 
                              class="w-full p-2 border border-dashed border-gray-300 rounded text-[11px] bg-blue-50/30 focus:bg-white outline-none" 
                              rows="2" 
                              placeholder="Escriba aquí condiciones específicas si es necesario...">${ptePrevia.observaciones_tecnologicas || ''}</textarea>
                </div>
            </section>

            <section class="mb-6">
                <h3 class="bg-blue-900 text-white px-2 py-1 font-bold uppercase mb-2 italic">Sobre la vigencia del Presupuesto</h3>
                <ul class="list-disc ml-5 space-y-1">
                    <li><span class="font-bold">Vigencia:</span> 30 días naturales desde la fecha de emisión del presupuesto.</li>
                </ul>

                <div class="mt-10 w-64 flex flex-col items-center">
                    <div class="relative group w-full flex flex-col items-center">
                        <img id="vista_previa_firma" src="${ptePrevia.firma_digital || ''}" class="h-16 mb-1 ${ptePrevia.firma_digital ? '' : 'hidden'} object-contain">
                        
                        <label class="no-print cursor-pointer bg-gray-100 border border-dashed border-gray-400 rounded p-1 mb-1 text-[9px] text-gray-500 flex items-center gap-1">
                            <span>Subir Firma (Imagen)</span>
                            <input type="file" accept="image/*" class="hidden" onchange="const reader = new FileReader(); reader.onload = (e) => { const img = document.getElementById('vista_previa_firma'); img.src = e.target.result; img.classList.remove('hidden'); }; reader.readAsDataURL(this.files[0]);">
                        </label>
                    </div>

                    <div class="border-b border-gray-800 w-full mb-1">
                        <input type="text" 
                            id="pte_nombre_elaborador"
                            class="w-full bg-transparent outline-none text-center font-bold uppercase text-[11px] placeholder:text-gray-300 no-print-border" 
                            placeholder="NOMBRE DEL ELABORADOR"
                            value="${ptePrevia.elaborado_por || ''}">
                    </div>
                  
                </div>
            </section>


            <div class="page-break" style="page-break-before: always;"></div>
            <section class="mt-10 border-2 border-gray-200 p-6 rounded-lg">
                <h3 class="text-center font-black text-lg mb-4 uppercase">Anexo 1: Ficha de Inscripción y Matrícula</h3>
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div class="border-b border-gray-400 pb-1 italic">Apellidos: ________________________</div>
                    <div class="border-b border-gray-400 pb-1 italic">Nombres: _________________________</div>
                    <div class="border-b border-gray-400 pb-1 italic">DNI: _____________________________</div>
                    <div class="border-b border-gray-400 pb-1 italic">Correo: __________________________</div>
                    <div class="border-b border-gray-400 pb-1 italic">Fecha nacimiento: __________________________</div>
                    <div class="border-b border-gray-400 pb-1 italic">Celular: __________________________</div>
                    <div class="border-b border-gray-400 pb-1 italic">Correo: __________________________</div>
                    <div class="border-b border-gray-400 pb-1 italic">Dirección: __________________________</div>
                    <div class="border-b border-gray-400 pb-1 italic">Curso/Programa: __________________________</div>

                    
                </div>
                <p class="text-[9px] text-justify mt-6 font-bold">Cláusula de Consentimiento (Ley N° 29733):</p>
                <p class="text-[8px] text-gray-500 text-justify">
                    Cláusula de Consentimiento y Finalidad Para Alumnos y Egresados
                    De conformidad con lo establecido en la Ley N° 29733, Ley de Protección de Datos Personales, y su Reglamento, aprobado por Decreto Supremo N° 003-2013-JUS, mediante el presente documento, otorgo mi consentimiento libre, previo, informado, expreso e inequívoco para que mis datos personales y datos sensibles o no, puedan ser tratados por el Servicio  Nacional de Adiestramiento en Trabajo Industrial (en adelante “el SENATI”), esto es, para la recopilación, registro, almacenamiento, conservación, utilización, transferencia nacional e internacional y/o para que reciban cualquier otra forma de procesamiento por parte del SENATI. Dichos datos serán incluidos en el Banco de Datos Personales “Alumnos” y Banco de Datos Personales “Egresados”, ambos de titularidad del SENATI, con la finalidad  de brindar información, ofrecer sus productos y servicios para fines comerciales  que puedan ser de su interés, para la gestión académica y financiera del producto o servicio contratado, a efectos de dar cumplimiento a las obligaciones contraídas; así como el envío de información de los resultados del rendimiento académico a solicitud de sus tutores, apoderado y/o patrocinadores; para la participación en pasantías, becas y concursos u otras actividades educativas relacionadas con el producto o servicio contratado; así mismo para la elaboración de materiales de publicidad, materiales didácticos e instructivos.
                    
                    El SENATI garantiza que los datos personales serán tratados de forma estrictamente confidencial y respetando las medidas de seguridad dispuestas en la Ley N° 29733, Ley de Protección de Datos Personales y su Reglamento, aprobado por Decreto Supremo No. 003-2013-JUS.
                    
                    Se informa al titular de los datos personales que puede revocar la presente autorización, para el tratamiento de sus datos personales, en cualquier momento, de conformidad con lo previsto en la Ley. Para ejercer este derecho, o cualquier otro previsto en la norma, el titular de datos personales podrá presentar su solicitud en la Dirección Zonal correspondiente. Para mayor información consultar el siguiente enlace: http://www.senati.edu.pe/web/cobertura-nacional/sedes.
                </p>
                </p>He Leído y aceptado las Condiciones indicadas (si) (no): ______</p>
                </p>Firma: ______</p>
                </p>F12 SEN-DIRE 09</p>
            </section>

            <section class="mt-10 border-2 border-gray-200 p-6 rounded-lg">
                <h3 class="text-center font-black text-lg mb-4 uppercase">Anexo 2: Pagos internacionales</h3>
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div class="border-b border-gray-400 pb-1 italic"> ¿Qué datos necesito para realizar una transferencia internacional?  
                        1. Nombre completo o razón social del beneficiario y su domicilio. 
                        Razón Social: Servicio Nacional de Adiestramiento en Trabajo Industrial Nombre Comercial. SENATI 
                        Domicilio: Av. Alfredo Mendiola 3520 – Independencia. Lima Perú.<br> 
                        2. Número de cuenta de destino, tipo y moneda. 
                        Número de Cuenta: 193-2047003-1-07 
                        Tipo de cuenta: Cuenta Corriente 
                        Moneda: dólares 
                        CCI: 00219300204700310719<br> 
                        3. Nombre, ciudad, estado y país del banco de destino, dirección del banco. 
                        Nombre: Banco de Crédito del Perú 
                        Ciudad: Lima 
                        Estado Lima 
                        País: Perú 
                        Dirección: Calle Centenario Nro. 156 Urb Las Laderas de Melgarejo Lima -La Molina<br> 
                        4. Código SWIFT del banco. 
                        SWIFT: BCPLPEPL<br> 
                        5. Persona de Contacto 
                        Rosario Pajuelo Valerio – Tesorería SENATI<br> 
                        Atentamente; 
                        Rosario Pajuelo Valerio 
                        Jefe de Tesorería 
                        Gerencia de Finanzas y Administración - DN 
                        (Cel) 944813929 
                        pajuelor@senati.edu.pe 
                    </div>

                    <div class="border-b border-gray-400 pb-1 italic"> ¿Qué datos necesito para realizar una transferencia internacional?  
                        1. Nombre completo o razón social del beneficiario y su domicilio. 
                        Razón Social: Servicio Nacional de Adiestramiento en Trabajo Industrial Nombre Comercial. SENATI 
                        Domicilio: Av. Alfredo Mendiola 3520 – Independencia. Lima Perú.<br> 
                        2. Número de cuenta de destino, tipo y moneda. 
                        Número de Cuenta: 0011-0661-65-0100004245 
                        Tipo de cuenta: Cuenta Corriente 
                        Moneda: dólares 
                        CCI: 011-661-000-100004245-65<br> 
                        3. Nombre, ciudad, estado y país del banco de destino, dirección del banco. 
                        Nombre: BBVA- Banco Continental  
                        Ciudad: Lima 
                        Estado Lima 
                        País: Perú 
                        Dirección: Avenida república de Panamá N°3055 Urbanización El Palomar- San Isidro <br> 
                        4. Código SWIFT del banco. 
                        SWIFT: BCONPEPL<br> 
                        5. Persona de Contacto 
                        Rosario Pajuelo Valerio – Tesorería SENATI<br> 
                        Atentamente; 
                        Rosario Pajuelo Valerio 
                        Jefe de Tesorería 
                        Gerencia de Finanzas y Administración - DN 
                        (Cel) 944813929 
                        pajuelor@senati.edu.pe 
                    </div>


                    
                </div>
                
            </section>


        </div>

        <div class="flex gap-4 mt-8 no-print justify-center">
            <button onclick="guardarPTE('${id}')" class="bg-indigo-700 text-white font-black px-8 py-4 rounded-xl shadow-lg hover:bg-indigo-800 transition uppercase">
                💾 Guardar Propuesta
            </button>
            <button onclick="generarPDFPTE('${codPTE}')" class="bg-emerald-600 text-white font-black px-8 py-4 rounded-xl shadow-lg hover:bg-emerald-700 transition uppercase">
                📄 Descargar PDF
            </button>
            <button onclick="cerrarModal()" class="px-8 py-4 border-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition">
                Regresar a la Lista
            </button>
        </div>


    `;

    abrirModal("3. GENERACIÓN DE PROPUESTA TÉCNICO ECONÓMICA", html);
};

window.generarPDFPTE = (nombreArchivo) => {
    const elemento = document.getElementById('documento_pte');
    
    // 1. Ocultar manualmente elementos que no deben ir en el PDF
    // Aseguramos que el botón de subir firma se oculte aunque la clase falle
    const elementosNoDeseados = elemento.querySelectorAll('.no-print, label, button');
    elementosNoDeseados.forEach(el => el.style.visibility = 'hidden');

    // 2. Configuración de alta resolución y ajuste de página
    const opciones = {
        margin:       [10, 10, 10, 10], // Margen en mm
        filename:     `${nombreArchivo}.pdf`,
        image:        { type: 'jpeg', quality: 1 }, // Máxima calidad de imagen
        html2canvas:  { 
            scale: 4, // Aumenta la resolución (4 es ideal para impresión nítida)
            useCORS: true, 
            letterRendering: true,
            scrollX: 0,
            scrollY: 0
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] } // Evita cortes de texto
    };

    // 3. Ejecución con limpieza posterior
    html2pdf().set(opciones).from(elemento).save().then(() => {
        // Restaurar visibilidad para seguir editando en el modal
        elementosNoDeseados.forEach(el => el.style.visibility = 'visible');
        alert("PTE generada con alta resolución.");
    });
};

const montoALetras = (num) => {
    const unidades = (n) => ['UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'][n - 1];
    const decenas = (n) => {
        if (n >= 10 && n <= 19) return ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'][n - 10];
        if (n >= 20 && n <= 29) return n === 20 ? 'VEINTE' : 'VEINTI' + unidades(n - 20);
        const d = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'][Math.floor(n / 10)];
        return d + (n % 10 !== 0 ? ' Y ' + unidades(n % 10) : '');
    };
    const centenas = (n) => {
        if (n === 100) return 'CIEN';
        if (n > 100 && n <= 199) return 'CIENTO ' + decenas(n - 100);
        const c = ['', '', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'][Math.floor(n / 100)];
        return c + (n % 100 !== 0 ? ' ' + decenas(n % 100) : '');
    };

    const procesar = (n) => {
        if (n === 0) return '';
        if (n < 10) return unidades(n);
        if (n < 100) return decenas(n);
        return centenas(n);
    };

    const entero = Math.floor(num);
    const decimales = Math.round((num - entero) * 100);
    const centavosStr = `CON ${decimales.toString().padStart(2, '0')}/100 SOLES`;

    if (entero === 0) return `SON: CERO ${centavosStr}`;
    if (entero === 1) return `SON: UN ${centavosStr}`;

    let letras = '';
    if (entero < 1000) {
        letras = procesar(entero);
    } else if (entero < 1000000) {
        const miles = Math.floor(entero / 1000);
        const resto = entero % 1000;
        letras = (miles === 1 ? 'MIL' : procesar(miles) + ' MIL') + (resto > 0 ? ' ' + procesar(resto) : '');
    }

    return `SON: ${letras} ${centavosStr}`.replace(/\s+/g, ' ').toUpperCase();
};


window.guardarPTE = async (id) => {
    try {
        // 1. Capturar datos del modal
        const nombreElaborador = document.getElementById('pte_nombre_elaborador')?.value || "";
        const observaciones = document.getElementById('pte_obs_final')?.value || "";
        const imagenFirma = document.getElementById('vista_previa_firma');
        
        // Capturamos la imagen en base64 si existe
        const firmaBase64 = (imagenFirma && !imagenFirma.classList.contains('hidden')) 
            ? imagenFirma.src 
            : null;

        // 2. Guardar en la subcolección "gestiones/propuesta_tecnica"
        const pteRef = doc(db, "cotizaciones", id, "gestiones", "propuesta_tecnica");
        await setDoc(pteRef, {
            elaborado_por: nombreElaborador,
            observaciones_adicionales: observaciones,
            horario_frecuencia: document.getElementById('pte_horario_frecuencia')?.value || "",
            observaciones_tecnologicas: document.getElementById('pte_obs_tecnologicas')?.value || "",
            firma_digital: firmaBase64,
            fecha_guardado: new Date(),
            version: 1
        });

        // 3. Actualizar el estado en el documento principal
        const docPrincipal = doc(db, "cotizaciones", id);
        await updateDoc(docPrincipal, {
            estado: "PTE_Listo",
            ultima_actualizacion: new Date()
        });

        alert("¡Propuesta Técnica guardada con éxito y estado actualizado!");
        cerrarModal();
        
    } catch (error) {
        console.error("Error al guardar PTE:", error);
        alert("Error al guardar la propuesta: " + error.message);
    }
};

// 1. GESTIÓN DE MODAL (ACCIÓN 4)
window.accionAprobacionCliente = async (id, codigo) => {
    const pteCodigo = codigo.replace('REQ', 'PTE');
    const cuerpoTexto = `Estimado Jefe Directo,\n\nSe remite la propuesta ${pteCodigo} para su revisión y aprobación.\n\nAtentamente,\nEquipo CTTC - SENATI`;

    const html = `
        <div class="space-y-6 p-2">
            <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                <span class="text-2xl">📧</span>
                <div>
                    <p class="text-blue-900 font-bold text-sm uppercase italic">Solicitud de Aprobación</p>
                    <p class="text-blue-600 text-[11px]">Envíe la propuesta a su jefe para validación.</p>
                </div>
            </div>
            
            <button onclick="window.enviarCorreoSolicitud('${id}', '${codigo}')" 
                    class="w-full flex items-center justify-center gap-3 p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-md">
                <span class="text-xl">✉️</span>
                <span class="font-black text-sm uppercase">Abrir Correo Automático</span>
            </button>

            <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p class="text-[9px] font-bold text-gray-400 uppercase mb-2">¿El botón de arriba no funcionó? Use la copia manual:</p>
                <button onclick="navigator.clipboard.writeText('${cuerpoTexto.replace(/\n/g, '\\n')}'); alert('Texto copiado al portapapeles');" 
                        class="w-full py-2 bg-white border border-gray-300 rounded text-[10px] font-bold text-gray-600 hover:bg-gray-100 transition">
                    📋 COPIAR CUERPO DEL MENSAJE
                </button>
            </div>

            <div class="grid grid-cols-2 gap-4 pt-2">
                <button onclick="window.confirmarEstadoFinal('${id}', 'PTE_Aceptada')" class="p-4 border-2 border-emerald-100 rounded-xl hover:bg-emerald-50 transition text-center group">
                    <span class="block font-black text-emerald-700 text-xs">✅ ACEPTAR</span>
                </button>
                <button onclick="window.confirmarEstadoFinal('${id}', 'PTE_Rechazada')" class="p-4 border-2 border-rose-100 rounded-xl hover:bg-rose-50 transition text-center group">
                    <span class="block font-bold text-rose-700 text-xs">❌ RECHAZAR</span>
                </button>
            </div>

            <div class="flex justify-center pt-4 border-t">
                <button onclick="cerrarModal()" class="text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest">
                    ✕ Regresar a la lista de requerimientos
                </button>
            </div>
        </div>
    `;
    abrirModal("4. GESTIÓN DE APROBACIÓN", html);
};

// --- ACCIÓN 5: APROBACIÓN FINAL DEL CLIENTE ---
window.accionAprobacionFinalCliente = async (id, codigo) => {
    const html = `
        <div class="space-y-6 p-2">
            <div class="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
                <span class="text-2xl">🤝</span>
                <div>
                    <p class="text-emerald-900 font-bold text-sm uppercase italic">Aprobación Final del Cliente</p>
                    <p class="text-emerald-600 text-[11px]">Registre la respuesta oficial del cliente tras recibir la PTE.</p>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 pt-2">
                <button onclick="window.confirmarEstadoFinal('${id}', 'Aceptada_Cliente')" class="p-4 border-2 border-emerald-100 rounded-xl hover:bg-emerald-50 transition text-center group">
                    <span class="block font-black text-emerald-700 text-xs">✅ CLIENTE ACEPTÓ</span>
                </button>
                <button onclick="window.confirmarEstadoFinal('${id}', 'Rechazada_Cliente')" class="p-4 border-2 border-rose-100 rounded-xl hover:bg-rose-50 transition text-center group">
                    <span class="block font-bold text-rose-700 text-xs">❌ CLIENTE RECHAZÓ</span>
                </button>
            </div>

            <div class="flex justify-center pt-4 border-t">
                <button onclick="cerrarModal()" class="text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest">
                    ✕ Regresar a la lista
                </button>
            </div>
        </div>
    `;
    abrirModal("5. APROBACIÓN FINAL DEL CLIENTE", html);
};

// 2. FUNCIÓN DE CAMBIO DE ESTADO
window.confirmarEstadoFinal = async (id, nuevoEstado) => {
    if (!confirm(`¿Está seguro de marcar esta propuesta como ${nuevoEstado.replace('PTE_', '')}?`)) return;
    
    try {
        const docRef = doc(db, "cotizaciones", id);
        await updateDoc(docRef, { 
            estado: nuevoEstado, // Aquí se actualiza a PTE_Aceptada o PTE_Rechazada
            fecha_decision: new Date()
        });
        alert("Estado actualizado correctamente.");
        cerrarModal();
    } catch (e) {
        console.error("Error al actualizar estado:", e);
        alert("Error: " + e.message);
    }
};

// 3. ENVÍO DE CORREO 
window.enviarCorreoSolicitud = async (id, codigo) => {
    const pteCodigo = codigo.replace('REQ', 'PTE');
    const btn = event?.target || document.activeElement;

    try {
        btn.disabled = true;
        btn.innerHTML = "⌛ Cargando datos de HC...";

        // Traer el documento desde Firestore
        const docRef = doc(db, "cotizaciones", id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) throw new Error("Documento no encontrado");
        const d = docSnap.data();

        // Recuperación de respaldo desde subcolecciones para evitar campos en blanco
        const docHC = await getDoc(doc(db, "cotizaciones", id, "gestiones", "hoja_costos"));
        const hc = docHC.exists() ? docHC.data() : null;

        const docDiseno = await getDoc(doc(db, "cotizaciones", id, "gestiones", "diseno_curricular"));
        const diseno = docDiseno.exists() ? docDiseno.data() : null;

        // MAPEADO DE DATOS (Verifica los nombres en tu base de datos)
        const templateParams = {
            codigo_pte: pteCodigo,
            empresa: d.razon_social || "No especificada",
            fecha: new Date().toLocaleDateString('es-PE'),
            
            // Sección: Detalles del Programa
            nombre_curso: d.nombre_servicio_diseno || (diseno ? diseno.nombre : "No especificado"),
            duracion: d.duracion_horas || "0",
            modalidad: d.modalidad_hc || (hc ? hc.metadata.modalidad : "No definida"),
            alumnos: d.cantidad_alumnos_hc || (hc ? hc.ingresos.cantidad : "0"),

            // Sección: Resumen Económico (HC)
            total_facturado: d.total_facturado || (hc ? "S/ " + (hc.ingresos.unitario * hc.ingresos.cantidad).toFixed(2) : "0.00"),
            utilidad: d.utilidad_bruta || "0.00",
            margen: d.margen_rentabilidad || "0%",
            ingreso_hora_alumno: d.ingreso_real_hora_alumno || "0.00",

            // Enlaces de acción directa para el jefe (One-Click Approval)
            link_aprobar: `${window.location.origin}/approve.html?id=${id}&action=PTE_Aceptada`,
            link_rechazar: `${window.location.origin}/approve.html?id=${id}&action=PTE_Rechazada`
        };

        const response = await emailjs.send('service_oe6288g', 'template_dwpsc2p', templateParams);

        if (response.status === 200) {
            alert("✅ Notificación enviada con todos los datos de la HC.");
            await updateDoc(docRef, { notificado_jefe: true });
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error al enviar: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = "✉️ Abrir Correo Automático";
    }
};