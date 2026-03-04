// Importa a conexão do banco de dados
const db = require('./db'); // Ajuste o caminho conforme necessário

// Cache para as configurações
let storeConfigCache = null;
let lastLoadTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Carrega as configurações da loja do banco de dados
 */
async function loadStoreConfig(forceReload = false) {
    try {
        // Verifica se o db foi importado corretamente
        if (!db) {
            throw new Error('Conexão com banco de dados não encontrada');
        }

        const now = Date.now();
        
        // Retorna cache se válido
        if (!forceReload && storeConfigCache && lastLoadTime && (now - lastLoadTime < CACHE_DURATION)) {
            // console.log('📦 Usando cache das configurações da loja');
            return storeConfigCache;
        }

        // console.log('📦 Carregando configurações da loja do banco...');
        
        // Verifica se a tabela existe e busca os dados
        const [rows] = await db.query('SELECT * FROM store_info WHERE id = 1 LIMIT 1');
        
        if (rows.length === 0) {
            throw new Error('Configurações da loja não encontradas na tabela store_info');
        }

        storeConfigCache = rows[0];
        lastLoadTime = now;
        
        // console.log('✅ Configurações da loja carregadas com sucesso');
        return storeConfigCache;
        
    } catch (error) {
        console.error('❌ Erro ao carregar configurações:', error);
        
        // Se tiver cache, retorna como fallback
        if (storeConfigCache) {
            console.log('⚠️ Usando cache como fallback devido a erro');
            return storeConfigCache;
        }
        
        throw error;
    }
}

/**
 * Obtém uma configuração específica
 */
async function getStoreConfig(key) {
    try {
        const config = await loadStoreConfig();
        if (!config) {
            throw new Error('Configurações não disponíveis');
        }
        return config[key];
    } catch (error) {
        console.error(`❌ Erro ao obter configuração ${key}:`, error);
        throw error;
    }
}

/**
 * Limpa o cache
 */
function clearStoreCache() {
    storeConfigCache = null;
    lastLoadTime = null;
    // console.log('🧹 Cache das configurações limpo');
}

/**
 * Atualiza as configurações no banco
 */
async function updateStoreConfig(newConfig) {
    try {
        const [result] = await db.query(
            `UPDATE store_info SET 
                store_name = ?,
                mail_store = ?,
                mail_pass = ?,
                mail_resend = ?,
                resend_pass = ?,
                site_back = ?,
                tel = ?,
                open_hour = ?
            WHERE id = 1`,
            [
                newConfig.store_name,
                newConfig.mail_store,
                newConfig.mail_pass,
                newConfig.mail_resend,
                newConfig.resend_pass,
                newConfig.site_back,
                newConfig.tel,
                newConfig.open_hour
            ]
        );

        if (result.affectedRows > 0) {
            clearStoreCache();
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('❌ Erro ao atualizar configurações:', error);
        throw error;
    }
}

module.exports = {
    loadStoreConfig,
    getStoreConfig,
    clearStoreCache,
    updateStoreConfig
};