// Script de prueba para la API de Syntage
import { consultarDatosFiscales, validarFormatoRFC } from './src/services/syntageService';

async function testSyntageAPI() {
    const rfc = 'MSM2402201U9';

    console.log('=== Prueba de API Syntage ===\n');
    console.log(`RFC a consultar: ${rfc}\n`);

    // 1. Validar formato del RFC
    console.log('1. Validando formato del RFC...');
    const validacion = validarFormatoRFC(rfc);
    console.log('   Resultado:', validacion);
    console.log();

    if (!validacion.valido) {
        console.log('❌ RFC inválido, no se puede continuar');
        return;
    }

    // 2. Consultar datos fiscales
    console.log('2. Consultando datos fiscales via Syntage...');
    const resultado = await consultarDatosFiscales(rfc);

    console.log('\n=== Respuesta de Syntage ===');
    console.log(JSON.stringify(resultado, null, 2));

    if (resultado.success && resultado.data) {
        console.log('\n✅ Consulta exitosa');
        console.log('   RFC:', resultado.data.rfc);
        console.log('   Razón Social:', resultado.data.razonSocial || '(no disponible)');
        console.log('   Tipo Persona:', resultado.data.tipoPersona);
        console.log('   Régimen Fiscal:', resultado.data.regimenFiscal || '(no disponible)');
        console.log('   Código Postal:', resultado.data.codigoPostal || '(no disponible)');
    } else {
        console.log('\n❌ Error en la consulta:', resultado.error);
    }
}

testSyntageAPI().catch(console.error);
