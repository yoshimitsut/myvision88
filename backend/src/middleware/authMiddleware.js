const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log(`🔐 [AUTH] Header: ${authHeader ? 'Present' : 'Missing'}`);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ [AUTH] No Bearer token provided');
    return res.status(401).json({ 
      success: false, 
      error: 'Acesso negado. Token não fornecido.' 
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const verified = jwt.verify(token, 'my_vision_88_fixed_secret_2026');
    console.log('✅ [AUTH] Token verified for user:', verified.username || verified.id);
    req.user = verified;
    next();
  } catch (err) {
    console.error('❌ [AUTH] Token verification failed:', err.message);
    res.status(401).json({ 
      success: false, 
      error: 'Token inválido ou expirado.' 
    });
  }
};

module.exports = authMiddleware;
