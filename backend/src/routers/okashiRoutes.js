const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');


const UPLOAD_DIR = path.join(process.cwd(), 'uploads/myvision88');

// Função para sanitizar nome do arquivo
function sanitizeFileName(name) {
  if (!name) return 'produto';
  
  return name
    .toString()
    // Remove caracteres inválidos para arquivos
    .replace(/[\\/*?:"<>|]/g, '')
    // Substitui espaços por hífen
    .replace(/\s+/g, '-')
    // Remove hífens duplicados
    .replace(/-+/g, '-')
    // Remove hífens do início e fim
    .replace(/^-+|-+$/g, '')
    // Limita o tamanho
    .substring(0, 100);
}

// Configuração do multer para arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // const uploadPath = path.join(__dirname, '../../image');
    
    const uploadPath = UPLOAD_DIR;

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    try {
      // Log para debug
      // console.log('📦 req.body no filename:', req.body);
      
      // Pega o nome do produto do body (já deve estar populado)
      const productName = req.body.name;
      // 
      console.log('📦 Nome do produto no filename:', productName);
      
      if (!productName) {
        console.log('⚠️ Nome do produto não fornecido, usando timestamp');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        return cb(null, 'okashi-' + uniqueSuffix + ext);
      }
      
      const ext = path.extname(file.originalname).toLowerCase();
      const sanitizedName = sanitizeFileName(productName);
      
      let fileName = sanitizedName + ext;
      // console.log(`📸 Tentando salvar como: ${fileName}`);
      
      // const uploadPath = path.join(__dirname, '../../image');
      const uploadPath = UPLOAD_DIR;
      const fullPath = path.join(uploadPath, fileName);
      
      // Se já existe, adiciona timestamp
      if (fs.existsSync(fullPath)) {
        const timestamp = Date.now();
        fileName = `${sanitizedName}-${timestamp}${ext}`;
        console.log(`📸 Arquivo já existe, usando: ${fileName}`);
      }
      
      // console.log(`✅ Arquivo será salvo como: ${fileName}`);
      cb(null, fileName);
      
    } catch (error) {
      console.error('❌ Erro no filename:', error);
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, 'okashi-' + uniqueSuffix + ext);
    }
  }
});

// Configuração do multer - IMPORTANTE: usar .any() ou .fields() para processar todos os campos
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    // console.log('📸 Arquivo recebido:', file.fieldname, file.originalname);
    
    if (file.fieldname === 'image') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('画像ファイルのみ許可されています！'), false);
      }
    } else {
      cb(new Error('Campo inesperado: ' + file.fieldname), false);
    }
  }
}).single('image'); // .single('image') processa apenas o campo 'image' e coloca os campos de texto no req.body

// 🔹 Rota para criar produto com imagem
router.post('/', (req, res, next) => {
  // console.log('📦 Headers:', req.headers);
  // console.log('📦 Content-Type:', req.headers['content-type']);
  
  // Usa multer para processar a requisição
  upload(req, res, function(err) {
    if (err) {
      console.error('❌ Erro no multer:', err);
      return res.status(400).json({ 
        success: false, 
        error: err.message 
      });
    }
    
    // Log do body após processamento do multer
    // console.log('📦 req.body após multer:', req.body);
    // console.log('📦 req.file:', req.file);
    
    // Agora processa a criação do okashi
    next();
  });
}, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // console.log('📦 Dados recebidos:', req.body);

    const { name, description, sizes } = req.body;
    
    // Validação
    if (!name || !String(name).trim()) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'お菓子名は必須です' 
      });
    }

    // Pega o nome do arquivo
    const imageFilename = req.file ? req.file.filename : '';
    
    // console.log(`🖼️ Nome da imagem salva: ${imageFilename}`);
    // console.log(`📝 Nome do okashi: ${name}`);

    // Insere no banco
    const [okashiResult] = await connection.query(
      'INSERT INTO okashi (name, description, image) VALUES (?, ?, ?)',
      [String(name).trim(), description?.trim() || '', imageFilename]
    );

    const okashiId = okashiResult.insertId;

    // Processa sizes se existir
    if (sizes) {
      let sizesArray = sizes;
      if (typeof sizes === 'string') {
        try {
          sizesArray = JSON.parse(sizes);
        } catch (e) {
          console.error('Erro ao parsear sizes:', e);
          sizesArray = [];
        }
      }
      
      if (Array.isArray(sizesArray) && sizesArray.length > 0) {
        for (const size of sizesArray) {
          await connection.query(
            'INSERT INTO okashi_sizes (okashi_id, size, stock, price) VALUES (?, ?, ?, ?)',
            [okashiId, size.size, size.stock || 0, size.price || 0]
          );
        }
      }
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      okashiId: okashiId,
      image: imageFilename,
      message: 'お菓子が正常に作成されました！'
    });

  } catch (err) {
    await connection.rollback();
    console.error('❌ Erro ao criar okashi:', err);
    res.status(500).json({ 
      success: false, 
      error: 'お菓子の作成中にエラーが発生しました: ' + err.message 
    });
  } finally {
    connection.release();
  }
});

// 🔹 Rota para atualizar produto com imagem
router.put('/:id', (req, res, next) => {
  // console.log('📦 Update Headers:', req.headers);
  
  upload(req, res, function(err) {
    if (err) {
      console.error('❌ Erro no multer (update):', err);
      return res.status(400).json({ 
        success: false, 
        error: err.message 
      });
    }
    
    // console.log('📦 Update req.body:', req.body);
    // console.log('📸 Update req.file:', req.file);
    
    next();
  });
}, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const okashiId = req.params.id;
    const { name, description, sizes, existingImage } = req.body;

    // console.log('📦 Update - Dados:', { okashiId, name, description, sizes, existingImage });

    // Verifica se o okashi existe
    const [existingOkashis] = await connection.query(
      'SELECT * FROM okashi WHERE id = ?', 
      [okashiId]
    );
    
    if (existingOkashis.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        error: 'お菓子が見つかりません' 
      });
    }

    if (!name || !String(name).trim()) {
      await connection.rollback();
      return res.status(400).json({ 
        success: false, 
        error: 'お菓子名は必須です' 
      });
    }

    // Determina o nome da imagem
    let imageFilename = existingImage || existingOkashis[0].image || '';
    
    // Se nova imagem foi enviada
    if (req.file) {
      imageFilename = req.file.filename;
      
      // Deleta imagem antiga
      if (existingOkashis[0].image && existingOkashis[0].image !== imageFilename) {
        // const oldImagePath = path.join(__dirname, '../../image', existingOkashis[0].image);
        const oldImagePath = path.join(UPLOAD_DIR, existingOkashis[0].image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          // console.log(`🗑️ Imagem antiga deletada: ${existingOkashis[0].image}`);
        }
      }
    }

    // Atualiza okashi
    await connection.query(
      'UPDATE okashi SET name = ?, description = ?, image = ? WHERE id = ?',
      [String(name).trim(), description?.trim() || '', imageFilename, okashiId]
    );

    // Remove sizes antigos
    await connection.query('DELETE FROM okashi_sizes WHERE okashi_id = ?', [okashiId]);

    // Insere novos sizes
    if (sizes) {
      let sizesArray = sizes;
      if (typeof sizes === 'string') {
        try {
          sizesArray = JSON.parse(sizes);
        } catch (e) {
          console.error('Erro ao parsear sizes:', e);
          sizesArray = [];
        }
      }
      
      if (Array.isArray(sizesArray) && sizesArray.length > 0) {
        for (const size of sizesArray) {
          await connection.query(
            'INSERT INTO okashi_sizes (okashi_id, size, stock, price) VALUES (?, ?, ?, ?)',
            [okashiId, size.size, size.stock || 0, size.price || 0]
          );
        }
      }
    }

    await connection.commit();

    res.json({
      success: true,
      image: imageFilename,
      message: 'お菓子が正常に更新されました！'
    });

  } catch (err) {
    await connection.rollback();
    console.error('❌ Erro ao atualizar okashi:', err);
    res.status(500).json({ 
      success: false, 
      error: 'お菓子の更新中にエラーが発生しました: ' + err.message 
    });
  } finally {
    connection.release();
  }
});

// 🔹 Rota de upload separada
router.post('/upload', upload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: '画像が送信されていません' 
      });
    }

    res.json({
      success: true,
      filename: req.file.filename,
      message: '画像のアップロードが成功しました！'
    });
  } catch (err) {
    console.error('アップロードエラー:', err);
    res.status(500).json({ 
      success: false, 
      error: '画像のアップロードに失敗しました' 
    });
  }
});

// 🔹 Todas as outras rotas (GET, DELETE, etc)
router.get('/', async (req, res) => {
  try {
    const [okashi] = await pool.query('SELECT * FROM okashi ORDER BY id');
    const [sizes] = await pool.query('SELECT * FROM okashi_sizes ORDER BY id');

    const result = okashi.map(okashi => ({
      ...okashi,
      sizes: sizes.filter(s => s.okashi_id === okashi.id).sort((a, b) => a.id - b.id)
    }));

    res.json({ success: true, okashi: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      error: 'お菓子の取得中にエラーが発生しました' 
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const okashiId = req.params.id;
    
    const [okashi] = await pool.query('SELECT * FROM okashi WHERE id = ?', [okashiId]);
    
    if (okashi.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'お菓子が見つかりません' 
      });
    }

    const [sizes] = await pool.query(
      'SELECT * FROM okashi_sizes WHERE okashi_id = ? ORDER BY id', 
      [okashiId]
    );

    const result = {
      ...okashi[0],
      sizes: sizes
    };

    res.json({ success: true, okashi: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      error: 'お菓子の取得中にエラーが発生しました' 
    });
  }
});

router.delete('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const okashiId = req.params.id;

    const [existingOkashis] = await connection.query(
      'SELECT * FROM okashi WHERE id = ?', 
      [okashiId]
    );
    
    if (existingOkashis.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        error: 'お菓子が見つかりません' 
      });
    }

    // Deleta imagem
    if (existingOkashis[0].image) {
      // const imagePath = path.join(__dirname, '../../image', existingOkashis[0].image);
      const imagePath = path.join(UPLOAD_DIR, existingOkashis[0].image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        // console.log(`🗑️ Imagem deletada: ${existingOkashis[0].image}`);
      }
    }

    await connection.query('DELETE FROM okashi_sizes WHERE okashi_id = ?', [okashiId]);
    await connection.query('DELETE FROM okashi WHERE id = ?', [okashiId]);

    await connection.commit();

    res.json({
      success: true,
      message: 'お菓子が正常に削除されました！'
    });

  } catch (err) {
    await connection.rollback();
    console.error('❌ Erro ao deletar okashi:', err);
    res.status(500).json({ 
      success: false, 
      error: 'お菓子の削除中にエラーが発生しました' 
    });
  } finally {
    connection.release();
  }
});

module.exports = router;