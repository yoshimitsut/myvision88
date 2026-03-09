const { Resend } = require('resend');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
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
 * Teste Resend
 */
async function testResend() {
    try {
        const resend = await getResendInstance();
        const mailStore = await getStoreConfig('mail_store');
        
        const result = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: mailStore,
            subject: 'Teste Resend - ' + new Date().toISOString(),
            html: '<strong>Teste funcionando! 🎉</strong>'
        });

        return { success: true, result };
    } catch (error) {
        console.error('Erro no testResend:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Teste com email real
 */
async function testResendRealEmail() {
    try {
        const resend = await getResendInstance();
        const mailStore = await getStoreConfig('mail_store');
        
        const result = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: mailStore,
            subject: 'Teste Resend - E-mail Real',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: green;">✅ Resend Funcionando!</h2>
                    <p>Este é um teste de envio para e-mail real.</p>
                    <p><strong>Data:</strong> ${new Date().toLocaleString()}</p>
                </div>
            `
        });

        return { success: true, result };
    } catch (error) {
        console.error('Erro no testResendRealEmail:', error);
        return { success: false, error: error.message };
    }
}


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
                const cakeTotalPrice = (cake.price) * cake.amount;
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
                                <hr/>
                                <strong>小計 ¥${Math.trunc(cakeTotalPrice).toLocaleString("ja-JP")}</strong>
                            </td>
                        </tr>
                    </table>
                `}).join('')}

            <div style="max-width: 400px; background: #ddd; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <h3 style="margin: 0; color: #000;">合計金額</h3>
                <p style="font-size: 24px; font-weight: bold; margin: 10px 0 0 0;">
                    ¥${Math.trunc(totalGeral).toLocaleString("ja-JP")}
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
                <p style="margin: 10px 0 0 0;"><strong style="font-size: large;">${config.store_name}</strong></p>
                <p style="margin: 5px 0;">OPEN ${config.open_hour}</p>
                <p style="margin: 5px 0;">TEL: <a href="tel:${config.tel}" style="color: #007bff; text-decoration: none;">${config.tel}</a></p>
            </div>
            <p style="text-align: center; margin-top: 20px; font-style: italic;">宜しくお願いいたします。</p>
        </div>
        `;

        const result = await resend.emails.send({
            from: `"${config.store_name}" <shimitsutanaka@gmail.com>`,
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
            const cakeTotalPrice = (cake.price) * cake.amount;
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
                            ${cake.message_cake ? `<p style="margin: 5px 0;"><strong>メッセージ:</strong> ${cake.message_cake}</p>` : ''}
                            <hr/>
                            <strong>小計: ¥${Math.trunc(cakeTotalPrice).toLocaleString("ja-JP")}</strong>
                        </td>
                    </tr>
                </table>
            `;
        }).join('');

        const totalGeral = orderData.cakes.reduce((total, cake) => {
            return total + ((cake.price) * cake.amount);
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
        console.error('Error em sendOrderCompletedNotification:', error);
        throw error;
    }
}


module.exports = {
    sendNewOrderConfirmation,
    sendOrderUpdateNotification,
    sendCancellationNotification,
    sendOrderCompletedNotification,
    testResend,
    testResendRealEmail
};