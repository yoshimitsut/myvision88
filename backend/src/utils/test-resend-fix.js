// test-resend-fix.js
const { testResend, testResendRealEmail } = require('./email');

async function runTests() {
    console.log('🚀 Executando testes Resend...\n');
    
    // Teste 1: Email de teste
    console.log('1. Testando com delivered@resend.dev...');
    await testResend();
    
    console.log('\n2. Testando com e-mail real...');
    await testResendRealEmail();
    
    console.log('\n📊 Testes concluídos!');
}

runTests();