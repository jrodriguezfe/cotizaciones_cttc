import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const form = document.getElementById('formCotizacion');
const rucInput = document.getElementById('ruc');

// --- LÓGICA DE BÚSQUEDA Y AUTOCOMPLETADO POR RUC ---
rucInput.addEventListener('blur', async () => {
    const ruc = rucInput.value.trim();
    if (ruc.length !== 11) return;

    try {
        // Consultamos los requerimientos registrados con ese RUC
        // Eliminamos orderBy y limit para evitar la necesidad de un índice compuesto en Firestore
        const q = query(
            collection(db, "cotizaciones"),
            where("ruc", "==", ruc)
        );

        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            // Ordenamos manualmente por fecha_creacion descendente para obtener el más reciente en memoria
            const docs = querySnapshot.docs.map(d => d.data());
            docs.sort((a, b) => {
                const timeA = a.fecha_creacion?.toMillis ? a.fecha_creacion.toMillis() : 0;
                const timeB = b.fecha_creacion?.toMillis ? b.fecha_creacion.toMillis() : 0;
                return timeB - timeA;
            });

            const lastReq = docs[0];
            
            // Autocompletar campos con la información recuperada
            document.getElementById('razon_social').value = lastReq.razon_social || '';
            document.getElementById('objetivo').value = lastReq.objetivo || '';
            document.getElementById('perfil').value = lastReq.perfil_personal || '';
            document.getElementById('nivel').value = lastReq.nivel || 'Básico';
            document.getElementById('modalidad').value = lastReq.modalidad || 'Presencial';
            const durVal = lastReq.duracion_horas;
            document.getElementById('duracion').value = (durVal === "Sujeto a propuesta" || !durVal) ? "" : durVal;
            document.getElementById('lugar').value = lastReq.lugar || '';
            document.getElementById('horario').value = lastReq.horario_frecuencia || '';
            
            if (lastReq.contacto) {
                document.getElementById('nombre').value = lastReq.contacto.nombre || '';
                document.getElementById('apellido').value = lastReq.contacto.apellido || '';
                document.getElementById('celular').value = lastReq.contacto.celular || '';
                document.getElementById('correo').value = lastReq.contacto.correo || '';
            }
            
            document.getElementById('colaboradores').value = lastReq.cantidad_colaboradores || '';
            document.getElementById('anio').value = lastReq.anio || '2026';
            
            alert("¡RUC reconocido! Hemos cargado los datos de su última solicitud para su comodidad.");
            rucInput.classList.add('border-green-500');
        }
    } catch (error) {
        console.error("Error al recuperar datos por RUC:", error);
    }
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Recopilación de datos según tu requerimiento
    const formData = {
        razon_social: document.getElementById('razon_social').value,
        ruc: document.getElementById('ruc').value,
        objetivo: document.getElementById('objetivo').value,
        perfil_personal: document.getElementById('perfil').value,
        nivel: document.getElementById('nivel').value,
        modalidad: document.getElementById('modalidad').value,
        duracion_horas: document.getElementById('duracion').value || "Sujeto a propuesta",
        lugar: document.getElementById('lugar').value,
        horario_frecuencia: document.getElementById('horario').value,
        contacto: {
            nombre: document.getElementById('nombre').value,
            apellido: document.getElementById('apellido').value,
            celular: document.getElementById('celular').value,
            correo: document.getElementById('correo').value
        },
        cantidad_colaboradores: document.getElementById('colaboradores').value,
        anio: document.getElementById('anio').value,
        fecha_creacion: serverTimestamp(),
        estado: "Pendiente"
    };

    try {
        const docRef = await addDoc(collection(db, "cotizaciones"), formData);
        console.log("Documento escrito con ID: ", docRef.id);
        alert("¡Solicitud enviada correctamente! Revisaremos los datos para elaborar la PTE.");
        form.reset();
    } catch (error) {
        console.error("Error al añadir documento: ", error);
        alert("Hubo un error al enviar el formulario.");
    }
});