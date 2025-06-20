const puppeteer = require('puppeteer');
const fs = require('fs');

const URL = 'http://localhost:8501/';

const PREGUNTAS = [
  '¿Cuántos créditos tiene la resolución 047?',
  '¿Qué es el PEP?',
  '¿Qué es la matrícula académica?',
  '¿Qué es bajo rendimiento académico?',
  '¿Qué es una habilitación?',
  '¿Qué es un examen de suficiencia?',
  '¿Cuáles son las modalidades de trabajo de grado?',
  '¿Qué es la matrícula financiera?',
  '¿Qué es un crédito académico?',
  '¿Qué es un curso electivo?',
  '¿Qué materias se ven en el primer semestre de Ingeniería de Sistemas?'
];

const USERS_TOTAL = 50;               // Número total de usuarios simulados
const USER_INTERVAL_MS = 500;         // Tiempo entre usuarios (milisegundos)

const resultados = [];

async function simulateUser(id) {
  const browser = await puppeteer.launch({
    headless: true, // Cambiar a false si quieres ver las pestañas
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  const pregunta = PREGUNTAS[Math.floor(Math.random() * PREGUNTAS.length)];

  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 0 });


    await page.waitForSelector('textarea[data-testid="stChatInputTextArea"]', { timeout: 30000 });
    await page.type('textarea[data-testid="stChatInputTextArea"]', pregunta);

    const buttonSelector = 'button[data-testid="stChatInputSubmitButton"]';
    await page.waitForSelector(buttonSelector, { visible: true });

    const startTime = Date.now();
    await page.click(buttonSelector);

    // Esperar a que aparezca el texto "Tiempo de respuesta"
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('div')).some(el => el.innerText.includes('Tiempo de respuesta')),
      { timeout: 60000 }
    );

    const endTime = Date.now();
    const duracion = endTime - startTime;

    resultados.push({
      id,
      pregunta,
      tiempo_ms: duracion,
      status: 'OK',
      error: ''
    });

    console.log(`✅ Usuario ${id}: ${duracion} ms`);
  } catch (err) {
    resultados.push({
      id,
      pregunta,
      tiempo_ms: '',
      status: 'ERROR',
      error: err.message.replace(/"/g, "'")
    });

    console.error(`❌ Usuario ${id} falló: ${err.message}`);
  } finally {
    await browser.close();
  }
}

let currentUser = 0;
const startGlobal = Date.now();

function launchUser() {
  if (currentUser >= USERS_TOTAL) return;

  currentUser++;
  simulateUser(currentUser).then(() => {
    if (resultados.length === USERS_TOTAL) {
      const endGlobal = Date.now();
      const tiempoTotal = endGlobal - startGlobal;

      // Guardar CSV
      const csvLines = ['usuario,pregunta,tiempo_ms,status,error'];
      for (const r of resultados) {
        csvLines.push(`"${r.id}","${r.pregunta}","${r.tiempo_ms}","${r.status}","${r.error}"`);
      }
      fs.writeFileSync('resultados_throughput_500MS.csv', csvLines.join('\n'));
      console.log('✅ Archivo resultados_throughput_500MS.csv guardado');

      // Estadísticas
      const exitosos = resultados.filter(r => r.status === 'OK');
      const duraciones = exitosos.map(r => r.tiempo_ms);
      if (duraciones.length > 0) {
        const promedio = duraciones.reduce((a, b) => a + b, 0) / duraciones.length;
        const max = Math.max(...duraciones);
        const min = Math.min(...duraciones);
        console.log('\n📊 Estadísticas:');
        console.log(`Usuarios exitosos: ${exitosos.length}`);
        console.log(`Usuarios con error: ${resultados.length - exitosos.length}`);
        console.log(`Tiempo promedio: ${promedio.toFixed(2)} ms`);
        console.log(`Tiempo mínimo: ${min} ms`);
        console.log(`Tiempo máximo: ${max} ms`);
        console.log(`⏱️ Tiempo total (todos los usuarios): ${(tiempoTotal / 1000).toFixed(2)} s`);
      }
    } else {
      setTimeout(launchUser, USER_INTERVAL_MS);
    }
  });
}

launchUser();
