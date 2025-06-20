const puppeteer = require('puppeteer');
const fs = require('fs');

const URL = 'http://localhost:8501/';
const PREGUNTAS = [
  '¿Cuántos créditos tiene la resolución 047?',
  '¿Que es el PEP?',
  '¿Que es la matricula academica?',
  'Que es un bajo rendimiento académico?',
  '¿Que es una habilitación?',
  '¿Que es un examen de suficiencia?',
  '¿Cuales son las modalidades de trabajo de grado de la facultad de ingeniería?',
  '¿Que es la matricula financiera?',
  '¿Que es un crédito académico?',
  '¿Que es un curso electivo?',
  '¿Cuales materias se ven en el primer semestre de ingeniería de sistemas?',
  '¿Cuales son los derechos y deberes de los estudiantes?',
  '¿Que es un examen de validación?',
  '¿Cuales son las caracteristicas generales del programa academico de ingeniería de sistemas?',
  '¿Que nivel de inglés se requiere para graduarse?'
];
const CONCURRENCY = 20;
const TOTAL_USERS = 200;

let tiempos = [];
let errores = [];

async function simulateUser(id) {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 0 });

    // Paso 1: Si existe botón de continuar, hacer clic
    // try {
    //   await page.waitForSelector('#continue', { timeout: 1000 });
    //   await page.click('#continue');
    //   //console.log(`Usuario ${id}: clic en 'Continuar'`);
    // } catch (e) {
    //   console.log(`Usuario ${id}: botón 'Continuar' no fue necesario o no apareció`);
    // }

    // Paso 2: Esperar que se cargue el textarea
    await page.waitForSelector('textarea[data-testid="stChatInputTextArea"]', { timeout: 30000 });

    // Paso 3: Escribir la pregunta
    const preguntaAleatoria = PREGUNTAS[Math.floor(Math.random() * PREGUNTAS.length)];
    await page.type('textarea[data-testid="stChatInputTextArea"]', preguntaAleatoria);

    // Paso 4: Esperar que el botón de envío esté listo y hacer clic
    const buttonSelector = 'button[data-testid="stChatInputSubmitButton"]';
    await page.waitForSelector(buttonSelector, { visible: true});

    const startTime = performance.now();
    await page.click(buttonSelector);

    //Esperar hasta que aparezca el texto final
    await page.waitForFunction(() => {
      const elements = document.querySelectorAll('div');
      return Array.from(elements).some(el => el.innerText.includes("Tiempo de respuesta"));
    }, { timeout: 60000 });

    const endTime = performance.now();
    const responseTime = endTime - startTime;
    tiempos.push({id, responseTime});

    //console.log(`✅ Usuario ${id}: ${responseTime.toFixed(2)} ms`);

  } catch (err) {
    errores.push({id, error: 'err'});
    console.error(`❌ Usuario ${id} falló: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function runLoadTest() {
  for (let i = 0; i < TOTAL_USERS; i += CONCURRENCY) {
    const batch = [];
    for (let j = 0; j < CONCURRENCY && i + j < TOTAL_USERS; j++) {
      batch.push(simulateUser(i + j + 1));
    }
    await Promise.all(batch);
    console.log(`--- Completados ${Math.min(i + CONCURRENCY, TOTAL_USERS)} usuarios ---`);
  }

  // Guardar resultados en CSV
  const csvLines = ['usuario, tiempo_ms, status'];

  for (const t of tiempos) {
    csvLines.push(`${t.id},${t.responseTime.toFixed(2)}, 'OK'`);
  }

  for (const e of errores) {
    csvLines.push(`${e.id},0, 'ERROR'`);
  }

  fs.writeFileSync('resultados_20_200.csv', csvLines.join('\n'));
  console.log('✅ Archivo resultados.csv guardado con éxito.');

  // Estadísticas básicas
  // if (tiempos.length > 0) {
  //   const duraciones = tiempos.map(t => t.responseTime);
  //   const promedio = duraciones.reduce((a, b) => a + b, 0) / duraciones.length;
  //   const max = Math.max(...duraciones);
  //   const min = Math.min(...duraciones);

  //   const rangos = {
  //     "< 5s": duraciones.filter(t => t < 5000).length,
  //     "5s - 10s": duraciones.filter(t => t >= 5000 && t < 10000).length,
  //     "10s - 15s": duraciones.filter(t => t >= 10000 && t < 15000).length,
  //     "> 15s": duraciones.filter(t => t >= 15000).length,
  //   };

  //   console.log('\n📊 Estadísticas:');
  //   console.log(`Usuarios exitosos: ${tiempos.length}`);
  //   console.log(`Usuarios con error: ${errores.length}`);
  //   console.log(`Tiempo promedio: ${promedio.toFixed(2)} ms`);
  //   console.log(`Tiempo mínimo: ${min.toFixed(2)} ms`);
  //   console.log(`Tiempo máximo: ${max.toFixed(2)} ms`);
  //   console.log(`\nDistribución por rangos:`);
  //   for (const [rango, cantidad] of Object.entries(rangos)) {
  //     console.log(`${rango}: ${cantidad}`);
  //   }
  // } else {
  //   console.log('❌ No se pudieron medir tiempos.');
  // }
}



runLoadTest();
