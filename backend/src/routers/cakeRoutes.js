const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 🔹 画像アップロードのためのMULTER設定
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../images');
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // ファイル名を一意に生成
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'cake-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: function (req, file, cb) {
    // 画像ファイルか確認
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('画像ファイルのみ許可されています！'), false);
    }
  }
});

// 🔹 画像アップロードルート
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '画像が送信されていません' });
    }

    res.json({
      success: true,
      filename: req.file.filename,
      message: '画像のアップロードが成功しました！'
    });
  } catch (err) {
    console.error('アップロードエラー:', err);
    res.status(500).json({ success: false, error: '画像のアップロードに失敗しました' });
  }
});

// 🔹 全てのケーキとサイズをリスト
router.get('/', async (req, res) => {
  try {
    const [cakes] = await pool.query('SELECT * FROM cakes ORDER BY id');
    const [sizes] = await pool.query('SELECT * FROM cake_sizes ORDER BY id');

    const result = cakes.map(cake => ({
      ...cake,
      sizes: sizes.filter(s => s.cake_id === cake.id).sort((a, b) => a.id - b.id)
    }));

    res.json({ success: true, cakes: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'ケーキの取得中にエラーが発生しました' });
  }
});

// 🔹 IDでケーキを検索
router.get('/:id', async (req, res) => {
  try {
    const cakeId = req.params.id;
    
    const [cakes] = await pool.query('SELECT * FROM cakes WHERE id = ?', [cakeId]);
    
    if (cakes.length === 0) {
      return res.status(404).json({ success: false, error: 'ケーキが見つかりません' });
    }

    const [sizes] = await pool.query('SELECT * FROM cake_sizes WHERE cake_id = ? ORDER BY id', [cakeId]);

    const result = {
      ...cakes[0],
      sizes: sizes
    };

    res.json({ success: true, cake: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'ケーキの取得中にエラーが発生しました' });
  }
});

// 🔹 新しいケーキを作成
router.post('/', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { name, description, image, sizes } = req.body;

    // 必須データを検証
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'ケーキ名は必須です' });
    }

    // ケーキを挿入
    const [cakeResult] = await connection.query(
      'INSERT INTO cakes (name, description, image) VALUES (?, ?, ?)',
      [name.trim(), description?.trim() || '', image || '']
    );

    const cakeId = cakeResult.insertId;

    // サイズが提供された場合は挿入
    if (sizes && sizes.length > 0) {
      for (const size of sizes) {
        if (size.size && size.size.trim()) {
          await connection.query(
            'INSERT INTO cake_sizes (cake_id, size, stock, price) VALUES (?, ?, ?, ?)',
            [cakeId, size.size.trim(), size.stock || 0, size.price || 0]
          );
        }
      }
    }

    await connection.commit();

    // 作成されたケーキをサイズ付きで取得
    const [cakes] = await connection.query('SELECT * FROM cakes WHERE id = ?', [cakeId]);
    const [sizesResult] = await connection.query('SELECT * FROM cake_sizes WHERE cake_id = ? ORDER BY id', [cakeId]);

    const result = {
      ...cakes[0],
      sizes: sizesResult
    };

    res.status(201).json({
      success: true,
      cake: result,
      message: 'ケーキが正常に作成されました！'
    });

  } catch (err) {
    await connection.rollback();
    console.error('ケーキ作成エラー:', err);
    res.status(500).json({ success: false, error: 'ケーキの作成中にエラーが発生しました' });
  } finally {
    connection.release();
  }
});

// 🔹 ケーキを更新
router.put('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const cakeId = req.params.id;
    const { name, description, image, sizes } = req.body;

    // ケーキが存在するか確認
    const [existingCakes] = await connection.query('SELECT * FROM cakes WHERE id = ?', [cakeId]);
    if (existingCakes.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'ケーキが見つかりません' });
    }

    // データを検証
    if (!name || !name.trim()) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'ケーキ名は必須です' });
    }

    // ケーキを更新
    await connection.query(
      'UPDATE cakes SET name = ?, description = ?, image = ? WHERE id = ?',
      [name.trim(), description?.trim() || '', image || '', cakeId]
    );

    // 既存のサイズを削除
    await connection.query('DELETE FROM cake_sizes WHERE cake_id = ?', [cakeId]);

    // 新しいサイズを挿入
    if (sizes && sizes.length > 0) {
      for (const size of sizes) {
        if (size.size && size.size.trim()) {
          await connection.query(
            'INSERT INTO cake_sizes (cake_id, size, stock, price) VALUES (?, ?, ?, ?)',
            [cakeId, size.size.trim(), size.stock || 0, size.price || 0]
          );
        }
      }
    }

    await connection.commit();

    // 更新されたケーキを取得
    const [cakes] = await connection.query('SELECT * FROM cakes WHERE id = ?', [cakeId]);
    const [sizesResult] = await connection.query('SELECT * FROM cake_sizes WHERE cake_id = ? ORDER BY id', [cakeId]);

    const result = {
      ...cakes[0],
      sizes: sizesResult
    };

    res.json({
      success: true,
      cake: result,
      message: 'ケーキが正常に更新されました！'
    });

  } catch (err) {
    await connection.rollback();
    console.error('ケーキ更新エラー:', err);
    res.status(500).json({ success: false, error: 'ケーキの更新中にエラーが発生しました' });
  } finally {
    connection.release();
  }
});

// 🔹 ケーキを削除
router.delete('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const cakeId = req.params.id;

    // ケーキが存在するか確認
    const [existingCakes] = await connection.query('SELECT * FROM cakes WHERE id = ?', [cakeId]);
    if (existingCakes.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'ケーキが見つかりません' });
    }

    // まずサイズを削除（外部キーのため）
    await connection.query('DELETE FROM cake_sizes WHERE cake_id = ?', [cakeId]);
    
    // ケーキを削除
    await connection.query('DELETE FROM cakes WHERE id = ?', [cakeId]);

    await connection.commit();

    res.json({
      success: true,
      message: 'ケーキが正常に削除されました！'
    });

  } catch (err) {
    await connection.rollback();
    console.error('ケーキ削除エラー:', err);
    res.status(500).json({ success: false, error: 'ケーキの削除中にエラーが発生しました' });
  } finally {
    connection.release();
  }
});

module.exports = router;