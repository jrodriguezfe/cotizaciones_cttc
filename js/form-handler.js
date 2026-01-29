import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const form = document.getElementById('formCotizacion');

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