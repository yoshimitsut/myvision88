const { Resend } = require('resend');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { loadStoreConfig, getStoreConfig } = require('../config/storeConfig');

/**
 * Obtém instância do Resend
 */
async function getResendInstance() {
    const resendPass = await getStoreConfig('resend_pass');
    return new Resend(resendPass);
}

/**
 * Obtém transporter do Nodemailer
 */
async function getTransporter() {
    const [mailStore, mailPass] = await Promise.all([
        getStoreConfig('mail_store'),
        getStoreConfig('mail_pass')
    ]);
    
    return nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: mailStore,
            pass: mailPass
        }
    });
}

/**
 * Formata data para japonês
 */
const formatDateJP = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日`;
};

/**
 * Envia confirmação de novo pedido
 */
async function sendNewOrderConfirmation(newOrder, orderId) {
    try {
        const qrCodeBuffer = await QRCode.toBuffer(String(orderId), { type: 'png', width: 400 });
        const qrCodeContentId = 'qrcode_order_id';
        
        // Carrega as configurações uma única vez
        const config = await loadStoreConfig();
        const resend = await getResendInstance();

        const totalGeral = newOrder.cakes.reduce((total, cake) => {
            return total + ((cake.price) * cake.amount);
        }, 0);

        const htmlContent = `
        <div style="border: 1px solid #ddd; padding: 20px; max-width: 400px; margin: 0 auto; font-family: Arial, sans-serif;">  
            <h2>🎂 注文ありがとうございます！</h2>
            <p>お名前: ${newOrder.first_name} ${newOrder.last_name}</p>
            <p>受付番号: <strong>${String(orderId).padStart(4, "0")}</strong></p>
            <p>電話番号: ${newOrder.tel}</p>
            <p>受け取り日時: ${newOrder.date} / ${newOrder.pickupHour}</p>
            <p>メッセージ: ${newOrder.message || '無し'}</p>

            <h3 style="border-bottom: 2px solid #333; padding-bottom: 5px;">ご注文商品</h3>
                    
            ${newOrder.cakes.map(cake => {
                const fruitPrice = cake.fruit_option === '有り' ? 648 : 0;
                const cakeTotalPrice = (cake.price + fruitPrice) * cake.amount;

                return `
                    <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse; background: #f9f9f9; border-radius: 8px; overflow: hidden;">
                        <tr>
                            <td style="width: 120px; padding: 15px 0px 15px 15px; vertical-align: top;">
                                <img src="${config.site_back}/image/${config.folder_img}/${cake.image}" 
                                    alt="${cake.name}" 
                                    width="100" 
                                    style="border-radius: 6px; border: 1px solid #ddd;"
                                    onerror="this.style.display='none'">
                            </td>
                            <td style="padding: 15px 10px 15px 0px; vertical-align: top;">
                                <h3 style="margin: 0 0 10px 0;">${cake.name}</h3>
                                ${cake.size ? `<p style="margin: 5px 0;"><strong>サイズ:</strong> ${cake.size}</p>` : ''}
                                <p style="margin: 5px 0;"><strong>個数:</strong> ${cake.amount}個</p>
                                <p style="margin: 5px 0;"><strong>価格:</strong> ¥${Math.trunc(cake.price).toLocaleString("ja-JP")}</p>
                                ${cake.message_cake ? `<p style="margin: 5px 0;"><strong>メッセージプレート:</strong> ${cake.message_cake}</p>` : ''}
                                <p style="margin: 5px 0;"><strong>フルーツ盛り:</strong> ${cake.fruit_option === '有り' ? '有り ＋648円' : '無し'}
                                <hr/>
                                <strong>小計 ¥${Math.trunc(cakeTotalPrice).toLocaleString("ja-JP")}</strong>
                            </td>
                        </tr>
                    </table>
                `}).join('')}

            <div style="max-width: 400px; background: #ddd; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <h3 style="margin: 0; color: #000;">合計金額</h3>
                <p style="font-size: 24px; font-weight: bold; margin: 10px 0 0 0;">
                    ¥${Math.trunc(newOrder.cakes.reduce((total, cake) => {
                        const fruitPrice = cake.fruit_option === '有り' ? 648 : 0;
                        return total + ((cake.price + fruitPrice) * cake.amount)
                        }, 0)).toLocaleString("ja-JP")
                    }
                    <span style="font-size: 14px; font-weight: normal;">(税込)</span>
                </p>
                <p><strong style="color: red;">事前にお支払いで受け取りスムーズ</strong></p>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
                <p><strong>受付用QRコード</strong></p>
                <p><strong style="color: red;">受け取り時にご提示ください。</strong></p>
                <img src="cid:${qrCodeContentId}" width="300" style="display: block; margin: 0 auto;" />
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 20px;">
                <p style="margin: 0; font-size: 14px;">上記の内容に相違がございましたら、お手数をお掛けしますが、</p>
                <p style="margin: 5px 0 0 0; font-size: 14px;">ご連絡をお願いいたします。</p>
                <p style="margin: 5px 0 0 0; font-size: 10px; color: red; text-align: center;">※ご注文をキャンセルされる場合、商品受取日3日前までにお店にご連絡お願い致します。</p>
                <p style="margin: 10px 0 0 0;"><strong style="font-size: large;">${config.store_name}</strong></p>
                <p style="margin: 5px 0;">OPEN ${config.open_hour}</p>
                <p style="margin: 5px 0;">TEL: <a href="tel:${config.tel}" style="color: #007bff; text-decoration: none;">${config.tel}</a></p>
            </div>
            <p style="text-align: center; margin-top: 20px; font-style: italic;">宜しくお願いいたします。</p>
        </div>
        `;

        const result = await resend.emails.send({
            from: `"${config.store_name}" <order@yoyaku.myvision88.com>`,
            to: [newOrder.email, config.mail_store],
            subject: `🎂 ご注文確認 - 受付番号 ${String(orderId).padStart(4, "0")}`,
            html: htmlContent,
            attachments: [{
                filename: 'qrcode.png',
                content: qrCodeBuffer,
                contentDisposition: 'inline',
                contentId: qrCodeContentId
            }]
        });

        return { success: true, result };
    } catch (error) {
        console.error('Erro em sendNewOrderConfirmation:', error);
        throw error;
    }
}

/**
 * Envia notificação de alteração
 */
async function sendOrderUpdateNotification(orderData) {
    try {
        const qrCodeBuffer = await QRCode.toBuffer(String(orderData.id_order).padStart(4, "0"), { type: 'png', width: 400 });
        const qrCodeContentId = 'qrcode_order_id';
        
        // Carrega as configurações uma única vez
        const config = await loadStoreConfig();
        const transporter = await getTransporter();
        
        const cakeListHtml = orderData.cakes.map(cake => {
            const fruitPrice = cake.fruit_option === '有り' ? 648 : 0;
            const cakeTotalPrice = (cake.price + fruitPrice) * cake.amount;
            return `
                <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse; background: #f9f9f9; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="width: 120px; padding: 15px 0px 15px 15px; vertical-align: top;">
                            <img src="${config.site_back}/image/${config.folder_img}/${cake.image}" 
                                alt="${cake.name}" 
                                width="100" 
                                style="border-radius: 6px; border: 1px solid #ddd;"
                                onerror="this.style.display='none'">
                        </td>
                        <td style="padding: 15px 10px 15px 0px; vertical-align: top;">
                            <h3 style="margin: 0 0 10px 0;">${cake.name}</h3>
                            <p style="margin: 5px 0;"><strong>サイズ:</strong> ${cake.size}</p>
                            <p style="margin: 5px 0;"><strong>個数:</strong> ${cake.amount}個</p>
                            <p style="margin: 5px 0;"><strong>価格:</strong> ¥${Math.trunc(cake.price).toLocaleString()}</p>
                            <p style="margin: 5px 0;"><strong>フルーツ盛り:</strong> ${cake.fruit_option === '有り' ? '有り ＋648円' : '無し'}
                            ${cake.message_cake ? `<p style="margin: 5px 0;"><strong>メッセージ:</strong> ${cake.message_cake}</p>` : ''}
                            <hr/>
                            <strong>小計: ¥${Math.trunc(cakeTotalPrice).toLocaleString("ja-JP")}</strong>
                        </td>
                    </tr>
                </table>
            `;
        }).join('');

        const totalGeral = orderData.cakes.reduce((total, cake) => {
            const fruitPrice = cake.fruit_option === '有り' ? 648 : 0;
            return total + ((cake.price + fruitPrice) * cake.amount);
        }, 0);

        const mailOptions = {
            from: `"${config.store_name}" <${config.mail_resend}>`,
            to: [orderData.email, config.mail_store],
            subject: `🎂 ご注文内容変更 - 受付番号 ${String(orderData.id_order).padStart(4, "0")}`,
            html: `
                <div style="border: 1px solid #ddd; padding: 20px; max-width: 400px; margin: 0 auto;">
                    <h2 style="text-align: center;">以下の内容に変更しました</h2>
                    <p><strong>お名前：</strong> ${orderData.first_name} ${orderData.last_name}様</p>
                    <p><strong>受付番号：</strong> ${String(orderData.id_order).padStart(4, "0")}</p>
                    <p><strong>受取日時：</strong> ${orderData.date} / ${orderData.pickupHour}</p>
                    <p><strong>メッセージ：</strong> ${orderData.message || '無し'}</p>
                    
                    <h3 style="border-bottom: 2px solid #333; padding-bottom: 5px;">ご注文商品</h3>
                    ${cakeListHtml}

                    <div style="max-width: 400px; background: #ddd; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                        <h3 style="margin: 0; color: #000;">合計金額</h3>
                        <p style="font-size: 24px; font-weight: bold; margin: 10px 0 0 0;">
                            ¥${Math.trunc(totalGeral).toLocaleString("ja-JP")}
                            <span style="font-size: 14px; font-weight: normal;">(税込)</span>
                        </p>
                    </div>

                    <div style="text-align: center; margin: 20px 0;">
                        <p><strong>受付用QRコード</strong></p>
                        <p><strong style="color: red;">受け取り時にご提示ください。</strong></p>
                        <img src="cid:${qrCodeContentId}" width="300" style="display: block; margin: 0 auto;" />
                    </div>

                    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 20px;">
                        <p style="margin: 0; font-size: 14px;">上記の内容に相違がございましたら、お手数をお掛けしますが、</p>
                        <p style="margin: 5px 0 0 0; font-size: 14px;">ご連絡をお願いいたします。</p>
                        <p style="margin: 5px 0 0 0; font-size: 10px; color: red; text-align: center;">※ご注文をキャンセルされる場合、商品受取日3日前までにお店にご連絡お願い致します。</p>
                        <p style="margin: 10px 0 0 0;"><strong style="font-size: large;">${config.store_name}</strong></p>
                        <p style="margin: 5px 0;">OPEN ${config.open_hour}</p>
                        <p style="margin: 5px 0;">TEL: <a href="tel:${config.tel}" style="color: #007bff; text-decoration: none;">${config.tel}</a></p>
                    </div>
                </div>
            `,
            attachments: [{
                filename: 'qrcode.png',
                content: qrCodeBuffer,
                contentId: qrCodeContentId,

                contentDisposition: 'inline',
                contentType: 'image/png', 
                cid: qrCodeContentId
            }]
        };

        const result = await transporter.sendMail(mailOptions);
        return { success: true, result };
    } catch (error) {
        console.error('Erro em sendOrderUpdateNotification:', error);
        throw error;
    }
}

/**
 * Envia notificação de cancelamento
 */
async function sendCancellationNotification(order, cakesDetails) {
    try {
        const orderId = order.id_order;
        const cakeListHtml = cakesDetails.map(cake => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${cake.name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${cake.size}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${cake.amount}個</td>
            </tr>
        `).join('');

        const formattedDate = formatDateJP(order.date);
        
        // Carrega as configurações uma única vez
        const config = await loadStoreConfig();
        const transporter = await getTransporter();

        const mailOptions = {
            from: `"${config.store_name}" <${config.mail_resend}>`,
            to: [order.email, config.mail_store],
            subject: `ご注文キャンセル完了 - 受付番号 ${String(orderId).padStart(4, "0")}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #d32f2f;">注文がキャンセルされました</h2>
                        <p style="color: #666;">以下の注文がキャンセル処理されました</p>
                    </div>

                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="margin: 0 0 10px 0; color: #333;">注文詳細</h3>
                        <p><strong>受付番号：</strong> ${String(orderId).padStart(4, "0")}</p>
                        <p><strong>お名前：</strong> ${order.first_name} ${order.last_name}様</p>
                        <p><strong>受取予定日：</strong> ${formattedDate}</p>
                        <p><strong>受取時間：</strong> ${order.pickupHour}</p>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #333; margin-bottom: 10px;">キャンセルされた商品</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f5f5f5;">
                                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">商品名</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">サイズ</th>
                                    <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">数量</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${cakeListHtml}
                            </tbody>
                        </table>
                    </div>

                    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border: 1px solid #ffeaa7; margin-bottom: 20px;">
                        <h4 style="color: #856404; margin: 0 0 10px 0;">📝 キャンセルについて</h4>
                        <p style="color: #856404; margin: 0; font-size: 14px;">
                            ご注文のキャンセルが完了しました。<br>
                            ご不明な点がございましたら、下記までご連絡ください。
                        </p>
                    </div>

                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                        <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                            <strong style="font-size: large;">${config.store_name} </strong><br>
                            OPEN ${config.open_hour}<br>
                            TEL: <a href="tel:${config.tel}" style="color: #007bff;">${config.tel}</a>
                        </p>
                        <p style="margin: 0; font-size: 12px; color: #999;">
                            このメールは自動送信されています
                        </p>    
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        return { success: true, result };
    } catch (error) {
        console.error('Erro em sendCancellationNotification:', error);
        throw error;
    }
}

async function sendOrderCompletedNotification(order) {
    try {
        const config = await loadStoreConfig();
        const transporter = await getTransporter();

        const formattedDate = formatDateJP(order.date);

        const mailOptions = {
            from: `"${config.store_name}" <${config.mail_store}>`,
            to: order.email,
            subject: `ご注文お渡し完了 - 受付番号 ${String(order.id_order).padStart(4, "0")}`,
            html: `
                 <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #2e7d32;">✅ ご注文のお渡しが完了しました</h2>
                        <p style="color: #666;">ご利用ありがとうございました</p>
                    </div>

                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="margin: 0 0 10px 0; color: #333;">注文詳細</h3>
                        <p><strong>受付番号：</strong> ${String(order.id_order).padStart(4, "0")}</p>
                        <p><strong>お名前：</strong> ${order.first_name} ${order.last_name}様</p>
                        <p><strong>受取日：</strong> ${formattedDate}</p>
                        <p><strong>受取時間：</strong> ${order.pickupHour}</p>
                    </div>

                    <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border: 1px solid #c8e6c9; margin-bottom: 20px; text-align: center;">
                        <p style="color: #2e7d32; margin: 0; font-size: 16px;">
                            またのご利用を心よりお待ちしております。🎂
                        </p>
                    </div>

                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                        <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                            <strong style="font-size: large;">${config.store_name}</strong><br>
                            OPEN ${config.open_hour}<br>
                            TEL: <a href="tel:${config.tel}" style="color: #007bff; text-decoration: none;">${config.tel}</a>
                        </p>
                        <p style="margin: 0; font-size: 12px; color: #999;">
                            このメールは自動送信されています
                        </p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        return { success: true, result };
    } catch (error) {
        console.error('Error em sendOrderCompletedNotification:', error);
        throw error;
    }
}


/**
 * Envia confirmação de novo pedido de Gift
 */
async function sendNewGiftOrderConfirmation(newOrder, orderId) {
    try {
        const QRCode = require('qrcode');
        const qrCodeBuffer = await QRCode.toBuffer(`G-${String(orderId)}`, { type: 'png', width: 400 });
        const qrCodeContentId = 'qrcode_gift_order_id';
        
        const config = await loadStoreConfig();
        const resend = await getResendInstance();

        const totalGeral = newOrder.items.reduce((total, item) => {
            return total + (item.price * item.amount);
        }, 0);

        const deliveryLabel = newOrder.delivery_method === 'shipping' ? '配送' : '店舗受取';
        
        const addressHtml = newOrder.delivery_method === 'shipping' ? `
            <div style="background: #f0f8ff; padding: 12px; border-radius: 6px; margin: 10px 0;">
                <p style="margin: 5px 0;"><strong>配送先住所:</strong></p>
                <p style="margin: 3px 0;">〒${newOrder.postal_code || ''}</p>
                <p style="margin: 3px 0;">${newOrder.prefecture || ''} ${newOrder.city || ''}</p>
                <p style="margin: 3px 0;">${newOrder.address1 || ''}</p>
                ${newOrder.address2 ? `<p style="margin: 3px 0;">${newOrder.address2}</p>` : ''}
            </div>
        ` : '';

        // Preparar anexos e CIDs para as imagens dos produtos
        const attachments = [
            {
                filename: 'qrcode.png',
                content: qrCodeBuffer,
                contentDisposition: 'inline',
                contentId: qrCodeContentId
            }
        ];

        // Mapear itens para incluir o CID da imagem
        const itemsWithCid = newOrder.items.map((item, index) => {
            const cid = `item_image_${index}`;
            // Pasta de upload padrão é 'myvision88' se config.folder_img não estiver definido ou for diferente
            const folder = config.folder_img || 'myvision88';
            const imagePath = path.join(process.cwd(), 'uploads', folder, item.image);
            
            if (item.image && fs.existsSync(imagePath)) {
                attachments.push({
                    filename: item.image,
                    content: fs.readFileSync(imagePath),
                    contentDisposition: 'inline',
                    contentId: cid
                });
                return { ...item, cid };
            }
            return { ...item, cid: null };
        });

        const htmlContent = `
        <div style="border: 1px solid #ddd; padding: 20px; max-width: 400px; margin: 0 auto; font-family: Arial, sans-serif;">  
            <h2>🎁 ギフト注文ありがとうございます！</h2>
            <p>お名前: ${newOrder.first_name} ${newOrder.last_name}</p>
            <p>受付番号: <strong>G-${String(orderId).padStart(4, "0")}</strong></p>
            <p>電話番号: ${newOrder.tel}</p>
            <p>配送方法: ${deliveryLabel}</p>
            ${addressHtml}
            <p>メッセージ: ${newOrder.message || '無し'}</p>

            <h3 style="border-bottom: 2px solid #333; padding-bottom: 5px;">ご注文商品</h3>
                    
            ${itemsWithCid.map(item => {
                const itemTotal = item.price * item.amount;
                const imgSrc = item.cid ? `cid:${item.cid}` : `${config.site_back}/image/${config.folder_img}/${item.image}`;
                
                return `
                    <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse; background: #f9f9f9; border-radius: 8px; overflow: hidden;">
                        <tr>
                            <td style="width: 120px; padding: 15px 0px 15px 15px; vertical-align: top;">
                                <img src="${imgSrc}" 
                                    alt="${item.name}" 
                                    width="100" 
                                    style="border-radius: 6px; border: 1px solid #ddd;">
                            </td>
                            <td style="padding: 15px 10px 15px 0px; vertical-align: top;">
                                <h3 style="margin: 0 0 10px 0;">${item.name}</h3>
                                ${item.size ? `<p style="margin: 5px 0;"><strong>サイズ:</strong> ${item.size}</p>` : ''}
                                <p style="margin: 5px 0;"><strong>個数:</strong> ${item.amount}個</p>
                                <p style="margin: 5px 0;"><strong>価格:</strong> ¥${Math.trunc(item.price).toLocaleString("ja-JP")}</p>
                                <hr/>
                                <strong>小計 ¥${Math.trunc(itemTotal).toLocaleString("ja-JP")}</strong>
                            </td>
                        </tr>
                    </table>
                `;
            }).join('')}

            <div style="max-width: 400px; background: #ddd; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <h3 style="margin: 0; color: #000;">合計金額</h3>
                <p style="font-size: 24px; font-weight: bold; margin: 10px 0 0 0;">
                    ¥${Math.trunc(totalGeral).toLocaleString("ja-JP")}
                    <span style="font-size: 14px; font-weight: normal;">(税込)</span>
                </p>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
                <p><strong>受付用QRコード</strong></p>
                <p><strong style="color: red;">受け取り時にご提示ください。</strong></p>
                <img src="cid:${qrCodeContentId}" width="300" style="display: block; margin: 0 auto;" />
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 20px;">
                <p style="margin: 0; font-size: 14px;">上記の内容に相違がございましたら、お手数をお掛けしますが、</p>
                <p style="margin: 5px 0 0 0; font-size: 14px;">ご連絡をお願いいたします。</p>
                <p style="margin: 5px 0 0 0; font-size: 10px; color: red; text-align: center;">※ご注文をキャンセルされる場合、商品受取日3日前までにお店にご連絡お願い致します。</p>
                <p style="margin: 10px 0 0 0;"><strong style="font-size: large;">${config.store_name}</strong></p>
                <p style="margin: 5px 0;">OPEN ${config.open_hour}</p>
                <p style="margin: 5px 0;">TEL: <a href="tel:${config.tel}" style="color: #007bff; text-decoration: none;">${config.tel}</a></p>
            </div>
            <p style="text-align: center; margin-top: 20px; font-style: italic;">宜しくお願いいたします。</p>
        </div>
        `;

        const result = await resend.emails.send({
            from: `"${config.store_name}" <order@yoyaku.myvision88.com>`,
            to: [newOrder.email, config.mail_store],
            subject: `🎁 ギフト注文確認 - 受付番号 G-${String(orderId).padStart(4, "0")}`,
            html: htmlContent,
            attachments: attachments
        });

        return { success: true, result };
    } catch (error) {
        console.error('Erro em sendNewGiftOrderConfirmation:', error);
        throw error;
    }
}




async function sendGiftCancellationNotification(order, itemsDetails) {
    try {
        const orderId = order.id_order;
        const itemListHtml = itemsDetails.map(item => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.size || '-'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.amount}個</td>
            </tr>
        `).join('');

        const formattedDate = formatDateJP(order.created_at);
        
        const config = await loadStoreConfig();
        const transporter = await getTransporter();

        const mailOptions = {
            from: `"${config.store_name}" <${config.mail_resend}>`,
            to: [order.email, config.mail_store],
            subject: `🎁 ギフト注文キャンセル完了 - 受付番号 G-${String(orderId).padStart(4, "0")}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #d32f2f;">ギフト注文がキャンセルされました</h2>
                        <p style="color: #666;">以下の注文がキャンセル処理されました</p>
                    </div>

                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="margin: 0 0 10px 0; color: #333;">注文詳細</h3>
                        <p><strong>受付番号：</strong> G-${String(orderId).padStart(4, "0")}</p>
                        <p><strong>お名前：</strong> ${order.first_name} ${order.last_name}様</p>
                        <p><strong>注文日：</strong> ${formattedDate}</p>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #333; margin-bottom: 10px;">キャンセルされた商品</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f5f5f5;">
                                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">商品名</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">サイズ</th>
                                    <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">数量</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemListHtml}
                            </tbody>
                        </table>
                    </div>

                    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border: 1px solid #ffeaa7; margin-bottom: 20px;">
                        <h4 style="color: #856404; margin: 0 0 10px 0;">📝 キャンセルについて</h4>
                        <p style="color: #856404; margin: 0; font-size: 14px;">
                            ギフト注文のキャンセルが完了しました。<br>
                            ご不明な点がございましたら、下記までご連絡ください。
                        </p>
                    </div>

                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                        <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                            <strong style="font-size: large;">${config.store_name} </strong><br>
                            OPEN ${config.open_hour}<br>
                            TEL: <a href="tel:${config.tel}" style="color: #007bff;">${config.tel}</a>
                        </p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        return { success: true, result };
    } catch (error) {
        console.error('Erro em sendGiftCancellationNotification:', error);
        throw error;
    }
}

async function sendGiftCompletedNotification(order) {
    try {
        const config = await loadStoreConfig();
        const transporter = await getTransporter();

        const mailOptions = {
            from: `"${config.store_name}" <${config.mail_store}>`,
            to: order.email,
            subject: `🎁 ギフト商品発送/お渡し完了 - 受付番号 G-${String(order.id_order).padStart(4, "0")}`,
            html: `
                 <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #2e7d32;">✅ ギフト商品の発送/お渡しが完了しました</h2>
                        <p style="color: #666;">ご利用ありがとうございました</p>
                    </div>

                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="margin: 0 0 10px 0; color: #333;">注文詳細</h3>
                        <p><strong>受付番号：</strong> G-${String(order.id_order).padStart(4, "0")}</p>
                        <p><strong>お名前：</strong> ${order.first_name} ${order.last_name}様</p>
                    </div>

                    <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border: 1px solid #c8e6c9; margin-bottom: 20px; text-align: center;">
                        <p style="color: #2e7d32; margin: 0; font-size: 16px;">
                            またのご利用を心よりお待ちしております。🎁
                        </p>
                    </div>

                    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                        <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">
                            <strong style="font-size: large;">${config.store_name}</strong><br>
                            TEL: <a href="tel:${config.tel}" style="color: #007bff; text-decoration: none;">${config.tel}</a>
                        </p>
                    </div>
                </div>
            `
        };

        const result = await transporter.sendMail(mailOptions);
        return { success: true, result };
    } catch (error) {
        console.error('Error em sendGiftCompletedNotification:', error);
        throw error;
    }
}

async function sendSameDayOrderRequestToStore(orderData, orderId) {
    try {
        const config = await loadStoreConfig();
        const resend = await getResendInstance();

        const itemsHtml = orderData.items.map(item => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold;">${item.cake_name || item.name}</td>
                <td style="padding: 10px;">${item.size}</td>
                <td style="padding: 10px; text-align: center;">${item.amount}個</td>
                <td style="padding: 10px; text-align: right;">¥${(item.price * item.amount).toLocaleString('ja-JP')}</td>
            </tr>
        `).join('');

        const htmlContent = `
        <div style="border: 1px solid #e0e0e0; padding: 25px; max-width: 600px; margin: 0 auto; font-family: 'Helvetica Neue', Arial, sans-serif; color: #333;">
            <div style="background: #fff3cd; border-left: 5px solid #ffc107; padding: 15px; margin-bottom: 20px;">
                <h2 style="margin: 0 0 5px 0; color: #856404; font-size: 20px;">⚡ 【当日受取】新規予約リクエスト</h2>
                <p style="margin: 0; color: #856404; font-size: 14px;"><strong>※店舗の在庫を確認し、管理画面（/list）にて【予約確定】または【在庫切れ】の対応を行ってください。</strong></p>
            </div>

            <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin-top: 0; border-bottom: 2px solid #ddd; padding-bottom: 8px;">お客様情報</h3>
                <p style="margin: 5px 0;"><strong>受付番号：</strong> #${String(orderId).padStart(4, '0')}</p>
                <p style="margin: 5px 0;"><strong>お名前：</strong> ${orderData.first_name} ${orderData.last_name} 様</p>
                <p style="margin: 5px 0;"><strong>電話番号：</strong> <a href="tel:${orderData.tel}">${orderData.tel}</a></p>
                <p style="margin: 5px 0;"><strong>メールアドレス：</strong> ${orderData.email}</p>
                <p style="margin: 5px 0;"><strong>受取希望日時：</strong> ${orderData.pickup_date} / ${orderData.pickup_hour}</p>
                ${orderData.message ? `<p style="margin: 5px 0;"><strong>ご要望・メッセージ：</strong> ${orderData.message}</p>` : ''}
            </div>

            <h3 style="border-bottom: 2px solid #ddd; padding-bottom: 8px;">ご希望商品</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background: #f2f2f2;">
                        <th style="padding: 10px; text-align: left;">商品名</th>
                        <th style="padding: 10px; text-align: left;">サイズ</th>
                        <th style="padding: 10px; text-align: center;">数量</th>
                        <th style="padding: 10px; text-align: right;">小計</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <div style="background: #f1f3f5; padding: 15px; border-radius: 8px; text-align: right; margin-bottom: 20px;">
                <span style="font-size: 16px;">合計金額 (税込): </span>
                <strong style="font-size: 22px; color: #d63384;">¥${(orderData.total_amount || 0).toLocaleString('ja-JP')}</strong>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; font-size: 13px; color: #888;">
                <p>${config.store_name} 自動通知システム</p>
            </div>
        </div>
        `;

        const result = await resend.emails.send({
            from: `"${config.store_name}" <order@yoyaku.myvision88.com>`,
            to: [config.mail_store],
            subject: `⚡【当日受取リクエスト】新規予約の確認依頼 - 受付番号 #${String(orderId).padStart(4, '0')}`,
            html: htmlContent
        });

        return { success: true, result };
    } catch (error) {
        console.error('Erro em sendSameDayOrderRequestToStore:', error);
        // Tenta fallback com transporter
        try {
            const config = await loadStoreConfig();
            const transporter = await getTransporter();
            await transporter.sendMail({
                from: `"${config.store_name}" <${config.mail_store}>`,
                to: [config.mail_store],
                subject: `⚡【当日受取リクエスト】新規予約の確認依頼 - 受付番号 #${String(orderId).padStart(4, '0')}`,
                text: `当日受取ケーキの予約リクエストが入りました。受付番号 #${String(orderId).padStart(4, '0')}`
            });
            return { success: true, fallback: true };
        } catch (e) {
            console.error('Erro no fallback do email da loja:', e);
            throw error;
        }
    }
}

async function sendSameDayOrderRequestToClient(orderData, orderId) {
    try {
        const config = await loadStoreConfig();
        const resend = await getResendInstance();

        const itemsHtml = orderData.items.map(item => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold;">${item.cake_name || item.name}</td>
                <td style="padding: 10px;">${item.size}</td>
                <td style="padding: 10px; text-align: center;">${item.amount}個</td>
                <td style="padding: 10px; text-align: right;">¥${(item.price * item.amount).toLocaleString('ja-JP')}</td>
            </tr>
        `).join('');

        const htmlContent = `
        <div style="border: 1px solid #e0e0e0; padding: 25px; max-width: 600px; margin: 0 auto; font-family: 'Helvetica Neue', Arial, sans-serif; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #2b2b2b; margin: 0 0 10px 0;">🎂 ご予約リクエストを受け付けました</h2>
                <span style="display: inline-block; background: #fff3cd; color: #856404; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 14px;">
                    現在、店舗にて在庫を確認中です
                </span>
            </div>

            <div style="background: #fff8e1; border: 1px solid #ffe082; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0 0 8px 0; font-weight: bold; color: #b78103;">⚠️ まだご予約は完了しておりません</p>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #5d4037;">
                    「当日受取ケーキ」は在庫に限りがあるため、現在スタッフが実物の在庫状況を確認しております。<br>
                    在庫の確認が取れ次第、<strong>【予約確定メール】</strong>をお送りいたしますので、今しばらくお待ちください。
                </p>
            </div>

            <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin-top: 0; border-bottom: 2px solid #ddd; padding-bottom: 8px;">リクエスト内容</h3>
                <p style="margin: 5px 0;"><strong>受付番号：</strong> #${String(orderId).padStart(4, '0')}</p>
                <p style="margin: 5px 0;"><strong>お名前：</strong> ${orderData.first_name} ${orderData.last_name} 様</p>
                <p style="margin: 5px 0;"><strong>受取希望日時：</strong> ${orderData.pickup_date} / ${orderData.pickup_hour}</p>
            </div>

            <h3 style="border-bottom: 2px solid #ddd; padding-bottom: 8px;">ご注文商品</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background: #f2f2f2;">
                        <th style="padding: 10px; text-align: left;">商品名</th>
                        <th style="padding: 10px; text-align: left;">サイズ</th>
                        <th style="padding: 10px; text-align: center;">数量</th>
                        <th style="padding: 10px; text-align: right;">小計</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <div style="background: #f1f3f5; padding: 15px; border-radius: 8px; text-align: right; margin-bottom: 20px;">
                <span style="font-size: 16px;">合計予定金額 (税込): </span>
                <strong style="font-size: 22px; color: #333;">¥${(orderData.total_amount || 0).toLocaleString('ja-JP')}</strong>
            </div>

            <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 25px;">
                <p style="margin: 0; font-size: 14px;"><strong style="font-size: 16px;">${config.store_name}</strong></p>
                <p style="margin: 5px 0; font-size: 14px;">OPEN ${config.open_hour}</p>
                <p style="margin: 5px 0; font-size: 14px;">TEL: <a href="tel:${config.tel}" style="color: #007bff; text-decoration: none;">${config.tel}</a></p>
            </div>
        </div>
        `;

        const result = await resend.emails.send({
            from: `"${config.store_name}" <order@yoyaku.myvision88.com>`,
            to: [orderData.email],
            subject: `🎂【MyVision88】当日受取ケーキの予約リクエストを受け付けました（確認中）- 受付番号 #${String(orderId).padStart(4, '0')}`,
            html: htmlContent
        });

        return { success: true, result };
    } catch (error) {
        console.error('Erro em sendSameDayOrderRequestToClient:', error);
        return { success: false, error: error.message };
    }
}

async function sendSameDayOrderConfirmedToClient(orderData, orderId) {
    try {
        const qrCodeBuffer = await QRCode.toBuffer(String(orderId), { type: 'png', width: 350 });
        const qrCodeContentId = 'qrcode_sameday_order';

        const config = await loadStoreConfig();
        const resend = await getResendInstance();

        const paymentUrl = `${config.site_back}/sameday/payment/${orderId}`;

        const itemsHtml = orderData.items.map(item => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold;">${item.cake_name || item.name}</td>
                <td style="padding: 10px;">${item.size}</td>
                <td style="padding: 10px; text-align: center;">${item.amount}個</td>
                <td style="padding: 10px; text-align: right;">¥${(item.price * item.amount).toLocaleString('ja-JP')}</td>
            </tr>
        `).join('');

        const htmlContent = `
        <div style="border: 1px solid #e0e0e0; padding: 25px; max-width: 600px; margin: 0 auto; font-family: 'Helvetica Neue', Arial, sans-serif; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #28a745; margin: 0 0 10px 0;">🎉 ご予約が確定いたしました！</h2>
                <p style="color: #555; font-size: 15px; margin: 0;">商品の在庫が確保されました。ご来店をお待ちしております。</p>
            </div>

            <div style="background: #e8f5e9; border: 1px solid #c8e6c9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin-top: 0; color: #2e7d32; border-bottom: 1px solid #a5d6a7; padding-bottom: 5px;">予約内容</h3>
                <p style="margin: 5px 0;"><strong>受付番号：</strong> <span style="font-size: 18px; font-weight: bold; color: #2e7d32;">#${String(orderId).padStart(4, '0')}</span></p>
                <p style="margin: 5px 0;"><strong>お名前：</strong> ${orderData.first_name} ${orderData.last_name} 様</p>
                <p style="margin: 5px 0;"><strong>受取日時：</strong> <strong style="color: #d32f2f;">${orderData.pickup_date} / ${orderData.pickup_hour}</strong></p>
            </div>

            <h3 style="border-bottom: 2px solid #ddd; padding-bottom: 8px;">ご予約商品</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background: #f2f2f2;">
                        <th style="padding: 10px; text-align: left;">商品名</th>
                        <th style="padding: 10px; text-align: left;">サイズ</th>
                        <th style="padding: 10px; text-align: center;">数量</th>
                        <th style="padding: 10px; text-align: right;">小計</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <div style="background: #f1f3f5; padding: 15px; border-radius: 8px; text-align: right; margin-bottom: 20px;">
                <span style="font-size: 16px;">お支払い合計 (税込): </span>
                <strong style="font-size: 24px; color: #28a745;">¥${(orderData.total_amount || 0).toLocaleString('ja-JP')}</strong>
            </div>

            <!-- Botão e Opções de Pagamento -->
            <div style="background: #f8f9fa; border: 2px dashed #007bff; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 25px;">
                <h3 style="margin-top: 0; color: #007bff;">💳 お支払い方法について</h3>
                <p style="font-size: 14px; margin-bottom: 15px; color: #555;">
                    「店頭での現金・カード払い」または「事前オンラインクレジットカード決済」をご利用いただけます。
                </p>
                <a href="${paymentUrl}" style="display: inline-block; background: #007bff; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 16px; margin-bottom: 10px;">
                    お支払い・予約確認ページへ進む →
                </a>
                <p style="font-size: 12px; color: #888; margin: 5px 0 0 0;">※事前決済をしていただくと、店頭でのお受け取りがスムーズになります。</p>
            </div>

            <!-- QR Code -->
            <div style="text-align: center; margin: 25px 0;">
                <p style="margin: 0 0 5px 0; font-weight: bold; font-size: 15px;">受取確認用 QRコード</p>
                <p style="margin: 0 0 10px 0; color: #d32f2f; font-size: 13px;">店頭での受取時にこちらの画面をご提示ください。</p>
                <img src="cid:${qrCodeContentId}" width="260" style="display: block; margin: 0 auto; border: 1px solid #ddd; padding: 5px; border-radius: 8px;" />
            </div>

            <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 25px;">
                <p style="margin: 0; font-size: 14px;"><strong style="font-size: 16px;">${config.store_name}</strong></p>
                <p style="margin: 5px 0; font-size: 14px;">OPEN ${config.open_hour}</p>
                <p style="margin: 5px 0; font-size: 14px;">TEL: <a href="tel:${config.tel}" style="color: #007bff; text-decoration: none;">${config.tel}</a></p>
            </div>
        </div>
        `;

        const result = await resend.emails.send({
            from: `"${config.store_name}" <order@yoyaku.myvision88.com>`,
            to: [orderData.email, config.mail_store],
            subject: `🎂【予約確定】当日受取ケーキのご予約が確定いたしました - 受付番号 #${String(orderId).padStart(4, '0')}`,
            html: htmlContent,
            attachments: [{
                filename: 'qrcode.png',
                content: qrCodeBuffer,
                contentDisposition: 'inline',
                contentId: qrCodeContentId
            }]
        });

        return { success: true, result };
    } catch (error) {
        console.error('Erro em sendSameDayOrderConfirmedToClient:', error);
        throw error;
    }
}

async function sendSameDayOrderRejectedToClient(orderData, orderId) {
    try {
        const config = await loadStoreConfig();
        const resend = await getResendInstance();

        const itemsHtml = orderData.items.map(item => `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold;">${item.cake_name || item.name}</td>
                <td style="padding: 10px;">${item.size}</td>
                <td style="padding: 10px; text-align: center;">${item.amount}個</td>
            </tr>
        `).join('');

        const htmlContent = `
        <div style="border: 1px solid #e0e0e0; padding: 25px; max-width: 600px; margin: 0 auto; font-family: 'Helvetica Neue', Arial, sans-serif; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #dc3545; margin: 0 0 10px 0;">⚠️ 商品のご用意ができませんでした</h2>
                <p style="color: #666; font-size: 15px; margin: 0;">大変申し訳ございません。ご希望の商品は本日既に完売いたしました。</p>
            </div>

            <div style="background: #fdf2f2; border: 1px solid #f8d7da; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #721c24;">
                    ${orderData.first_name} ${orderData.last_name} 様<br><br>
                    この度は「当日受取ケーキ」をご注文いただき誠にありがとうございました。<br>
                    店舗にて実物の在庫状況を確認いたしましたところ、ご希望いただきました商品は<strong>本日既に完売・在庫切れ</strong>となっており、ご用意することができませんでした。<br><br>
                    ご期待に沿えず大変申し訳ございません。何卒ご了承のほどよろしくお願い申し上げます。
                </p>
            </div>

            <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin-top: 0; border-bottom: 2px solid #ddd; padding-bottom: 8px;">対象のリクエスト</h3>
                <p style="margin: 5px 0;"><strong>受付番号：</strong> #${String(orderId).padStart(4, '0')}</p>
                <p style="margin: 5px 0;"><strong>受取希望日時：</strong> ${orderData.pickup_date} / ${orderData.pickup_hour}</p>
            </div>

            <h3 style="border-bottom: 2px solid #ddd; padding-bottom: 8px;">商品内容</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background: #f2f2f2;">
                        <th style="padding: 10px; text-align: left;">商品名</th>
                        <th style="padding: 10px; text-align: left;">サイズ</th>
                        <th style="padding: 10px; text-align: center;">数量</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 25px;">
                <p style="margin: 0; font-size: 14px;"><strong style="font-size: 16px;">${config.store_name}</strong></p>
                <p style="margin: 5px 0; font-size: 14px;">OPEN ${config.open_hour}</p>
                <p style="margin: 5px 0; font-size: 14px;">TEL: <a href="tel:${config.tel}" style="color: #007bff; text-decoration: none;">${config.tel}</a></p>
            </div>
        </div>
        `;

        const result = await resend.emails.send({
            from: `"${config.store_name}" <order@yoyaku.myvision88.com>`,
            to: [orderData.email],
            subject: `⚠️【在庫切れのお知らせ】当日受取ケーキのご用意ができませんでした - 受付番号 #${String(orderId).padStart(4, '0')}`,
            html: htmlContent
        });

        return { success: true, result };
    } catch (error) {
        console.error('Erro em sendSameDayOrderRejectedToClient:', error);
        throw error;
    }
}

module.exports = {
    sendNewOrderConfirmation,
    sendOrderUpdateNotification,
    sendCancellationNotification,
    sendOrderCompletedNotification,
    sendNewGiftOrderConfirmation,
    sendGiftCancellationNotification,
    sendGiftCompletedNotification,
    sendSameDayOrderRequestToStore,
    sendSameDayOrderRequestToClient,
    sendSameDayOrderConfirmedToClient,
    sendSameDayOrderRejectedToClient
};