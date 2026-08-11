// ============================================================
// Safe Bootstrap — ловит ВСЕ ошибки включая segfault
// ============================================================

// 1. Глобальные обработчики ДО любого импорта
process.on('uncaughtException', (error) => {
  console.error('💥 UNCAUGHT EXCEPTION:', error);
  if (error && error.stack) console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('💥 UNHANDLED REJECTION:', reason);
  if (reason instanceof Error) console.error(reason.stack);
  process.exit(1);
});

process.on('warning', (warning) => {
  console.warn('⚠️  Node warning:', warning.name, warning.message);
});

console.log('🚀 Safe bootstrap started');
console.log(`Node.js ${process.version}, PID ${process.pid}`);
console.log(`ENV: ${process.env.NODE_ENV || 'development'}`);

// 2. Запуск с логированием каждого шага
async function bootstrap() {
  try {
    console.log('📦 Step 1/4: Loading server module...');
    const serverModulePath = './server.cjs';
    const serverModule = await import(serverModulePath);
    
    console.log('📦 Step 2/4: Server module loaded successfully');
    
    if (typeof serverModule.startServer === 'function') {
      console.log('📦 Step 3/4: Calling startServer()...');
      await serverModule.startServer();
      console.log('📦 Step 4/4: startServer() completed');
    } else if (typeof serverModule.default === 'function') {
      console.log('📦 Step 3/4: Calling default export...');
      await serverModule.default();
      console.log('📦 Step 4/4: Default export completed');
    } else {
      console.log('✅ Server module auto-executed on import');
    }
    
    console.log('🎉 Bootstrap completed successfully');
  } catch (error: any) {
    console.error('❌ Bootstrap failed:', error?.message || error);
    if (error?.stack) console.error(error.stack);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Fatal bootstrap error:', error);
  process.exit(1);
});
