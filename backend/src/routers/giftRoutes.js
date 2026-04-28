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
        return cb(null, 'gift-' + uniqueSuffix + ext);
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
      cb(null, 'gift-' + uniqueSuffix + ext);
    }
  }
});

// Configuração do multer - IMPORTANTE: usar .any() ou .fields() para processar todos os campos
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    // console.log('📸 Arquivo recebido:', file.fieldname, file.originalname);
    
    if (file.fieldname === 'images') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('画像ファイルのみ許可されています！'), false);
      }
    } else {
      cb(new Error('Campo inesperado: ' + file.fieldname), false);
    }
  }
}).array('images', 10); // Permite até 10 imagens por produto

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
    
    // Agora processa a criação do gift
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

    // Pega os nomes dos arquivos
    const images = req.files ? req.files.map(f => f.filename) : [];
    const mainImage = images.length > 0 ? images[0] : '';
    
    // console.log(`🖼️ Imagens salvas: ${images.join(', ')}`);
    // console.log(`📝 Nome do gift: ${name}`);

    // Insere no banco (gift principal)
    const [giftResult] = await connection.query(
      'INSERT INTO gift (name, description, image) VALUES (?, ?, ?)',
      [String(name).trim(), description?.trim() || '', mainImage]
    );

    const giftId = giftResult.insertId;

    // Insere todas as imagens na tabela gift_images
    for (const img of images) {
      await connection.query(
        'INSERT INTO gift_images (gift_id, image_path) VALUES (?, ?)',
        [giftId, img]
      );
    }

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
            'INSERT INTO gift_sizes (gift_id, size, stock, price) VALUES (?, ?, ?, ?)',
            [giftId, size.size, size.stock || 0, size.price || 0]
          );
        }
      }
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      giftId: giftId,
      images: images,
      message: 'お菓子が正常に作成されました！'
    });

  } catch (err) {
    await connection.rollback();
    console.error('❌ Erro ao criar gift:', err);
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

    const giftId = req.params.id;
    const { name, description, sizes, existingImages } = req.body;

    // console.log('📦 Update - Dados:', { giftId, name, description, sizes, existingImages });

    // Verifica se o gift existe
    const [existingGifts] = await connection.query(
      'SELECT * FROM gift WHERE id = ?', 
      [giftId]
    );
    
    if (existingGifts.length === 0) {
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

    // Processa imagens existentes (as que devem ser mantidas)
    let imagesToKeep = [];
    if (existingImages) {
      imagesToKeep = Array.isArray(existingImages) ? existingImages : JSON.parse(existingImages);
    }

    // Busca imagens atuais no banco para saber quais deletar do disco
    const [currentImages] = await connection.query('SELECT image_path FROM gift_images WHERE gift_id = ?', [giftId]);
    const imagesToDelete = currentImages
      .map(img => img.image_path)
      .filter(img => !imagesToKeep.includes(img));

    // Deleta arquivos do disco
    for (const imgName of imagesToDelete) {
      const imgPath = path.join(UPLOAD_DIR, imgName);
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    }

    // Atualiza gift_images (remove as que não devem ser mantidas)
    await connection.query('DELETE FROM gift_images WHERE gift_id = ?', [giftId]);
    for (const imgPath of imagesToKeep) {
      await connection.query('INSERT INTO gift_images (gift_id, image_path) VALUES (?, ?)', [giftId, imgPath]);
    }

    // Adiciona novas imagens se enviadas
    const newImages = req.files ? req.files.map(f => f.filename) : [];
    for (const imgPath of newImages) {
      await connection.query('INSERT INTO gift_images (gift_id, image_path) VALUES (?, ?)', [giftId, imgPath]);
    }

    // Atualiza a imagem principal (usa a primeira mantida ou a primeira nova)
    const allImages = [...imagesToKeep, ...newImages];
    const mainImage = allImages.length > 0 ? allImages[0] : '';

    // Atualiza gift
    await connection.query(
      'UPDATE gift SET name = ?, description = ?, image = ? WHERE id = ?',
      [String(name).trim(), description?.trim() || '', mainImage, giftId]
    );

    // Remove sizes antigos
    await connection.query('DELETE FROM gift_sizes WHERE gift_id = ?', [giftId]);

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
            'INSERT INTO gift_sizes (gift_id, size, stock, price) VALUES (?, ?, ?, ?)',
            [giftId, size.size, size.stock || 0, size.price || 0]
          );
        }
      }
    }

    await connection.commit();

    res.json({
      success: true,
      images: allImages,
      message: 'お菓子が正常に更新されました！'
    });

  } catch (err) {
    await connection.rollback();
    console.error('❌ Erro ao atualizar gift:', err);
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
    const [gift] = await pool.query('SELECT * FROM gift ORDER BY id');
    const [sizes] = await pool.query('SELECT * FROM gift_sizes ORDER BY id');
    const [images] = await pool.query('SELECT * FROM gift_images ORDER BY id');

    const result = gift.map(gift => ({
      ...gift,
      sizes: sizes.filter(s => s.gift_id === gift.id).sort((a, b) => a.id - b.id),
      images: images.filter(img => img.gift_id === gift.id).map(img => img.image_path)
    }));

    res.json({ success: true, gift: result });
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
    const giftId = req.params.id;
    
    const [gift] = await pool.query('SELECT * FROM gift WHERE id = ?', [giftId]);
    
    if (gift.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'お菓子が見つかりません' 
      });
    }

    const [sizes] = await pool.query(
      'SELECT * FROM gift_sizes WHERE gift_id = ? ORDER BY id', 
      [giftId]
    );

    const [images] = await pool.query(
      'SELECT image_path FROM gift_images WHERE gift_id = ? ORDER BY id',
      [giftId]
    );

    const result = {
      ...gift[0],
      sizes: sizes,
      images: images.map(img => img.image_path)
    };

    res.json({ success: true, gift: result });
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

    const giftId = req.params.id;

    const [existingGifts] = await connection.query(
      'SELECT * FROM gift WHERE id = ?', 
      [giftId]
    );
    
    if (existingGifts.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        success: false, 
        error: 'お菓子が見つかりません' 
      });
    }

    // Deleta imagens do disco
    const [images] = await connection.query('SELECT image_path FROM gift_images WHERE gift_id = ?', [giftId]);
    for (const img of images) {
      const imagePath = path.join(UPLOAD_DIR, img.image_path);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await connection.query('DELETE FROM gift_sizes WHERE gift_id = ?', [giftId]);
    await connection.query('DELETE FROM gift WHERE id = ?', [giftId]);

    await connection.commit();

    res.json({
      success: true,
      message: 'お菓子が正常に削除されました！'
    });

  } catch (err) {
    await connection.rollback();
    console.error('❌ Erro ao deletar gift:', err);
    res.status(500).json({ 
      success: false, 
      error: 'お菓子の削除中にエラーが発生しました' 
    });
  } finally {
    connection.release();
  }
});

module.exports = router;