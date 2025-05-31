const puppeteer = require('puppeteer');
const fs = require('fs');

const URL = 'https://p68q6qtp-8501.use2.devtunnels.ms/';
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
  '¿Cuales materias se ven en el primer semestre de ingeniería de sistemas?'
];
const CONCURRENCY = 2;
const TOTAL_USERS = 10;

let tiempos = [];

async function simulateUser(id) {
  const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 0 });

    // Paso 1: Si existe botón de continuar, hacer clic
    try {
      await page.waitForSelector('#continue', { timeout: 8000 });
      await page.click('#continue');
      console.log(`Usuario ${id}: clic en 'Continuar'`);
    } catch (e) {
      console.log(`Usuario ${id}: botón 'Continuar' no fue necesario o no apareció`);
    }

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

    console.log(`✅ Usuario ${id}: ${responseTime.toFixed(2)} ms`);

  } catch (err) {
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
  const csvLines = ['usuario,tiempo_ms'];
  for (const t of tiempos) {
    csvLines.push(`${t.id},${t.responseTime.toFixed(2)}`);
  }
  fs.writeFileSync('resultados.csv', csvLines.join('\n'));
  console.log('✅ Archivo resultados.csv guardado con éxito.');

  // Estadísticas básicas
  if (tiempos.length > 0) {
    const duraciones = tiempos.map(t => t.responseTime);
    const promedio = duraciones.reduce((a, b) => a + b, 0) / duraciones.length;
    const max = Math.max(...duraciones);
    const min = Math.min(...duraciones);
    console.log('\n📊 Resultados de la prueba de carga:');
    console.log(`Usuarios simulados: ${tiempos.length}`);
    console.log(`Tiempo promedio: ${promedio.toFixed(2)} ms`);
    console.log(`Tiempo mínimo: ${min.toFixed(2)} ms`);
    console.log(`Tiempo máximo: ${max.toFixed(2)} ms`);
  } else {
    console.log('No se pudieron medir tiempos.');
  }
}



runLoadTest();
