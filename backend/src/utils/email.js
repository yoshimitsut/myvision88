const { Resend } = require('resend');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');

// Certifique-se de que estas variáveis de ambiente estão sendo lidas
const resend = new Resend(process.env.RESEND_API_KEY || "re_c8hnBVtD_JX19Sk4HsVZ7kayHwWFG16ZG");

const EMAIL_CONFIG = {
  fromName: process.env.EMAIL_FROM_NAME,
  fromResend: process.env.EMAIL_FROM_RESEND,
  fromGmail: process.env.EMAIL_FROM_GMAIL,
  gmailPass: process.env.EMAIL_PASS
};

// Configura o transporter do Nodemailer (usado para atualizações/cancelamentos)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: EMAIL_CONFIG.fromGmail,
    pass: EMAIL_CONFIG.gmailPass
  }
});

/**
 * Função para formatar a data no formato japonês (YYYY年MM月DD日)
 * @param {string} dateString - Data no formato YYYY-MM-DD
 * @returns {string} Data formatada em Japonês
 */
const formatDateJP = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}年${month}月${day}日`;
};

async function testResend() {
    try {
        console.log('🧪 Testando Resend...');
        
        const result = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'delivered@resend.dev',
            subject: 'Teste Resend - ' + new Date().toISOString(),
            html: '<strong>Teste funcionando! 🎉</strong>'
        });

        console.log('✅ Teste Resend OK:', result);
        return result;
    } catch (error) {
        console.error('❌ Teste Resend FALHOU:', error);
        return null;
    }
}

// 🔥 ADICIONAR: Teste com e-mail real
async function testResendRealEmail() {
    try {
        console.log('🧪 Testando Resend com e-mail real...');
        
        const result = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'shimitsutanaka@gmail.com',
            subject: 'Teste Resend - E-mail Real',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: green;">✅ Resend Funcionando!</h2>
                    <p>Este é um teste de envio para e-mail real.</p>
                    <p><strong>Data:</strong> ${new Date().toLocaleString()}</p>
                </div>
            `
        });

        console.log('✅ Teste e-mail real OK:', result);
        return result;
    } catch (error) {
        console.error('❌ Teste e-mail real FALHOU:', error);
        
        // Detalhes do erro
        if (error.message) {
            console.log('Mensagem de erro:', error.message);
        }
        return null;
    }
}


/**
 * Envia o email de confirmação de novo pedido.
 * @param {object} newOrder - Dados do novo pedido.
 * @param {number} orderId - ID do pedido.
 * @returns {Promise<void>}
 */
async function sendNewOrderConfirmation(newOrder, orderId) {
    const qrCodeBuffer = await QRCode.toBuffer(String(orderId), { type:'png', width:400 });
    const qrCodeContentId = 'qrcode_order_id';

    const totalGeral = newOrder.cakes.reduce((total, cake) => {
        return total + ((cake.price) * cake.amount);
    }, 0);

    const htmlContent = `
    <div style="border: 1px solid #ddd; padding: 20px; max-width: 400px; margin: 0 auto; font-family: Arial, sans-serif;">  
        <h2>🎂 注文ありがとうございます！</h2>
        <p>お名前: ${newOrder.first_name} ${newOrder.last_name}</p>
        <p>受付番号: <strong>${String(orderId).padStart(4,"0")}</strong></p>
        <p>電話番号: ${newOrder.tel}</p>
        <p>受け取り日時: ${newOrder.date} / ${newOrder.pickupHour}</p>
        <p>メッセージ: ${newOrder.message || '無し'}</p>

        <h3 style="border-bottom: 2px solid #333; padding-bottom: 5px;">ご注文商品</h3>
                
        ${newOrder.cakes.map(cake => { 
            const cakeTotalPrice = (cake.price) * cake.amount;

            return `
                <table style="width: 400px; margin-bottom: 20px; border-collapse: collapse; background: #f9f9f9; border-radius: 8px; overflow: hidden;">
                    <tr>
                        <td style="width: 120px; padding: 15px 0px 15px 15px; vertical-align: top;">
                            <img src="${process.env.EMAIL_USER_SITE}/image/${cake.image}" 
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
                            ${cake.message_cake ? `<p style="margin: 5px 0;"><strong>メッセージプレート:</strong> ${cake.message_cake || '無し'}</p>` : ''}
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
                <br/>
                <p><strong style="color: red;">事前にお支払い（ご来店）頂く事で、<br />受け取り当日スムーズにお渡しができます。</strong><p>
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
            <p style="margin: 10px 0 0 0;"><strong>Patisserie</strong></p>
            <p style="margin: 5px 0;">open 11:00 - 19:00</p>
            <p style="margin: 5px 0;">TEL: <a href="tel:080-0000-0000" style="color: #007bff; text-decoration: none;">080-9854-2849</a></p>
        </div>
        <p style="text-align: center; margin-top: 20px; font-style: italic;">宜しくお願いいたします。</p>
    </div>
    `;

    await resend.emails.send({
      from: `"${EMAIL_CONFIG.fromName}" <onboarding@resend.dev>`,
      to: [
        newOrder.email, 
        EMAIL_CONFIG.fromGmail
      ],
      subject: `🎂 ご注文確認 - 受付番号 ${String(orderId).padStart(4,"0")}`,
      html: htmlContent,
      attachments: [{
        filename: 'qrcode.png',
        content: qrCodeBuffer,
        contentDisposition: 'inline',
        contentId: qrCodeContentId
      }]
    });
}

/**
 * Envia o email de notificação de alteração de pedido.
 * @param {object} orderData - Dados do pedido atualizados.
 * @returns {Promise<void>}
 */
async function sendOrderUpdateNotification(orderData) {
    const qrCodeBuffer = await QRCode.toBuffer(String(orderData.id_order).padStart(4, "0"), { type: 'png', width: 400 });
    const qrCodeContentId = 'qrcode_order_id';
console.table(orderData);
    const cakeListHtml = orderData.cakes.map(cake => {
        const cakeTotalPrice = (cake.price) * cake.amount;
        return `
            <table style="width: 400px; margin-bottom: 20px; border-collapse: collapse; background: #f9f9f9; border-radius: 8px; overflow: hidden;">
                <tr>
                    <td style="width: 120px; padding: 15px 0px 15px 15px; vertical-align: top;">
                        <img src="${process.env.EMAIL_USER_SITE}/image/${cake.image}" 
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
                        ${cake.message_cake ? `<p style="margin: 5px 0;"><strong>メッセージプレート:</strong> ${cake.message_cake}</p>` : ''}
                        <hr/>
                        <strong>小計: ¥${Math.trunc(cakeTotalPrice).toLocaleString("ja-JP")}</strong>
                    </td>
                </tr>
            </table>
        `}).join('');

    const totalGeral = orderData.cakes.reduce((total, cake) => {
        return total + ((cake.price) * cake.amount);
    }, 0);

    const mailOptions = {
        from: `"Patisserie Test" <${EMAIL_CONFIG.fromResend}>`,
        to: [
            orderData.email, 
            EMAIL_CONFIG.fromGmail
        ],  
        subject: `🎂 ご注文内容変更のお知らせ - 受付番号 ${String(orderData.id_order).padStart(4, "0")}`,
        html: `
            <div style="border: 1px solid #ddd; padding: 20px; max-width: 400px; margin: 0 auto; font-family: Arial, sans-serif;">
                <h2 style="text-align: center; color: #333;">以下の内容に変更いたしました</h2>
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
                        <br/>
                        <p><strong style="color: red;">事前にお支払い（ご来店）頂く事で、<br />受け取り当日スムーズにお渡しができます。</strong>
                    <p>
                </div>

                <div style="text-align: center; margin: 20px 0;">
                    <p><strong>受付用QRコード</strong></p>
                    <p><strong style="color: red;">受け取り時にご提示ください。</strong></p>
                    <img src="cid:${qrCodeContentId}" width="300" style="display: block; margin: 0 auto;" />
                </div>

                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 20px;">
                    <p style="margin: 0; font-size: 14px;">上記の内容に相違がございましたら、お手数をお掛けしますが、</p>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">ご連絡をお願いいたします。</p>
                    <p style="margin: 10px 0 0 0;"><strong>Patisserie</strong></p>
                    <p style="margin: 5px 0;">open 11:00 - 19:00</p>
                    <p style="margin: 5px 0;">TEL: <a href="tel:080-0000-0000" style="color: #007bff; text-decoration: none;">080-9854-2849</a></p>
                </div>
                
                <p style="text-align: center; margin-top: 20px; font-style: italic;">宜しくお願いいたします。</p>
            </div>
        `,
        attachments: [{
            filename: 'qrcode.png',
            content: qrCodeBuffer,
            contentDisposition: 'inline',
            contentId: qrCodeContentId,
            contentType: 'image/png', 
            cid: qrCodeContentId
        }]
    };

    return transporter.sendMail(mailOptions);
}

/**
 * Envia o email de notificação de cancelamento de pedido.
 * @param {object} order - Dados do pedido cancelado.
 * @param {Array<object>} cakesDetails - Detalhes dos bolos do pedido.
 * @returns {Promise<void>}
 */
async function sendCancellationNotification(order, cakesDetails) {
    const orderId = order.id_order;
    const cakeListHtml = cakesDetails.map(cake => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${cake.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${cake.size}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${cake.amount}個</td>
        </tr>
    `).join('');

    const formattedDate = formatDateJP(order.date);

    const mailOptions = {
        from: `"Patisserie" <${EMAIL_CONFIG.fromResend}>`,
        to: [
            order.email,
            EMAIL_CONFIG.fromGmail
        ],
        subject: `ご注文のキャンセル完了 - 受付番号 ${String(orderId).padStart(4, "0")}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #d32f2f; margin-bottom: 10px;">注文がキャンセルされました</h2>
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
                        Patisserie<br>
                        OPEN 11:00 - 19:00<br>
                        TEL: <a href="tel:080-9854-2849" style="color: #007bff;">080-9854-2849</a>
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #999;">
                        このメールは自動送信されています
                    </p>
                </div>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
}


module.exports = {
    sendNewOrderConfirmation,
    sendOrderUpdateNotification,
    sendCancellationNotification,
    testResend, // 🔥 EXPORTAR função de teste
    testResendRealEmail // 🔥 EXPORTAR função de teste real
};